(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const schema = window.OveChatSchema;
  let config, token=null, sessionId=0, expiryTimer, serverState, doc, savedText=null, reviewedText=null;
  let currentNode='home', rawDirty=false, buttonsTextValid=true, busy=false, previewCounter=0, previewPending=null;
  let versionCursor=null, inquiryPage=0, inquiryHasNext=false, reviewPage=0, reviewHasNext=false;
  const stringify = o => JSON.stringify(o,null,2);
  const canonical = o => JSON.stringify(o);
  const clone = o => JSON.parse(JSON.stringify(o));
  const elem = (tag,text,cls) => {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const action = (label,fn) => {const b=elem('button',label);b.type='button';b.addEventListener('click',()=>run(fn));return b;};
  const stamp = s => s ? new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Tokyo',hour12:false}) : '—';
  const status = (s,error=false) => {$('#admin-status').textContent=s;$('#admin-status').dataset.kind=error?'error':'info';};
  const dirty = () => rawDirty || !!doc && canonical(doc)!==savedText;
  const validate = () => {
    const errors=schema.validate(doc);
    if(rawDirty)errors.unshift('전체 JSON을 먼저 편집기에 적용하세요.');
    if(!buttonsTextValid)errors.unshift('다음 버튼 JSON 형식을 확인하세요.');
    const list=$('#validation-errors');list.replaceChildren(...errors.map(s=>elem('li',s)));list.hidden=!errors.length;
    return !errors.length;
  };
  function updateButtons(){
    if(!doc)return;
    $('#publish').disabled=busy || dirty() || reviewedText!==canonical(doc) || !savedText;
    $('#preview').disabled=busy || dirty() || !savedText || !buttonsTextValid;
    $('#delete-node').disabled=busy || ['home','fallback'].includes(currentNode);
    $('#more-versions').disabled=busy;
    $('#prev-inquiries').disabled=busy || inquiryPage===0;
    $('#next-inquiries').disabled=busy || !inquiryHasNext;
    $('#prev-reviews').disabled=busy || reviewPage===0;
    $('#next-reviews').disabled=busy || !reviewHasNext;
    $('#draft-label').textContent=`초안 r${serverState.revision}${dirty()?' · 저장하지 않은 변경':' · 저장됨'}`;
    $('#publish-help').textContent=reviewedText===canonical(doc)&&!dirty()?'미리보기 확인 완료 · 최종 게시 버튼을 누르면 공개됩니다.':'초안 저장 → 미리보기 → 최종 게시 순서로 진행하세요.';
  }
  function setBusy(v){busy=v;$('#admin-panel').querySelectorAll('button,input,textarea,select').forEach(e=>{e.disabled=v;});updateButtons();}
  async function run(fn){if(busy||!token)return;setBusy(true);try{await fn();}catch(e){status(e.message||'요청을 완료하지 못했습니다.',true);}finally{setBusy(false);}}
  function changed(){reviewedText=null;$('#raw-json').value=stringify(doc);updateButtons();}
  function hidePrivate(message='로그아웃했습니다.'){
    sessionId++;token=null;clearTimeout(expiryTimer);previewPending?.reject(new Error('로그인이 종료됐습니다.'));previewPending=null;
    doc=null;serverState=null;savedText=null;reviewedText=null;rawDirty=false;buttonsTextValid=true;
    $('#admin-panel').hidden=true;$('#login-panel').hidden=false;$('#logout').hidden=true;
    $('#review-list').replaceChildren();
    $('#node-list').replaceChildren();$('#common-fields').replaceChildren();$('#node-select').replaceChildren();$('#version-list').replaceChildren();$('#inquiry-list').replaceChildren();$('#validation-errors').replaceChildren();$('#validation-errors').hidden=true;
    for(const id of ['raw-json','node-answer','node-buttons','node-questions','node-keywords','publish-note'])$('#'+id).value='';
    $('#preview-frame').src='about:blank';$('#preview-section').hidden=true;$('#publish-dialog').close();
    $('#login-status').textContent=message;
  }
  async function request(path,{body,method='POST',headers={}}={}){
    const generation=sessionId, credential=token;
    if(!credential)throw new Error('관리자 로그인이 필요합니다.');
    let response;
    try{response=await fetch(config.supabaseUrl+path,{method,cache:'no-store',headers:{apikey:config.publishableKey,Authorization:'Bearer '+credential,'Content-Type':'application/json',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
    catch{throw new Error('서버 연결을 확인하세요. 저장·게시 완료 여부가 불확실하면 서버 초안을 다시 불러오세요.');}
    if(generation!==sessionId)throw new Error('로그인이 변경되어 결과를 표시하지 않습니다.');
    const result=await response.json().catch(()=>null);
    if(!response.ok){
      if(response.status===401 || response.status===403 || result?.code==='42501'){hidePrivate('관리자 권한을 확인하지 못했거나 로그인이 만료됐습니다. 다시 로그인하세요.');throw new Error('관리자 인증이 필요합니다.');}
      if(result?.code==='40001'||result?.message?.includes('DRAFT_CONFLICT'))throw new Error('다른 창에서 초안이나 게시 버전이 바뀌었습니다. 내용을 다운로드한 뒤 서버 초안을 다시 불러오세요.');
      if(result?.message?.includes('PREVIEW_REQUIRED'))throw new Error('현재 서버 초안을 다시 미리보기한 후 게시하세요.');
      throw new Error('요청을 처리하지 못했습니다. 데이터 형식과 서버 설정을 확인하세요.');
    }
    return result;
  }
  const rpc=(name,body={})=>request('/rest/v1/rpc/'+name,{body});
  async function loadState(){
    const generation=sessionId;
    const state=await rpc('get_chatbot_admin_state');
    let content=state.draft;
    if(!content){const r=await fetch('data/chatbot.json',{cache:'no-store'});if(!r.ok)throw new Error('기본 안내 데이터를 불러오지 못했습니다.');content=await r.json();}
    if(generation!==sessionId)throw new Error('로그인이 변경됐습니다.');
    if(schema.validate(content).length)throw new Error('저장된 안내 형식을 확인하세요. JSON 백업을 보존하고 수정이 필요합니다.');
    serverState=state;doc=clone(content);savedText=state.draft?canonical(doc):null;reviewedText=null;rawDirty=false;buttonsTextValid=true;
    if(!doc.nodes[currentNode])currentNode='home';renderEditor();renderPublished();
  }
  function renderPublished(){$('#published-label').textContent=serverState.published_version_id?`현재 게시: v${serverState.published_version_id}`:'게시 이력 없음 · 웹은 기본 안내 파일 사용';}
  function renderEditor(){
    $('#node-select').replaceChildren();$('#node-list').replaceChildren();
    for(const [id,node] of Object.entries(doc.nodes)){
      const option=elem('option',id);option.value=id;$('#node-select').append(option);
      const b=action(id,async()=>selectNode(id));b.setAttribute('aria-current',String(id===currentNode));b.append(elem('small',node.answer.slice(0,40)));$('#node-list').append(b);
    }
    $('#node-select').value=currentNode;renderNode();renderCommon();$('#raw-json').value=stringify(doc);validate();updateButtons();
  }
  function selectNode(id){if(!buttonsTextValid||rawDirty){$('#node-select').value=currentNode;status('편집 중인 버튼 또는 전체 JSON을 먼저 적용하세요.',true);return;}currentNode=id;renderEditor();}
  function renderNode(){const node=doc.nodes[currentNode];$('#node-heading').textContent=currentNode+' · 안내 내용';$('#node-answer').value=node.answer;$('#node-questions').value=node.questions.join('\n');$('#node-keywords').value=node.keywords.join('\n');$('#node-buttons').value=stringify(node.buttons);$('#node-form').value=node.form||'';}
  function renderCommon(){
    const host=$('#common-fields');host.replaceChildren();
    for(const [group,keys] of [['ui',schema.uiKeys],['form',schema.formKeys]])for(const key of keys){
      const target=group==='ui'?doc.ui:doc.ui.form;
      const label=elem('label',(group==='form'?'문의 · ':'')+key);const input=elem('textarea');input.rows=2;input.maxLength=group==='ui'?1000:2000;input.value=target[key];
      input.addEventListener('input',()=>{target[key]=input.value;changed();});label.append(input);host.append(label);
    }
  }
  async function saveDraft(){if(!validate())throw new Error('입력 오류를 확인하세요.');serverState=await rpc('save_chatbot_draft',{p_payload:doc,p_expected_revision:serverState.revision});savedText=canonical(doc);reviewedText=null;renderPublished();status('초안을 저장했습니다. 공개 내용은 바뀌지 않았습니다.');}
  async function preview(){
    if(!validate()||dirty()||!savedText)throw new Error('현재 내용을 초안으로 저장한 뒤 미리보기하세요.');
    reviewedText=null;$('#preview-section').hidden=false;
    const nonce=crypto.randomUUID(),content=clone(doc);
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{previewPending=null;reject(new Error('미리보기 준비에 실패했습니다. 다시 시도하세요.'));},15000);
      previewPending={nonce,content,resolve:()=>{clearTimeout(timer);previewPending=null;resolve();},reject:e=>{clearTimeout(timer);previewPending=null;reject(e);}};
      $('#preview-frame').src='admin-preview.html?preview='+String(++previewCounter);
    });
    serverState=await rpc('review_chatbot_draft',{p_expected_revision:serverState.revision});reviewedText=canonical(doc);status('저장된 초안 미리보기를 준비했습니다. 대화를 확인한 뒤 최종 게시하세요.');$('#preview-section').scrollIntoView({behavior:'smooth',block:'start'});
  }
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin || event.source!==$('#preview-frame').contentWindow || !token || !previewPending)return;
    if(event.data?.type==='ove-chatbot-preview-ready')$('#preview-frame').contentWindow.postMessage({type:'ove-chatbot-draft',content:previewPending.content,nonce:previewPending.nonce},location.origin);
    if(event.data?.type==='ove-chatbot-preview-rendered' && event.data.nonce===previewPending.nonce)previewPending.resolve();
  });
  async function loadVersions(append=false){
    const versions=await rpc('list_chatbot_versions',{p_before:append?versionCursor:null});
    if(!append)$('#version-list').replaceChildren();
    if(!append&&!versions.length)$('#version-list').append(elem('p','아직 게시한 버전이 없습니다.'));
    for(const version of versions){
      const card=elem('article',undefined,'version-card'),header=elem('header');header.append(elem('h3','v'+version.id),elem('span',version.id===serverState.published_version_id?'현재 게시':'이전 게시','version-badge'));
      card.append(header,elem('small',stamp(version.published_at)+(version.source_version_id?` · v${version.source_version_id}에서 복원`:'')),elem('p',version.note||'게시 설명 없음'));
      card.append(action('이 버전을 초안으로 불러오기',async()=>{
        if(dirty()&&!confirm('저장하지 않은 편집 내용이 있습니다. 이전 버전을 초안으로 불러올까요?'))return;
        serverState=await rpc('restore_chatbot_version',{p_version_id:version.id,p_expected_revision:serverState.revision});doc=clone(serverState.draft);savedText=canonical(doc);reviewedText=null;rawDirty=false;buttonsTextValid=true;if(!doc.nodes[currentNode])currentNode='home';renderEditor();activateTab('editor');status(`v${version.id}를 초안으로 불러왔습니다. 미리보기 후 최종 게시해야 공개됩니다.`);
      }));$('#version-list').append(card);
    }
    versionCursor=versions.length?versions[versions.length-1].id:null;$('#more-versions').hidden=versions.length<25;
  }
  async function loadInquiries(){
    const filter=$('#inquiry-filter').value;
    const query='?select=request_id,name,email,message,created_at,status,consent_version,consented_at&order=created_at.desc,request_id.desc&limit=21&offset='+inquiryPage*20+(filter==='all'?'':'&status=eq.'+encodeURIComponent(filter));
    const rows=await request('/rest/v1/chatbot_inquiries'+query,{method:'GET'});
    inquiryHasNext=rows.length>20;$('#inquiry-list').replaceChildren();
    if(!rows.length)$('#inquiry-list').append(elem('p','이 조건으로 접수된 문의가 없습니다.'));
    for(const inquiry of rows.slice(0,20)){
      const card=elem('article',undefined,'inquiry-card'),head=elem('header');head.append(elem('h3',inquiry.name),elem('small',stamp(inquiry.created_at)));card.append(head,elem('p',inquiry.email),elem('p',inquiry.message),elem('small',`동의 버전: ${inquiry.consent_version} · 동의 시각: ${stamp(inquiry.consented_at)}`));
      const row=elem('div',undefined,'inquiry-status-row'),label=elem('label','처리 상태'),select=elem('select');select.setAttribute('aria-label','처리 상태');
      for(const [value,text] of [['new','새 문의'],['in_progress','처리 중'],['closed','완료']]){const o=elem('option',text);o.value=value;select.append(o);}select.value=inquiry.status;label.append(select);row.append(label,action('상태 저장',async()=>{
        const updated=await request('/rest/v1/chatbot_inquiries?request_id=eq.'+encodeURIComponent(inquiry.request_id),{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:select.value}});
        if(updated.length!==1)throw new Error('문의 처리 상태를 바꾸지 못했습니다. 권한 또는 삭제 여부를 확인하세요.');status('문의 처리 상태를 저장했습니다.');await loadInquiries();
      }));card.append(row);$('#inquiry-list').append(card);
    }
    $('#inquiry-page').textContent=String(inquiryPage+1)+'페이지';updateButtons();
  }
  async function loadReviews(){
    if(!config.reviewsEnabled){$('#review-list').replaceChildren(elem('p','후기 저장 서버 연결을 준비 중입니다.'));return;}
    const deletionReady=config.reviewDeletionEnabled===true;
    $('#review-filter').querySelector('option[value=deleted]').disabled=!deletionReady;
    let filter=$('#review-filter').value;
    if(filter==='deleted'&&!deletionReady){filter='pending';$('#review-filter').value=filter;}
    const deletionFilter=deletionReady?(filter==='deleted'?'&deleted_at=not.is.null':'&deleted_at=is.null'):'';
    const statusFilter=['all','deleted'].includes(filter)?'':'&status=eq.'+encodeURIComponent(filter);
    const rows=await request('/rest/v1/visitor_reviews?select=request_id,resource,nickname,message,status,created_at'+(deletionReady?',deleted_at':'')+'&order=created_at.desc,request_id.desc&limit=21&offset='+reviewPage*20+statusFilter+deletionFilter,{method:'GET'});
    reviewHasNext=rows.length>20;$('#review-list').replaceChildren();
    if(!rows.length)$('#review-list').append(elem('p','이 조건으로 접수된 후기가 없습니다.'));
    const names={oryukdo:'오륙도',beomeosa:'범어사',taejongdae:'태종대'};
    for(const review of rows.slice(0,20)){
      const card=elem('article',undefined,'inquiry-card'),head=elem('header');head.append(elem('h3',(names[review.resource]||review.resource)+' · '+review.nickname),elem('small',stamp(review.created_at)));card.append(head,elem('p',review.message));
      if(review.deleted_at){
        card.append(elem('small','삭제됨 · '+stamp(review.deleted_at)),action('후기 복구',async()=>{
          await rpc('set_visitor_review_deleted',{p_request_id:review.request_id,p_deleted:false});status('후기를 확인 대기로 복구했습니다. 다시 승인해야 공개됩니다.');await loadReviews();
        }));$('#review-list').append(card);continue;
      }
      const label=elem('label','공개 상태'),select=elem('select');select.setAttribute('aria-label','후기 공개 상태');
      for(const [value,text] of [['pending','확인 대기'],['published','공개'],['hidden','비공개']]){const o=elem('option',text);o.value=value;select.append(o);}select.value=review.status;label.append(select);card.append(label,action('공개 상태 저장',async()=>{
        const updated=await request('/rest/v1/visitor_reviews?request_id=eq.'+encodeURIComponent(review.request_id),{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:select.value}});
        if(updated.length!==1)throw new Error('후기 상태를 저장하지 못했습니다.');status('후기 공개 상태를 저장했습니다.');await loadReviews();
      }));
      if(deletionReady)card.append(action('후기 삭제',async()=>{
        if(!confirm('이 후기를 삭제할까요? 공개 목록에서 제외되며 삭제됨 목록에서 복구할 수 있습니다.'))return;
        await rpc('set_visitor_review_deleted',{p_request_id:review.request_id,p_deleted:true});status('후기를 삭제했습니다. 원문은 보존되며 삭제됨 목록에서 복구할 수 있습니다.');await loadReviews();
      }));
      else card.append(elem('small','삭제 기능은 서버 설정 적용 후 활성화됩니다.'));
      $('#review-list').append(card);
    }
    $('#review-page').textContent=(reviewPage+1)+'페이지';updateButtons();
  }
  function activateTab(id){
    for(const tab of ['editor','versions','inquiries','reviews']){const active=tab===id;$('#tab-'+tab).setAttribute('aria-selected',String(active));$('#tab-'+tab).tabIndex=active?0:-1;$('#'+tab+'-tab').hidden=!active;}
  }
  for(const name of ['editor','versions','inquiries','reviews'])$('#tab-'+name).addEventListener('click',()=>run(async()=>{activateTab(name);if(name==='versions')await loadVersions();if(name==='inquiries')await loadInquiries();if(name==='reviews')await loadReviews();}));
  document.querySelector('[role=tablist]').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('[role=tab]')];const i=tabs.indexOf(document.activeElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const n=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[n].click();tabs[n].focus();});
  $('#refresh-reviews').addEventListener('click',()=>run(loadReviews));
  $('#review-filter').addEventListener('change',()=>run(async()=>{reviewPage=0;await loadReviews();}));
  $('#prev-reviews').addEventListener('click',()=>run(async()=>{if(reviewPage>0)reviewPage--;await loadReviews();}));
  $('#next-reviews').addEventListener('click',()=>run(async()=>{if(reviewHasNext)reviewPage++;await loadReviews();}));
  $('#node-select').addEventListener('change',event=>selectNode(event.target.value));
  for(const [id,field] of [['node-answer','answer'],['node-questions','questions'],['node-keywords','keywords']])$('#'+id).addEventListener('input',event=>{doc.nodes[currentNode][field]=field==='answer'?event.target.value:event.target.value.split('\n').map(s=>s.trim()).filter(Boolean);changed();});
  $('#node-buttons').addEventListener('input',event=>{try{const value=JSON.parse(event.target.value);if(!Array.isArray(value))throw new Error();doc.nodes[currentNode].buttons=value;buttonsTextValid=true;changed();}catch{buttonsTextValid=false;reviewedText=null;updateButtons();}});
  $('#node-form').addEventListener('change',event=>{if(event.target.value)doc.nodes[currentNode].form=event.target.value;else delete doc.nodes[currentNode].form;changed();});
  $('#raw-json').addEventListener('input',()=>{rawDirty=true;reviewedText=null;updateButtons();});
  $('#apply-json').addEventListener('click',()=>run(async()=>{let candidate;try{candidate=JSON.parse($('#raw-json').value);}catch{throw new Error('JSON 형식이 올바르지 않습니다.');}const errors=schema.validate(candidate);if(errors.length)throw new Error(errors.join('\n'));doc=candidate;rawDirty=false;buttonsTextValid=true;reviewedText=null;if(!doc.nodes[currentNode])currentNode='home';renderEditor();status('JSON을 편집기에 적용했습니다. 아직 저장·게시되지 않았습니다.');}));
  $('#new-node-form').addEventListener('submit',event=>{event.preventDefault();run(async()=>{if(!buttonsTextValid||rawDirty)throw new Error('편집 중인 JSON을 먼저 적용하세요.');const id=$('#new-node-id').value.trim();if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id)||['constructor','prototype'].includes(id)||Object.hasOwn(doc.nodes,id))throw new Error('중복되지 않는 안전한 항목 ID를 입력하세요.');doc.nodes[id]={answer:'새 안내 내용을 입력하세요.',questions:[],keywords:[],buttons:[]};currentNode=id;$('#new-node-id').value='';reviewedText=null;renderEditor();});});
  $('#delete-node').addEventListener('click',()=>run(async()=>{if(['home','fallback'].includes(currentNode))return;const refs=Object.keys(doc.nodes).filter(id=>id!==currentNode&&doc.nodes[id].buttons.some(b=>b.next===currentNode));if(refs.length)throw new Error('먼저 연결 버튼을 수정하세요: '+refs.join(', '));if(!confirm(currentNode+' 항목을 현재 초안에서 삭제할까요?'))return;delete doc.nodes[currentNode];currentNode='home';reviewedText=null;renderEditor();}));
  $('#save-draft').addEventListener('click',()=>run(saveDraft));$('#preview').addEventListener('click',()=>run(preview));
  $('#reload-draft').addEventListener('click',()=>run(async()=>{if(dirty()&&!confirm('저장하지 않은 편집을 버리고 서버 초안을 불러올까요?'))return;await loadState();status('서버 초안을 다시 불러왔습니다. 게시 전에는 미리보기가 필요합니다.');}));
  $('#publish').addEventListener('click',()=>{if(busy||dirty()||reviewedText!==canonical(doc)||!validate())return;$('#publish-confirm-label').textContent=`초안 r${serverState.revision} · 현재 ${serverState.published_version_id?'v'+serverState.published_version_id:'기본 파일'}`;$('#publish-dialog').showModal();});
  $('#publish-dialog').addEventListener('close',()=>{if($('#publish-dialog').returnValue!=='publish')return;run(async()=>{if(dirty()||reviewedText!==canonical(doc))throw new Error('현재 내용을 다시 저장하고 미리보기하세요.');try{serverState=await rpc('publish_chatbot_draft',{p_expected_revision:serverState.revision,p_expected_published_version:serverState.published_version_id,p_note:$('#publish-note').value.trim()});reviewedText=null;renderPublished();status(`v${serverState.published_version_id} 게시 완료. 새로 연 공개 홈페이지의 챗봇에 반영됩니다.`);$('#publish-note').value='';}catch(e){reviewedText=null;throw e;}});});
  $('#export-json').addEventListener('click',()=>run(async()=>{if(!validate())throw new Error('유효한 데이터만 다운로드할 수 있습니다.');const url=URL.createObjectURL(new Blob([stringify(doc)],{type:'application/json'}));const a=elem('a');a.href=url;a.download='ove-chatbot-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
  $('#import-json').addEventListener('change',event=>run(async()=>{const file=event.target.files[0];if(!file)return;if(file.size>800000)throw new Error('파일이 너무 큽니다.');let candidate;try{candidate=JSON.parse(await file.text());}catch{throw new Error('JSON 파일 형식을 확인하세요.');}const errors=schema.validate(candidate);if(errors.length)throw new Error(errors.join('\n'));if(dirty()&&!confirm('현재 편집을 가져온 파일로 바꿀까요?'))return;doc=candidate;reviewedText=null;rawDirty=false;buttonsTextValid=true;currentNode='home';renderEditor();status('파일을 편집기에 불러왔습니다. 초안 저장 후 미리보기하세요.');event.target.value='';}));
  $('#refresh-versions').addEventListener('click',()=>run(()=>loadVersions()));$('#more-versions').addEventListener('click',()=>run(()=>loadVersions(true)));
  $('#refresh-inquiries').addEventListener('click',()=>run(loadInquiries));$('#inquiry-filter').addEventListener('change',()=>run(async()=>{inquiryPage=0;await loadInquiries();}));
  $('#prev-inquiries').addEventListener('click',()=>run(async()=>{inquiryPage=Math.max(0,inquiryPage-1);await loadInquiries();}));$('#next-inquiries').addEventListener('click',()=>run(async()=>{inquiryPage++;await loadInquiries();}));
  $('#logout').addEventListener('click',async()=>{if(dirty()&&!confirm('저장하지 않은 변경이 있습니다. 로그아웃할까요?'))return;const oldToken=token;hidePrivate();if(oldToken)fetch(config.supabaseUrl+'/auth/v1/logout',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+oldToken}}).catch(()=>{});});
  window.addEventListener('beforeunload',event=>{if(token&&dirty()){event.preventDefault();event.returnValue='';}});
  $('#login-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!config?.supabaseUrl)return;
    const form=event.target,username=form.elements.username.value.trim();if(username!=='admin'){$('#login-status').textContent='아이디 또는 비밀번호를 확인하세요.';return;}
    busy=true;$('#login-submit').disabled=true;$('#login-status').textContent='로그인 중입니다.';
    try{
      const response=await fetch(config.supabaseUrl+'/auth/v1/token?grant_type=password',{method:'POST',cache:'no-store',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:config.adminEmail||'admin@ove.example',password:form.elements.password.value})});
      const result=await response.json();form.elements.password.value='';if(!response.ok||!result.access_token)throw new Error('아이디 또는 비밀번호를 확인하세요.');
      token=result.access_token;sessionId++;await loadState();
      clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>hidePrivate('로그인이 만료됐습니다. 다시 로그인하세요.'),Math.max(0,((result.expires_at?result.expires_at*1000:Date.now()+result.expires_in*1000)-Date.now()-5000)));
      $('#login-panel').hidden=true;$('#admin-panel').hidden=false;$('#logout').hidden=false;activateTab('editor');status(savedText?'서버 초안을 불러왔습니다.':'현재 홈페이지의 기본 데이터를 불러왔습니다. 첫 초안을 저장해 주세요.');
    }catch(e){hidePrivate(e.message||'로그인 서버에 연결하지 못했습니다.');form.elements.password.value='';}
    finally{busy=false;$('#login-submit').disabled=false;setBusy(false);}
  });
  async function boot(){
    try{const r=await fetch('data/chatbot-config.json',{cache:'no-store'});if(!r.ok)throw new Error();config=await r.json();const u=new URL(config.supabaseUrl);const localDev=['127.0.0.1','localhost'].includes(location.hostname)&&u.protocol==='http:'&&u.hostname===location.hostname;
      if((u.protocol!=='https:'&&!localDev)||!config.publishableKey||config.publishableKey.startsWith('sb_secret_'))throw new Error();config.supabaseUrl=u.origin;
      $('#login-submit').disabled=false;$('#login-status').textContent='관리자 계정으로 로그인하세요.';
    }catch{$('#login-submit').disabled=true;$('#login-status').textContent='관리자 인증 서버가 아직 연결되지 않았습니다.';$('#setup-note').hidden=false;}
  }
  boot();
})();
