/* Public visitor notes are stored on the server and moderated before publication. */
(() => {
  'use strict';
  const form = document.querySelector('#visitor-review-form');
  if (!form) return;
  const list = document.querySelector('#visitor-review-list');
  const status = document.querySelector('#review-submit-status');
  const more = document.querySelector('#more-visitor-reviews');
  const retry = document.querySelector('#retry-visitor-reviews');
  const submit = form.querySelector('button[type=submit]');
  const attempts = new Map();
  let config, resource, generation = 0, offset = 0, loading = false, pending = false;
  const node = (tag,text) => { const e=document.createElement(tag); e.textContent=text; return e; };
  const ready = fetch('data/chatbot-config.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(c=>{
    if (!c?.reviewsEnabled || !c.publishableKey || c.publishableKey.startsWith('sb_secret_') || new URL(c.supabaseUrl).protocol!=='https:') return null;
    return {...c,supabaseUrl:new URL(c.supabaseUrl).origin};
  }).catch(()=>null);
  async function rpc(name,body) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try {
      const r=await fetch(config.supabaseUrl+'/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      if(!r.ok) throw new Error('server'); return await r.json();
    } finally { clearTimeout(timer); }
  }
  async function load(append=false) {
    if(!config || !resource || loading) return;
    const current=generation, target=resource;
    loading=true;more.disabled=true;retry.hidden=true;
    if(!append){offset=0;list.replaceChildren(node('p','후기를 불러오고 있습니다.'));}
    try {
      const rows=await rpc('list_visitor_reviews',{p_resource:target,p_offset:offset});
      if(current!==generation)return;
      if(!Array.isArray(rows))throw new Error('format');
      if(!append)list.replaceChildren();
      if(!rows.length && !append)list.append(node('p','아직 공개된 후기가 없습니다. 첫 소감을 남겨 주세요.'));
      rows.forEach(review=>{
        const card=node('article','');card.className='review-entry';
        const head=node('header',''),time=node('time',new Date(review.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Tokyo'}));time.dateTime=review.created_at;
        head.append(node('strong',review.nickname),time);card.append(head,node('p',review.message));list.append(card);
      });
      offset+=rows.length;more.hidden=rows.length<20;
    }catch{if(current===generation){if(!append)list.replaceChildren(node('p','후기를 불러오지 못했습니다. 다시 시도해 주세요.'));retry.hidden=false;}}
    finally{if(current===generation){loading=false;more.disabled=false;}}
  }
  document.addEventListener('ove-resource-open',async event=>{
    const current=++generation;resource=event.detail.resource;offset=0;loading=false;pending=false;
    form.reset();submit.disabled=true;more.hidden=true;retry.hidden=true;list.replaceChildren();
    status.textContent='후기 연결 상태를 확인하고 있습니다.';
    config=await ready;if(current!==generation)return;
    submit.disabled=!config;
    status.textContent=config?'등록한 후기는 관리자 확인 후 공개됩니다.':'후기 등록 서버를 준비 중입니다. 현재 후기는 전송되지 않습니다.';
    if(config)load();else list.append(node('p','방문자 후기 공개를 준비하고 있습니다.'));
  });
  more.addEventListener('click',()=>load(true));retry.addEventListener('click',()=>load(false));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending||!config||!resource||!form.reportValidity())return;
    const message=form.elements.message.value.trim(),nickname=form.elements.nickname.value.trim()||'방문자';
    if(message.length<10){status.textContent='방문 소감은 10자 이상 적어 주세요.';return;}
    const body={p_resource:resource,p_nickname:nickname,p_message:message,p_consent:form.elements.consent.checked};
    const fingerprint=JSON.stringify(body);if(!attempts.has(fingerprint))attempts.set(fingerprint,crypto.randomUUID());
    const current=generation;pending=true;submit.disabled=true;status.textContent='후기를 접수하고 있습니다.';
    try{
      await rpc('submit_visitor_review',{p_request_id:attempts.get(fingerprint),...body});
      if(current!==generation)return;
      attempts.delete(fingerprint);form.reset();status.textContent='후기가 접수됐습니다. 관리자 확인 후 이 장소의 후기 목록에 공개됩니다.';
    }catch{if(current===generation)status.textContent='접수를 확인하지 못했습니다. 내용을 유지했으니 다시 눌러 주세요. 같은 내용은 중복 접수되지 않습니다.';}
    finally{if(current===generation){pending=false;submit.disabled=false;}}
  });
})();
