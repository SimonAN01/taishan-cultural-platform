"""Actual CPU CLIP inference; outputs similarity, never calibrated confidence."""
import threading
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

NEGATIVES = ['a pet cat or dog indoors','a person taking a selfie indoors','food on a restaurant table','a modern city building or a car','a computer screenshot with text','a beach and ocean','a snowy mountain far from any Chinese temple']
class Vision:
    def __init__(self, directory, spots):
        self.directory=Path(directory); self.spots=spots; self.lock=threading.Lock(); self.image_model=None
    def available(self):
        return all((self.directory/f).is_file() for f in ['vision_model_quantized.onnx','text_model_quantized.onnx','tokenizer.json'])
    def load(self):
        import onnxruntime as ort
        from tokenizers import Tokenizer
        options=ort.SessionOptions(); options.intra_op_num_threads=2; options.inter_op_num_threads=1
        self.image_model=ort.InferenceSession(str(self.directory/'vision_model_quantized.onnx'),options,providers=['CPUExecutionProvider'])
        tm=ort.InferenceSession(str(self.directory/'text_model_quantized.onnx'),options,providers=['CPUExecutionProvider'])
        tok=Tokenizer.from_file(str(self.directory/'tokenizer.json'))
        tok.enable_truncation(max_length=77); tok.enable_padding(length=77,pad_id=49407,pad_token='<|endoftext|>')
        texts=[s['vision_prompt'] for s in self.spots]+NEGATIVES
        enc=tok.encode_batch(['a photo of '+x for x in texts])
        values={'input_ids':np.array([x.ids for x in enc],dtype=np.int64),'attention_mask':np.array([x.attention_mask for x in enc],dtype=np.int64)}
        self.embeddings=tm.run(None,{i.name:values[i.name] for i in tm.get_inputs()})[0]
        self.embeddings/=np.linalg.norm(self.embeddings,axis=-1,keepdims=True)
        del tm
    def recognize(self, image):
        with self.lock:
            if self.image_model is None:self.load()
            image=ImageOps.exif_transpose(image).convert('RGB')
            w,h=image.size; scale=224/min(w,h)
            image=image.resize((round(w*scale),round(h*scale)),Image.Resampling.BICUBIC)
            w,h=image.size; image=image.crop(((w-224)//2,(h-224)//2,(w+224)//2,(h+224)//2))
            pixels=np.asarray(image,dtype=np.float32)/255
            pixels=(pixels-np.array([.48145466,.4578275,.40821073],dtype=np.float32))/np.array([.26862954,.26130258,.27577711],dtype=np.float32)
            pixels=np.transpose(pixels,(2,0,1))[None]
            emb=self.image_model.run(None,{'pixel_values':pixels})[0]
            emb/=np.linalg.norm(emb,axis=-1,keepdims=True)
            scores=(emb@self.embeddings.T)[0]
            best_negative=float(max(scores[len(self.spots):])); indices=np.argsort(scores[:len(self.spots)])[::-1][:3]
            best=float(scores[indices[0]]); margin=best-float(scores[indices[1]])
            # Uncalibrated baseline: every candidate still requires user confirmation.
            unknown=best<.22 or best_negative>=best-.015
            return {'model_version':'CLIP ViT-B/32 · ONNX int8 · zero-shot','method':'zero-shot','status':'unknown' if unknown else 'needs_confirmation','confidence':None,'score_type':'cosine_similarity','candidates':[] if unknown else [{'spot_id':self.spots[i]['id'],'name':self.spots[i]['name'],'similarity':round(float(scores[i]),4)} for i in indices],'margin':round(margin,4),'message':'暂时无法确认是泰山景点，请换一张包含完整地标的照片，或手动浏览景点。' if unknown else '已找到视觉相近的景点，请对照名称人工确认。相似度不代表识别准确率。'}
