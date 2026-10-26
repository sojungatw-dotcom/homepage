(() => {
  'use strict';
  const STORAGE_KEY = 'cardnews-editor-v3';
  const presets = {
    cine:{name:'시네마틱',bg:'#111827',ink:'#ffffff',art:'radial-gradient(circle at 78% 22%, #245AC4 0 10%, transparent 35%), linear-gradient(145deg,#1a2740,#07090e 70%)'},
    mag:{name:'매거진',bg:'#FFF5E6',ink:'#141515',art:'linear-gradient(115deg,transparent 0 56%,rgba(235,91,44,.32) 56% 68%,transparent 68%),repeating-linear-gradient(90deg,transparent 0 12%,rgba(0,0,0,.025) 12% 12.3%)'},
    manga:{name:'만화',bg:'#26303b',ink:'#ffffff',art:'radial-gradient(circle at 78% 18%,#E97532 0 7%,transparent 7.5%),repeating-radial-gradient(circle at 78% 18%,transparent 0 12px,rgba(255,255,255,.09) 13px 14px)'},
    pixel:{name:'픽셀',bg:'#E97532',ink:'#141414',art:'linear-gradient(90deg,rgba(255,255,255,.1) 50%,transparent 50%),linear-gradient(rgba(255,255,255,.1) 50%,transparent 50%)',size:'24px 24px'},
    doodle:{name:'도들',bg:'#FFBB8E',ink:'#3b2530',art:'radial-gradient(circle at 15% 20%,#FFF5E6 0 7%,transparent 7.3%),radial-gradient(circle at 83% 72%,#E5EDF9 0 11%,transparent 11.3%)'},
    blue:{name:'화이트 & 블루',bg:'#E5EDF9',ink:'#245AC4',art:'radial-gradient(circle at 78% 20%,rgba(50,113,255,.28) 0 16%,transparent 38%),linear-gradient(150deg,#ffffff,#E5EDF9)'}
  };
  const colors=['#245AC4','#E97532','#FFF5E6','#FFBB8E','#E5EDF9','#000000','#FFFFFF'];
  const schemas={
    cover:[['badge','라벨','input'],['title','제목','textarea'],['sub','부제','textarea']],
    content:[['tag','카테고리','input'],['num','큰 번호','input'],['head','헤드라인','textarea'],['desc','본문','textarea']],
    quote:[['quote','인용문','textarea'],['by','출처','input']],
    table:[['title','표 제목','input'],['rows','행 데이터 (항목 | 기존 | 새로운 방식)','textarea']],
    closing:[['head','마무리 제목','textarea'],['desc','설명','textarea'],['cta1','CTA 1','input'],['cta2','CTA 2','input'],['hint','힌트','input']]
  };
  const typeNames={cover:'표지',content:'본문',quote:'인용',table:'비교표',closing:'마무리 CTA'};
  const defaultSlide=type=>({type,scrim:82,bg:null,f:type==='cover'?{badge:'JOURNEY NOTE',title:'낯선 풍경을\n*콘텐츠로* 만드는 법',sub:'여행의 장면을 발견하고 기록하는 작은 가이드'}:type==='content'?{tag:'POINT',num:'01',head:'먼저, 익숙한 풍경을\n*다르게* 바라봅니다',desc:'좋은 콘텐츠는 새로운 장소보다 새로운 시선에서 시작됩니다.'}:type==='quote'?{quote:'여행은 장소가 아니라\n*시선*을 바꾸는 일이다',by:'JOURNEY ARCHIVE'}:type==='table'?{title:'기록에서 콘텐츠로',rows:'관찰 | 지나치기 | 질문하기\n기록 | 사진만 남기기 | 맥락 함께 적기\n편집 | 정보 나열 | 하나의 관점'}:{head:'다음 장면은\n당신의 차례',desc:'AI와 함께 더 빠르게 만들고, 더 오래 기억되는 콘텐츠를 시작하세요.',cta1:'AI 커뮤니티 참여',cta2:'댓글 AIMAX',hint:'저장하고 팀과 공유해 보세요'}});
  const initial={preset:'cine',accent:'#E97532',current:0,slides:[defaultSlide('cover'),defaultSlide('content'),{...defaultSlide('content'),f:{tag:'STEP 02',num:'02',head:'정보보다 먼저\n*감각*을 수집하세요',desc:'빛, 소리, 냄새와 사람의 표정이 이야기의 결을 만듭니다.'}},defaultSlide('table'),defaultSlide('quote'),defaultSlide('closing')]};
  let state=loadState();
  let toastTimer;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rich=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\n/g,'<br>');
  function validateDeck(data){
    if(!data || !Array.isArray(data.slides) || !data.slides.length) throw new Error('Invalid deck');
    const candidate={...initial,...data};
    if(!Object.hasOwn(presets,candidate.preset) || !/^#[0-9a-f]{6}$/i.test(candidate.accent)) throw new Error('Invalid style');
    for(const slide of candidate.slides){
      if(!slide || !Object.hasOwn(schemas,slide.type) || !slide.f || typeof slide.f!=='object' || Array.isArray(slide.f)) throw new Error('Invalid card');
      if(Object.values(slide.f).some(value=>typeof value!=='string' && typeof value!=='number')) throw new Error('Invalid card text');
      if(slide.scrim!=null && (!Number.isFinite(slide.scrim) || slide.scrim<0 || slide.scrim>100)) throw new Error('Invalid scrim');
      if(slide.bg!=null && (typeof slide.bg!=='string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(slide.bg))) throw new Error('Invalid image');
    }
    candidate.current=Number.isInteger(candidate.current)?Math.max(0,Math.min(candidate.current,candidate.slides.length-1)):0;
    return candidate;
  }
  function loadState(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved)return validateDeck(saved);}catch(e){}
    return structuredClone(initial);
  }
  function save(){
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      $('#saveStatus').textContent='모든 변경사항 저장됨';
      $('.save-dot').style.background='#49a675';
    } catch {
      $('#saveStatus').textContent='자동 저장 불가 · 덱 파일로 저장해 주세요';
      $('.save-dot').style.background='#245AC4';
      toast('브라우저 저장 공간을 사용할 수 없습니다. 덱 저장 버튼으로 내려받아 주세요.');
    }
  }
  function markSaving(){ $('#saveStatus').textContent='저장 중…';$('.save-dot').style.background='#e1a83b';clearTimeout(markSaving.t);markSaving.t=setTimeout(save,250)}
  function active(){return state.slides[state.current]}
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2200)}
  function render(){renderList();renderCanvas();renderFields();renderPresets();renderColors();const slide=active();$('#deckCount').textContent=`${state.slides.length} CARDS`;$('#currentNumber').textContent=String(state.current+1).padStart(2,'0');$('#totalNumber').textContent=String(state.slides.length).padStart(2,'0');$('#cardType').value=slide.type;$('#typeLabel').textContent=typeNames[slide.type];$('#presetName').textContent=presets[state.preset].name;$('#accentValue').textContent=state.accent;$('#scrimRange').value=slide.scrim??82;$('#scrimValue').textContent=slide.scrim??82;document.documentElement.style.setProperty('--accent',state.accent)}
  function renderList(){const list=$('#slideList');list.innerHTML='';state.slides.forEach((slide,i)=>{const label=slide.f.title||slide.f.head||slide.f.quote||slide.f.tag||typeNames[slide.type];const btn=document.createElement('button');btn.type='button';btn.className='slide-item'+(i===state.current?' is-active':'');btn.setAttribute('aria-label',`${i+1}번 ${typeNames[slide.type]} 카드`);btn.innerHTML=`<span class="slide-number">${String(i+1).padStart(2,'0')}</span><span class="slide-thumb" style="--thumb-accent:${state.accent}"><b>${esc(label).replace(/\n/g,'<br>')}</b></span><span class="slide-info"><b>${esc(label.replace(/\n/g,' '))}</b><small>${typeNames[slide.type]}</small></span>`;btn.addEventListener('click',()=>{state.current=i;render();save()});list.append(btn)})}
  function shell(content,cls=''){return `<div class="card-inner ${cls}"><div class="card-brand"><span>CARD ATELIER</span><span>${String(state.current+1).padStart(2,'0')} / ${String(state.slides.length).padStart(2,'0')}</span></div>${content}</div>`}
  function renderCanvas(){
    const slide=active();
    const f=slide.f;
    const card=$('#cardCanvas');
    const p=presets[state.preset];
    card.dataset.preset=state.preset;
    card.style.setProperty('--card-bg',p.bg);
    card.style.setProperty('--card-ink',p.ink);
    card.style.setProperty('--card-accent',state.accent);
    card.style.setProperty('--bg-art',p.art);
    card.style.setProperty('--scrim',String((slide.scrim??82)/100));
    card.style.backgroundSize=p.size||'auto';
    if(slide.bg){
      card.classList.add('has-image');
      card.style.setProperty('--image',`url("${slide.bg}")`);
    }else{
      card.classList.remove('has-image');
      card.style.removeProperty('--image');
    }
    if(slide.type==='cover'){
      card.innerHTML=shell(`<div class="card-main"><span class="card-badge">${rich(f.badge)}</span><h2 class="card-title">${rich(f.title)}</h2><p class="card-sub">${rich(f.sub)}</p></div><div class="card-footer"><span>EDITORIAL SERIES · 2026</span><span>SWIPE →</span></div>`);
    }else if(slide.type==='content'){
      const number=f.num?`<div class="card-num">${rich(f.num)}</div>`:'';
      card.innerHTML=shell(`<div class="card-main">${number}<span class="card-tag">${rich(f.tag)}</span><h2 class="card-head">${rich(f.head)}</h2><p class="card-desc">${rich(f.desc)}</p></div><div class="card-footer"><span class="card-progress">${String(state.current+1).padStart(2,'0')} — NOTE</span><span>JOURNEY ARCHIVE</span></div>`,'content-layout');
    }else if(slide.type==='quote'){
      card.innerHTML=shell(`<div class="card-main"><div class="card-quote-mark">“</div><blockquote class="card-quote">${rich(f.quote)}</blockquote><p class="card-by">— ${rich(f.by)}</p></div><div class="card-footer"><span>QUOTE</span><span>KEEP THIS</span></div>`);
    }else if(slide.type==='table'){
      const rows=String(f.rows||'').split('\n').map(r=>r.split('|'));
      const rowHtml=rows.map(r=>`<div class="compare-row"><span>${rich(r[0]||'')}</span><span>${rich(r[1]||'')}</span><b>${rich(r[2]||'')}</b></div>`).join('');
      card.innerHTML=shell(`<div class="card-main"><span class="card-tag">COMPARE</span><h2 class="table-title">${rich(f.title)}</h2><div class="comparison-table"><div class="compare-row"><span>항목</span><span>기존</span><b>새로운 방식</b></div>${rowHtml}</div></div><div class="card-footer"><span>AT A GLANCE</span><span>JOURNEY ARCHIVE</span></div>`);
    }else{
      card.innerHTML=shell(`<div class="card-main"><span class="card-badge">NEXT STEP</span><h2 class="card-head">${rich(f.head)}</h2><p class="card-desc">${rich(f.desc)}</p><div class="cta-box"><span>${rich(f.cta1)}</span><span>${rich(f.cta2)}</span></div><p class="cta-hint">${rich(f.hint)}</p></div>`,'closing-layout');
    }
  }
  function renderFields(){const wrap=$('#fieldControls');wrap.innerHTML='';schemas[active().type].forEach(([key,label,kind])=>{const box=document.createElement('div');box.className='field-control';const id=`field-${key}`;box.innerHTML=`<label for="${id}">${label}</label>${kind==='textarea'?`<textarea id="${id}" rows="${key==='rows'?5:3}"></textarea>`:`<input id="${id}" type="text">`}`;const input=box.querySelector('input,textarea');input.value=active().f[key]||'';input.addEventListener('input',()=>{active().f[key]=input.value;renderCanvas();renderList();markSaving()});wrap.append(box)})}
  function renderPresets(){const grid=$('#presetGrid');grid.innerHTML='';Object.entries(presets).forEach(([key,p])=>{const b=document.createElement('button');b.type='button';b.className='preset-button'+(state.preset===key?' is-active':'');b.innerHTML=`<span class="preset-swatch" style="--swatch:${p.art};--swatch-ink:${p.ink}"></span><span>${p.name}</span>`;b.addEventListener('click',()=>{state.preset=key;location.hash=key;render();markSaving()});grid.append(b)})}
  function renderColors(){const row=$('#colorRow');row.innerHTML='';colors.forEach(color=>{const b=document.createElement('button');b.type='button';b.className='color-button'+(state.accent===color?' is-active':'');b.style.setProperty('--color',color);b.setAttribute('aria-label',`포인트 색 ${color}`);b.addEventListener('click',()=>{state.accent=color;render();markSaving()});row.append(b)})}
  function changeSlide(step){state.current=(state.current+step+state.slides.length)%state.slides.length;render();save()}
  function quickConvert(text){const clean=text.trim();if(!clean){toast('원문을 입력해 주세요.');return false}const lines=clean.split(/\n+/).map(s=>s.replace(/^#{1,3}\s*|^\d+[.)]\s*/,'').trim()).filter(Boolean);const title=lines.shift()||'새로운 이야기';const chunks=lines.length?lines.slice(0,6):['핵심 메시지를 한 문장으로 정리해 보세요.','독자가 기억할 포인트를 명확하게 전합니다.','마지막에는 행동을 부르는 문장으로 마무리합니다.'];const slides=[{...defaultSlide('cover'),f:{badge:'QUICK BRIEF',title:balance(title),sub:'긴 글에서 발견한 핵심 이야기를 카드로 정리했습니다.'}}];chunks.slice(0,5).forEach((line,i)=>{const parts=line.split(/[.!?]\s+/);slides.push({...defaultSlide('content'),f:{tag:i===0?'INTRO':`POINT ${String(i+1).padStart(2,'0')}`,num:i===0?'':String(i+1).padStart(2,'0'),head:balance(parts[0].slice(0,42)),desc:(parts.slice(1).join('. ')||line).slice(0,110)}})});if(chunks.length>2)slides.push({...defaultSlide('quote'),f:{quote:balance(`기억에 남는 콘텐츠는\n정보보다 *관점*을 남긴다`),by:'CARD ATELIER'}});slides.push(defaultSlide('closing'));state.slides=slides;state.current=0;render();save();toast(`${slides.length}장의 카드 덱을 만들었어요.`);return true}
  function balance(text){const s=text.replace(/\s+/g,' ').trim();if(s.length<18)return s;const mid=Math.floor(s.length/2);let cut=s.indexOf(' ',mid);if(cut<0)cut=mid;return s.slice(0,cut)+'\n'+s.slice(s[cut]===' '?cut+1:cut)}
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  async function exportPng(){const s=active(),p=presets[state.preset],canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle=p.bg;ctx.fillRect(0,0,1080,1350);const grad=ctx.createLinearGradient(0,0,1080,1350);grad.addColorStop(0,state.accent+'66');grad.addColorStop(.45,'transparent');grad.addColorStop(1,'#00000088');ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1350);ctx.fillStyle=p.ink;ctx.font='700 25px "Noto Sans KR"';ctx.fillText('CARD ATELIER',90,105);ctx.textAlign='right';ctx.font='400 22px "Noto Sans KR"';ctx.fillText(`${String(state.current+1).padStart(2,'0')} / ${String(state.slides.length).padStart(2,'0')}`,990,105);ctx.textAlign='left';const headline=s.f.title||s.f.head||s.f.quote||s.f.title||typeNames[s.type];const desc=s.f.sub||s.f.desc||s.f.by||'';drawWrapped(ctx,headline.replace(/\*/g,''),90,s.type==='closing'?500:680,900,86,96,p.ink);drawWrapped(ctx,desc.replace(/\*/g,''),92,s.type==='closing'?820:990,840,36,58,p.ink);ctx.strokeStyle=p.ink+'66';ctx.beginPath();ctx.moveTo(90,1230);ctx.lineTo(990,1230);ctx.stroke();ctx.font='500 20px "Noto Sans KR"';ctx.fillText(typeNames[s.type].toUpperCase(),90,1275);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));download(blob,`${String(state.current+1).padStart(2,'0')}-cardnews.png`);toast('1080 × 1350 PNG를 저장했어요.')}
  function drawWrapped(ctx,text,x,y,maxWidth,fontSize,lineHeight,color){ctx.fillStyle=color;ctx.font=`800 ${fontSize}px "Noto Sans KR"`;String(text).split('\n').forEach((paragraph,pi)=>{let line='';for(const word of paragraph.split(' ')){const test=line+word+' ';if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=word+' ';y+=lineHeight}else line=test}ctx.fillText(line,x,y);y+=lineHeight;if(pi<String(text).split('\n').length-1)y+=8})}
  function bind(){
    $('#openComposer').addEventListener('click',()=>$('#composerDialog').showModal());$('#sourceText').addEventListener('input',e=>$('#charCount').textContent=`${e.target.value.length.toLocaleString()}자`);$('#composerForm').addEventListener('submit',e=>{if(e.submitter?.id!=='convertButton')return;e.preventDefault();if(quickConvert($('#sourceText').value))$('#composerDialog').close()});
    $('#prevSlide').addEventListener('click',()=>changeSlide(-1));$('#nextSlide').addEventListener('click',()=>changeSlide(1));$('#addSlide').addEventListener('click',()=>{state.slides.splice(state.current+1,0,defaultSlide('content'));state.current++;render();markSaving();toast('새 본문 카드를 추가했어요.')});$('#deleteSlide').addEventListener('click',()=>{if(state.slides.length===1){toast('카드는 한 장 이상 필요해요.');return}state.slides.splice(state.current,1);state.current=Math.min(state.current,state.slides.length-1);render();markSaving();toast('카드를 삭제했어요.')});
    $('#cardType').addEventListener('change',e=>{const old=active();state.slides[state.current]={...defaultSlide(e.target.value),scrim:old.scrim,bg:old.bg};render();markSaving()});$('#scrimRange').addEventListener('input',e=>{active().scrim=Number(e.target.value);$('#scrimValue').textContent=e.target.value;renderCanvas();markSaving()});$('#shuffleButton').addEventListener('click',()=>{const keys=Object.keys(presets),next=keys[(keys.indexOf(state.preset)+1)%keys.length];state.preset=next;render();markSaving();toast(`${presets[next].name} 배경으로 바꿨어요.`)});$('#clearBackground').addEventListener('click',()=>{active().bg=null;renderCanvas();markSaving()});
    $('#backgroundUpload').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{active().bg=reader.result;renderCanvas();markSaving();toast('배경 이미지를 적용했어요.')};reader.readAsDataURL(file)});$('#pngButton').addEventListener('click',exportPng);
    $('#exportJsonButton').addEventListener('click',()=>{download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'cardnews-deck.json');toast('덱 파일을 저장했어요.')});$('#importButton').addEventListener('click',()=>$('#importFile').click());$('#importFile').addEventListener('change',e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const candidate=validateDeck(JSON.parse(reader.result));state={...candidate,current:0};render();save();toast('덱을 불러왔어요.')}catch(err){toast('올바른 덱 파일이 아니에요.')}};reader.readAsText(file)});
    document.addEventListener('keydown',e=>{if($('#composerDialog').open||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft')changeSlide(-1);if(e.key==='ArrowRight')changeSlide(1)});
  }
  const hash=location.hash.slice(1);if(presets[hash])state.preset=hash;bind();render();save();
})();
