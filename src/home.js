import * as THREE from 'three';
import { gsap } from 'gsap';
import { places, routes, summitPaths, source } from './home-data.js';
import { getGuideGreeting, getGuideQuestions } from './guide-data.js';
import './home.css';
import { createCulturalPages } from './cultural-pages.js';
import { installPanoramaControls } from './panorama-controls.js';
import { createVoicePipeline } from './voice-pipeline.js';
import {images as artImages, imageById, artUrl, openArtGallery} from './art-gallery.js';
import { requestApi, askApi, recordVisit, apiSpotId, unavailableSpots, fullSite } from './integration.js';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog = null;
const catalogReady = requestApi('catalog').catch(() => null);
// A direct guide visit should start its small model before hidden map imagery.
if (location.hash.split('?')[0] === '#agent') {
  const preload = document.createElement('link');
  preload.rel = 'preload'; preload.as = 'fetch'; preload.crossOrigin = 'anonymous';
  preload.href = import.meta.env.BASE_URL + 'models/princess-agent-web-v2.glb';
  preload.fetchPriority = 'high'; document.head.append(preload);
}



const asset = id => artUrl(id === 'H-BG-01' ? 'map-cover' : id) || `${import.meta.env.BASE_URL}home-assets/${id}.webp`;
const icon = name => ({ motion: '◌', fullscreen: '⛶', sun: '☼', back: '↶' }[name]);
const app = document.querySelector('#app');
document.body.classList.add('welcome-open');

app.innerHTML = `
 <section class="welcome-scene" id="welcome-scene" aria-labelledby="welcome-title">
  <h1 class="sr-only" id="welcome-title">一山千年 · 泰山文化沉浸式体验</h1>
  <div class="welcome-cover" role="img" aria-label="一山千年·泰山文化沉浸式体验欢迎画卷，碧霞仙子伸手邀请游客入山"></div>
  <button class="welcome-skip" id="welcome-skip">跳过动画，直接入山</button><div class="welcome-entry"><button id="welcome-enter" type="button"><span>启卷入山</span><i aria-hidden="true">→</i></button></div>
 </section>
 <main class="home" id="journey" aria-hidden="true" inert>
  <div class="map-scroll" aria-label="泰山全景，点击地标探索"><div class="map-stage">
   <img class="map-fallback" src="${asset('H-BG-01')}" alt="浅绛水墨绘制的泰山群峰全景">
   <canvas id="landscape" aria-hidden="true"></canvas>
   <div class="sun-glow" aria-hidden="true"></div>
   <div class="focus-veil" aria-hidden="true"></div>
   <div class="map-overlay"><svg class="paths" viewBox="0 0 1000 562.5" aria-label="四条登山路线示意"></svg><div class="landmark-icons" aria-hidden="true"></div><img class="landmark-spotlight" alt="" aria-hidden="true"><div class="landmarks"></div></div>
  </div></div>
  <div class="paper-shade" aria-hidden="true"></div>
  <header class="topbar"><div class="brand-cluster"><a href="#journey" class="tiny-brand" aria-label="回到泰山全景"><span class="seal">岱</span>山河未改 · 来者不同</a><button class="welcome-return" id="welcome-return" type="button" title="返回欢迎页"><span aria-hidden="true">↶</span>返回卷首</button></div>
   <nav aria-label="探索内容"><button data-explore="overview" class="current">山水</button><span>／</span><button data-explore="culture">历史</button><span>／</span><button data-explore="poem">诗词</button><span>／</span><button data-explore="travel">路线</button><span>／</span><button data-explore="guide">问山</button><span>／</span><button data-explore="art">图集</button><span>／</span><button data-explore="vision">识景</button></nav>
   <div class="tools"><a class="full-system-link" href="/">完整导览 ↗</a><button id="motion" aria-pressed="false" title="简化动效">${icon('motion')}<span>动效</span></button><button id="fullscreen" title="切换全屏">${icon('fullscreen')}<span>全屏</span></button></div>
  </header>
  <div class="side-script" aria-hidden="true">五岳之首 · 中华泰山<span class="small-seal">山河</span></div>
  <section class="hero" aria-labelledby="title"><p class="eyebrow">A JOURNEY THROUGH TIME</p>
   <h1 id="title">一山千年<span class="title-seal" aria-hidden="true">泰<br>山</span><small>泰 山</small></h1>
   <p class="subtitle">沿一条山路，走过千年泰山。</p>
   <p class="mode-question">你想先读懂这座山，还是先走进这座山？</p>
   <div class="mode-guide" aria-hidden="true"><span>第 1 步</span><b>选择一种方式开始</b><i>↓</i></div>
   <div class="mode-buttons"><button class="mode" data-mode="culture" aria-pressed="false"><b>循迹千年 <span>↗</span></b><small>从朝代、人物与诗词中认识泰山</small></button><button class="mode" data-mode="travel" aria-pressed="false"><b>今日登山 <span>↗</span></b><small>从路线、索道与景点中规划登山</small></button></div>
   <p class="mode-caption">点击一种方式开始，也可以随时切换。</p>
  </section>
  <aside class="poem"><p>会当凌绝顶，<br>一览众山小。</p><span>—— 杜甫《望岳》</span><button id="sunrise" aria-pressed="false">${icon('sun')} 等一场日出</button></aside>
  <section class="route-selector" aria-labelledby="route-title"><div class="route-guide" id="route-guide"><span>第 2 步</span><b id="route-guide-copy">选择一条登山路线</b><i aria-hidden="true">↓</i></div><div class="route-heading"><span class="mini-line"></span><h2 id="route-title">红门古道</h2><small>四径同归</small></div>
   <div class="route-buttons">${routes.map((r, i) => `<button data-route="${r.id}" style="--route-color:${r.color}" aria-pressed="${i === 0}"><i></i><span>${r.name}</span><small>${r.kind}</small><b>↗</b></button>`).join('')}</div>
   <div class="route-brief"><p id="route-tag"></p><button id="route-detail">查看路线 <span>→</span></button></div>
   <div class="line-legend"><span><i></i>步行</span><span><i class="bus"></i>乘车</span><span><i class="cable"></i>索道</span></div>
  </section>
  <button class="guide-orb" id="guide-orb" aria-label="唤出碧霞仙子数字导游"><span class="guide-orb-image"><img src="${import.meta.env.BASE_URL}home-assets/bixia-guide.png" alt=""></span><span><b>问山</b><small>数字导游</small></span></button>
  <footer class="bottom-bar"><button id="reset">${icon('back')} 返回全景</button><p class="map-action-guide"><span class="map-guide-arrow" aria-hidden="true">↑</span><span><b id="map-guide-title">也可以直接点击山中地标</b><small id="map-guide-copy">走近建筑，查看故事与诗词</small></span><span class="mobile-hint">左右滑动画卷 · 点击地标</span></p><span class="map-note">艺术化路线示意 · 非导航地图</span></footer>
  <div class="journey-meter" aria-hidden="true"><span></span></div>
  </main>
  <section class="mode-confirm" id="mode-confirm" role="dialog" aria-modal="true" aria-labelledby="mode-confirm-title" aria-describedby="mode-confirm-copy" aria-hidden="true" inert>
   <div class="mode-confirm-wash" aria-hidden="true"></div>
   <div class="mode-confirm-card">
    <p class="mode-confirm-eyebrow" id="mode-confirm-eyebrow">A WAY TO READ TAISHAN</p>
    <span class="mode-confirm-mark" aria-hidden="true">山</span>
    <h2 id="mode-confirm-title">循迹千年</h2>
    <p class="mode-confirm-copy" id="mode-confirm-copy">沿着朝代、人物与诗词的线索，重新认识这座山。</p>
    <p class="mode-confirm-hint" id="mode-confirm-hint">点击山中的文化节点查看近景，或从上方“史”阅读有来源的时间轴。</p>
    <div class="mode-confirm-actions"><button class="mode-confirm-back" id="mode-confirm-back">返回</button><button class="mode-confirm-enter" id="mode-confirm-enter">进入千年泰山 <span>→</span></button></div>
   </div>
  </section>
 <section class="visit-scene" id="visit-scene" aria-label="景点近景" aria-hidden="true" inert data-depth="near" data-kind="building">
  <div class="visit-visual">
   <div class="visit-backdrop"></div><div class="visit-inside-backdrop" hidden></div><img class="visit-platform" alt=""><img class="visit-stairs" alt=""><img class="visit-gate" alt=""><img class="visit-accent" alt=""><img class="visit-cloud visit-cloud-one" src="${asset('H-BG-04')}" alt=""><img class="visit-cloud visit-cloud-two" src="${asset('H-BG-06')}" alt="">
   <div class="visit-title"><small>TAISHAN · SCENIC PLACE</small><h2>泰山</h2><p>沿山路，走进一处风景。</p></div>
   <button class="visit-enter" id="visit-enter" aria-pressed="false" hidden>走进南天门 <span>↗</span></button>
   <span class="visit-art-note">近景概念画面 · 后续可替换实景素材</span>
  </div>
  <aside class="visit-info"><button class="visit-back" id="visit-back">← 返回泰山全景</button><p class="visit-eyebrow">一山千年 · 山中一处</p><h2 id="visit-info-title">走近泰山</h2><p class="visit-intro">选一则故事，继续走进山中。</p>
   <div class="visit-tabs" role="tablist" aria-label="景点介绍"><button role="tab" id="visit-tab-history" aria-controls="visit-panel" aria-selected="true" data-visit-tab="history">历史</button><button role="tab" id="visit-tab-story" aria-controls="visit-panel" aria-selected="false" tabindex="-1" data-visit-tab="story">故事</button><button role="tab" id="visit-tab-poetry" aria-controls="visit-panel" aria-selected="false" tabindex="-1" data-visit-tab="poetry">诗词</button></div>
   <div class="visit-panel" id="visit-panel" role="tabpanel" aria-labelledby="visit-tab-history" tabindex="0"></div>
    <button class="visit-cable3d" id="visit-cable3d" hidden><span><b>进入 3D 索道</b><small>乘缆车穿过云海，拖动观察山中视角</small></span><i>进入体验 →</i></button>
    <button class="visit-guide" id="visit-guide"><img src="${import.meta.env.BASE_URL}home-assets/bixia-guide.png" alt=""><span><b>请仙子讲解此处</b><small>带着当前景点进入数字人讲解</small></span><i>→</i></button>
   <div class="visit-source">文字参考：<a href="${source.routeGuide}" target="_blank" rel="noopener noreferrer">泰山官方游览资料 ↗</a></div>
  </aside>
 </section>
 <section class="cableway-scene" id="cableway-scene" aria-label="桃花源索道三维入山体验" aria-hidden="true" inert>
  <div class="cableway-backdrop" aria-hidden="true"></div>
  <div class="cableway-model" id="cableway-model"><div class="cableway-loading"><i></i><p>正在载入索道与云海</p></div></div>
  <div class="cableway-cloud cableway-cloud-a" aria-hidden="true"></div><div class="cableway-cloud cableway-cloud-b" aria-hidden="true"></div>
  <header class="cableway-header"><div><small>TAOHUAYUAN · CABLEWAY</small><h2>乘云入山</h2><p>艺术化三维演绎，不代表实时位置或索道运行状态。</p></div><button id="cableway-close" aria-label="返回桃花源">×</button></header>
  <div class="cableway-depth" aria-hidden="true"><span></span></div>
  <div class="cableway-hud"><p id="cableway-status">模型载入中</p><div><button id="cableway-ride" aria-pressed="true">Ⅱ 暂停行进</button><button id="cableway-reset">◎ 复位视角</button></div><small>按住拖动旋转 · 滚轮拉近 · 观察缆车与群峰</small></div>
 </section>
 <section class="guide-scene" id="guide-scene" aria-label="碧霞仙子数字导游" aria-hidden="true" inert>
  <div class="guide-visual">
   <div class="guide-mist" aria-hidden="true"></div>
   <div class="guide-model" id="guide-model"><div class="guide-loading" role="status"><span></span><p>正在加载三维形象…</p><button type="button" id="guide-model-retry" hidden>重新加载三维形象</button></div></div>
   <img class="guide-fallback" src="${import.meta.env.BASE_URL}home-assets/bixia-guide.png" alt="碧霞仙子数字导游立绘">
   <div class="guide-identity"><small>DIGITAL GUIDE · TAISHAN</small><h2>碧霞仙子</h2><p>以山中故事，为你引路。</p></div>
    <div class="guide-gestures" aria-label="数字人动作"><button data-gesture="nod" disabled>点头</button><button data-gesture="bow" disabled>作揖</button><button data-gesture="look" disabled>远望</button><span class="guide-rotate-hint">按住人物拖动旋转</span></div>
  </div>
  <div class="guide-conversation">
   <header><div><p>一山千年 · 数字人讲解</p><h2>问山</h2></div><button class="guide-close" id="guide-close" aria-label="关闭数字导游">×</button></header><div class="guide-scroll">
   <p class="guide-context" id="guide-context">正在从泰山全景为你讲解</p>
   <div class="guide-answer" id="guide-answer" aria-live="polite"><span class="guide-speaker">碧霞仙子</span><p></p><button class="guide-route-link" id="guide-route-link" hidden></button></div>
   <div class="guide-status" id="guide-status" role="status"><i></i><span>可以开始提问</span></div>
   <div id="guide-sources" class="guide-sources"></div><div class="guide-questions" id="guide-questions" aria-label="推荐问题"></div>
   <form class="guide-form" id="guide-form"><label for="guide-input">还想知道什么？</label><div><input id="guide-input" maxlength="800" autocomplete="off" placeholder="例如：第一次登泰山走哪条路？"><button type="submit">请讲解</button></div></form>
   <div class="guide-voice-input" id="guide-voice-input"></div><div class="guide-request-controls"><button id="guide-cancel" hidden>停止等待</button><button id="guide-retry" hidden>重试上个问题</button><button id="guide-clear">清空对话</button></div><details class="guide-transcript"><summary>本次会话记录</summary><div class="guide-transcript-log" id="guide-transcript-log"><p>尚无提问。</p></div></details><div class="guide-controls"><button id="guide-replay">◉ 再听一遍</button><button id="guide-stop">□ 停止朗读</button><span id="guide-voice-label">云端 TTS：晓晓 · 实际音频驱动口型</span></div>
  </div></div>
 </section>
 <div class="scroll-space" aria-hidden="true"></div>
 <dialog class="detail-dialog" aria-labelledby="detail-title"><button class="close" aria-label="关闭介绍">×</button><div class="dialog-content"></div></dialog>
 <div class="status" role="status" aria-live="polite"></div>
`;

let selected = 'hongmen';
const appState = {
  mode: null,
  phase: 'overview',
  pendingMode: null,
  selectedRoute: 'hongmen',
  selectedPlace: null,
  selectedDynasty: null,
  guideCompleted: false,
  agentOpen: false,
};
let mode = null;
let simple = matchMedia('(prefers-reduced-motion: reduce)').matches;
let sunrise = false;
let sunriseStart = 0;
let hoverRoute = null;
let targetMouse = { x: 0, y: 0 };
let scrollFraction = 0;
let previousFocus;
let focusTimeline;
const focusState = { active: false, id: null, artBoost: 0 };
const focusRig = { x: 0, y: 0, z: 40, fov: 26 };
const focusFx = { fog: 0, shift: 0 };

const dialog = document.querySelector('dialog');
const content = dialog.querySelector('.dialog-content');
const overlay = document.querySelector('.map-overlay');
const paths = document.querySelector('.paths');
const nodeWrap = document.querySelector('.landmarks');
const iconWrap = document.querySelector('.landmark-icons');
const stage = document.querySelector('.map-stage');
let panoramaControls;
const spotlight = document.querySelector('.landmark-spotlight');
const welcomeScene = document.querySelector('#welcome-scene');
const welcomeEnter = document.querySelector('#welcome-enter');
const welcomeReturn = document.querySelector('#welcome-return');
const homeScene = document.querySelector('.home');
const visitScene = document.querySelector('#visit-scene');
const visitPanel = document.querySelector('#visit-panel');
const visitEnter = document.querySelector('#visit-enter');
const visitCable3d = document.querySelector('#visit-cable3d');
const cablewayScene = document.querySelector('#cableway-scene');
const cablewayModel = document.querySelector('#cableway-model');
const modeConfirm = document.querySelector('#mode-confirm');
const guideScene = document.querySelector('#guide-scene');
const guideModel = document.querySelector('#guide-model');
const guideAnswer = document.querySelector('#guide-answer p');
const guideQuestions = document.querySelector('#guide-questions');
const guideRouteLink = document.querySelector('#guide-route-link');
const guideStatus = document.querySelector('#guide-status');
let visitReturnFocus;
let activeVisitId = 'nantianmen';
let visitCopy = {};
let guideAvatar;
let guideAvatarPromise;
let guidePreviousFocus;
let guideContextId = null;
let guideLastAnswer = '';
let guideController;
let guideRequest = 0;
let guideBusy = false;
let guideUtterance;
let guideSpeechRequest = 0;
let cablewayController;
let cablewayControllerPromise;
let cablewayPreviousFocus;
let cablewayRiding = true;
let modeConfirmPreviousFocus;
const visitProfiles = {
  hongmen: { kind: 'building', en: 'THE FIRST GATE', subtitle: '古道从这里起笔。', panelTitle: '从红门入山', intro: '收起山下的喧闹，从第一重山门开始，把脚步交给石阶。', historyTitle: '泰山古道的起点', storyTitle: '推门，入山', story: '山路在红墙与石阶之间向上延伸。初登泰山的人从这里调整呼吸，远处的岱顶还藏在云里，一场漫长的登临刚刚开始。', support: 'H-NT-01', bg: '45% 62%' },
  zhongtian: { kind: 'building', en: 'HALFWAY UP', subtitle: '几条山路在半山相逢。', panelTitle: '山腰的交汇处', intro: '走到中天门，徒步、乘车与索道的旅程在这里重新选择方向。', historyTitle: '承上启下的中天门', storyTitle: '在半山回望', story: '走到这里，山脚已经隐入云雾，山顶仍在更高处。人们稍作停歇，再决定沿石阶继续向上，或换一种方式接近岱顶。', support: 'H-NT-04', bg: '51% 55%' },
  shibapan: { kind: 'path', en: 'THE STEEPEST ASCENT', subtitle: '一步一阶，直上天门。', panelTitle: '仰望十八盘', intro: '石阶在峰壁间收紧，抬头只能看见更高处的山门。', historyTitle: '登顶前的陡峭石阶', storyTitle: '把路交给脚步', story: '越向上，石阶越像一条悬在山间的线。风声、呼吸声与脚步声交叠，南天门时而出现，时而又被云雾遮住。', support: 'H-NT-04', bg: '52% 49%' },
  nantianmen: { kind: 'building', en: 'TAISHAN · 1460 M', subtitle: '越过十八盘，步入天上街市。', panelTitle: '登临南天门', intro: '云路至此豁然开朗。选一则故事，继续走进这座山门。', historyTitle: '十八盘尽头的天门', history: '南天门位于十八盘尽头，又称三天门，海拔约 1460 米。现存山门始建于元代中统元年（1260），由道士张志纯筹资营建。门洞以石砌成，上建摩空阁。', storyTitle: '云开时，门在天际', story: '仰望十八盘，石阶像悬在峰壁上的长梯。登到尽头，南天门有时隐入云雾，有时又从云里显现。穿门而过，回望漫长的来路，登高的分量才变得真切。', support: 'H-ND-03', platform: 'H-BG-11', bg: '54% 38%', source: source.nantianmen, inside: { enterLabel: '走进南天门', exitLabel: '返回门前', title: '天街', subtitle: '山门在身后，云上的路在眼前。', panelTitle: '门后是天街', intro: '穿过南天门，路势渐缓。抬头是岱顶的殿宇，回望仍是来时的十八盘。' } },
  tianjie: { kind: 'street', en: 'A STREET ABOVE THE CLOUDS', subtitle: '石板路沿着岱顶缓缓展开。', panelTitle: '漫步天街', intro: '从南天门出发，在云海、店铺与古建之间放慢脚步。', historyTitle: '岱顶的云上街道', storyTitle: '山巅也有人间', story: '翻过陡峭的十八盘，脚下的路忽然舒展开来。行旅在这里停歇、相遇，再沿天街走向碧霞祠和更高处。', background: 'H-ND-05-bg', primaryInScene: false, platform: 'H-ND-05-street', bg: '63% 48%', artNote: '天街艺术化场景合成 · 建筑位置为示意', inside: { enterLabel: '沿街而行', exitLabel: '返回天街全景', title: '天街深处', subtitle: '沿石板路，继续走向山巅。', panelTitle: '沿街而行', intro: '建筑与石阶从近处展开，云海留在街巷的一侧。', background: 'H-ND-05-bg', bg: '69% 52%' } },
  bixia: { kind: 'temple', en: 'A TEMPLE IN THE CLOUDS', subtitle: '殿宇与香火留在山巅。', panelTitle: '走近碧霞祠', intro: '在岱顶殿宇之间，山岳信仰与人间心愿彼此相遇。', historyTitle: '岱顶的古建筑群', storyTitle: '山巅的人间愿望', story: '穿过天街，红墙与灰瓦从云里显现。有人在此停步远望，有人把愿望留在香烟之中，山巅因此有了温度。', support: 'H-NT-01', bg: '59% 31%' },
  stone: { kind: 'monument', en: 'WORDS ON STONE', subtitle: '一方岩面，留下山岳声名。', panelTitle: '读五岳独尊', intro: '风雨从岩面经过，四个大字仍在山巅与来者相望。', historyTitle: '写在山石上的泰山', storyTitle: '石上有声', story: '游客在题刻前停下脚步，读到的不只是四个字，也是历代登山者观看泰山的方式。岩石沉默，文字让它开口。', support: 'H-NT-04', bg: '68% 36%' },
  yuhuang: { kind: 'temple', en: 'THE SUMMIT', subtitle: '行至极顶，与群山相望。', panelTitle: '抵达玉皇顶', intro: '站在全程的高点，来路、云海与远山一起展开。', historyTitle: '泰山之巅', storyTitle: '回望来时山路', story: '走到极顶，登山不再只是一条向上的路。转身回望，红门、十八盘与南天门都成为长卷中的层层笔墨。', support: 'H-NT-04', bg: '55% 23%' },
  riguan: { kind: 'landscape', en: 'WAITING FOR SUNRISE', subtitle: '在东方峰头，等天色渐明。', panelTitle: '日观峰候日', intro: '夜色退去之前，远山先出现轮廓，随后第一束光越过云海。', historyTitle: '向东看日出的山峰', storyTitle: '等一场天光', story: '人们在黎明前抵达峰头。风很轻，话语也变少；直到天际泛红，群山才从暗色里一层层醒来。', support: 'H-NT-01', bg: '78% 31%' },
  tianwai: { kind: 'gateway', en: 'THE WESTERN ENTRANCE', subtitle: '从山外出发，循车道入山。', panelTitle: '由天外村启程', intro: '这里是轻松登山线路的开端，先抵达中天门，再选择步行或索道。', historyTitle: '西麓的入山门户', storyTitle: '把路程留给山色', story: '车辆沿山路渐渐升高，窗外的城市退去，山谷与松林靠近。抵达中天门以后，真正的岱顶旅程才继续展开。', support: 'H-NT-01', bg: '30% 78%' },
  taohua: { kind: 'landscape', en: 'THE WESTERN VALLEY', subtitle: '循溪入谷，向云中去。', panelTitle: '走进桃花峪', intro: '山水、花木与石径组成西线的第一重风景。', historyTitle: '泰山西麓的山水入口', storyTitle: '溪声引路', story: '水从岩石间落下，路在树影里转弯。这里的登山从溪谷开始，随后向桃花源与更高处的云海延伸。', support: 'H-NT-07', bg: '28% 63%' },
  taoyuan: { kind: 'station', en: 'THE CABLEWAY IN THE VALLEY', subtitle: '在山谷换乘，向云中继续上行。', panelTitle: '抵达桃花源', intro: '西线山水在此与索道相接，瀑布、花木和站房共同展开。', historyTitle: '桃花峪线的换乘节点', storyTitle: '从溪谷到云端', story: '沿溪谷抵达桃花源，索道把旅程从山水之间送向更高处。轿厢离开站台后，瀑布与花木渐渐缩成山谷中的一笔。', background: 'H-ND-13-bg', primaryInScene: false, accent: 'H-TR-01-cablecar', bg: '61% 48%', artNote: '桃花源艺术化场景合成 · 交通关系为示意', inside: { enterLabel: '查看换乘平台', exitLabel: '返回索道站全景', title: '换乘平台', subtitle: '停在栏杆旁，远望群峰与云海。', panelTitle: '桃花源换乘平台', intro: '在继续登顶之前，从平台回望一路经过的西线山谷。', background: 'H-ND-13-platform', bg: '64% 48%' } },
  dongyu: { kind: 'gateway', en: 'THE EASTERN ANCIENT PATH', subtitle: '松石夹道，古径向上。', panelTitle: '从东御道入山', intro: '由东侧进入泰山，沿较安静的古道向中天门一带行进。', historyTitle: '东侧古道的入口', storyTitle: '另一面泰山', story: '山门之后，石路在松林与岩壁间展开。离开热闹的主线，脚步更容易听见风穿过树冠的声音。', support: 'H-NT-04', bg: '78% 62%' },
};
// Supplied complete scenes are used as complete backgrounds, not doubled with their own buildings.
Object.assign(visitProfiles.nantianmen,{background:'nantian-front',primaryInScene:false,support:null,platform:null,bg:'50% 50%',artNote:'南天门门前画境 · 艺术化演绎'});
Object.assign(visitProfiles.nantianmen.inside,{background:'nantian-inside',bg:'50% 50%',spotId:'tianjie'});
Object.assign(visitProfiles.riguan,{background:'riguan-landscape',primaryInScene:false,support:null,bg:'50% 50%'});
Object.assign(visitProfiles.tianwai,{background:'tianwai-landscape',primaryInScene:false,support:null,bg:'50% 50%'});
Object.assign(visitProfiles.taohua,{background:'taohua-landscape',primaryInScene:false,support:null,bg:'50% 50%'});
Object.assign(visitProfiles.stone,{background:'stone-landscape',primaryInScene:false,support:null,bg:'50% 50%'});
Object.assign(visitProfiles.dongyu,{background:'H-BG-14',bg:'50% 50%'});
Object.assign(visitProfiles.tianjie,{platform:null,bg:'50% 50%'});
Object.assign(visitProfiles.tianjie.inside,{bg:'58% 50%'});
Object.assign(visitProfiles.taoyuan,{bg:'50% 50%'});
Object.assign(visitProfiles.taoyuan.inside,{bg:'50% 50%'});
visitProfiles.dongtian={kind:'gateway',en:'THE EASTERN GATE',subtitle:'门阙与古道，留在山水之间。',panelTitle:'走近东天门画境',intro:'从门前看古道与远山，继续展开一段艺术化的山中想象。',historyTitle:'东侧古道节点',storyTitle:'古道松风',story:'门阙在松石之间显现，石阶把来路留在身后。此处文字为画卷情境演绎。',background:'dongtian-landscape',primaryInScene:false,bg:'50% 50%',artNote:'东天门概念画境 · 非实地测绘',inside:{enterLabel:'走近古道',exitLabel:'返回门前画境',title:'古道入口',subtitle:'在石阶与松石之间读画。',panelTitle:'东天门古道画境',intro:'建筑与石阶在眼前展开，山势留在远处。',background:'H-BG-14',bg:'50% 50%',primary:'dongtian-path'}};

const visitPlaceId=()=>visitScene.dataset.depth==='inside' ? visitProfiles[activeVisitId]?.inside?.spotId||activeVisitId : activeVisitId;
const screenPoint = p => [p[0] * 10, p[1] * 5.625];

function curve(points) {
  const p = points.map(screenPoint);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) d += ` Q${p[i][0]},${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2},${(p[i][1] + p[i + 1][1]) / 2}`;
  const n = p.length;
  d += ` Q${p[n - 2][0]},${p[n - 2][1]} ${p[n - 1][0]},${p[n - 1][1]}`;
  return d;
}

function transportMark(segment) {
  if (!segment.label) return '';
  const point = screenPoint(segment.points[Math.floor(segment.points.length / 2)]);
  const glyph = segment.type === 'cable' ? '<rect x="-8" y="-5" width="16" height="10" rx="3"/><path d="M-5-5L0-10 5-5M0-10V-15"/>' : '<rect x="-9" y="-6" width="18" height="12" rx="3"/><circle cx="-5" cy="7" r="2"/><circle cx="5" cy="7" r="2"/>';
  return `<g class="transport-mark ${segment.type}" transform="translate(${point[0]} ${point[1]})"><title>${segment.label}</title>${glyph}<text x="13" y="4">${segment.label}</text></g>`;
}

paths.innerHTML = routes.map(route => `<g class="route-path" data-path="${route.id}" style="--route-color:${route.color}">${route.segments.map(segment => `<path class="route-under" d="${curve(segment.points)}"/><path class="route-stroke ${segment.type}" d="${curve(segment.points)}"/><path class="route-hit" data-select="${route.id}" d="${curve(segment.points)}"/>${transportMark(segment)}`).join('')}</g>`).join('') + `<g class="summit-path">${summitPaths.map(p => `<path class="route-under" d="${curve(p)}"/><path class="route-stroke" d="${curve(p)}"/>`).join('')}</g>`;

nodeWrap.innerHTML = Object.entries(places).map(([id, p]) => `<button class="landmark level-${p.level} ${p.labelSide === 'left' ? 'label-left' : ''} ${p.immersive ? 'immersive' : ''}" data-place="${id}" style="left:${p.x * 10}px;top:${p.y * 5.625}px" aria-label="探索${p.name}" ${p.immersive ? `title="点击进入${p.name}近景"` : ''}><i></i><span>${p.name}</span>${id === 'yuhuang' ? '<small>极顶</small>' : ''}</button>`).join('');
iconWrap.innerHTML = Object.entries(places).filter(([, p]) => p.mapIcon).map(([id, p]) => `<img loading="lazy" class="landmark-icon" data-icon-place="${id}" src="${asset(p.mapIcon.asset)}" alt="" style="left:${p.x * 10}px;top:${p.y * 5.625}px;width:${p.mapIcon.width}px">`).join('');

function showSpotlight(id, locked = false) {
  const p = places[id];
  const visualAsset = p?.asset || p?.mapIcon?.asset;
  if (!visualAsset) return;
  spotlight.src = asset(visualAsset);
  spotlight.style.left = `${p.x * 10}px`;
  spotlight.style.top = `${p.y * 5.625}px`;
  spotlight.style.width = `${Math.max(66, (p.scene?.width || 8) * 13)}px`;
  spotlight.classList.toggle('locked', locked);
  spotlight.classList.add('visible');
  nodeWrap.querySelectorAll('.landmark').forEach(node => node.classList.toggle('is-lit', node.dataset.place === id));
  iconWrap.querySelectorAll('.landmark-icon').forEach(icon => icon.classList.toggle('is-lit', icon.dataset.iconPlace === id));
}

function clearSpotlight() {
  if (focusState.active) return;
  spotlight.classList.remove('visible', 'locked');
  nodeWrap.querySelectorAll('.landmark').forEach(node => node.classList.remove('is-lit'));
  iconWrap.querySelectorAll('.landmark-icon').forEach(icon => icon.classList.remove('is-lit'));
}

nodeWrap.querySelectorAll('[data-place]').forEach(node => {
  node.addEventListener('pointerenter', () => showSpotlight(node.dataset.place));
  node.addEventListener('pointerleave', clearSpotlight);
  node.addEventListener('focus', () => showSpotlight(node.dataset.place));
  node.addEventListener('blur', clearSpotlight);
});

iconWrap.querySelectorAll('[data-icon-place]').forEach(icon => {
  icon.addEventListener('pointerenter', () => showSpotlight(icon.dataset.iconPlace));
  icon.addEventListener('pointerleave', clearSpotlight);
  icon.addEventListener('click', () => focusPlace(icon.dataset.iconPlace));
});

function routeState() {
  const active = hoverRoute || selected;
  const route = routes.find(r => r.id === active);
  document.querySelectorAll('[data-path]').forEach(e => e.classList.toggle('selected', e.dataset.path === active));
  document.querySelectorAll('[data-route]').forEach(e => e.setAttribute('aria-pressed', String(Boolean(mode) && e.dataset.route === selected)));
  document.querySelectorAll('.landmark').forEach(e => e.classList.toggle('on-route', route.nodes.includes(e.dataset.place)));
  document.querySelector('#route-tag').textContent = routes.find(r => r.id === selected).tag;
  document.documentElement.style.setProperty('--selected-route', routes.find(r => r.id === selected).color);
  document.body.classList.toggle('route-preview', Boolean(hoverRoute));
}

const routeVariants = {};
function syncVerifiedRoute(id, variantId) {
  const verified=catalog?.routes.find(r=>r.id===id), local=routes.find(r=>r.id===id);
  if(!verified||!local)return;
  const variant=verified.variants?.find(v=>v.id===(variantId||routeVariants[id]))||verified.variants?.[0]||verified;
  routeVariants[id]=variant.id;
  const ids=variant.node_sequence.map(id=>id==='nantian'?'nantianmen':id).filter(id=>places[id]);
  local.nodes=ids;local.description=verified.description;local.kind=verified.type;
  const group=paths.querySelector(`[data-path="${id}"]`);
  group.innerHTML=ids.slice(1).map((to,i)=>{
    const from=ids[i],a=places[from],b=places[to];
    const transport=variant.transport?.find(t=>apiSpotId(from)===t.from&&apiSpotId(to)===t.to);
    const type=transport?.mode==='cable'?'cable':transport?'bus':'walk';
    const segment={type,points:[[a.x,a.y],[(a.x+b.x)/2,(a.y+b.y)/2],[b.x,b.y]],label:transport?(transport.mode==='cable'?'索道':'景区交通'):null};
    const d=curve(segment.points);
    return `<path class="route-under" d="${d}"/><path class="route-stroke ${type}" d="${d}"/>${transportMark(segment)}`;
  }).join('');
  // This drawing represents major known landmarks only; full station sequences remain in the route page.
}
function selectRoute(id, reveal = true) {
  syncVerifiedRoute(id);

  selected = id;
  appState.selectedRoute = id;
  hoverRoute = null;
  document.body.classList.toggle('show-secondary', reveal);
  routeState();
}

document.querySelectorAll('[data-route],[data-select]').forEach(el => {
  const id = el.dataset.route || el.dataset.select;
  el.addEventListener('click', () => selectRoute(id, true));
  el.addEventListener('pointerenter', () => { hoverRoute = id; routeState(); });
  el.addEventListener('pointerleave', () => { hoverRoute = null; routeState(); });
});

function enterTaishan(skip = false) {
  if (welcomeScene.classList.contains('is-entering')) return;
  welcomeEnter.disabled = true;
  welcomeScene.classList.add('is-entering');
  const finish = () => {
    welcomeScene.hidden = true;
    welcomeScene.setAttribute('aria-hidden', 'true');
    homeScene.inert = false;
    homeScene.removeAttribute('aria-hidden');
    document.body.classList.remove('welcome-open');
    if(!document.querySelector('.culture-dialog[open]'))document.querySelector('.mode').focus({ preventScroll: true });
  };
  setTimeout(finish, skip || simple ? 0 : 1080);
}

welcomeEnter.onclick = () => enterTaishan();
document.querySelector('#welcome-skip').onclick = () => enterTaishan(true);
function returnToWelcome() {
  reset();
  homeScene.setAttribute('aria-hidden', 'true');
  homeScene.inert = true;
  welcomeScene.hidden = false;
  welcomeScene.classList.remove('is-entering');
  welcomeScene.classList.add('is-returning');
  welcomeEnter.disabled = false;
  document.body.classList.add('welcome-open');
  setTimeout(() => welcomeScene.classList.remove('is-returning'), simple ? 20 : 720);
  requestAnimationFrame(() => welcomeEnter.focus({ preventScroll: true }));
}

welcomeReturn.onclick = returnToWelcome;
requestAnimationFrame(() => welcomeEnter.focus({ preventScroll: true }));

function showDialog(html, variant = '') {
  if (!dialog.open) {
    previousFocus = document.activeElement;
    dialog.showModal();
  }
  dialog.classList.toggle('poetry-library-dialog', variant === 'poetry');
  dialog.classList.toggle('is-art', variant === 'art');
  content.innerHTML = html;
  dialog.scrollTop = 0;
  dialog.querySelector('.close').focus();
}

function closeDialog() {
  if (dialog.open) dialog.close();
  previousFocus?.focus();
}

dialog.querySelector('.close').onclick = closeDialog;
dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
dialog.addEventListener('click', e => {
  if (e.target !== dialog) return;
  const b = dialog.getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeDialog();
});

function openPlace(id) {
  recordVisit(id).catch(() => status('足迹未保存，请稍后重试；景点仍可阅读。'));
  const p = places[id];
  showDialog(`<p class="dialog-eyebrow">TAISHAN · ${p.tag}</p><h2 id="detail-title">${p.name}</h2><p class="dialog-poem">${p.poem}</p>${p.asset ? `<figure><img src="${asset(p.asset)}" alt="${p.name}概念插画"/><figcaption>概念插画 · 建筑与地貌细节待校准</figcaption></figure>` : ''}<p class="description">${p.text}</p><div class="dialog-actions"><button class="primary" id="next-place">${id === 'riguan' ? '观赏日出' : '继续游览 →'}</button><a href="${source.routeGuide}" target="_blank" rel="noopener noreferrer">官方路线资料 ↗</a></div>`);
  content.querySelector('img')?.addEventListener('error', e => { e.currentTarget.closest('figure').innerHTML = '<figcaption>图片暂未加载，请继续阅读介绍。</figcaption>'; });
  content.querySelector('#next-place').onclick = () => {
    if (id === 'riguan') { closeDialog(); toggleSunrise(true); return; }
    const route = routes.find(r => r.id === selected);
    const index = Math.max(0, route.nodes.indexOf(id));
    openPlace(route.nodes[(index + 1) % route.nodes.length]);
  };
}

function buildVisitCopy(id, profile) {
  const verified = !unavailableSpots.has(id) && catalog?.spots.find(spot => spot.id === apiSpotId(id));
  const citation = verified?.sources?.map(source => `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.publisher)} · ${escapeHTML(source.title)} ↗</a>`).join('') || '';
  const details = verified ? `<p><button class="verified-detail" data-cultural-spot="${apiSpotId(id)}">查看实景图与完整文化资料 ↗</button></p>` : `<p><a href="${fullSite('spots')}">浏览已有文化资料 ↗</a></p>`;
  const p = places[id];
  const classicPoem = ['hongmen', 'shibapan', 'nantianmen', 'yuhuang'].includes(id);
  return {
    history: `<p class="visit-kicker">景点小志</p><h3>${profile.historyTitle}</h3><p>${escapeHTML(verified ? verified.intro + ' ' + verified.interpretation : profile.history || p.text)}</p><div class="verified-sources">${citation}</div>${details}`,
    story: `<p class="visit-kicker">画卷情境 · 原创文学演绎</p><h3>${profile.storyTitle}</h3><p>${profile.story}</p>`,
    poetry: `<p class="visit-kicker">${classicPoem ? '与泰山同行的诗' : '画卷题句'}</p><blockquote>${p.poem}</blockquote>${classicPoem ? '<p class="visit-poet">唐 · 杜甫《望岳》</p>' : ''}<p>让文字停在风景旁，也让眼前这一处山水成为继续向前的引子。</p>`,
  };
}

function showVisit(id, tab = 'history') {
  const p = places[id];
  const profile = visitProfiles[id];
  if (!p || !profile) return openPlace(id);
  activeVisitId = id;
  recordVisit(id).catch(() => status('足迹未保存，请稍后重试；景点仍可阅读。'));
  visitCopy = buildVisitCopy(id, profile);
  visitScene.inert = false;
  visitScene.setAttribute('aria-hidden', 'false');
  visitScene.setAttribute('aria-label', `${p.name}近景`);
  visitScene.querySelector('.visit-tabs').setAttribute('aria-label', `${p.name}介绍`);
  visitScene.dataset.kind = profile.kind;
  visitScene.dataset.place = id;
  visitScene.style.setProperty('--visit-bg', profile.bg);
  visitScene.style.setProperty('--visit-inside-bg', profile.inside?.bg || profile.bg);
  document.querySelector('.home').inert = true;
  visitScene.scrollTop = 0;
  visitScene.dataset.depth = 'near';
  visitEnter.setAttribute('aria-pressed', 'false');
  visitEnter.hidden = !profile.inside;
  visitEnter.innerHTML = `${profile.inside?.enterLabel || '继续前行'} <span>↗</span>`;
  document.querySelector('#visit-info-title').textContent = profile.panelTitle;
  document.querySelector('.visit-intro').textContent = profile.intro;
  document.querySelector('.visit-title small').textContent = profile.en;
  document.querySelector('.visit-title h2').textContent = p.name;
  document.querySelector('.visit-title p').textContent = profile.subtitle;
  const primary = visitScene.querySelector('.visit-gate');
  const support = visitScene.querySelector('.visit-stairs');
  const platform = visitScene.querySelector('.visit-platform');
  const backdrop = visitScene.querySelector('.visit-backdrop');
  const insideBackdrop = visitScene.querySelector('.visit-inside-backdrop');
  const accent = visitScene.querySelector('.visit-accent');
  backdrop.style.backgroundImage = `url("${asset(profile.background || 'H-BG-01')}")`;
  insideBackdrop.hidden = !profile.inside?.background;
  if (profile.inside?.background) insideBackdrop.style.backgroundImage = `url("${asset(profile.inside.background)}")`;
  primary.hidden = profile.primaryInScene === false || !p.asset;
  if (!primary.hidden) {
    primary.src = asset(p.asset);
    primary.alt = `${p.name}概念近景`;
  }
  support.hidden = !profile.support;
  if (profile.support) support.src = asset(profile.support);
  platform.hidden = !profile.platform;
  if (profile.platform) platform.src = asset(profile.platform);
  accent.hidden = !profile.accent;
  if (profile.accent) {
    accent.src = asset(profile.accent);
    accent.alt = `${p.name}交通点景`;
  }
  visitCable3d.hidden = id !== 'taoyuan';
  document.querySelector('.visit-art-note').textContent = profile.artNote || `${p.name}近景概念画面 · 后续可替换实景素材`;
  const sourceLink = visitScene.querySelector('.visit-source a');
  sourceLink.href = profile.source || source.routeGuide;
  sourceLink.textContent = profile.source ? '泰山景区官方资料 ↗' : '泰山官方游览资料 ↗';
  setVisitTab(tab);
  document.body.classList.add('is-visiting');
  requestAnimationFrame(() => {
    visitScene.classList.add('is-open');
    document.querySelector('#visit-back').focus({ preventScroll: true });
  });
}

function setVisitTab(tab, focusTab = false) {
  const active = visitScene.querySelector(`[data-visit-tab="${tab}"]`);
  if (!active) return;
  visitScene.querySelectorAll('[data-visit-tab]').forEach(button => {
    const chosen = button === active;
    button.setAttribute('aria-selected', String(chosen));
    button.tabIndex = chosen ? 0 : -1;
  });
  visitPanel.innerHTML = visitCopy[tab];
  visitPanel.setAttribute('aria-labelledby', active.id);
  if (focusTab) active.focus();
}

visitScene.querySelectorAll('[data-visit-tab]').forEach(button => {
  button.addEventListener('click', () => setVisitTab(button.dataset.visitTab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['history', 'story', 'poetry'];
    const current = tabs.indexOf(button.dataset.visitTab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (current + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    setVisitTab(tabs[next], true);
  });
});

visitEnter.addEventListener('click', () => {
  const profile = visitProfiles[activeVisitId];
  const p = places[activeVisitId];
  if (!profile?.inside || !p) return;
  const inside = visitScene.dataset.depth === 'inside';
  visitScene.dataset.depth = inside ? 'near' : 'inside';
  visitEnter.setAttribute('aria-pressed', String(!inside));
  visitEnter.innerHTML = inside ? `${profile.inside.enterLabel} <span>↗</span>` : `${profile.inside.exitLabel} <span>↶</span>`;
  document.querySelector('#visit-info-title').textContent = inside ? profile.panelTitle : profile.inside.panelTitle;
  document.querySelector('.visit-intro').textContent = inside ? profile.intro : profile.inside.intro;
  document.querySelector('.visit-title h2').textContent = inside ? p.name : profile.inside.title;
  document.querySelector('.visit-title p').textContent = inside ? profile.subtitle : profile.inside.subtitle;
  const contextId=visitPlaceId();
  const contextName=places[contextId]?.name||p.name;
  visitScene.setAttribute('aria-label',contextName+'近景');
  visitScene.querySelector('.visit-tabs').setAttribute('aria-label',contextName+'介绍');
  document.querySelector('.visit-art-note').textContent=(inside?p.name:profile.inside.title)+'画境 · 艺术化演绎';
  document.querySelector('.visit-title small').textContent=inside?profile.en:(visitProfiles[contextId]?.en||profile.en);
  const contextSource=catalog?.spots.find(spot=>spot.id===apiSpotId(contextId))?.sources?.[0];
  const contextLink=visitScene.querySelector('.visit-source a');
  contextLink.href=contextSource?.url||profile.source||source.routeGuide;
  contextLink.textContent=contextSource?contextSource.publisher+' ↗':'泰山官方游览资料 ↗';

  visitCopy=buildVisitCopy(contextId,visitProfiles[contextId]||profile);
  setVisitTab(visitScene.querySelector('[data-visit-tab][aria-selected="true"]').dataset.visitTab);
  if(!inside&&profile.inside.spotId)recordVisit(contextId).catch(()=>status('足迹未保存，请稍后重试。'));
  const primary=visitScene.querySelector('.visit-gate');
  if(profile.inside.primary){primary.hidden=inside&&profile.primaryInScene===false;primary.src=asset(inside?p.asset:profile.inside.primary);primary.alt=(inside?p.name:profile.inside.title)+'概念近景'}
});

function ensureCablewayExperience() {
  if (cablewayController) return Promise.resolve(cablewayController);
  if (!cablewayControllerPromise) {
    cablewayControllerPromise = import('./cableway-experience.js').then(({ createCablewayExperience }) => {
      cablewayController = createCablewayExperience(cablewayModel, {
        onReady: () => {
          cablewayScene.classList.add('is-ready');
          cablewayScene.classList.remove('is-error');
          document.querySelector('#cableway-status').textContent = '艺术化索道体验 · 正在演示穿云场景';
        },
        onError: () => {
          cablewayScene.classList.add('is-error');
          document.querySelector('#cableway-status').textContent = '三维模型暂未载入，可返回桃花源继续游览';
        },
        onProgress: (progress, loading = false) => {
          cablewayScene.style.setProperty('--cable-progress', String(progress));
          if (loading) document.querySelector('#cableway-status').textContent = `正在载入三维缆车 · ${Math.round(progress * 100)}%`;
        },
      });
      return cablewayController;
    }).catch(() => {
      cablewayScene.classList.add('is-error');
      document.querySelector('#cableway-status').textContent = '当前设备暂不支持三维索道体验';
      return null;
    });
  }
  return cablewayControllerPromise;
}

function setCablewayRide(value) {
  cablewayRiding = value;
  cablewayScene.classList.toggle('is-riding', value);
  const button = document.querySelector('#cableway-ride');
  button.setAttribute('aria-pressed', String(value));
  button.textContent = value ? 'Ⅱ 暂停行进' : '▶ 继续入山';
  if (cablewayScene.classList.contains('is-ready')) {
    document.querySelector('#cableway-status').textContent = value ? '艺术化索道体验 · 正在演示穿云场景' : '索道已暂停 · 可拖动观察缆车';
  }
  cablewayController?.setRide(value);
}

function openCablewayExperience() {
  if (activeVisitId !== 'taoyuan') return;
  cablewayPreviousFocus = document.activeElement;
  cablewayScene.inert = false;
  cablewayScene.setAttribute('aria-hidden', 'false');
  visitScene.inert = true;
  document.body.classList.add('is-cableway');
  setCablewayRide(!simple);
  requestAnimationFrame(() => {
    cablewayScene.classList.add('is-open');
    document.querySelector('#cableway-close').focus({ preventScroll: true });
  });
  ensureCablewayExperience().then(controller => controller?.setActive(true));
}

function closeCablewayExperience() {
  cablewayController?.setActive(false);
  cablewayScene.classList.remove('is-open');
  cablewayScene.inert = true;
  cablewayScene.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-cableway');
  visitScene.inert = !visitScene.classList.contains('is-open');
  cablewayPreviousFocus?.focus({ preventScroll: true });
}

visitCable3d.addEventListener('click', openCablewayExperience);
document.querySelector('#cableway-close').addEventListener('click', closeCablewayExperience);
document.querySelector('#cableway-ride').addEventListener('click', () => setCablewayRide(!cablewayRiding));
document.querySelector('#cableway-reset').addEventListener('click', () => cablewayController?.resetView());

function hideVisit() {
  visitScene.classList.remove('is-open');
  visitScene.inert = true;
  visitScene.setAttribute('aria-hidden', 'true');
  visitScene.dataset.depth = 'near';
  document.querySelector('.home').inert = false;
  document.body.classList.remove('is-visiting');
}

function returnPanorama() {
  hideVisit();
  exitFocus(simple || document.body.classList.contains('static-scene'));
  visitReturnFocus?.focus({ preventScroll: true });
}

document.querySelector('#visit-back').addEventListener('click', returnPanorama);
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (modeConfirm.classList.contains('is-open')) closeModeConfirm();
  else if (cablewayScene.classList.contains('is-open')) closeCablewayExperience();
  else if (guideScene.classList.contains('is-open')) closeGuide();
  else if (visitScene.classList.contains('is-open')) returnPanorama();
});

function focusPlace(id) {
  const p = places[id];
  appState.selectedPlace = id;
  appState.phase = 'focusing';
  if (!p?.immersive) { openPlace(id); return; }
  visitReturnFocus = document.activeElement;
  showSpotlight(id, true);
  focusTimeline?.kill();
  focusState.active = true;
  focusState.id = id;
  focusState.artBoost = 0;
  document.body.classList.add('is-focusing');
  document.querySelectorAll('.landmark').forEach(node => node.classList.toggle('is-focus', node.dataset.place === id));
  if (simple || document.body.classList.contains('static-scene') || !camera) {
    focusFx.fog = 1;
    if (!simple) document.body.classList.add('static-transition');
    setTimeout(() => { showVisit(id); focusFx.fog = 0; document.body.classList.remove('static-transition'); }, simple ? 0 : 420);
    return;
  }
  const depth = (40 - base.mesh.position.z) / 125;
  const targetX = (p.x / 100 - .5) * baseWidth * depth;
  const targetY = (.5 - p.y / 100) * baseHeight * depth;
  const zoom = p.focus.zoom || 2;
  const duration = p.focus.duration || 1.5;
  Object.assign(focusRig, { x: camera.position.x, y: camera.position.y, z: camera.position.z, fov: camera.fov });
  focusTimeline = gsap.timeline({ onComplete: () => { showVisit(id); focusFx.fog = 0; } });
  focusTimeline.to(focusFx, { fog: 1, shift: 10, duration: .46, ease: 'power2.in' }, 0)
    .to(focusRig, { x: targetX, y: targetY, z: 40 - (zoom - 1) * 17, fov: 26 - (zoom - 1) * 5.4, duration, ease: 'power2.inOut' }, 0)
    .to(focusState, { artBoost: 1, duration: duration * .7, ease: 'power2.out' }, .1);
}

document.querySelectorAll('[data-place]').forEach(b => b.onclick = () => focusPlace(b.dataset.place));

document.querySelector('#route-detail').onclick = () => culturalPages.open('routes',selected);

const modeProfiles = {
  culture: {
    eyebrow: 'READ THE MOUNTAIN · 循迹千年',
    mark: '史',
    title: '循迹千年',
    copy: '沿着朝代、人物与诗词的线索，重新认识这座山。',
    hint: '点击山中的文化节点查看近景，或从上方“史”阅读有来源的时间轴。',
    enter: '进入千年泰山',
    caption: '山是长卷，脚步是笔。从时间留下的痕迹读懂泰山。',
    routeTitle: '文化线索 · 红门古道',
    routeGuide: '选择一处文化节点',
    mapGuide: '点击发光地标，寻找山中故事',
    mapHint: '每个地标都可以走近查看',
    status: '已进入“循迹千年” · 下一步将从时间与文化线索开始。',
  },
  travel: {
    eyebrow: 'WALK INTO THE MOUNTAIN · 今日登山',
    mark: '路',
    title: '今日登山',
    copy: '从四条经典线路中选择一条，看看今天该怎样走上泰山。',
    hint: '你可以自己选路线，也可以让“问山”比较路线结构与不同登山方式。',
    enter: '开始规划登山',
    caption: '四条入山路，一处云上峰。选择路线，再查看沿途节点。',
    routeTitle: '选择你的登山路线',
    routeGuide: '选择一条登山路线',
    mapGuide: '点击路线上的地标，查看这一站',
    mapHint: '红门、中天门、南天门等节点均可进入',
    status: '已进入“今日登山” · 请选择一条路线开始规划。',
  },
};

function openModeConfirm(value) {
  const profile = modeProfiles[value];
  if (!profile || mode === value) return;
  modeConfirmPreviousFocus = document.activeElement;
  appState.pendingMode = value;
  appState.phase = 'confirm';
  document.querySelector('#mode-confirm-eyebrow').textContent = profile.eyebrow;
  document.querySelector('.mode-confirm-mark').textContent = profile.mark;
  document.querySelector('#mode-confirm-title').textContent = profile.title;
  document.querySelector('#mode-confirm-copy').textContent = profile.copy;
  document.querySelector('#mode-confirm-hint').textContent = profile.hint;
  document.querySelector('#mode-confirm-enter').firstChild.textContent = `${profile.enter} `;
  modeConfirm.dataset.pendingMode = value;
  modeConfirm.inert = false;
  modeConfirm.setAttribute('aria-hidden', 'false');
  document.querySelector('.home').inert = true;
  document.body.classList.add('mode-confirming');
  requestAnimationFrame(() => {
    modeConfirm.classList.add('is-open');
    document.querySelector('#mode-confirm-enter').focus({ preventScroll: true });
  });
}

function closeModeConfirm(restoreFocus = true) {
  modeConfirm.classList.remove('is-open');
  modeConfirm.inert = true;
  modeConfirm.setAttribute('aria-hidden', 'true');
  document.querySelector('.home').inert = false;
  document.body.classList.remove('mode-confirming');
  delete modeConfirm.dataset.pendingMode;
  appState.pendingMode = null;
  appState.phase = 'overview';
  if (restoreFocus) modeConfirmPreviousFocus?.focus({ preventScroll: true });
}

function syncRoutePanelLayout() {
  const panel = document.querySelector('.route-selector');
  if (innerWidth < 760) {
    panel.style.removeProperty('top');
    panel.style.removeProperty('bottom');
    panel.style.removeProperty('max-height');
    panel.style.removeProperty('overflow-y');
    return;
  }
  const heroBottom = document.querySelector('.hero').getBoundingClientRect().bottom;
  const bottomClearance = innerHeight < 820 ? 63 : 76;
  const panelTop = Math.ceil(heroBottom + 12);
  const availableHeight = Math.max(160, innerHeight - panelTop - bottomClearance);
  panel.style.top = `${panelTop}px`;
  panel.style.bottom = 'auto';
  panel.style.maxHeight = `${availableHeight}px`;
  panel.style.overflowY = panel.scrollHeight > availableHeight ? 'auto' : 'visible';
}

function setMode(value) {
  mode = modeProfiles[value] ? value : null;
  appState.mode = mode;
  appState.phase = 'overview';
  document.body.dataset.mode = mode || 'overview';
  document.body.classList.remove('show-secondary', 'route-preview');
  document.querySelectorAll('.mode[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
  document.querySelectorAll('[data-explore]').forEach(b => b.classList.toggle('current', mode ? b.dataset.explore === mode : b.dataset.explore === 'overview'));
  document.querySelector('.mode-caption').textContent = mode ? modeProfiles[mode].caption : '点击一种方式开始，也可以随时切换。';
  document.querySelector('#route-title').textContent = mode ? modeProfiles[mode].routeTitle : '四径同归泰山';
  document.querySelector('#route-guide-copy').textContent = mode ? modeProfiles[mode].routeGuide : '选择一种方式后继续';
  document.querySelector('#map-guide-title').textContent = mode ? modeProfiles[mode].mapGuide : '也可以直接点击山中地标';
  document.querySelector('#map-guide-copy').textContent = mode ? modeProfiles[mode].mapHint : '走近建筑，查看故事与诗词';
  if (mode === 'culture') selectRoute('hongmen', false); else routeState();
  requestAnimationFrame(syncRoutePanelLayout);
}

function confirmModeSelection() {
  const value = appState.pendingMode;
  if (!modeProfiles[value]) return;
  const profile = modeProfiles[value];
  closeModeConfirm(false);
  setMode(value);
  status(profile.status);
}

document.querySelectorAll('.mode[data-mode]').forEach(b => b.onclick = () => openModeConfirm(b.dataset.mode));
document.querySelector('#mode-confirm-back').onclick = () => closeModeConfirm();
document.querySelector('#mode-confirm-enter').onclick = confirmModeSelection;
modeConfirm.querySelector('.mode-confirm-wash').onclick = () => closeModeConfirm();


document.querySelectorAll('[data-explore]').forEach(b => b.onclick = () => {
  const action = b.dataset.explore;
  if (action === 'overview') reset();
  if (action === 'art') openArtGallery(showDialog,focusPlace);
  if (action === 'poem') culturalPages.open('poetry');
  if (action === 'travel') culturalPages.open('routes');
  if (action === 'culture') culturalPages.open('history');
  if (action === 'vision') culturalPages.open('vision');
  if (action === 'guide') openGuide();
});

function setGuideStatus(label, state = 'ready') {
  guideStatus.dataset.state = state;
  guideStatus.querySelector('span').textContent = label;
}

function stopGuideSpeech() {
  voicePipeline?.stop();
  guideSpeechRequest += 1;

  if ('speechSynthesis' in window) speechSynthesis.cancel();
  guideUtterance = null;
  guideAvatar?.setThinking(false);
  guideAvatar?.setSpeaking(false);
  setGuideStatus('可以继续提问', 'ready');
}

let voicePipeline;
async function speakGuide(text) {
  guideLastAnswer=text;
  if(voicePipeline)await voicePipeline.speak(text);
}

function renderGuideQuestions() {
  guideQuestions.innerHTML = getGuideQuestions(guideContextId).map(question => `<button type="button">${question}<span>↗</span></button>`).join('');
  guideQuestions.querySelectorAll('button').forEach(button => button.addEventListener('click', () => askGuide(button.textContent.replace('↗', '').trim())));
}

function showGuideAnswer(reply, speak = true) {
  guideAnswer.textContent = reply.answer;
  document.querySelector('.guide-speaker').textContent = reply.mode === 'rag_llm' ? `碧霞仙子 · AI 生成 · ${reply.model}` : reply.mode === 'local_knowledge_fallback' ? '碧霞仙子 · 模型不可用，引用文化资料' : reply.mode === 'local_knowledge' ? '碧霞仙子 · 引用文化资料' : '碧霞仙子 · 文化导览角色';
  const sourceHost = document.querySelector('#guide-sources');
  sourceHost.replaceChildren();
  const groups = reply.citations?.length ? reply.citations.map(c => ({title: `[${c.number}] ${c.title}`, sources: c.sources})) : reply.sources?.length ? [{title: '资料来源', sources: reply.sources}] : [];
  for (const group of groups) {
    const title = document.createElement('strong'); title.textContent = group.title; sourceHost.append(title);
    for (const source of group.sources) { const a = document.createElement('a'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = `${source.publisher} · ${source.title} ↗`; sourceHost.append(a); }
  }

  guideRouteLink.hidden = !reply.routeId;
  if (reply.routeId) {
    guideRouteLink.dataset.route = reply.routeId;
    guideRouteLink.textContent = `${reply.routeLabel} →`;
  }
  guideAvatar?.gesture(reply.emotion || 'nod');
  if (speak) speakGuide(reply.answer);
  else guideLastAnswer = reply.answer;
}

let lastGuideQuestion = '';
let guideWasCancelled = false;
let historyRequest = 0;
async function loadGuideHistory() {
  const token=++historyRequest;
  try {
    const rows=await requestApi('agent/history');
    if(token!==historyRequest)return;
    const log=document.querySelector('#guide-transcript-log');
    log.innerHTML=rows.length?rows.map(row=>`<article class="guide-message"><strong>${row.role==='user'?'你':row.mode==='rag_llm'?'碧霞仙子 · AI 生成':'碧霞仙子 · 文化资料'}</strong><p>${escapeHTML(row.text)}</p>${(row.sources||[]).map(source=>`<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)} ↗</a>`).join('')}</article>`).join(''):'<p>尚无提问。</p>';
  } catch(error) { if(token===historyRequest)document.querySelector('#guide-transcript-log').textContent='暂时无法载入记录：'+error.message; }
}
async function askGuide(question) {
  if (!question || guideBusy) return;
  voicePipeline?.unlock();
  voicePipeline?.stopListening();
  stopGuideSpeech();
  lastGuideQuestion=question;guideWasCancelled=false;
  document.querySelector('#guide-cancel').hidden=false;
  document.querySelector('#guide-retry').hidden=true;
  document.querySelector('#guide-clear').disabled=true;
  const request = ++guideRequest;
  guideController = new AbortController();
  const controller = guideController;
  const timeout = setTimeout(() => controller.abort(), 65000);
  guideBusy = true;
  const submit = document.querySelector('#guide-form button'); submit.disabled = true;
  document.querySelector('#guide-input').value = '';
  document.querySelector('#guide-sources').replaceChildren();
  guideAnswer.textContent = `你问：“${question}”`;
  guideRouteLink.hidden = true;
  guideAvatar?.setThinking(true);
  setGuideStatus('正在检索资料并请求模型', 'thinking');
  try {
    const reply = await askApi(question, guideContextId, catalog?.spots.find(s=>s.id===guideContextId)?.name || places[guideContextId]?.name, controller.signal);
    if (request !== guideRequest || !guideScene.classList.contains('is-open')) return;
    guideAvatar?.setThinking(false);
    showGuideAnswer(reply, false);
    if(voicePipeline?.autoSpeak())speakGuide(reply.answer);
    loadGuideHistory();
    if(!voicePipeline?.autoSpeak())setGuideStatus(reply.mode === 'rag_llm' ? '模型已回答，可对照来源或点击朗读' : '已返回文化资料，请对照来源', 'ready');
  } catch (error) {
    if (request !== guideRequest) return;
    guideAvatar?.setThinking(false);
    guideAnswer.textContent = error.name === 'AbortError' ? (guideWasCancelled?'已停止等待。服务器可能仍在处理，请稍后查看会话记录。':'请求超时，请重试。') : `问答未完成：${error.message}`;
    document.querySelector('#guide-input').value = question;
    document.querySelector('#guide-retry').hidden=false;
    setGuideStatus('请求未完成，可重试或打开完整导览', 'ready');
  } finally {
    clearTimeout(timeout);
    if (request === guideRequest) { guideBusy = false; submit.disabled = false; guideController = null; document.querySelector('#guide-cancel').hidden=true; document.querySelector('#guide-clear').disabled=false; }
  }
}

async function ensureGuideAvatar() {
  if (guideAvatarPromise) return guideAvatarPromise;
  const loading = guideModel.querySelector('.guide-loading');
  const label = loading.querySelector('p');
  const retry = loading.querySelector('button');
  retry.hidden = true;
  loading.classList.remove('is-error');
  label.textContent = '正在加载三维形象…';
  const failed = () => {
    guideScene.classList.remove('is-model-ready');
    guideScene.classList.add('use-fallback');
    loading.classList.add('is-error');
    label.textContent = '三维形象未载入，暂用立绘；语音仍可播放';
    retry.hidden = false;
    for (const button of document.querySelectorAll('[data-gesture]')) button.disabled = true;
  };
  guideAvatarPromise = import('./digital-human.js').then(async ({ createDigitalHuman }) => {
    guideAvatar = createDigitalHuman(guideModel, {
      reducedMotion: simple,
      onProgress: percent => { label.textContent = percent === null ? '正在下载三维形象…' : percent < 100 ? `正在下载三维形象 ${percent}%` : '正在准备动作与表情…'; },
      onReady: ({ animations }) => {
        for (const button of document.querySelectorAll('[data-gesture]')) button.disabled = !animations.includes({nod:'Nod',bow:'Bow',look:'LookAround'}[button.dataset.gesture]);
        guideScene.classList.add('is-model-ready');
        guideScene.classList.remove('use-fallback');
      },
      onError: failed,
    });
    guideAvatar.setActive(guideScene.classList.contains('is-open'));
    return guideAvatar.ready;
  }).catch(() => { failed(); return false; });
  return guideAvatarPromise;
}
document.querySelector('#guide-model-retry').onclick = () => {
  guideAvatar?.destroy();
  guideAvatar = null;
  guideAvatarPromise = null;
  guideScene.classList.remove('use-fallback', 'is-model-ready');
  ensureGuideAvatar();
};

function openGuide(placeId = null) {
  if (guideScene.classList.contains('is-open')) return;
  closeDialog();
  guidePreviousFocus = document.activeElement;
  guideContextId = placeId ? apiSpotId(placeId) : null;
  document.querySelector('#guide-context').textContent = guideContextId ? `正在讲解：${catalog?.spots.find(s=>s.id===guideContextId)?.name || places[guideContextId]?.name || '当前景点'} · 可继续追问此处故事与路线` : '正在从泰山全景为你讲解 · 可问路线、古迹、诗词与日出';
  showGuideAnswer({ answer: getGuideGreeting(guideContextId), emotion: 'bow' }, false);
  renderGuideQuestions();
  loadGuideHistory();
  guideScene.inert = false;
  guideScene.setAttribute('aria-hidden', 'false');
  document.querySelector('.home').inert = true;
  if (visitScene.classList.contains('is-open')) visitScene.inert = true;
  document.body.classList.add('is-guiding');
  requestAnimationFrame(() => {
    guideScene.classList.add('is-open');
    document.querySelector('#guide-close').focus({ preventScroll: true });
    // Microphone and audio start only after an explicit user action.
  });
  ensureGuideAvatar().then(() => guideAvatar?.setActive(guideScene.classList.contains('is-open')));
}

function closeGuide() {
  document.querySelector('#guide-cancel').hidden=true;document.querySelector('#guide-clear').disabled=false;
  guideRequest++; guideController?.abort(); guideController = null; guideBusy = false;
  document.querySelector('#guide-form button').disabled = false;
  stopGuideSpeech();
  voicePipeline?.stopListening();
  guideAvatar?.setActive(false);
  guideScene.classList.remove('is-open');
  guideScene.inert = true;
  guideScene.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('is-guiding');
  const visitOpen = visitScene.classList.contains('is-open');
  visitScene.inert = !visitOpen;
  document.querySelector('.home').inert = visitOpen;
  guidePreviousFocus?.focus({ preventScroll: true });
}

document.querySelector('#guide-orb').addEventListener('click', () => openGuide());
document.querySelector('#visit-guide').addEventListener('click', () => openGuide(visitPlaceId()));
document.querySelector('#guide-close').addEventListener('click', closeGuide);
document.querySelector('#guide-form').addEventListener('submit', event => {
  event.preventDefault();
  askGuide(document.querySelector('#guide-input').value.trim());
});
document.querySelector('#guide-replay').addEventListener('click', () => {voicePipeline?.unlock();if(guideLastAnswer)speakGuide(guideLastAnswer);});
document.querySelector('#guide-stop').addEventListener('click', stopGuideSpeech);
document.querySelectorAll('[data-gesture]').forEach(button => button.addEventListener('click', () => guideAvatar?.gesture(button.dataset.gesture)));
guideRouteLink.addEventListener('click', () => {
  const routeId = guideRouteLink.dataset.route;
  closeGuide();
  if (visitScene.classList.contains('is-open')) returnPanorama();
  setMode('travel');
  selectRoute(routeId, true);
  status(`已在全景中标出${routes.find(route => route.id === routeId)?.name || '这条路线'}。`);
});

let statusTimer;
function status(text) {
  const e = document.querySelector('.status');
  e.textContent = text;
  e.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => e.classList.remove('visible'), 3200);
}

function setMotion(value) {
  simple = value;
  document.body.classList.toggle('reduced', simple);
  const button = document.querySelector('#motion');
  button.setAttribute('aria-pressed', String(simple));
  button.querySelector('span').textContent = simple ? '静态' : '动效';
  if (simple) targetMouse = { x: 0, y: 0 };
  if (guideScene.classList.contains('is-open')) {
    guideAvatar?.setReducedMotion?.(simple);
    ensureGuideAvatar();
  }
}

setMotion(simple);
document.querySelector('#motion').onclick = () => setMotion(!simple);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => setMotion(e.matches));
document.querySelector('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else status('当前浏览器暂不支持全屏。');
  } catch { status('全屏未开启，你仍可继续游览。'); }
};

function toggleSunrise(value = !sunrise) {
  sunrise = value;
  sunriseStart = performance.now();
  document.body.classList.toggle('sunrise', value);
  const button = document.querySelector('#sunrise');
  button.setAttribute('aria-pressed', String(value));
  button.innerHTML = value ? '↶ 返回清晨' : '☼ 等一场日出';
}

document.querySelector('#sunrise').onclick = () => toggleSunrise();

function exitFocus(immediate = false) {
  focusTimeline?.kill();
  const finish = () => {
    focusState.active = false;
    focusState.id = null;
    focusState.artBoost = 0;
    document.body.classList.remove('is-focusing');
    document.querySelectorAll('.landmark').forEach(node => node.classList.remove('is-focus'));
    clearSpotlight();
  };
  if (immediate || !camera) {
    Object.assign(focusRig, { x: 0, y: 0, z: 40, fov: 26 });
    Object.assign(focusFx, { fog: 0, shift: 0 });
    finish();
    return;
  }
  focusState.active = true;
  focusTimeline = gsap.timeline({ onComplete: finish })
    .to(focusFx, { fog: .72, shift: 7, duration: .25 }, 0)
    .to(focusRig, { x: 0, y: 0, z: 40, fov: 26, duration: .78, ease: 'power2.inOut' }, 0)
    .to(focusState, { artBoost: 0, duration: .35 }, 0)
    .to(focusFx, { fog: 0, shift: 0, duration: .4 }, .38);
}

function reset() {
  closeDialog();
  hideVisit();
  panoramaControls?.reset();
  document.body.classList.remove('static-transition');
  window.scrollTo({ top: 0, behavior: simple ? 'instant' : 'smooth' });
  targetMouse = { x: 0, y: 0 };
  setMode(null);
  toggleSunrise(false);
  exitFocus(simple);
  const map = document.querySelector('.map-scroll');
  if (innerWidth < 760) map.scrollTo({ left: Math.max(0, (stage.clientWidth - map.clientWidth) * .52), behavior: simple ? 'instant' : 'smooth' });
}

document.querySelector('#reset').onclick = reset;
document.querySelector('.tiny-brand').onclick = e => { e.preventDefault(); reset(); };
addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && !simple && !dialog.open && !focusState.active) targetMouse = { x: (e.clientX / innerWidth - .5) * .65, y: (.5 - e.clientY / innerHeight) * .35 };
});
addEventListener('scroll', () => {
  scrollFraction = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
  document.querySelector('.journey-meter span').style.transform = `scaleX(${scrollFraction})`;
}, { passive: true });

const canvas = document.querySelector('#landscape');
let renderer, camera, scene, target, postScene, postCamera, postMaterial;
let layers = [];
let base;
let fogLayer;
let manifest = {};
let raf = 0;
let last = performance.now();
let baseWidth = 1;
let baseHeight = 1;
const textureLoader = new THREE.TextureLoader();
const background = new THREE.Color('#f2eee3');
const vertex = `varying vec2 vUv;varying float vDistance;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vDistance=length(p.xyz);gl_Position=projectionMatrix*p;}`;
const fragment = `uniform sampler2D map;uniform vec3 paper;uniform float strength;uniform float opacity;uniform float dawn;varying vec2 vUv;varying float vDistance;void main(){vec4 tex=texture2D(map,vUv);float a=tex.a*opacity;if(a<0.012)discard;float dissolve=smoothstep(70.,205.,vDistance)*strength;float gray=dot(tex.rgb,vec3(.299,.587,.114));vec3 c=mix(vec3(gray),tex.rgb,.86);c=mix(c,paper,dissolve);c=mix(c,c*vec3(1.08,.93,.76),dawn*.28);gl_FragColor=vec4(c,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`;
const paperFragment = `uniform sampler2D sceneMap;uniform float dawn;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec4 c=texture2D(sceneMap,vUv);float n=hash(floor(gl_FragCoord.xy))-.5;c.rgb+=n*.018;c.rgb=mix(c.rgb,c.rgb*vec3(.53,.62,.71),dawn);gl_FragColor=c;\n#include <colorspace_fragment>}`;

function addLayer(id, { x = 50, y = 50, z = -85, width = 100, strength = 0, opacity = 1, anchor = 'center', drift = 0, group = 'scenery', placeId = null } = {}) {
  const material = new THREE.ShaderMaterial({ uniforms: { map: { value: null }, paper: { value: background }, strength: { value: strength }, opacity: { value: opacity }, dawn: { value: 0 } }, vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, alphaTest: .012 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.visible = false;
  scene.add(mesh);
  const item = { id, mesh, x, y, z, width, anchor, drift, group, placeId, opacity, currentOpacity: opacity };
  layers.push(item);
  textureLoader.load(asset(id), texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    material.uniforms.map.value = texture;
    item.ratio = texture.image.width / texture.image.height;
    mesh.visible = true;
    placeLayers();
  }, undefined, () => {
    if (id === 'H-BG-01') fallback();
    else status('一张点景图片未加载，其他内容可继续游览。');
  });
  return item;
}

function placeLayers() {
  if (!camera) return;
  const aspect = stage.clientWidth / stage.clientHeight;
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(13)) * 125;
  const vw = vh * aspect;
  baseWidth = Math.max(vw, vh * 1672 / 941);
  baseHeight = baseWidth * 941 / 1672;
  for (const layer of layers) {
    const depth = (40 - layer.z) / 125;
    const width = baseWidth * layer.width / 100 * depth;
    const height = width / (layer.ratio || 1.778);
    let cx = (layer.x / 100 - .5) * baseWidth * depth;
    let cy = (.5 - layer.y / 100) * baseHeight * depth;
    if (layer.anchor === 'ground' && manifest[layer.id]) {
      const meta = manifest[layer.id];
      cx += (.5 - meta.centroidXNormalized) * width;
      cy += (meta.groundYNormalized - .5) * height;
    }
    layer.mesh.scale.set(width, height, 1);
    layer.baseScale = { x: width, y: height };
    layer.mesh.position.set(cx, cy, layer.z);
    layer.originX = cx;
    layer.originY = cy;
  }
}

function syncOverlay() {
  if (!base?.mesh.visible) {
    const width = Math.max(stage.clientWidth, stage.clientHeight * 1672 / 941);
    overlay.style.transform = `translate(${(stage.clientWidth - width) / 2}px,${(stage.clientHeight - width * 941 / 1672) / 2}px) scale(${width / 1000})`;
    return;
  }
  const b = base.mesh;
  const a = new THREE.Vector3(-b.scale.x / 2, b.scale.y / 2, b.position.z).project(camera);
  const c = new THREE.Vector3(b.scale.x / 2, -b.scale.y / 2, b.position.z).project(camera);
  const left = (a.x + 1) / 2 * stage.clientWidth;
  const top = (1 - a.y) / 2 * stage.clientHeight;
  const width = (c.x - a.x) / 2 * stage.clientWidth;
  overlay.style.transform = `translate(${left}px,${top}px) scale(${width / 1000})`;
}

function resize() {
  if (renderer) {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    camera.aspect = stage.clientWidth / stage.clientHeight;
    camera.updateProjectionMatrix();
    target.setSize(Math.round(stage.clientWidth * renderer.getPixelRatio()), Math.round(stage.clientHeight * renderer.getPixelRatio()));
    placeLayers();
  }
  syncOverlay();
  syncRoutePanelLayout();
}

function fallback() {
  cancelAnimationFrame(raf);
  document.body.classList.remove('webgl-ready');
  document.body.classList.add('static-scene');
  base = null;
  syncOverlay();
}

function layerOpacity(layer) {
  if (layer === fogLayer) return focusState.active ? .12 + focusFx.fog * .78 : layer.opacity;
  if (focusState.active) {
    if (layer.group === 'decor') return .06;
  }
  return layer.opacity;
}

try {
  if (new URLSearchParams(location.search).has('static')) throw new Error('Static preview requested');
  renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.background = background;
  camera = new THREE.PerspectiveCamera(26, 1, .1, 500);
  camera.position.set(0, 0, 40);
  target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  postScene = new THREE.Scene();
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postMaterial = new THREE.ShaderMaterial({ uniforms: { sceneMap: { value: target.texture }, dawn: { value: 0 } }, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: paperFragment, depthTest: false, depthWrite: false });
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));

  addLayer('H-BG-03', { z: -160, y: 51, width: 145, strength: .72, opacity: .18 });
  base = addLayer('H-BG-01', { z: -85, x: 50, y: 50, width: 100, strength: .025 });
  addLayer('H-BG-04', { z: -72, x: 46, y: 82, width: 106, opacity: .16, drift: .2 });
  addLayer('H-NT-01', { z: -20, x: 3, y: 107, width: 19, anchor: 'ground', group: 'decor' });
  addLayer('H-NT-04', { z: -18, x: 96, y: 107, width: 22, anchor: 'ground', opacity: .35, group: 'decor' });
  fogLayer = addLayer('H-BG-06', { z: 20, x: 50, y: 106, width: 125, opacity: .34, drift: .14, group: 'fog' });

  fetch(import.meta.env.BASE_URL + 'home-assets/manifest.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => { manifest = {...data,...Object.fromEntries(artImages.map(image=>[image.id,image]))}; if(imageById.has('map-cover'))manifest['H-BG-01']=imageById.get('map-cover'); placeLayers(); }).catch(() => {});
  resize();

  function frame(now) {
    if (document.body.classList.contains('is-guiding')) { last = now; raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(.06, (now - last) / 1000);
    last = now;
    const damping = 1 - Math.exp(-dt * 3);
    if (focusState.active) {
      camera.position.set(focusRig.x, focusRig.y, focusRig.z);
      camera.fov = focusRig.fov;
    } else {
      camera.position.x += ((simple ? 0 : targetMouse.x) - camera.position.x) * damping;
      camera.position.y += ((simple ? 0 : targetMouse.y) - camera.position.y) * damping;
      camera.position.z += ((simple ? 40 : 40 - scrollFraction * 6) - camera.position.z) * damping;
      camera.fov += (26 - camera.fov) * damping;
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    const progress = sunrise ? (simple ? 1 : Math.min(1, (now - sunriseStart) / 9000)) : 0;
    for (const layer of layers) {
      layer.currentOpacity += (layerOpacity(layer) - layer.currentOpacity) * Math.min(1, dt * 5.5);
      layer.mesh.material.uniforms.opacity.value = layer.currentOpacity;
      layer.mesh.material.uniforms.dawn.value = progress;
      const drift = simple ? 0 : Math.sin(now * .00014 + layer.z) * layer.drift;
      layer.mesh.position.x = layer.originX + drift + (layer === fogLayer ? focusFx.shift : 0);
      layer.mesh.position.y = layer.originY;
      if (layer.baseScale) {
        const boost = layer.placeId === focusState.id ? 1 + focusState.artBoost * .14 : 1;
        layer.mesh.scale.set(layer.baseScale.x * boost, layer.baseScale.y * boost, 1);
      }
    }
    postMaterial.uniforms.dawn.value = sunrise ? (1 - progress) * .55 : 0;
    document.querySelector('.sun-glow').style.opacity = sunrise ? String(progress * .85) : '0';
    document.querySelector('.focus-veil').style.opacity = String(focusFx.fog * .72);
    syncOverlay();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
    if (base?.mesh.visible) document.body.classList.add('webgl-ready');
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback(); status('已切换为静态画卷，路线与景点仍可使用。'); });
} catch { fallback(); }

setMode(null);
routeState();
new ResizeObserver(resize).observe(stage);
if (innerWidth < 760) requestAnimationFrame(() => { const map = document.querySelector('.map-scroll'); map.scrollLeft = (stage.clientWidth - map.clientWidth) * .52; });
document.addEventListener('visibilitychange', () => { last = performance.now(); });

const culturalPages = createCulturalPages({getCatalog:()=>catalog,
  onMap:()=>{}, onGuide:id=>openGuide(id),
  onRoute:(id,variant)=>{routeVariants[id]=variant;setMode('travel');selectRoute(id,true);status('已标出路线示意；具体站点与交通方式请以路线详情为准。');},
  onScene:id=>{const local=id==='nantian'?'nantianmen':id;if(places[local])focusPlace(local);else{status('此景点尚无独立画境，已打开真实文化资料。');culturalPages.open('spot',id);}}
});
for(const route of routes)syncVerifiedRoute(route.id);
panoramaControls=installPanoramaControls({stage,viewport:document.querySelector('.map-scroll'),places,catalog,openSpot:id=>culturalPages.open('spot',id)});
document.querySelector('#visit-panel').addEventListener('click',e=>{const b=e.target.closest('[data-cultural-spot]');if(b){const id=b.dataset.culturalSpot;returnPanorama();culturalPages.open('spot',id);}});
const initialPage=location.hash.slice(1).split('?')[0];
if(['map','spot','routes','history','poetry','vision','agent'].includes(initialPage)){
  enterTaishan(true);
  if(initialPage!=='map')setTimeout(()=>culturalPages.open(initialPage,new URLSearchParams(location.hash.split('?')[1]).get('id'),false),0);
}

document.querySelector('#guide-cancel').onclick=()=>{guideWasCancelled=true;guideController?.abort();};
document.querySelector('#guide-retry').onclick=()=>askGuide(lastGuideQuestion);
document.querySelector('#guide-clear').onclick=async()=>{
  const button=document.querySelector('#guide-clear');button.disabled=true;
  try{await requestApi('agent/history',{method:'DELETE'});historyRequest++;stopGuideSpeech();document.querySelector('#guide-transcript-log').innerHTML='<p>对话已清空。</p>';document.querySelector('#guide-sources').replaceChildren();showGuideAnswer({answer:getGuideGreeting(guideContextId)},false);document.querySelector('#guide-retry').hidden=true;setGuideStatus('对话已清空，景点足迹与收藏仍保留','ready');}
  catch(e){setGuideStatus('未能清空：'+e.message,'ready');}finally{button.disabled=false;}
};

catalogReady.then(data=>{
  catalog=data;if(!catalog)return;
  for(const [id,place] of Object.entries(places)){
    if(unavailableSpots.has(id))continue;
    const verified=catalog.spots.find(spot=>spot.id===apiSpotId(id));
    if(verified)place.text=verified.intro+' '+verified.interpretation;
  }
  for(const route of routes)syncVerifiedRoute(route.id);
  panoramaControls.setCatalog(catalog);
  if(guideContextId&&guideScene.classList.contains('is-open')){const current=catalog.spots.find(spot=>spot.id===guideContextId);if(current)document.querySelector('#guide-context').textContent=`正在讲解：${current.name} · 可继续追问此处故事与路线`;}
  routeState();
});

voicePipeline=createVoicePipeline({host:document.querySelector('#guide-voice-input'),input:document.querySelector('#guide-input'),onSubmit:question=>askGuide(question),getAvatar:()=>guideAvatar,waitForAvatar:ensureGuideAvatar,onStatus:setGuideStatus,isOpen:()=>guideScene.classList.contains('is-open'),isBusy:()=>guideBusy});
