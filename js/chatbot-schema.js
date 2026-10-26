/* Shared validation for editor, preview and public chatbot. */
(function(root) {
  'use strict';
  const uiKeys = ['title','subtitle','launcher','close','back','home','reset','placeholder','send','loadError','retry','storageWarning','empty','resetNotice'];
  const formKeys = ['name','email','message','submit','pending','consent','notice','unavailable','success','error','invalid'];
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  const text = (s,max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  function safeHref(href) {
    if (!text(href,2048) || /[\x00-\x20\\]/.test(href)) return false;
    if (/^https:\/\//i.test(href)) { try { const u = new URL(href); return !!u.hostname && !u.username && !u.password; } catch { return false; } }
    return !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) && !href.startsWith('/');
  }
  function validate(doc) {
    const errors = [];
    if (!object(doc) || !object(doc.nodes) || !object(doc.ui)) return ['ui와 nodes 객체가 필요합니다.'];
    if (JSON.stringify(doc).length > 200000) errors.push('전체 데이터는 200KB 이하여야 합니다.');
    if (doc.version !== 1) errors.push('데이터 형식 version은 1이어야 합니다.');
    const ids = Object.keys(doc.nodes);
    if (ids.length < 2 || ids.length > 200) errors.push('안내 항목은 2~200개여야 합니다.');
    if (!own(doc.nodes,'home') || !own(doc.nodes,'fallback')) errors.push('home과 fallback 항목이 필요합니다.');
    uiKeys.forEach(k => { if (!text(doc.ui[k],1000)) errors.push(`공통 문구 ${k}: 1~1000자 텍스트가 필요합니다.`); });
    if (!object(doc.ui.form)) errors.push('문의 양식 공통 문구(form)가 필요합니다.');
    else formKeys.forEach(k => { if (!text(doc.ui.form[k],2000)) errors.push(`문의 양식 ${k}: 1~2000자 텍스트가 필요합니다.`); });
    ids.forEach(id => {
      if (!/^[a-z][a-z0-9_-]{0,63}$/.test(id) || ['constructor','prototype'].includes(id)) errors.push(`항목 ID ${id}는 영문 소문자로 시작하는 안전한 이름이어야 합니다.`);
      const node = doc.nodes[id];
      if (!object(node)) { errors.push(`${id}: 항목 형식이 잘못됐습니다.`); return; }
      if (!text(node.answer,8000)) errors.push(`${id}: 답변은 1~8000자여야 합니다.`);
      for (const k of ['questions','keywords']) {
        if (!Array.isArray(node[k]) || node[k].length > 100 || node[k].some(s => !text(s,200))) errors.push(`${id}: ${k}는 200자 이하 텍스트 목록(최대 100개)이어야 합니다.`);
      }
      if (node.form !== undefined && node.form !== 'inquiry') errors.push(`${id}: 지원하지 않는 양식입니다.`);
      if (!Array.isArray(node.buttons) || node.buttons.length > 12) { errors.push(`${id}: 버튼은 최대 12개입니다.`); return; }
      node.buttons.forEach((b,i) => {
        if (!object(b) || !text(b.label,120)) { errors.push(`${id} 버튼 ${i+1}: 이름이 필요합니다.`); return; }
        if (!!b.next === !!b.href) errors.push(`${id} 버튼 ${i+1}: 이동 항목 또는 링크 하나만 지정하세요.`);
        if (b.next && !own(doc.nodes,b.next)) errors.push(`${id}: 연결된 항목 ${b.next}가 없습니다.`);
        if (b.href && !safeHref(b.href)) errors.push(`${id}: HTTPS 또는 사이트 내부 상대 링크만 사용하세요.`);
      });
    });
    return errors;
  }
  const api = {validate,safeHref,uiKeys,formKeys};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OveChatSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
