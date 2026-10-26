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
  let catalogPromise=null;
  const getCatalog=()=>{
    if(!catalogPromise)catalogPromise=fetch('data/content-catalog.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('catalog');return response.json();}).catch(error=>{catalogPromise=null;throw error;});
    return catalogPromise;
  };
  const relativeAsset=src=>typeof src==='string'&&/^assets\/images\/contents\/[a-z0-9_./-]+\.(jpg|jpeg|png|webp)$/i.test(src)&&!src.includes('..');
  document.querySelectorAll('[data-carousel]').forEach(carousel=>{
    const image=carousel.querySelector('img'),previous=carousel.querySelector('[data-carousel-prev]'),next=carousel.querySelector('[data-carousel-next]');
    let slides=[],position=0,busy=false;
    const move=async delta=>{
      if(busy)return;busy=true;previous.disabled=true;next.disabled=true;
      const note=document.querySelector('#media-status');
      try{
        if(!slides.length){
          const catalog=await getCatalog(),item=catalog.items.find(item=>item.id===carousel.dataset.carousel);
          if(!item||!Array.isArray(item.slides)||!item.slides.length||item.slides.some(slide=>!relativeAsset(slide.src)||typeof slide.alt!=='string'))throw new Error('slides');
          slides=item.slides;
        }
        const target=position+delta;
        if(target>=0&&target<slides.length){position=target;image.src=slides[position].src;image.alt=slides[position].alt;}
        carousel.querySelector('[data-carousel-page]').textContent=(position+1)+' / '+slides.length;
        note.hidden=true;
      }catch{note.hidden=false;note.textContent='카드뉴스를 불러오지 못했습니다. 화살표를 다시 누르거나 기존 Instagram 게시물 링크를 이용해 주세요.';}
      finally{busy=false;previous.disabled=position===0;next.disabled=slides.length>0&&position===slides.length-1;}
    };
    previous.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
    carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();move(event.key==='ArrowLeft'?-1:1);}});
  });
});
