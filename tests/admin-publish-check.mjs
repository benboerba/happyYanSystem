import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../admin.js', import.meta.url), 'utf8');
function setup() {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { value: '', files: [], disabled: false, hidden: true, textContent: '', classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {} });
    return nodes.get(id);
  };
  const requests = [];
  class XHR {
    upload = {};
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader() {}
    send(body) { this.body = body; requests.push(this); }
    respond(status, body) { this.status = status; this.responseText = typeof body === 'string' ? body : JSON.stringify(body); this.onload(); this.onloadend(); }
    abort() { this.onabort(); this.onloadend(); }
  }
  const controls = ['#publish','#saveDraft','#remove','#actionNameInput','#categorySelect','#tipsInput','#videoInput','#imageInput','#coursewareSelect','#lockAdmin'].map(node);
  const context = vm.createContext({ console, URL, structuredClone, XMLHttpRequest: XHR, WeakMap, location: { href: 'https://example.com/spine-rehab/admin' }, document: { currentScript: { src: 'https://example.com/spine-rehab/admin.js' }, querySelector: node, querySelectorAll: () => controls, body: { classList: { add() {}, remove() {} } }, addEventListener() {} }, sessionStorage: { getItem: () => '', removeItem() {} }, requestAnimationFrame: f => f(), setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, context);
  node('#actionNameInput').value = '测试动作'; node('#categorySelect').value = 'extension'; node('#tipsInput').value = '注意呼吸';
  node('#videoInput').files = [{ name: 'demo.mp4', type: 'video/mp4', size: 1024 }];
  node('#imageInput').files = [{ name: 'demo.png', type: 'image/png', size: 1024 }];
  return { node, requests, context, run: s => vm.runInContext(s, context) };
}
const tick = () => new Promise(r => setImmediate(r));
{
 const t = setup(); t.node('#actionNameInput').value = '';
 await t.run('persist("published")'); assert.equal(t.requests.length, 0); assert.match(t.node('#saveProgressText').textContent, /动作名称/);
 t.node('#actionNameInput').value = '测试'; t.node('#videoInput').files[0].size = 301 * 1024 * 1024;
 await t.run('persist("published")'); assert.equal(t.requests.length, 0); assert.match(t.node('#saveProgressText').textContent, /300 MB/);
}
{
 const t = setup(); const first = t.run('persist("published")');
 assert.equal(t.node('#saveDraft').disabled, true); await t.run('persist("draft")'); assert.equal(t.requests.length, 1);
 t.requests[0].upload.onprogress({ lengthComputable: true, loaded: 512, total: 1024 }); assert.match(t.node('#saveProgressText').textContent, /50%/);
 t.requests[0].respond(201, { url: '/uploads/video.mp4' }); await tick();
 t.requests[1].respond(201, { url: '/uploads/image.png' }); await tick();
 const failed = t.requests[2]; failed.ontimeout(); failed.onloadend(); await first;
 assert.equal(t.node('#publish').disabled, false); assert.equal(t.run('draft.status'), 'draft');
 assert.match(t.node('#saveProgressText').textContent, /超时/);
 const retry = t.run('persist("published")'); await tick();
 assert.equal(t.requests.length, 4); const last = t.requests[3]; assert.equal(last.method, 'PUT'); assert.equal(last.url, failed.url);
 const item = { ...JSON.parse(last.body), id: last.url.split('/').at(-1) };
 t.node('#coursewareSelect').value = item.id;
 last.respond(200, { item }); await retry;
 assert.equal(t.run('draft.status'), 'published'); assert.match(t.node('#saveProgressText').textContent, /发布成功/);
}
for (const mode of ['network', 'html413', 'auth']) {
 const t = setup(); const work = t.run('persist("published")'); const req = t.requests[0];
 if (mode === 'network') { req.onerror(); req.onloadend(); } else if (mode === 'html413') req.respond(413, '<html>too large</html>'); else req.respond(401, { error: '访问码不正确' });
 await work; assert.equal(t.node('#publish').disabled, false); assert.equal(t.requests.length, 1); assert.equal(t.run('draft.status'), 'draft');
 assert.match(t.node('#saveProgressText').textContent, /网络|300 MB|访问码/);
}
console.log('发布回归通过：校验、进度、重复点击、超时重试复用文件和 ID、网络中断、413、401、成功状态。');
