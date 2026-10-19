// Start the real launcher, check the complete application, then stop only this test's process tree.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),windows=process.platform==='win32';
const port=Number(process.env.TAISHAN_TEST_PORT||18625),base=`http://127.0.0.1:${port}`;
const env={...process.env,TAISHAN_PORT:String(port),TAISHAN_NO_OPEN:'1',PYTHONUTF8:'1'};
const child=spawn(windows?'cmd.exe':process.execPath,windows?['/d','/c','Start-Windows.cmd']:['scripts/run.mjs'],{cwd:root,env,stdio:'inherit',detached:!windows});
let exited=false;child.once('exit',()=>exited=true);
const report={platform:process.platform,launcher:windows?'Start-Windows.cmd':'scripts/run.mjs',checks:[]};
try{
 let ready=false;
 for(let i=0;i<600;i++){
  assert.equal(exited,false,'The launcher exited before the application became ready');
  try{const r=await fetch(base+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok){const h=await r.json();assert.equal(h.immersive_available,true);ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(ready,'The complete system did not become ready within ten minutes');
 for(const entry of['/','/index.html','/classic','/classic/map']){
  const r=await fetch(base+entry+'?ui=latest',{redirect:'manual'});assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/experience/?ui=latest');
 }
 report.checks.push('all entrypoints redirect to the latest interface');
 const html=await fetch(base+'/experience/').then(r=>{assert.equal(r.status,200);return r.text();});
 for(const[,url]of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))assert.equal((await fetch(new URL(url,base),{method:'HEAD'})).status,200,url);
 for(const url of['/experience/design-assets/map-clean-desktop.webp','/experience/models/princess-agent-web-v4.glb','/experience/models/cable-car-optimized.glb']){
  const r=await fetch(base+url);assert.equal(r.status,200,url);const data=new Uint8Array(await r.arrayBuffer());assert.ok(data.length>1000,url);if(url.endsWith('.glb'))assert.equal(new TextDecoder().decode(data.slice(0,4)),'glTF');
 }
 report.checks.push('built HTML, JavaScript, CSS, map and both 3D models are served');
 for(const[name,count]of[['spots',19],['routes',4],['history',7],['poems',3]]){
  const r=await fetch(base+'/api/'+name);assert.equal(r.status,200);assert.equal((await r.json()).length,count,name);
 }
 const catalog=await fetch(base+'/api/catalog').then(r=>r.json());assert.equal(catalog.scenes.length,3);
 for(const scene of catalog.scenes)assert.equal((await fetch(base+'/api/scenes/'+scene.id)).status,200);
 for(const name of['app.js','map.js','ui.js','assistant.js','style.css'])assert.equal((await fetch(base+'/'+name)).status,410);
 report.checks.push('catalogue APIs work and legacy bundles return 410');
 mkdirSync(path.join(root,'taishan/runtime'),{recursive:true});writeFileSync(path.join(root,'taishan/runtime/startup-smoke.json'),JSON.stringify(report,null,2)+'\n');
 console.log('STARTUP SMOKE PASSED',JSON.stringify(report));
}finally{
 if(windows)spawnSync('taskkill',['/pid',String(child.pid),'/T','/F'],{stdio:'ignore'});
 else {
  try{process.kill(-child.pid,'SIGTERM');}catch{}
  await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);
  if(!exited)try{process.kill(-child.pid,'SIGKILL');}catch{}
 }
}
