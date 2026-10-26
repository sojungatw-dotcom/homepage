document.addEventListener('DOMContentLoaded', () => {
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const statusButtons = [...document.querySelectorAll('[data-status-filter]')];
  const cards = [...document.querySelectorAll('[data-category]')];
  const empty = document.querySelector('#content-empty');
  let category = 'all';
  let status = 'all';
  const apply = () => {
    let visible = 0;
    cards.forEach(card => {
      const show = (category === 'all' || card.dataset.category === category) && (status === 'all' || card.dataset.status === status);
      card.classList.toggle('is-hidden', !show);
      if(!show)card.querySelectorAll('video').forEach(video=>video.pause());
      if (show) { visible++; requestAnimationFrame(() => card.classList.add('is-visible')); }
    });
    if (empty) empty.hidden = visible !== 0;
  };
  const select = (group, button) => group.forEach(item => {
    const active = item === button;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  buttons.forEach(button => {
    const count = button.querySelector('span');
    if (count) count.textContent = String(cards.filter(card => button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter).length).padStart(2, '0');
    button.addEventListener('click', () => { category = button.dataset.filter; select(buttons, button); apply(); });
  });
  statusButtons.forEach(button => button.addEventListener('click', () => { status = button.dataset.statusFilter; select(statusButtons, button); apply(); }));

  const videos=[...document.querySelectorAll('.video-thumb video')];
  videos.forEach(video=>{
    video.addEventListener('play',()=>videos.forEach(other=>{if(other!==video)other.pause();}));
    video.addEventListener('error',()=>{
      const note=document.querySelector('#media-status');note.hidden=false;note.textContent='영상 재생을 완료하지 못했습니다. 카드 아래의 최종 영상 파일 링크로 다시 열어 주세요.';
    });
  });
  const viewer=document.querySelector('#content-viewer');
  if(!viewer)return;
  const image=viewer.querySelector('#content-viewer-image');
  const previous=viewer.querySelector('[data-viewer-prev]'),next=viewer.querySelector('[data-viewer-next]');
  let slides=[],position=0,opener=null,catalog=null;
  const relativeAsset=src=>typeof src==='string'&&/^assets\/images\/contents\/[a-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(src)&&!src.includes('..');
  const showSlide=()=>{
    const slide=slides[position];image.src=slide.src;image.alt=slide.alt;
    viewer.querySelector('#content-viewer-page').textContent=(position+1)+' / '+slides.length;
    previous.disabled=position===0;next.disabled=position===slides.length-1;
  };
  const move=delta=>{const target=position+delta;if(target<0||target>=slides.length)return;position=target;showSlide();};
  document.querySelectorAll('[data-gallery]').forEach(trigger=>trigger.addEventListener('click',async()=>{
    if(trigger.disabled)return;trigger.disabled=true;
    const status=document.querySelector('#media-status');
    try{
      if(!catalog){const response=await fetch('data/content-catalog.json',{cache:'no-store'});if(!response.ok)throw new Error('catalog');catalog=await response.json();}
      const item=catalog.items.find(item=>item.id===trigger.dataset.gallery);
      if(!item||!Array.isArray(item.slides)||!item.slides.length||item.slides.some(slide=>!relativeAsset(slide.src)||typeof slide.alt!=='string'))throw new Error('slides');
      slides=item.slides;position=0;opener=trigger;viewer.querySelector('#content-viewer-title').textContent=item.title;showSlide();status.hidden=true;viewer.showModal();
    }catch{status.hidden=false;status.textContent='카드뉴스를 불러오지 못했습니다. 다시 누르거나 기존 Instagram 게시물 링크를 이용해 주세요.';}
    finally{trigger.disabled=false;}
  }));
  previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  viewer.querySelector('[data-viewer-close]').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
  viewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}});
  viewer.addEventListener('close',()=>{image.removeAttribute('src');opener?.focus();});
});
