/* Dependency-free tests for rules, state, privacy, and the inquiry transport. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const schema = require('../js/chatbot-schema.js');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/chatbot.json')));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/content-catalog.json')));
const source = fs.readFileSync(path.join(root, 'js/chatbot.js'), 'utf8');
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.listeners = {}; this.value = ''; this.checked = false; }
  append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(k, v) { this.attrs[k] = v; }
  focus() { if (this.doc) this.doc.activeElement = this; }
  contains(target) { return this === target || this.children.some(c => c.contains?.(target)); }
  all() { return [this, ...this.children.flatMap(c => c.all?.() || [])]; }
  querySelector(selector) { return this.all().find(e => selector === '[data-chat-back]' ? e.dataset.chatBack !== undefined : ['button', 'a'].includes(e.tag)); }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  async fire(type) { return this.listeners[type]?.({preventDefault() {}}); }
  reportValidity() { return this.all().every(e => !e.required || e.disabled || (e.type === 'checkbox' ? e.checked : !!e.value)); }
  reset() { this.all().forEach(e => { e.value = ''; e.checked = false; }); }
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function boot(config = {}, restored = null, published = null) {
  const store = new Map(restored ? [['ove-chatbot-session-v1', restored]] : []);
  const document = {currentScript: {src: 'http://localhost/js/chatbot.js'}};
  document.createElement = tag => { const e = new Element(tag); e.doc = document; return e; };
  document.createTextNode = text => ({textContent: text});
  document.body = document.createElement('body'); document.activeElement = document.body;
  const calls = []; let responseMode = 'success';
  const context = {document, OveChatSchema:schema, URL, AbortController, crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout,
    requestAnimationFrame: fn => fn(), sessionStorage: {getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k)},
    fetch: async (url, options) => {
      if (String(url).endsWith('/data/content-catalog.json')) return {ok:true,json:async()=>catalog};
      if (String(url).endsWith('/data/chatbot.json')) return {ok: true, json: async () => data};
      if (String(url).endsWith('/data/chatbot-config.json')) return {ok: true, json: async () => config};
      if (String(url).endsWith('/get_published_chatbot')) return {ok:true, json:async()=>published};
      calls.push({url, ...options});
      return {ok: responseMode === 'success'};
    }};
  vm.runInNewContext(source, context); await tick();
  const all = () => document.body.all();
  const find = (cls) => all().find(e => e.className === cls);
  const click = async label => { const target = all().find(e => e.tag === 'button' && e.textContent === label); assert(target, label); await target.fire('click'); };
  const state = () => JSON.parse(store.get('ove-chatbot-session-v1'));
  return {store, calls, all, find, click, state, document, fail: () => {responseMode = 'failure';}, succeed: () => {responseMode = 'success';}};
}
(async () => {
  // Registered graph and internal file links must all resolve.
  for (const node of Object.values(data.nodes)) for (const option of node.buttons) {
    if (option.next) assert(data.nodes[option.next], option.next);
    if (option.href && !option.href.startsWith('https://')) assert(fs.existsSync(path.join(root, option.href.split('?')[0])), option.href);
  }
  const visual = await boot();
  const visualInput = visual.find('ove-chat-composer').children[0];
  visualInput.value='카드뉴스'; await visual.find('ove-chat-composer').fire('submit');
  assert.equal(visual.state().current,'cards');
  const previewCards=visual.all().filter(e=>e.className==='ove-chat-content-card');
  assert.equal(previewCards.length,catalog.items.filter(i=>i.category==='card'&&i.status==='published').length);
  assert(previewCards.every(e=>e.all().some(c=>c.tag==='a'&&c.href.includes('contents.html#'))));
  assert(!previewCards.some(e=>e.all().some(c=>c.textContent==='부산 지명 이야기 카드뉴스')));
  const a = await boot();
  await a.click(data.ui.launcher); await a.click('포트폴리오 보기'); await a.click('성과·배운 점');
  assert.equal(a.state().current, 'results');
  await a.click('이전으로'); assert.equal(a.state().current, 'portfolio');
  const restored = await boot({}, JSON.stringify(a.state()));
  assert.equal(restored.find('ove-chat-panel').hidden, false);
  assert.equal(restored.find('ove-chat-log').children.length, a.state().messages.length);
  const input = a.find('ove-chat-composer').children[0];
  input.value = '영상 보여줘'; await a.find('ove-chat-composer').fire('submit'); assert.equal(a.state().current, 'videos');
  input.value = '오늘 날씨는?'; await a.find('ove-chat-composer').fire('submit'); assert.equal(a.state().current, 'fallback');
  await a.click('대화 초기화'); assert.equal(a.store.size, 0); assert.equal(a.find('ove-chat-log').children.length, 1);
  await a.click('SNS 문의'); await a.click('제작 문의 남기기');
  assert(a.find('ove-chat-submit').disabled, 'Unconfigured backend must not claim it accepts inquiries');

  const config = {supabaseUrl: 'https://example.supabase.co', publishableKey:'sb_publishable_test', rpc:'submit_chatbot_inquiry', privacy:{controller:'Test',contact:'contact@example.com',retention:'test policy'},consentVersion:'test-v1'};
  const b = await boot(config); await b.click(data.ui.launcher); await b.click('SNS 문의'); await b.click('제작 문의 남기기');
  const form = b.find('ove-chat-inquiry');
  const fields = Object.fromEntries(form.all().filter(e => e.name).map(e => [e.name,e]));
  fields.name.value = '테스트'; fields.email.value = 'test@example.com'; fields.message.value = '테스트 문의';
  await form.fire('submit'); assert.equal(b.calls.length, 0, 'No request without consent');
  fields.consent.checked = true; b.fail(); await form.fire('submit');
  assert.equal(b.find('ove-chat-form-status').textContent, data.ui.form.error);
  assert.equal(fields.message.value, '테스트 문의');
  assert(!b.store.get('ove-chatbot-session-v1').includes('test@example.com'), 'Contact fields must not enter sessionStorage');
  b.succeed(); await form.fire('submit');
  assert.equal(b.find('ove-chat-form-status').textContent, data.ui.form.success);
  assert.equal(fields.email.value, ''); assert.equal(fields.consent.checked, false);
  assert.equal(JSON.parse(b.calls[0].body).p_request_id, JSON.parse(b.calls[1].body).p_request_id, 'Retry must be idempotent');
  assert.equal(JSON.parse(b.calls[1].body).p_consent, true);
  assert.equal(b.calls[1].headers.apikey, config.publishableKey);
  const publication = JSON.parse(JSON.stringify(data)); publication.nodes.home.answer='Published answer only';
  const live = await boot(config,null,{version:1,content:publication});
  assert.equal(live.find('ove-chat-log').children[0].children[1].textContent,'Published answer only');
  const invalid = await boot(config,null,{version:2,content:{nodes:{home:{answer:'Broken'}}}});
  assert.equal(invalid.find('ove-chat-log').children[0].children[1].textContent,data.nodes.home.answer,'Invalid remote data must fall back');
  const blocked = await boot({}, '{bad JSON');
  assert.equal(blocked.find('ove-chat-log').children.length, 1, 'Corrupt storage must recover');
  console.log('PASS: graph/links, menu branches, keyword/fallback, back/reset, restore, unconfigured backend, consent gate, failure/success, private-field storage exclusion, idempotent retry, corrupt storage recovery.');
})().catch(error => {console.error(error); process.exitCode = 1;});
