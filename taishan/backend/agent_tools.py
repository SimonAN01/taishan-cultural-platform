"""Read-only guide tools for intents that do not look like document queries."""
import re

def guide_tools(question,catalog,current_spot=None):
    text=re.sub(r'[\s，。！？?！,.]','',question)
    if re.search(r'你是谁|你叫什么|自我介绍|你能做什么|你可以做什么|你的名字|介绍你自己',text) or text in ['你好','您好','嗨']:
        return [{'id':'guide-identity','title':'文化导览角色说明','content':'我是碧霞仙子，这个泰山文化体验平台的艺术化导览角色。我可以介绍泰山景点和路线、讲解历史文化、解读诗词，也可以协助你查看照片识景候选结果。我不是历史人物或宗教权威。','keywords':[],'spot_ids':[],'source_ids':[],'relevance':1}],['guide_identity']
    named=[s for s in catalog['spots'] if s['name'] in text]
    targets={s['id'] for s in named} or ({current_spot} if current_spot else set())
    scene_docs=[d for d in catalog['knowledge'] if d['id'].startswith('scene-') and targets.intersection(d['spot_ids']) and any(k in text for k in d['keywords'][1:] if len(k)>=2)]
    if scene_docs:return [dict(d,relevance=1) for d in scene_docs[:3]],['get_scene_culture']
    contextual=bool(current_spot and re.search(r'这里|这个景点|它|此处',text))
    specific_routes=[r for r in catalog['routes'] if r['name'].replace('经典','').removesuffix('线') in text]
    if specific_routes and re.search(r'路线|线路|怎么走|怎么去|索道|徒步|乘车',text):
        spots={s['id']:s['name'] for s in catalog['spots']}
        def describe(r):
            variants=r.get('variants') or [{'name':r['type'],'node_sequence':r['node_sequence'],'transport':r.get('transport',[])}]
            return r['description']+'\n'+'\n'.join(v['name']+'：'+' → '.join(spots[i] for i in v['node_sequence'])+'。'+'；'.join(t['label'] for t in v.get('transport',[])) for v in variants)+'\n'+r['notes']
        return [{'id':'tool-route-'+r['id'],'title':r['name'],'content':describe(r),'keywords':[],'spot_ids':r['node_sequence'],'source_ids':r['source_ids'],'relevance':1} for r in specific_routes],['get_route_info']
    if not named and not contextual and re.search(r'(有什么|有哪些|哪些|推荐|介绍|好玩|看什么).*(景点|景色|地方)|景点.*(有哪些|推荐|介绍)|有什么好玩|有什么好看|看哪些',text):
        spots=catalog['spots']
        content='本平台可以探索的泰山文化景点有：'+ '、'.join(s['name'] for s in spots)+'。\n'
        content+='初次探索可沿红门经典线，按红门、万仙楼、斗母宫、中天门、五大夫松、十八盘、南天门、天街、碧霞祠、玉皇顶的顺序浏览；经石峪与日观峰为文化支线。\n'
        content+='十八盘适合感受险峻山势，南天门适合理解门阙与山势，碧霞祠可了解信仰文化，经石峪可看石刻，玉皇顶与日观峰可看山顶景观。你可以点击地图标记或选择路线来查看详情。'
        return [{'id':'tool-spots','title':'景点目录与红门文化游览线','content':content,'keywords':[],'spot_ids':[s['id'] for s in spots],'source_ids':['red','routes','jingshi','unesco'],'relevance':1}],['list_spots','get_route_info']
    if re.search(r'怎么玩|如何游览|怎么游览|路线推荐|推荐路线|哪些路线|几条路线|第一次来|登山路线|哪条路线|哪条线|哪条路',text):
        return [{'id':'tool-route-'+r['id'],'title':r['name'],'content':r['description']+' 游览方式：'+r['type']+'。'+r['notes'],'keywords':[],'spot_ids':r['node_sequence'],'source_ids':r['source_ids'],'relevance':1} for r in catalog['routes']],['list_routes','get_route_info']
    return [],[]
