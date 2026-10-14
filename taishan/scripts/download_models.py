"""Download public CLIP/BGE ONNX weights and record checksums; resumable files."""
import argparse
import hashlib
import json
import os
import urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--model',choices=['clip','bge','all'],default='all');args=parser.parse_args()
base=os.getenv('MODEL_DOWNLOAD_BASE','https://huggingface.co')
specs={
 'clip':('Xenova/clip-vit-base-patch32','main',['onnx/vision_model_quantized.onnx','onnx/text_model_quantized.onnx','tokenizer.json','preprocessor_config.json','config.json']),
 'bge':('Xenova/bge-small-zh-v1.5','75c43b069aac4d136ba6bc1122f995fedcfd2781',['onnx/model_quantized.onnx','tokenizer.json','config.json'])
}
for kind,(model,revision,files) in specs.items():
 if args.model not in ['all',kind]:continue
 out=ROOT/'models'/kind;out.mkdir(parents=True,exist_ok=True)
 manifest={'model':model,'source':base,'revision':revision,'purpose':'zero-shot baseline, not trained Mount Tai classifier' if kind=='clip' else 'Chinese cultural document retrieval','files':{}}
 for name in files:
    target=out/Path(name).name;part=target.with_suffix(target.suffix+'.part')
    if not target.exists():
        offset=part.stat().st_size if part.exists() else 0
        req=urllib.request.Request(f'{base}/{model}/resolve/{revision}/{name}',headers={'Range':f'bytes={offset}-'} if offset else {})
        print('Downloading',name,flush=True)
        with urllib.request.urlopen(req,timeout=90) as response:
            append=offset>0 and response.status==206
            with part.open('ab' if append else 'wb') as f:
                while chunk:=response.read(1024*1024):f.write(chunk)
        part.replace(target)
    manifest['files'][target.name]={'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
 print('Model files recorded:',out)
