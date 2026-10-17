// One entry point for the complete local system, including backend-only API configuration.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = path.join(root, 'taishan');
const windows = process.platform === 'win32';
const python = path.join(backend, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
const dev = process.argv.includes('--dev');
const children = new Set();
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    children.add(child);
    child.once('error', reject);
    child.once('exit', code => { children.delete(child); code === 0 ? resolve() : reject(new Error(`${path.basename(command)} 启动失败（${code}）`)); });
  });
}
try {
  if (!existsSync(python)) {
    const candidates = windows ? [['py', '-3.12'], ['py', '-3'], ['python'], ['python3']] : [['python3'], ['python']];
    const selected = candidates.find(([command, ...prefix]) => spawnSync(command, [...prefix, '-c', 'import sys; sys.exit(sys.version_info < (3,12))'], { stdio: 'ignore' }).status === 0);
    if (!selected) throw new Error('请先安装 Python 3.12 或更新版本，并加入 PATH；无需申请或填写 API 密钥。');
    console.log('首次运行：创建后端 Python 环境…');
    await run(selected[0], [...selected.slice(1), '-m', 'venv', path.join(backend, '.venv')]);
  }
  const requirements = path.join(backend, 'requirements.lock.txt');
  const digest = createHash('sha256').update(readFileSync(requirements)).digest('hex');
  const marker = path.join(backend, '.venv', '.taishan-requirements');
  if (!existsSync(marker) || readFileSync(marker, 'utf8') !== digest) {
    console.log('安装/核对后端依赖…');
    await run(python, ['-m', 'pip', 'install', '-r', requirements]);
    await run(python, ['-m', 'pip', 'check']);
    writeFileSync(marker, digest);
  }
  const env = { ...process.env };
  for (const filename of ['config/team.env', '.env']) {
    const file = path.join(backend, filename);
    if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
  }
  if (!env.COZE_API_TOKEN || !env.LLM_API_KEY) console.warn('团队 AI 配置未完整加载；检查是否拉取 codex/taishan-integration 分支，以及旧 taishan/.env 是否用空值覆盖凭证。历史长卷仍可读取。');
  // Avoid silently using another project's process or a stale backend.
  const net = await import('node:net');
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error('本机 18605 端口已占用，请先停止旧后端，再重新启动本项目。')));
    probe.listen(18605, '127.0.0.1', () => probe.close(resolve));
  });
  if (!dev) {
    console.log('构建沉浸式前端…');
    await run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--target', 'esnext']);
  }
  const server = spawn(python, ['-m', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', '18605'], { cwd: backend, env, stdio: 'inherit' });
  children.add(server);
  server.once('error', error => { console.error(error.message); stop(1); });
  server.once('exit', code => { children.delete(server); stop(code || 0); });
  let health;
  for (let attempt = 0; attempt < 80 && !closing; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:18605/api/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) { health = await response.json(); break; }
    } catch { /* The process may still be importing its dependencies. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!health) throw new Error('后端未能就绪，请检查上方启动日志。');
  const events = await fetch('http://127.0.0.1:18605/api/history').then(response => { if (!response.ok) throw new Error('历史资料接口不可用'); return response.json(); });
  console.log(`后端 ${health.version} 已就绪；历史资料 ${events.length} 条；问山配置 ${health.llm_configured ? '已加载' : '未加载'}；识景配置 ${health.vision_available ? '已加载' : '未加载'}。`);
  if (dev) {
    console.log('完整开发环境：http://127.0.0.1:4173/experience/#history（前后端均已启动）');
    await run(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '4173', '--strictPort']);
    stop();
  } else console.log('完整系统：http://127.0.0.1:18605/experience/#history\n问山：http://127.0.0.1:18605/experience/#agent\n识景：http://127.0.0.1:18605/experience/#vision');
} catch (error) {
  console.error(error.message);
  stop(1);
}
