export const source = {
  routeGuide: 'https://whlyj.taian.gov.cn/art/2026/4/13/art_366342_10312047.html',
  nantianmen: 'https://tsgw.taian.gov.cn/art/2026/3/23/art_363608_10320983.html',
  note: '景点与路线依据实景导览图重新校准；画面仍为艺术化示意，开放、交通与索道运行以景区当日公告为准。',
};

export const places = {
  hongmen: {
    name: '红门', x: 44.4, y: 73.2, level: 'primary', asset: 'H-ND-01',
    scene: { width: 9.4, z: -55, opacity: .86 }, focus: { zoom: 1.55, duration: 1.15 }, immersive: true,
    tag: '山麓 · 旅程的起笔', text: '循石阶入山，听松风渐近。从红门出发，沿经典登山线走向中天门，再向十八盘与岱顶前行。', poem: '岱宗夫如何？齐鲁青未了。',
  },
  zhongtian: {
    name: '中天门', x: 48.1, y: 59.4, level: 'secondary', asset: 'H-ND-02',
    scene: { width: 8.2, z: -54, opacity: .8 }, focus: { zoom: 1.65, duration: 1.2 }, immersive: true,
    tag: '半山 · 来路在此交汇', text: '红门徒步线、天外村乘车线与东御道在中天门衔接。由这里继续步行向上，也可以选择索道前往岱顶。', poem: '造化钟神秀，阴阳割昏晓。',
  },
  shibapan: {
    name: '十八盘', x: 50.2, y: 48.7, level: 'secondary', asset: 'H-ND-03',
    scene: { width: 5.1, z: -53, opacity: .78 }, focus: { zoom: 1.8, duration: 1.3 }, immersive: true,
    tag: '登阶 · 一步一重山', text: '循着石阶仰望，南天门在山口显现。画卷把这段向上的旅程压缩在山体中；真正的登山，要把节奏交给自己的脚步。', poem: '荡胸生曾云，决眦入归鸟。',
  },
  nantianmen: {
    name: '南天门', x: 52.6, y: 37.4, level: 'primary', asset: 'H-ND-04',
    scene: { width: 9.2, z: -52, opacity: .94 }, focus: { zoom: 2.08, duration: 1.55 }, immersive: true,
    tag: '天门 · 由此入云', text: '越过十八盘，进入南天门。从这里开始，登阶的节奏渐渐转换为山顶漫游，沿天街继续探索岱顶。', poem: '会当凌绝顶，一览众山小。',
  },
  tianjie: {
    name: '天街', x: 54.2, y: 31.5, level: 'secondary', asset: 'H-ND-05-gate',
    mapIcon: { asset: 'H-ND-05-gate', width: 58 },
    scene: { width: 7.6, z: -51, opacity: .82 }, focus: { zoom: 1.85, duration: 1.35 }, immersive: true,
    tag: '岱顶 · 云上漫步', text: '南天门之后，沿天街向碧霞祠一带游览。在山巅放慢脚步，让建筑、石刻与远山依次进入视野。', poem: '山河未改，来者不同。',
  },
  bixia: {
    name: '碧霞祠', x: 56.2, y: 23, level: 'secondary', asset: 'H-ND-06',
    scene: { width: 7.1, z: -51, opacity: .77 }, focus: { zoom: 1.9, duration: 1.4 }, immersive: true,
    tag: '古建 · 山巅的人间香火', text: '沿天街来到碧霞祠，在殿宇之间感受泰山的信仰文化。首页原型以插画表达其文化位置，建筑细节尚待实景校准。', poem: '一座山，也收留人间的心愿。',
  },
  stone: {
    name: '五岳独尊', x: 62.4, y: 24.8, level: 'secondary', asset: 'H-ND-08',
    scene: { width: 3.9, z: -49, opacity: .74 }, focus: { zoom: 2, duration: 1.4 }, immersive: true,
    tag: '石刻 · 岁月留在山上', text: '山石承载文字，文字留下人们与泰山的相遇。点击画中的题刻，读一处岩面，也读一段山岳记忆。', poem: '千年风雨，石上有声。',
  },
  yuhuang: {
    name: '玉皇顶', x: 51.4, y: 15.3, level: 'primary', asset: 'H-ND-07',
    scene: { width: 6.3, z: -50, opacity: .9 }, focus: { zoom: 1.9, duration: 1.4 }, immersive: true,
    tag: '极顶 · 与群山相望', text: '沿岱顶继续走向玉皇顶，回望山路与层叠群峰。这里是这幅登山长卷的高点，也是重新观看来路的地方。', poem: '会当凌绝顶，一览众山小。',
  },
  riguan: {
    name: '日观峰', x: 78.3, y: 30, level: 'primary', asset: 'H-ND-09',
    scene: { width: 8.1, z: -48, opacity: .82 }, focus: { zoom: 1.78, duration: 1.35 }, immersive: true,
    tag: '晨光 · 等一场日出', text: '把旅程留给山巅的第一缕晨光。原型中的日出为意境演绎，实际观日条件请以天气和景区安排为准。', poem: '天光渐明，群山有了新的颜色。',
  },
  tianwai: {
    name: '天外村', x: 23.3, y: 84.5, level: 'travel', asset: 'H-ND-10',
    scene: { width: 8.6, z: -45, opacity: .7 }, focus: { zoom: 1.55, duration: 1.15 }, immersive: true,
    tag: '西麓 · 乘车入山', text: '天外村线路先乘景区交通车至中天门，再选择步行或换乘索道登顶。具体交通安排以景区公告为准。', poem: '把目光交给沿途山色。',
  },
  taohua: {
    name: '桃花峪', x: 18.2, y: 63.7, level: 'travel', asset: 'H-ND-11',
    scene: { width: 8.7, z: -44, opacity: .68 }, focus: { zoom: 1.55, duration: 1.15 }, immersive: true,
    tag: '西线 · 沿山水而行', text: '从桃花峪游客中心进入西线，经桃花源换乘索道前往岱顶。这条线在画面左翼展开，与中央的红门古道相呼应。', poem: '溪声与山色，一路相随。',
  },
  taoyuan: {
    name: '桃花源', x: 37.1, y: 38, level: 'travel', asset: 'H-ND-13-station',
    mapIcon: { asset: 'H-ND-13-station', width: 96 },
    scene: { width: 8.7, z: -47, opacity: .78 }, focus: { zoom: 1.72, duration: 1.25 }, immersive: true,
    tag: '换乘 · 索道入云', text: '桃花峪线路的交通换乘节点。首页虚线表示桃花源索道示意，具体位置与距离并非测绘结果。', poem: '山外有山，云上有路。',
  },
  dongyu: {
    name: '东御道', x: 96, y: 62.5, level: 'travel', labelSide: 'left', asset: 'H-ND-12',
    scene: { width: 8.5, z: -43, opacity: .65 }, focus: { zoom: 1.5, duration: 1.1 }, immersive: true,
    tag: '东麓 · 古道慢行', text: '从东御道入山，沿东侧山脊经过东天门一带，向日观峰、五岳独尊与岱顶方向前行。原型按实景导览图重绘主要节点关系。', poem: '循一条古道，遇见另一面泰山。',
  },
  dongtian: { asset:'dongtian-gate', immersive:true, focus:{zoom:1.6,duration:1.2}, scene:{width:7.2,z:-40,opacity:.78}, name: '东天门', x: 86.6, y: 48.7, level: 'travel', labelSide: 'left', mapIcon: { asset: 'H-ND-14', width: 62 }, tag: '东侧 · 古道节点', text: '东御道沿线的重要节点之一，继续向上可沿东侧山脊前往日观峰与岱顶区域。图中的连接线表达游览关系，不提供定位导航。', poem: '山路有回转，风景各不同。' },
};

const summit = ['nantianmen', 'tianjie', 'bixia', 'stone', 'yuhuang', 'riguan'];
export const routes = [
  { id: 'hongmen', name: '红门线', en: 'THE CLASSIC ASCENT', color: '#934f43', kind: '徒步', tag: '沿古道，读千年', description: '从红门沿中央古道拾级而上，经中天门、十八盘抵达南天门，再进入岱顶。', nodes: ['hongmen', 'zhongtian', 'shibapan', ...summit], segments: [{ type: 'walk', points: [[44.4,73.2],[45.1,69],[46.3,65],[47.4,61.5],[48.1,59.4],[48.4,54],[50.2,48.7],[50.8,44],[51.6,40],[52.6,37.4]] }] },
  { id: 'tianwai', name: '天外村线', en: 'A GENTLER APPROACH', color: '#b49357', kind: '乘车＋索道', tag: '乘车入山，云间换乘', description: '从西南侧天外村乘景区交通车至中天门，再选择索道或徒步前往南天门与岱顶。图中点划线为乘车段，虚线为索道段。', nodes: ['tianwai', 'zhongtian', ...summit], segments: [{ type: 'bus', label: '景区车', points: [[23.3,84.5],[23.8,78],[28,72],[30.5,66],[36,62],[42,60],[48.1,59.4]] }, { type: 'cable', label: '中天门索道', points: [[48.1,59.4],[47.4,54],[48,49],[49.2,45],[52.6,37.4]] }] },
  { id: 'taohua', name: '桃花峪线', en: 'THROUGH THE WESTERN VALLEY', color: '#8a809b', kind: '乘车＋索道', tag: '循溪而行，西望群山', description: '从西侧桃花峪沿彩石溪方向进入桃花源，再换乘索道直达岱顶区域。沿线交通与开放信息请查看景区公告。', nodes: ['taohua', 'taoyuan', ...summit], segments: [{ type: 'bus', label: '景区车', points: [[18.2,63.7],[20.5,59],[19.4,55],[22.8,51],[21.8,47],[25.5,44],[29.4,41],[33,39],[37.1,38]] }, { type: 'cable', label: '桃花源索道', points: [[37.1,38],[41,32],[44.5,26],[48,20],[51.4,15.3]] }] },
  { id: 'dongyu', name: '东御道线', en: 'THE EASTERN ANCIENT PATH', color: '#ad7654', kind: '徒步', tag: '东侧古道，山林慢游', description: '由东御道进入，沿右侧山脊经过东天门一带，连接日观峰、五岳独尊与岱顶区域。', nodes: ['dongyu', 'dongtian', 'riguan', 'stone', 'bixia', 'tianjie', 'nantianmen', 'yuhuang'], segments: [{ type: 'walk', points: [[96,62.5],[94.4,59],[92.8,55],[90.6,52],[86.6,48.7],[83.5,42.5],[81.8,37],[78.3,30],[73,28.5],[68.5,27.3],[62.4,24.8],[58.5,23.5],[56.2,23]] }] },
];

export const summitPaths = [
  [[52.6,37.4],[53.2,34.5],[54.2,31.5],[54.8,28],[56.2,23],[54.5,19],[51.4,15.3]],
  [[56.2,23],[59.3,24],[62.4,24.8],[68.5,27.3],[73,28.5],[78.3,30]],
];
