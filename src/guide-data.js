import { places, routes } from './home-data.js';

export const defaultGuideQuestions = [
  '第一次登泰山，推荐哪条路线？',
  '十八盘为什么叫十八盘？',
  '在哪里看日出更合适？',
  '碧霞元君与泰山有什么关系？',
];

export const placeGuideQuestions = {
  tianjie: ['天街为什么建在山顶？', '从天街还能去哪里？', '这里适合看日落吗？'],
  taoyuan: ['桃花源怎么继续登顶？', '桃花峪线适合什么人？', '索道这一段看什么？'],
  nantianmen: ['南天门有多高？', '穿过南天门后先到哪里？', '十八盘为什么这么陡？'],
  bixia: ['碧霞祠供奉的是谁？', '碧霞元君与泰山有什么关系？', '从这里怎样去玉皇顶？'],
  riguan: ['日观峰几点看日出？', '看日出需要注意什么？', '这里为什么叫日观峰？'],
};

const clean = value => value.toLowerCase().replace(/[，。？！、s]/g, '');
const includesAny = (text, words) => words.some(word => text.includes(word));

export function getGuideGreeting(placeId, verifiedSpot) {
  const place = verifiedSpot || places[placeId === 'nantian' ? 'nantianmen' : placeId];
  if (!place) return '我是碧霞仙子。你可以问我泰山的路线、古迹、诗词与登山故事。选一个问题，我们从这幅山水长卷出发。';
  return `此刻我们来到${place.name}。${place.tag || place.subtitle}。你想先听这里的故事，还是继续问我后面的路线？`;
}

export function getGuideQuestions(placeId, verifiedSpot) {
  const localId = placeId === 'nantian' ? 'nantianmen' : placeId;
  const place = verifiedSpot || places[localId];
  const specific = placeGuideQuestions[localId] || [
    `${place?.name || '这里'}有什么故事？`,
    `从${place?.name || '这里'}怎样继续登顶？`,
  ];
  return [...specific, ...defaultGuideQuestions].slice(0, 4);
}

function routeReply(route) {
  return {
    answer: `${route.name}：${route.description} 首页路线为游览关系示意，交通、索道与开放情况请以景区当日公告为准。`,
    emotion: 'nod', routeId: route.id, routeLabel: `在全景中查看${route.name}`,
  };
}

export function answerGuide(question, placeId) {
  const text = clean(question);
  const place = places[placeId];
  if (!text) return { answer: '你可以问我一处景点、一首诗，或哪条登山路线更适合你。', emotion: 'look' };

  if (includesAny(text, ['第一次', '推荐', '经典', '徒步'])) return routeReply(routes.find(route => route.id === 'hongmen'));
  if (includesAny(text, ['轻松', '省力', '乘车'])) return routeReply(routes.find(route => route.id === 'tianwai'));
  if (includesAny(text, ['桃花峪线', '桃花源怎么', '西线'])) return routeReply(routes.find(route => route.id === 'taohua'));
  if (includesAny(text, ['东御道线', '安静', '古道'])) return routeReply(routes.find(route => route.id === 'dongyu'));
  if (includesAny(text, ['十八盘', '陡'])) return { answer: '十八盘是登临南天门前最陡峭的一段石阶。“十八”常被理解为多段盘道的概称。这里适合放慢速度、少量多次休息，雨雪天气尤其要注意脚下。', emotion: 'nod' };
  if (includesAny(text, ['日出', '日观峰', '几点'])) return { answer: '日观峰是岱顶观日出的代表地点。日出时间随季节和天气变化，建议提前查看当天预报与景区提示，预留从住宿点步行和占位的时间，并带好保暖衣物。', emotion: 'look' };
  if (includesAny(text, ['碧霞', '元君', '供奉'])) return { answer: '碧霞祠是泰山信仰的重要建筑群，民间常称碧霞元君为“泰山奶奶”。这里承载了祈福、还愿与山岳崇拜等文化记忆，也让岱顶不仅有雄奇山景，还有绵延的人间愿望。', emotion: 'bow' };
  if (includesAny(text, ['天街', '山顶', '建在'])) return { answer: '天街位于南天门之后的岱顶游览区。登过陡峭的十八盘，地势在这里稍缓，旅人可以休息、补给，再沿石板路前往碧霞祠、玉皇顶等处。', emotion: 'look' };
  if (includesAny(text, ['索道', '轿厢'])) return { answer: '桃花源索道把西线溪谷与岱顶衔接起来。上行时可俯瞰花岗岩峰林、云海与谷地；运行情况受天气影响，请以当天景区公告为准。', emotion: 'nod' };
  if (includesAny(text, ['南天门', '多高', '海拔'])) return { answer: '南天门位于十八盘尽头，海拔约1460米。穿门后便进入岱顶游览区，可沿天街继续前往碧霞祠、玉皇顶和日观峰。', emotion: 'nod' };
  if (includesAny(text, ['诗', '杜甫', '望岳'])) return { answer: '杜甫《望岳》写下“会当凌绝顶，一览众山小”。它把登泰山从眼前山景写成一种向上抵达、再回望天地的气魄。', emotion: 'bow' };
  if (includesAny(text, ['去哪里', '怎么走', '怎样继续', '登顶'])) {
    const route = routes.find(item => item.nodes.includes(placeId)) || routes[0];
    const index = route.nodes.indexOf(placeId);
    const next = route.nodes.slice(Math.max(0, index + 1), index + 4).map(id => places[id]?.name).filter(Boolean);
    return { answer: place ? `从${place.name}继续前行，可依次关注${next.join('、') || '南天门、天街与玉皇顶'}。地图展示的是主要游览关系，请把实际路况和景区公告作为出行依据。` : route.description, emotion: 'nod', routeId: route.id, routeLabel: `在全景中查看${route.name}` };
  }
  if (place) return { answer: `${place.name}，${place.text} ${place.poem}`, emotion: 'look' };
  return { answer: '泰山的山路把自然、历史与信仰串在一起。你可以直接说出“红门”“十八盘”“天街”“碧霞祠”或“日观峰”，我会从那一处继续讲。', emotion: 'look' };
}
