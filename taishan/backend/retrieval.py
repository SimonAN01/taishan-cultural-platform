"""Small, inspectable Chinese retrieval baseline; no invented facts."""
import math
import re
from collections import Counter

def terms(text):
    text = re.sub(r'[^\w\u4e00-\u9fff]', '', text.lower())
    return Counter(text[i:i+2] for i in range(max(0, len(text)-1)))

def search(catalog, question, spot_id=None, limit=3):
    query = terms(question)
    documents = catalog['knowledge']
    # ponytail: exact scan of a small curated corpus; use a vector index when corpus grows.
    freq = Counter(t for d in documents for t in terms(d['title']+' '+d['content']))
    def weights(words):
        return {t: (1+math.log(n))*(1+math.log((len(documents)+1)/(freq[t]+1))) for t,n in words.items()}
    q = weights(query)
    ranked = []
    for d in documents:
        v = weights(terms(d['title']+' '+d['content']))
        norm = math.sqrt(sum(x*x for x in q.values())*sum(x*x for x in v.values()))
        score = sum(w*v.get(t,0) for t,w in q.items())/norm if norm else 0
        exact = any(k in question for k in d['keywords'] if len(k)>=2)
        if exact: score += .3
        if spot_id in d['spot_ids'] and any(w in question for w in ['这里','这个景点','它','介绍一下','讲解一下']): score += .6
        if score >= .14: ranked.append((score,d))
    ranked.sort(key=lambda x:x[0],reverse=True)
    return [dict(d,relevance=round(s,3)) for s,d in ranked[:limit]]

class SemanticRetriever:
    """Chinese BGE vectors with lexical and exact-entity safeguards."""
    def __init__(self, directory, catalog):
        from pathlib import Path
        import threading
        self.path=Path(directory);self.catalog=catalog;self.lock=threading.Lock();self.model=None;self.failed=False
    def available(self):return not self.failed and (self.path/'model_quantized.onnx').exists() and (self.path/'tokenizer.json').exists()
    def encode(self,texts):
        import numpy as np
        enc=self.tokenizer.encode_batch(texts)
        feeds={'input_ids':np.array([x.ids for x in enc],dtype=np.int64),'attention_mask':np.array([x.attention_mask for x in enc],dtype=np.int64),'token_type_ids':np.array([x.type_ids for x in enc],dtype=np.int64)}
        result=self.model.run(None,{x.name:feeds[x.name] for x in self.model.get_inputs()})[0]
        vectors=result[:,0,:] if result.ndim==3 else result
        return vectors/np.linalg.norm(vectors,axis=1,keepdims=True)
    def load(self):
        import numpy as np
        import onnxruntime as ort
        from tokenizers import Tokenizer
        options=ort.SessionOptions();options.intra_op_num_threads=1;options.inter_op_num_threads=1
        self.model=ort.InferenceSession(str(self.path/'model_quantized.onnx'),options,providers=['CPUExecutionProvider'])
        self.tokenizer=Tokenizer.from_file(str(self.path/'tokenizer.json'));self.tokenizer.enable_truncation(max_length=256);self.tokenizer.enable_padding(length=256,pad_id=0,pad_token='[PAD]')
        texts=[d['title']+'。'+d['content'] for d in self.catalog['knowledge']]
        self.vectors=np.vstack([self.encode(texts[i:i+4]) for i in range(0,len(texts),4)])
    def search(self,question,spot_id=None,limit=3):
        if not self.available():return search(self.catalog,question,spot_id,limit)
        with self.lock:
            try:
                if self.model is None:self.load()
                query=self.encode(['为这个句子生成表示以用于检索相关文章：'+question])
                similarities=(query@self.vectors.T)[0]
            except Exception:
                import logging
                logging.getLogger('taishan').warning('Embedding model failed; using lexical retrieval')
                self.failed=True;self.model=None
                return search(self.catalog,question,spot_id,limit)
        lexical={d['id']:d['relevance'] for d in search(self.catalog,question,spot_id,limit=22)}
        ranked=[]
        for i,d in enumerate(self.catalog['knowledge']):
            cosine=float(similarities[i]);lex=lexical.get(d['id'],0)
            exact=any(k in question for k in d['keywords'] if len(k)>=2)
            context=spot_id in d['spot_ids'] and any(x in question for x in ['这里','这个景点','它','介绍一下','讲解一下'])
            # Similarity threshold is a conservative prototype guard, not calibrated correctness.
            if lex<.14 and cosine<.7:continue
            score=cosine+.35*lex+(.3 if exact else 0)+(.5 if context else 0)
            ranked.append((score,d,cosine))
        ranked.sort(key=lambda x:x[0],reverse=True)
        if ranked:ranked=[entry for entry in ranked if entry[0]>=ranked[0][0]-.35]
        return [dict(d,relevance=round(score,3),semantic_similarity=round(cos,3)) for score,d,cos in ranked[:limit]]
