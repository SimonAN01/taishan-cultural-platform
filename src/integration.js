// The immersive scene keeps its original IDs; API IDs come from the existing catalog.
export const apiSpotId = id => ({ nantianmen: 'nantian', stone: 'yuhuang' }[id] || id);
export const unavailableSpots = new Set(['taoyuan', 'dongtian', 'stone']);
export const fullSite = (view = 'map', spot = null) => `/#${view}${spot ? '?spot=' + encodeURIComponent(apiSpotId(spot)) : ''}`;

export async function requestApi(path, options = {}) {
  const response = await fetch('/api/' + path, {
    credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : '服务暂不可用，请重试');
  return result;
}

export function askApi(message, placeId, placeName, signal) {
  const known = placeId && !unavailableSpots.has(placeId);
  return requestApi('agent/chat', {
    method: 'POST', signal,
    body: JSON.stringify({
      message: !known && placeName ? `${placeName}：${message}` : message,
      current_spot: known ? apiSpotId(placeId) : null,
    }),
  });
}

export function recordVisit(placeId) {
  if (unavailableSpots.has(placeId)) return Promise.resolve(false);
  return requestApi('journey/visit', { method: 'POST', body: JSON.stringify({ spot_id: apiSpotId(placeId) }) });
}
