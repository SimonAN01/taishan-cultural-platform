"""HTTP acceptance checks against a running server, using disposable anonymous sessions.

Run from the repository root. --external makes paid/network AI and speech calls.
No credentials, session cookies or uploaded photo bytes are written to the report.
"""
import argparse
import io
import json
import re
import time
from pathlib import Path

import httpx
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:18605')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--external', action='store_true')
    args = parser.parse_args()
    report = {'base_url': args.base_url, 'scope': 'disposable anonymous HTTP sessions',
              'external_services_tested': args.external, 'checks': [], 'services': []}

    def check(name, condition, detail=None):
        report['checks'].append({'name': name, 'passed': bool(condition), **({'detail': detail} if detail is not None else {})})

    def post(client, path, body):
        return client.post('/api/' + path, json=body)

    with httpx.Client(base_url=args.base_url, trust_env=False, timeout=75, follow_redirects=True) as c, \
         httpx.Client(base_url=args.base_url, trust_env=False, timeout=75) as other:
        health = c.get('/api/health'); health.raise_for_status()
        report['health'] = health.json()
        schema = c.get('/openapi.json').json()
        check('health and OpenAPI use the same version', schema['info']['version'] == health.json()['version'],
              {'health': health.json()['version'], 'openapi': schema['info']['version']})
        cat = c.get('/api/catalog').json()
        report['catalog_counts'] = {key: len(cat[key]) for key in ['spots', 'routes', 'history', 'poems', 'artifacts', 'scenes', 'sources']}
        spots = {s['id']: s for s in cat['spots']}
        sources = {s['id']: s for s in cat['sources']}
        check('at least eight cultural spots', len(spots) >= 8)
        check('four routes', len(cat['routes']) == 4)
        for collection, endpoint in [('spots', 'spots'), ('routes', 'routes'), ('history', 'history'), ('poems', 'poems')]:
            check(endpoint + ' catalog parity', c.get('/api/' + endpoint).json() == cat[collection])
            for item in cat[collection]:
                check(collection + '/' + item['id'] + ' valid sources', bool(item['sources']) and all(s['id'] in sources for s in item['sources']))
        for spot in cat['spots']:
            check('spot detail/' + spot['id'], c.get('/api/spots/' + spot['id']).json() == spot)
        for route in cat['routes']:
            check('route node IDs/' + route['id'], set(route['node_sequence'] + route.get('detours', [])) <= spots.keys())
            for variant in route.get('variants', []):
                check('variant node IDs/' + route['id'] + '/' + variant['id'], set(variant['node_sequence']) <= spots.keys())
        for poem in cat['poems']:
            check('complete annotations/' + poem['id'], [a['line'] for a in poem['annotations']] == poem['original_text'].splitlines())
        for path in ['/', '/experience/']:
            page = c.get(path)
            check('HTML served/' + path, page.status_code == 200 and 'text/html' in page.headers.get('content-type', ''))
            check('security headers/' + path, page.headers.get('x-content-type-options') == 'nosniff' and 'object-src' in page.headers.get('content-security-policy', ''))
            assets = re.findall(r'(?:src|href)="([^"#]+\.(?:js|css))"', page.text)
            for asset in assets:
                response = c.get(asset)
                check('entry asset/' + asset, response.status_code == 200 and 'text/html' not in response.headers.get('content-type', ''))
        for spot in cat['spots']:
            for photo in spot.get('photos', []):
                response = c.get('/' + photo['url'].lstrip('/'))
                check('real photo/' + photo['id'], response.status_code == 200 and bool(photo.get('author') and photo.get('license') and photo.get('source_page')))
        model = c.get('/experience/models/princess-agent-web-v4.glb')
        check('real avatar GLB and immutable caching', model.content[:4] == b'glTF' and 'immutable' in model.headers.get('cache-control', ''))
        for scene in cat['scenes']:
            sid = scene['id']
            check('scene empty progress/' + sid, c.get('/api/scenes/' + sid).json()['progress']['viewed'] == [])
            check('scene rejects foreign reading point/' + sid, post(c, 'scenes/' + sid + '/discover', {'point_id': 'invalid'}).status_code == 422)
            for point in scene['points']:
                response = post(c, 'scenes/' + sid + '/discover', {'point_id': point['id']})
                check('scene point/' + sid + '/' + point['id'], response.status_code == 200 and point['id'] in response.json()['progress']['viewed'] and bool(point['sources']))
            repeated = post(c, 'scenes/' + sid + '/discover', {'point_id': scene['points'][0]['id']}).json()
            check('scene progress idempotent/' + sid, len(repeated['progress']['viewed']) == len(scene['points']))
            check('scene session isolation/' + sid, other.get('/api/scenes/' + sid).json()['progress']['viewed'] == [])
            model_response = c.get(scene['model_url'])
            check('scene model slot truth/' + sid, (model_response.status_code == 200 and model_response.content[:4] == b'glTF') == scene['model_available'])
        chapters = cat['story']['chapters']
        check('quiz hides answer keys', all('correct_index' not in ch and 'explanation' not in ch for ch in chapters))
        check('quiz rejects skipped chapters', post(c, 'story/chapters/' + chapters[-1]['id'] + '/answer', {'choice': 0}).status_code == 409)
        check('quiz requires a real visit', post(c, 'story/chapters/' + chapters[0]['id'] + '/answer', {'choice': 0}).status_code == 409)
        # Exercise each choice; accepting the right answer once must never create duplicate progress.
        for ch in chapters:
            post(c, 'journey/visit', {'spot_id': ch['spot_id']}).raise_for_status()
            outcomes = [post(c, 'story/chapters/' + ch['id'] + '/answer', {'choice': choice}) for choice in range(3)]
            check('quiz choice validation/' + ch['id'], all(r.status_code == 200 for r in outcomes) and sum(r.json()['correct'] for r in outcomes) == 1)
        progress = c.get('/api/journey').json()
        check('all chapters persisted exactly once', len(progress['story_progress']['completed']) == len(chapters) and progress['story_progress']['next_chapter'] is None)
        for kind, item in [('spot', 'hongmen'), ('poem', 'libai-2')]:
            for _ in range(2):
                post(c, 'journey/favorite', {'kind': kind, 'item_id': item, 'saved': True}).raise_for_status()
        check('favorites are persistent and idempotent', len(c.get('/api/journey').json()['favorites']) == 2)
        post(c, 'journey/favorite', {'kind': 'poem', 'item_id': 'libai-2', 'saved': False}).raise_for_status()
        check('favorite removal', len(c.get('/api/journey').json()['favorites']) == 1)
        check('other session journey is empty', not other.get('/api/journey').json()['visited'])
        for path, body, status in [('journey/visit', {'spot_id': 'missing'}, 404), ('journey/favorite', {'kind': 'spot', 'item_id': 'missing', 'saved': True}, 404), ('journey/favorite', {'kind': 'script', 'item_id': 'hongmen', 'saved': True}, 422), ('agent/chat', {'message': '   '}, 422), ('agent/chat', {'message': 'x' * 801}, 422), ('agent/chat', {'message': '介绍', 'current_spot': 'missing'}, 404), ('agent/chat', {'message': '介绍', 'current_poem': 'missing'}, 404), ('agent/chat', {'message': '介绍', 'current_route': 'missing'}, 404), ('speech/tts', {'text': ''}, 422)]:
            check('invalid input/' + path + '/' + str(body)[:90], post(c, path, body).status_code == status)
        check('cross-origin write rejected', c.post('/api/journey/visit', json={'spot_id': 'hongmen'}, headers={'Origin': 'https://other.example'}).status_code == 403)
        check('invalid photo rejected', c.post('/api/vision/recognize', files={'file': ('broken.png', b'not an image', 'image/png')}).status_code == 415)
        check('prediction ownership enforced', post(other, 'vision/predictions/missing/confirm', {'spot_id': 'hongmen'}).status_code == 404)
        check('cookie is HttpOnly and session response not cached', 'HttpOnly' in health.headers.get('set-cookie', '') and health.headers.get('cache-control') == 'no-store')

        if args.external:
            questions = [
                {'message': '你是谁？'},
                {'message': '泰山有什么景点？'},
                {'message': '这条路线有哪些站点和交通方式？', 'current_route': 'tianwai'},
                {'message': '这首诗里的羽人和鸟迹书分别是什么意思？', 'current_poem': 'libai-2'},
                {'message': '这里的壁画讲了什么？', 'current_spot': 'daimiao'},
                {'message': '后石坞的仙人故事是史实还是传说？', 'current_spot': 'houshiwu'},
            ]
            for payload in questions:
                print('Checking real chat: ' + payload['message'], flush=True)
                start = time.monotonic(); response = post(c, 'agent/chat', payload)
                data = response.json()
                report['services'].append({'kind': 'chat', 'request': payload, 'seconds': round(time.monotonic()-start, 2), 'http_status': response.status_code, 'result': data})
                check('real grounded chat/' + payload['message'], response.status_code == 200 and data.get('mode') == 'rag_llm' and not data.get('refused'))
                check('citations resolve/' + payload['message'], all(x['sources'] for x in data.get('citations', [])))
            for question in ['今天门票多少钱，几点开门？', '帮我写一个股票交易机器人']:
                response = post(c, 'agent/chat', {'message': question}); data = response.json()
                report['services'].append({'kind': 'refusal', 'question': question, 'result': data})
                check('realtime or unrelated question refused/' + question, response.status_code == 200 and data.get('refused'))
            for poem in cat['poems']:
                start = time.monotonic(); response = c.post('/api/poems/' + poem['id'] + '/narration'); data = response.json()
                check('real poem cues/' + poem['id'], response.status_code == 200 and len(data.get('cues', [])) == len(poem['original_text'].splitlines()) and all(q['end'] > q['start'] for q in data.get('cues', [])))
                if response.status_code == 200:
                    audio = c.get(data['audio_url'])
                    check('real poem audio/' + poem['id'], audio.status_code == 200 and audio.headers.get('content-type') == 'audio/mpeg' and len(audio.content) > 3000)
                    check('poem cache/' + poem['id'], c.post('/api/poems/' + poem['id'] + '/narration').json() == data)
                    report['services'].append({'kind': 'poem_audio', 'id': poem['id'], 'cues': data['cues'], 'bytes': len(audio.content), 'seconds': round(time.monotonic()-start, 2)})
            audio = post(c, 'speech/tts', {'text': '欢迎来到泰山。让我们沿着山路，读懂这一卷千年故事。'})
            check('real TTS audio', audio.status_code == 200 and audio.headers.get('content-type') == 'audio/mpeg' and len(audio.content) > 3000)
            report['services'].append({'kind': 'tts', 'http_status': audio.status_code, 'bytes': len(audio.content)})
            # These are smoke samples already in the catalog, never an independent accuracy dataset.
            samples = []
            for sid in ['daguan', 'jingshi', 'nantian']:
                photo = spots[sid]['photos'][0]
                samples.append((sid, c.get('/' + photo['url'].lstrip('/')).content))
            blank = io.BytesIO(); Image.new('RGB', (320, 240), '#cccccc').save(blank, 'PNG')
            samples.append(('unknown', blank.getvalue()))
            for sid, raw in samples:
                print('Checking cloud vision: ' + sid, flush=True)
                start = time.monotonic(); response = c.post('/api/vision/recognize', files={'file': ('sample', raw, 'application/octet-stream')}); data = response.json()
                report['services'].append({'kind': 'vision_smoke_not_accuracy', 'expected': sid, 'seconds': round(time.monotonic()-start, 2), 'http_status': response.status_code, 'result': data})
                check('real vision/' + sid, response.status_code == 200 and (data.get('status') == 'unknown' if sid == 'unknown' else sid in [x['spot_id'] for x in data.get('candidates', [])]))
                if sid != 'unknown' and response.status_code == 200 and data.get('candidates'):
                    candidate = data['candidates'][0]['spot_id']; rid = data['request_id']
                    check('vision candidate confirmation/' + sid, post(c, 'vision/predictions/' + rid + '/confirm', {'spot_id': candidate}).status_code == 200)
                    if sid == 'daguan':
                        check('vision other session cannot confirm/' + sid, post(other, 'vision/predictions/' + rid + '/confirm', {'spot_id': candidate}).status_code == 404)
                # Do not hit the six/minute vision limit with validation + confirmation probes.
                if sid == 'daguan': time.sleep(60)
            history = c.get('/api/agent/history').json()
            check('real conversation persisted with citations', bool(history) and all('mode' in m for m in history if m['role'] == 'assistant'))
            c.delete('/api/agent/history').raise_for_status()
            check('clear chat preserves journey', c.get('/api/agent/history').json() == [] and bool(c.get('/api/journey').json()['visited']))
        # Only the freshly-created QA client's records are deleted.
        c.delete('/api/journey').raise_for_status()
        journey = c.get('/api/journey').json()
        check('clear disposable journey resets progress and favorites', not journey['visited'] and not journey['favorites'] and not journey['story_progress']['completed'])
        for scene in cat['scenes']:
            check('clear scene progress/' + scene['id'], not c.get('/api/scenes/' + scene['id']).json()['progress']['viewed'])

    report['summary'] = {'total': len(report['checks']), 'passed': sum(c['passed'] for c in report['checks'])}
    report['summary']['failed'] = report['summary']['total'] - report['summary']['passed']
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'summary': report['summary'], 'failures': [c for c in report['checks'] if not c['passed']]}, ensure_ascii=False))
    raise SystemExit(bool(report['summary']['failed']))


if __name__ == '__main__':
    main()
