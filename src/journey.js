export const clamp = (v,min=0,max=1) => Math.max(min,Math.min(max,v));
export function journeyState(progress,count=6){
  const position=clamp(progress)*count;
  const index=Math.min(count-1,Math.floor(position));
  const local=position-index;
  const blend=index<count-1?clamp((local-.77)/.23):0;
  const eased=blend*blend*(3-2*blend);
  return {index,local,blend:eased,displayIndex:eased>.5?index+1:index};
}
export function chapterProgress(index,count=6){return clamp((index+.12)/count);}
export function focusAt(local){return local<.32?'bixia':local<.61?'stone':'yuhuang';}
