// Share the visitor's content selection through reloads, links and browser history.
export const culturePages = ['map', 'review', 'read', 'gallery', 'museum', 'sources', 'spot', 'routes', 'history', 'poetry', 'vision', 'agent', 'scenes', 'scene', 'trail', 'study'];
export const cultureEras = ['先秦', '秦汉', '唐宋', '明清', '近现代'];
export function readCultureLocation(hash) {
  const [page, query] = hash.replace(/^#/, '').split('?');
  if (!culturePages.includes(page)) return null;
  const params = new URLSearchParams(query);
  return {page, id:params.get('id') || '', variant:params.get('variant') || 'walk',
    era:cultureEras.includes(params.get('era')) ? params.get('era') : '先秦',
    tab:({trail:['footprints','favorites','stamps','learning'],gallery:['画境','实景'],museum:['original','text','listen']}[page]||['history','poetry','architecture']).includes(params.get('tab')) ? params.get('tab') : ({trail:'footprints',gallery:'画境',museum:'original'}[page]||'history'),
    line:Math.max(0,Math.floor(Number(params.get('line'))||0)),panel:['note','analysis','author'].includes(params.get('panel'))?params.get('panel'):'note',poem:params.get('poem')||'',route:params.get('route')||'',mode:params.get('mode')==='reading'?'reading':'space',chapter:params.get('chapter')||'',point:params.get('point') || '', photo:Math.max(0, Math.floor(Number(params.get('photo')) || 0))};
}
export function cultureHash(page, state = {}) {
  const params = new URLSearchParams();
  if (['spot','routes','poetry','agent','scene','study','history','museum'].includes(page) && state.id) params.set('id',state.id);
  if(page==='agent'){if(state.poem)params.set('poem',state.poem);if(state.route)params.set('route',state.route);}
  if(page==='poetry'){if(Number.isFinite(state.line)&&state.line>0)params.set('line',state.line);if(['analysis','author'].includes(state.panel))params.set('panel',state.panel);}
  if(['spot','poetry'].includes(page)&&state.chapter)params.set('chapter',state.chapter);
  if(page==='scene'&&state.mode==='reading')params.set('mode','reading');
  if (page === 'scene' && state.point) params.set('point',state.point);
  if (page === 'routes' && state.variant && state.variant !== 'walk') params.set('variant',state.variant);
  if (page === 'history' && state.era !== '先秦' && cultureEras.includes(state.era)) params.set('era',state.era);
  if (['spot','trail','gallery','museum'].includes(page) && state.tab && state.tab !== ({trail:'footprints',gallery:'画境',museum:'original'}[page]||'history')) params.set('tab',state.tab);
  if (['spot','museum'].includes(page) && Number.isFinite(state.photo) && state.photo > 0) params.set('photo',state.photo);
  return '#'+page+(params.size ? '?'+params : '');
}
