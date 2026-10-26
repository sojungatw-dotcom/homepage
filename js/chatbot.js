/* Registered content only. No model, generated responses, or third-party SDK. */
(() => {
  'use strict';
  const scriptUrl = new URL(document.currentScript.src);
  const root = new URL('../', scriptUrl);
  const storageKey = 'ove-chatbot-session-v1';
  const previewMode = globalThis.oveChatbotPreview === true;
  const schema = globalThis.OveChatSchema;
  const validDocument = candidate => !!candidate?.ui && !!candidate?.nodes?.home && !!candidate?.nodes?.fallback && (!schema || schema.validate(candidate).length === 0);
  let data, catalog = [], config = {}, state, panel, launcher, log, choices, inquiryHost, question, status;
  let pending = false, requestId = null, requestBody = null, requestController = null, formGeneration = 0;
  let storageAvailable = true;
  const el = (tag, className, text) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const button = (label, handler, className = '') => {
    const item = el('button', className, label);
    item.type = 'button';
    item.addEventListener('click', handler);
    return item;
  };
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
  function match(text) {
    const query = normalize(text);
    if (!query) return null;
    const entries = Object.entries(data.nodes).filter(([id]) => !['home', 'fallback'].includes(id));
    const exact = entries.find(([, node]) => (node.questions || []).some(q => normalize(q) === query));
    if (exact) return exact[0];
    // Longest keyword wins; contextual next steps break ties deterministically.
    const local = new Set(data.nodes[state.current].buttons.map(b => b.next));
    const candidates = entries.flatMap(([id, node], order) => (node.keywords || []).map(keyword => {
      const key = normalize(keyword);
      return key && query.includes(key) ? {id, length: key.length, local: local.has(id) ? 1 : 0, order} : null;
    }).filter(Boolean));
    candidates.sort((a, b) => b.length - a.length || b.local - a.local || a.order - b.order);
    return candidates[0]?.id || 'fallback';
  }
  function fresh() { return {version: 1, current: 'home', trail: [], messages: [{node: 'home'}], open: false}; }
  function save() {
    if (previewMode) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(state)); }
    catch { storageAvailable = false; }
  }
  function restore() {
    if (previewMode) return {...fresh(), open: true};
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey));
      if (saved?.version === 1 && data.nodes[saved.current] && Array.isArray(saved.messages) &&
          saved.messages.every(m => m && (data.nodes[m.node] || (typeof m.text === 'string' && m.text.length <= 500))) &&
          Array.isArray(saved.trail) && saved.trail.every(id => data.nodes[id])) {
        return {version: 1, current: saved.current, trail: saved.trail.slice(-100), messages: saved.messages.slice(-100), open: saved.open === true};
      }
    } catch { /* A blocked or corrupt storage must not prevent a new conversation. */ }
    return fresh();
  }
  function safeLink(href) {
    try {
      const url = new URL(href, root);
      return (url.origin === root.origin && ['http:', 'https:'].includes(url.protocol)) || url.protocol === 'https:' ? url : null;
    } catch { return null; }
  }
  async function loadCatalog() {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try {
      const response=await fetch(new URL('data/content-catalog.json',root),{cache:'no-store',signal:controller.signal});
      const value=response.ok?await response.json():null;
      catalog=Array.isArray(value?.items)?value.items.filter(item=>item&&/^[a-z][a-z0-9-]*$/.test(item.id)&&typeof item.title==='string'&&typeof item.description==='string'&&['card','video'].includes(item.category)&&['published','production','planning'].includes(item.status)):[];
    } catch { catalog=[]; } finally { clearTimeout(timer); }
  }
  function contentCards(nodeId) {
    const category={cards:'card',videos:'video',works:'all'}[nodeId];
    if(!category)return null;
    const items=catalog.filter(item=>(category==='all'||item.category===category)&&item.status==='published');
    if(!items.length)return null;
    const cards=el('div','ove-chat-cards');cards.setAttribute('aria-label',category==='card'?'카드뉴스 미리보기':'공개 콘텐츠 미리보기');
    items.forEach(item=>{
      const card=el('article','ove-chat-content-card');
      const href=safeLink('contents.html#'+item.id);
      const link=el('a');link.href=href.href;link.target='_blank';link.rel='noopener noreferrer';
      if(item.thumbnail&&safeLink(item.thumbnail)){
        const image=el('img');image.src=safeLink(item.thumbnail).href;image.alt=item.title+' 표지';image.loading='lazy';
        image.addEventListener('error',()=>{image.hidden=true;});link.append(image);
      }
      link.append(el('strong','',item.title));
      card.append(link,el('small','',item.category==='card'?'CARD NEWS · 업로드 완료':'VIDEO · 업로드 완료'),el('p','ove-chat-card-summary',item.description));
      const detail=el('a','ove-chat-card-link','콘텐츠 보기 ↗');detail.href=href.href;detail.target='_blank';detail.rel='noopener noreferrer';card.append(detail);cards.append(card);
    });
    return cards;
  }
  function renderLog() {
    log.replaceChildren();
    state.messages.forEach(message => {
      const text = message.node ? data.nodes[message.node].answer : message.text;
      const item = el('div', `ove-chat-message ${message.node ? 'ove-chat-bot' : 'ove-chat-user'}`);
      item.append(el('span', 'ove-chat-speaker', message.node ? 'OVE' : '나'), el('p', '', text));
      if(message.node){const cards=contentCards(message.node);if(cards)item.append(cards);}
      log.append(item);
    });
    requestAnimationFrame(() => { const last=log.children[log.children.length-1]; log.scrollTop=['cards','videos','works'].includes(state.current)&&last?last.offsetTop-log.offsetTop:log.scrollHeight; });
  }
  function cancelForm() {
    formGeneration++;
    requestController?.abort();
    requestController = null;
    pending = false;
    requestId = null;
    requestBody = null;
  }
  function renderStep() {
    cancelForm();
    choices.replaceChildren();
    inquiryHost.replaceChildren();
    const node = data.nodes[state.current];
    node.buttons.forEach(option => {
      if (option.next && data.nodes[option.next]) {
        choices.append(button(option.label, () => go(option.next, option.label), 'ove-chat-choice'));
      } else if (option.href) {
        const url = safeLink(option.href);
        if (!url) return;
        const a = el('a', 'ove-chat-choice', `${option.label} ↗`);
        a.href = url.href;
        a.target = '_blank'; a.rel = 'noopener noreferrer';
        choices.append(a);
      }
    });
    panel.querySelector('[data-chat-back]').disabled = !state.trail.length;
    if (node.form === 'inquiry') renderInquiry();
    renderLog();
    // If a selected button was removed, place keyboard focus on its replacement.
    if (panel.contains(document.activeElement) || document.activeElement === document.body) {
      choices.querySelector('button, a')?.focus({preventScroll: true});
    }
  }
  function go(id, userText) {
    if (!data.nodes[id]) id = 'fallback';
    state.trail.push(state.current);
    state.trail = state.trail.slice(-100);
    state.current = id;
    if (userText) state.messages.push({text: userText});
    state.messages.push({node: id});
    state.messages = state.messages.slice(-100);
    status.textContent = '';
    save(); renderStep();
  }
  function setOpen(open) {
    state.open = open;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? data.ui.close : data.ui.launcher);
    save();
    if (open) question.focus(); else launcher.focus();
  }
  function ready() {
    if (previewMode) return false;
    try {
      const url = new URL(config.supabaseUrl);
      const localDev = typeof location !== 'undefined' && ['127.0.0.1','localhost'].includes(location.hostname) && url.protocol === 'http:' && url.hostname === location.hostname;
      return (url.protocol === 'https:' || localDev) && !!config.publishableKey && !config.publishableKey.startsWith('sb_secret_') && !!config.rpc &&
        ['controller', 'contact', 'retention'].every(key => typeof config.privacy?.[key] === 'string' && config.privacy[key].trim());
    } catch { return false; }
  }
  function renderInquiry() {
    const ui = data.ui.form;
    const form = el('form', 'ove-chat-inquiry');
    form.setAttribute('aria-label', '제작 문의');
    const field = (name, labelText, tag, type, max) => {
      const label = el('label', 'ove-chat-field', labelText);
      const input = el(tag);
      input.name = name; input.required = true; input.maxLength = max;
      if (type) input.type = type;
      input.autocomplete = name === 'name' ? 'name' : name === 'email' ? 'email' : 'off';
      if (tag === 'textarea') input.rows = 3;
      label.append(input); form.append(label);
      return input;
    };
    const name = field('name', ui.name, 'input', 'text', 80);
    const email = field('email', ui.email, 'input', 'email', 254);
    const message = field('message', ui.message, 'textarea', null, 2000);
    const privacy = el('details', 'ove-chat-privacy');
    privacy.append(el('summary', '', '개인정보 수집·이용 안내'));
    privacy.append(el('p', '', ui.notice));
    if (ready()) {
      privacy.append(el('p', '', `처리자: ${config.privacy.controller}\n개인정보 문의: ${config.privacy.contact}\n보유·이용 기간: ${config.privacy.retention}`));
    }
    form.append(privacy);
    const consentLabel = el('label', 'ove-chat-consent');
    const consent = el('input'); consent.type = 'checkbox'; consent.required = true; consent.name = 'consent';
    consentLabel.append(consent, document.createTextNode(ui.consent));
    const feedback = el('p', 'ove-chat-form-status'); feedback.setAttribute('role', 'status');
    const submit = el('button', 'ove-chat-submit', ui.submit); submit.type = 'submit';
    if (!ready()) { feedback.textContent = ui.unavailable; submit.disabled = true; consent.disabled = true; }
    form.append(consentLabel, submit, feedback);
    inquiryHost.append(form);
    const generation = formGeneration;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending || !ready()) return;
      if (!form.reportValidity() || !name.value.trim() || !message.value.trim() || !consent.checked) {
        feedback.textContent = ui.invalid; return;
      }
      const body = {p_name: name.value.trim(), p_email: email.value.trim(), p_message: message.value.trim(), p_consent_version: config.consentVersion, p_consent: true};
      const signature = JSON.stringify(body);
      if (requestBody !== signature) { requestId = crypto.randomUUID(); requestBody = signature; }
      pending = true; submit.disabled = true; feedback.textContent = ui.pending;
      [name, email, message, consent].forEach(input => { input.disabled = true; });
      requestController = new AbortController();
      const timer = setTimeout(() => requestController?.abort(), 15000);
      try {
        const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${encodeURIComponent(config.rpc)}`, {
          method: 'POST', headers: {'Content-Type': 'application/json', apikey: config.publishableKey},
          body: JSON.stringify({...body, p_request_id: requestId}), signal: requestController.signal
        });
        if (!response.ok) throw new Error('inquiry_not_saved');
        if (generation !== formGeneration) return;
        form.reset();
        feedback.textContent = ui.success;
        requestId = null; requestBody = null;
      } catch {
        if (generation === formGeneration) feedback.textContent = ui.error;
      } finally {
        clearTimeout(timer);
        if (generation === formGeneration) {
          pending = false; submit.disabled = false;
          [name, email, message, consent].forEach(input => { input.disabled = false; });
          requestController = null;
        }
      }
    });
  }
  function mount() {
    state = restore();
    const widget = el('div', 'ove-chat-widget');
    launcher = button(data.ui.launcher, () => setOpen(!state.open), 'ove-chat-launcher');
    launcher.setAttribute('aria-controls', 'ove-chat-panel');
    launcher.setAttribute('aria-expanded', String(state.open));
    launcher.setAttribute('aria-label', state.open ? data.ui.close : data.ui.launcher);
    panel = el('section', 'ove-chat-panel'); panel.id = 'ove-chat-panel';
    panel.hidden = !state.open;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'ove-chat-title');
    const header = el('header', 'ove-chat-header');
    const avatar = el('span', 'ove-chat-avatar', 'ove'); avatar.setAttribute('aria-hidden', 'true');
    const titleBox = el('div'); const title = el('h2', '', data.ui.title); title.id = 'ove-chat-title';
    titleBox.append(title, el('p', '', data.ui.subtitle));
    const close = button('×', () => setOpen(false), 'ove-chat-close'); close.setAttribute('aria-label', data.ui.close);
    header.append(avatar, titleBox, close);
    log = el('div', 'ove-chat-log'); log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite'); log.setAttribute('aria-label', '대화 내용'); log.tabIndex = 0;
    const actionArea = el('div', 'ove-chat-actions');
    choices = el('div', 'ove-chat-choices'); choices.setAttribute('aria-label', '다음 선택지');
    inquiryHost = el('div');
    actionArea.append(choices, inquiryHost);
    const nav = el('nav', 'ove-chat-nav'); nav.setAttribute('aria-label', '대화 이동');
    const back = button(data.ui.back, () => {
      const previous = state.trail.pop();
      if (!previous) return;
      state.current = previous; state.messages.push({node: previous});
      state.messages = state.messages.slice(-100); save(); renderStep();
    }); back.dataset.chatBack = '';
    nav.append(back, button(data.ui.home, () => go('home')), button(data.ui.reset, () => {
      const open = state.open;
      cancelForm();
      if (!previewMode) { try { sessionStorage.removeItem(storageKey); } catch { storageAvailable = false; } }
      state = fresh(); state.open = open;
      question.value = '';
      renderStep(); status.textContent = data.ui.resetNotice;
      question.focus();
      // Do not re-save: reset removes the session entry, including all prior state.
    }));
    const composer = el('form', 'ove-chat-composer');
    question = el('input'); question.type = 'text'; question.maxLength = 500;
    question.placeholder = data.ui.placeholder; question.setAttribute('aria-label', data.ui.placeholder); question.autocomplete = 'off';
    const send = el('button', '', data.ui.send); send.type = 'submit';
    composer.append(question, send);
    status = el('p', 'ove-chat-status'); status.setAttribute('role', 'status');
    composer.addEventListener('submit', event => {
      event.preventDefault();
      const text = question.value.trim();
      if (!text) { status.textContent = data.ui.empty; return; }
      const command = normalize(text);
      if (command === normalize(data.ui.home)) go('home', text);
      else go(match(text), text);
      question.value = ''; question.focus();
    });
    panel.append(header, log, actionArea, nav, composer, status);
    widget.append(panel, launcher); document.body.append(widget);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    });
    renderStep();
    if (!storageAvailable) status.textContent = data.ui.storageWarning;
  }
  async function load() {
    await loadCatalog();
    if (previewMode) {
      data = await globalThis.oveChatbotPreviewReady;
      if (!validDocument(data)) throw new Error('invalid_preview');
      config = {}; mount();
      globalThis.parent.postMessage({type:'ove-chatbot-preview-rendered', nonce:globalThis.oveChatbotPreviewNonce}, location.origin);
      return;
    }
    const response = await fetch(new URL('data/chatbot.json', root), {cache:'no-store'});
    if (!response.ok) throw new Error('content_unavailable');
    data = await response.json();
    if (!validDocument(data)) throw new Error('invalid_content');
    try {
      const response = await fetch(new URL('data/chatbot-config.json', root), {cache:'no-store'});
      config = response.ok ? await response.json() : {};
    } catch { config = {}; }
    // Only the server's published pointer is public. Drafts and history require an admin JWT.
    try {
      const url = new URL(config.supabaseUrl);
      const localDev = typeof location !== 'undefined' && ['127.0.0.1','localhost'].includes(location.hostname) && url.protocol === 'http:' && url.hostname === location.hostname;
      if ((url.protocol === 'https:' || localDev) && config.publishableKey && !config.publishableKey.startsWith('sb_secret_')) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const result = await fetch(url.origin+'/rest/v1/rpc/get_published_chatbot', {
            method:'POST', cache:'no-store', headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
            body:'{}', signal:controller.signal
          });
          if (result.ok) {
            const published = await result.json();
            if (published?.content && validDocument(published.content)) data = published.content;
          }
        } finally { clearTimeout(timer); }
      }
    } catch { /* Keep the validated static document available during backend outages. */ }
    mount();
  }
  function fail() {
    const warning = button('안내 데이터를 불러오지 못했습니다. 다시 불러오기', () => {
      warning.disabled = true;
      load().then(() => warning.remove()).catch(() => { warning.disabled = false; });
    }, 'ove-chat-launcher');
    document.body.append(warning);
  }
  load().catch(fail);
})();
