// The immersive scene keeps its original IDs; API IDs come from the existing catalog.
export const apiSpotId = id => ({ nantianmen: 'nantian', stone: 'yuhuang' }[id] || id);
export const unavailableSpots = new Set(['taoyuan', 'dongtian', 'stone']);
export const fullSite = (view = 'map', spot = null) => `/experience/#${({spots:'spot','spot-full':'spot',poems:'poetry',journey:'trail',story:'study'})[view]||view}${spot ? '?id=' + encodeURIComponent(apiSpotId(spot)) : ''}`;

export async function requestApi(path, options = {}) {
  const response = await fetch('/api/' + path, {
    credentials: 'same-origin', ...options,
    headers: { ...(options.body instanceof FormData ? {} : {'Content-Type': 'application/json'}), ...options.headers },
    signal: options.signal || AbortSignal.timeout(15000),
  }).catch(error => {
    if(error.name==='TimeoutError')throw new Error('请求超时，请稍后重试。');
    if(error.name==='AbortError')throw error;
    throw new Error('暂时无法连接资料服务，请检查网络后重试。');
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : ({413:'上传内容过大，图片限 8 MB',429:'操作较频繁，请稍后再试',500:'资料服务暂时不可用，请稍后重试。',502:'服务暂不可用，请稍后重试',503:'服务繁忙，请稍后重试'}[response.status] || '服务暂不可用，请重试'));
  if (result === null) throw new Error('服务响应异常，请稍后重试');
  return result;
}

export function askApi(message, placeId, placeName, signal, context = {}) {
  const known = placeId && !unavailableSpots.has(placeId);
  return requestApi('agent/chat', {
    method: 'POST', signal,
    body: JSON.stringify({
      message: !known && placeName ? `${placeName}：${message}` : message,
      current_spot: known ? apiSpotId(placeId) : null,
      ...(context.poem ? {current_poem:context.poem} : {}),
      ...(context.route ? {current_route:context.route} : {}),
    }),
  });
}

export function recordVisit(placeId) {
  if (unavailableSpots.has(placeId)) return Promise.resolve(false);
  return requestApi('journey/visit', { method: 'POST', body: JSON.stringify({ spot_id: apiSpotId(placeId) }) });
}
