// Share the visitor's content selection through reloads, links and browser history.
export const culturePages = ['map', 'spot', 'routes', 'history', 'poetry', 'vision', 'agent'];
export const cultureEras = ['先秦', '秦汉', '唐宋', '明清', '近现代'];
export function readCultureLocation(hash) {
  const [page, query] = hash.replace(/^#/, '').split('?');
  if (!culturePages.includes(page)) return null;
  const params = new URLSearchParams(query);
  return {page, id:params.get('id') || '', variant:params.get('variant') || 'walk',
    era:cultureEras.includes(params.get('era')) ? params.get('era') : '先秦',
    tab:['history','poetry','architecture'].includes(params.get('tab')) ? params.get('tab') : 'history',
    photo:Math.max(0, Math.floor(Number(params.get('photo')) || 0))};
}
export function cultureHash(page, state = {}) {
  const params = new URLSearchParams();
  if (['spot','routes','poetry','agent'].includes(page) && state.id) params.set('id',state.id);
  if (page === 'routes' && state.variant && state.variant !== 'walk') params.set('variant',state.variant);
  if (page === 'history' && state.era !== '先秦' && cultureEras.includes(state.era)) params.set('era',state.era);
  if (page === 'spot' && state.tab && state.tab !== 'history') params.set('tab',state.tab);
  if (page === 'spot' && Number.isFinite(state.photo) && state.photo > 0) params.set('photo',state.photo);
  return '#'+page+(params.size ? '?'+params : '');
}
