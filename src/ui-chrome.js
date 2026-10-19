// Shared navigation and user-controlled presentation preferences.
const paths = {
  map:'m2 19 7-13 4 7 3-5 6 11M5 14l4-3 3 5 4-4 3 3',
  read:'M5 3h12l3 3v15H5zM8 7h6M8 11h9M8 15h9M8 18h6',
  scenes:'m2 19 6-12 5 8 4-5 5 9zM4 19h17M8 7V3m9 7V6',
  agent:'M8 9a4 4 0 1 1 6 3c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  trail:'M6 3h12v18H6zM9 7h6M9 11h6M9 15h4',
  search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  settings:'M4 12h.01M12 12h.01M20 12h.01',
  close:'m5 5 14 14M19 5 5 19',
  arrow:'M4 12h16m-6-6 6 6-6 6',
  star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  sound:'m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  pin:'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 0 1 14 0M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  monitor:'M3 3h18v14H3zM12 17v4m-5 0h10',
  clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 3',
  person:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3z',
  image:'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.01',
  camera:'M3 6h5l2-3h4l2 3h5v15H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  mic:'M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v4m-4 0h8',
};
export const uiIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.read}"/></svg>`;
export const destinations = [['map','游山'],['read','读山'],['scenes','山境'],['agent','问山'],['trail','手札']];
export function activeDestination(page){return ['scenes','scene'].includes(page)?'scenes':page==='trail'?'trail':['agent','vision'].includes(page)?'agent':['map','routes','review','spot','cableway'].includes(page)?'map':'read';}
export function navMarkup(page='map',mobile=false){
  return `<nav class="${mobile?'ui-bottom-nav':'ui-primary-nav'}" aria-label="${mobile?'底部导航':'主要导航'}">${destinations.map(([id,label])=>`<button type="button" data-ui-nav="${id}" ${activeDestination(page)===id?'aria-current="page"':''}>${uiIcon(id)}<span>${label}</span></button>`).join('')}</nav>`;
}
export const brandMarkup = `<a class="ui-brand" href="#map" aria-label="一山千年·泰山，返回游山">${uiIcon('map')}<span>一山千年 · 泰山</span></a>`;
export const toolsMarkup = `<div class="ui-header-tools"><button type="button" data-ui-action="search" aria-label="搜索景点">${uiIcon('search')}</button><button type="button" data-ui-action="settings" aria-label="更多与设置">${uiIcon('settings')}</button></div>`;
const defaults={autoSpeak:true,captions:true,volume:.8};
export function normalizePreferences(value={}){return {autoSpeak:typeof value?.autoSpeak==='boolean'?value.autoSpeak:true,captions:typeof value?.captions==='boolean'?value.captions:true,volume:typeof value?.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.8};}
export function getPreferences(){try{return normalizePreferences(JSON.parse(localStorage.getItem('taishan-experience')||'{}'));}catch{return {...defaults};}}
export function savePreferences(patch){const value=normalizePreferences({...getPreferences(),...patch});try{localStorage.setItem('taishan-experience',JSON.stringify(value));}catch{/* Preferences still apply for this visit. */}applyPreferences(value);return value;}
export function applyPreferences(value=getPreferences()){
  document.body.classList.toggle('hide-guide-captions',!value.captions);
  document.querySelectorAll('audio,video').forEach(a=>{a.volume=value.volume;});
  const auto=document.querySelector('#guide-autospeak');if(auto)auto.checked=value.autoSpeak;
  dispatchEvent(new CustomEvent('taishan:preferences',{detail:value}));
}
export function updateNavigation(page){document.querySelectorAll('[data-ui-nav]').forEach(b=>{if(b.dataset.uiNav===activeDestination(page))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}

export function installSettings({onNavigate,onTour,onMotion,onFullscreen,onWelcome,getCatalog,onGuideHistory,onGuideVoice,onGuideAvatar,onSoundChoice}){
  const dialog=document.createElement('dialog');dialog.className='ui-settings';dialog.setAttribute('aria-labelledby','settings-title');document.body.append(dialog);
  let previous;
  function close(){dialog.close();previous?.focus({preventScroll:true});}
  function open(){
    previous=document.activeElement;const p=getPreferences();
    dialog.innerHTML=`<header><p>一山千年 · 随心游览</p><h2 id="settings-title">更多与设置</h2><span>个性化你的游览体验</span><button class="ui-settings-close" aria-label="关闭设置">${uiIcon('close')}</button></header><section><h3>体验设置</h3><label>${uiIcon('sound')}<span>回答后自动朗读<small>问山回答后播放真实讲解音频</small></span><input type="checkbox" role="switch" name="autoSpeak" ${p.autoSpeak?'checked':''}></label><label>${uiIcon('read')}<span>显示讲解字幕<small>在数字人旁显示讲解文字</small></span><input type="checkbox" role="switch" name="captions" ${p.captions?'checked':''}></label><label class="ui-volume">${uiIcon('sound')}<span>音量</span><input type="range" name="volume" min="0" max="100" value="${Math.round(p.volume*100)}" aria-label="讲解音量"><output>${Math.round(p.volume*100)}%</output></label></section><section><h3>更多内容</h3>${[['tour','重看游历引导'],['trail','我的游历数据'],['sources','资料与图片来源']].map(([key,label])=>`<button data-setting="${key}">${label}<span>›</span></button>`).join('')}<details class="ui-display-options"><summary>显示与页面选项</summary>${[['motion','切换简化动效'],['fullscreen','切换全屏'],['welcome','返回卷首']].map(([key,label])=>`<button data-setting="${key}">${label}<span>›</span></button>`).join('')}</details></section><button class="ui-solid ui-settings-done">关闭</button><p class="ui-settings-status" role="status"></p>`;
    dialog.querySelector('.ui-settings-close').onclick=dialog.querySelector('.ui-settings-done').onclick=close;
    dialog.querySelectorAll('input').forEach(input=>input.oninput=()=>{const value=savePreferences({[input.name]:input.type==='checkbox'?input.checked:Number(input.value)/100});dialog.querySelector('output').textContent=Math.round(value.volume*100)+'%';dialog.querySelector('[role=status]').textContent='设置已应用';});
    dialog.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{const action=b.dataset.setting;if(action==='motion'){onMotion();dialog.querySelector('[role=status]').textContent='动效已切换';return;}if(action==='fullscreen'){onFullscreen();return;}close();if(action==='tour')onTour();else if(action==='welcome')onWelcome();else if(action==='avatar')onGuideAvatar?.();else if(action==='sound')onSoundChoice?.();else if(action==='history')onGuideHistory?.();else if(action==='voice')onGuideVoice?.();else onNavigate(action);});
    dialog.showModal();
  }
  dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  applyPreferences();return {open};
}
