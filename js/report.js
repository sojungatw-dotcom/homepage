document.addEventListener('DOMContentLoaded', () => {
  const resources = {
    oryukdo: {
      number: '01', title: '오륙도', type: '자연 관광', visual: 'ORYUKDO · COASTAL VIEW',
      description: '오륙도는 부산 남구 용호동 앞바다에 자리한 여섯 개의 바위섬으로, 보는 방향과 위치에 따라 다섯 개 또는 여섯 개로 보여 이름이 붙었습니다. 탁 트인 바다와 기암절벽이 어우러진 부산의 대표적인 해안 경관으로, 오륙도 스카이 워크와 해안 산책로를 함께 즐길 수 있습니다.',
      tags: ['#오륙도', '#오륙도스카이워크', '#부산바다', '#해안산책로', '#해맞이공원'],
      location: '부산광역시 남구 오륙도로 137', visit: '09:00—18:00 · 17:50 입장 마감 · 맑은 날 추천',
      images: {
        hero: 'assets/images/report/oryukdo/hero-original.jpg',
        programs: ['assets/images/report/oryukdo/program-skywalk.webp', 'assets/images/report/oryukdo/program-trail.webp', 'assets/images/report/oryukdo/program-park.webp'],
        reviews: ['assets/images/report/oryukdo/review-coast.png', 'assets/images/report/oryukdo/review-skywalk-original.jpg']
      },
      programs: [
        ['오륙도 스카이 워크', '바다 위에 설치된 투명한 유리 전망대로, 발밑으로 펼쳐지는 푸른 바다를 보며 아찔한 스릴을 느낄 수 있습니다.'],
        ['해안 산책로', '바다를 따라 이어지는 길에서 자연경관을 즐길 수 있어 가볍게 걷거나 주변 관광과 함께 둘러보기 좋습니다.'],
        ['해맞이공원', '계절마다 달라지는 해안 풍경과 꽃을 즐기며 여유롭게 산책하기 좋은 공간입니다.']
      ],
      reviews: [
        ['탁 트인 바다와 오륙도 풍경이 정말 아름답고, 사진 찍기에도 좋은 곳이에요.', '바다를 좋아하는 여행자'],
        ['유리 바닥 위를 걷는 순간은 생각보다 아찔해서 색다른 재미가 있었어요.', '주말 부산 여행자']
      ]
    },
    beomeosa: {
      number: '02', title: '범어사 템플 스테이', type: '체험형 관광', visual: 'BEOMEOSA · TEMPLE STAY',
      description: '신라 문무왕 18년인 678년 의상대사가 창건한 범어사는 금정산의 숲과 천년 불교문화가 어우러진 부산의 대표 수행 사찰입니다. 하늘에서 내려온 금빛 물고기 설화와 함께 선명상·공양·차담 등을 경험하며 일상의 속도를 잠시 늦출 수 있습니다.',
      tags: ['#범어사', '#범어사템플스테이', '#부산힐링여행', '#사찰여행', '#마음쉼여행'],
      location: '부산광역시 금정구 상마1길 20 범어사 선문화교육관', visit: '프로그램 일정 기준 · 사전 예약 · 봄·가을 추천',
      images: {
        hero: 'assets/images/report/beomeosa/hero.webp',
        programs: ['assets/images/report/beomeosa/program-seon.webp', 'assets/images/report/beomeosa/program-rest.webp', 'assets/images/report/beomeosa/program-volunteer.webp']
      },
      programs: [
        ['선명상 주말 체험형', '선명상과 숲길 포행, 사찰 안내, 공양을 통해 범어사의 수행 문화를 경험하는 1박 2일 프로그램입니다. 108배 서원주 만들기와 새벽예불, 스님과의 차담을 통해 자신의 마음을 차분히 돌아봅니다.'],
        ['‘쉼’ 휴식형', '정해진 체험보다 금정산의 바람과 새소리를 느끼며 자유롭게 쉬는 데 초점을 둔 프로그램입니다. 복잡한 도시와 일상에서 잠시 벗어나 조용한 산사에서 온전히 자신만의 시간을 보낼 수 있습니다.'],
        ['휴식형 자원봉사 프로그램', '휴식형 템플스테이 후 방사 정리, 세탁물 정돈, 잡초 뽑기 등의 울력에 참여하는 프로그램입니다. 산사에서 쉬는 경험과 공동체를 위한 작은 노동을 결합합니다.']
      ],
      reviews: [
        ['수행복으로 갈아입는 순간부터 평범한 숙박이 아닌, 일상을 내려놓는 시간처럼 느껴졌다.', '템플스테이 참가자'],
        ['범종과 목탁 소리, 숲길 산책, 이른 새벽의 고요함이 마음을 차분하게 만드는 경험됐습니다.', '주말 체험형 참가자'],
        ['108배와 명상은 몸이 힘들기도 했지만, 반복되는 동작 속에서 자신에게 집중하고 마음을 비울 수 있었다.', '선명상 참가자']
      ]
    },
    taejongdae: {
      number: '03', title: '태종대 유원지', type: '자연 관광 자원', visual: 'TAEJONGDAE · GEO PARK',
      description: '영도 최남단에 자리한 태종대 유원지는 울창한 해송 숲과 해안 절벽, 기암괴석, 대한해협이 어우러진 부산의 대표 자연 명소입니다. 신라 태종무열왕이 이곳에서 활을 쏘았다는 이야기에서 이름이 유래했다고 전해지지만 정확한 역사적 사실로 검증된 것은 아닙니다. 2005년 명승 제17호로 지정되었으며, 해식애와 파식대지 등 독특한 해안 지형을 관찰할 수 있습니다.',
      tags: ['#태종대', '#태종대유원지', '#부산힐링여행', '#부산숨은명소'],
      location: '부산광역시 영도구 전망로 24', visit: '맑은 날 오전—해질녘 추천 · 신선바위·망부석 진입로 출입 통제 중',
      images: {
        hero: 'assets/images/report/taejongdae/hero.webp',
        programs: [
          'assets/images/report/taejongdae/program-danubi.webp',
          'assets/images/report/taejongdae/program-lighthouse.webp',
          'assets/images/report/taejongdae/program-trail.webp'
        ]
      },
      programs: [
        ['다누비열차 타고 태종대 둘러보기', '4.3km 순환도로를 따라 전망대와 영도등대 등 주요 지점을 편하게 둘러봅니다. 도보로 전체를 돌면 약 1시간~1시간 30분이 걸립니다. 현재 안내 요금은 성인 순환 4,000원·편도 2,000원이며, 운행 일정과 기상에 따른 중단 여부는 방문 전 공식 홈페이지에서 확인하세요.'],
        ['영도등대·전망대에서 해안 절경 보기', '계단을 따라 내려가면 1906년 처음 불을 밝힌 영도등대와 절벽·바다가 맞닿은 전망을 만날 수 있습니다. 매우 맑은 날에는 약 56km 떨어진 쓰시마섬까지 보이지만, 경사와 계단이 많아 편한 신발이 필요합니다.'],
        ['숲길과 해안 절벽 따라 천천히 걷기', '해송 등 120여 종의 수목 사이로 태종사·영도등대·전망대·자갈마당·남항조망지를 연결해 걸을 수 있습니다. 유람선은 약 40분 코스로 운항 여부와 요금을 당일 확인해야 하며, 신선바위·망부석 진입로는 현재 출입 통제 중입니다.']
      ],
      reviews: [
        ['다누비열차를 이용하면 넓고 오르막이 많은 태종대를 비교적 편하게 돌아볼 수 있고, 숲길과 바다가 번갈아 보이는 이동 자체가 좋았습니다.', '다누비열차 이용객'],
        ['전망대와 영도등대에서 바라본 넓은 바다와 절벽 풍경이 가장 기억에 남았고, 잠시 앉아 바다를 바라보는 것만으로도 여유로웠습니다.', '태종대 방문객'],
        ['생각보다 오르막과 계단이 많아 체력이 필요했습니다. 편한 신발을 신고 다누비열차와 도보를 섞어 이동하는 것을 추천합니다.', '도보 여행자']
      ]
    }
  };

  const modal = document.querySelector('#resource-modal');
  if (!modal) return;
  const scrollArea = modal.querySelector('[data-modal-scroll]');
  const categoryButtons = [...modal.querySelectorAll('[data-modal-target]')];
  let opener = null;

  const setText = (selector, value) => { modal.querySelector(selector).textContent = value; };
  const setActiveCategory = targetId => {
    categoryButtons.forEach(button => {
      const active = button.dataset.modalTarget === targetId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-controls', button.dataset.modalTarget);
    });
    modal.querySelectorAll('.modal-section').forEach(section => {
      section.classList.toggle('is-active', section.id === targetId);
    });
    scrollArea.scrollTop = 0;
  };

  const fillModal = (key) => {
    const data = resources[key];
    if (!data) return;
    modal.dataset.theme = key;
    document.dispatchEvent(new CustomEvent('ove-resource-open', {detail:{resource:key,title:data.title}}));
    setText('[data-modal-title]', data.title);
    setText('[data-modal-type]', data.type);
    setText('[data-modal-home-label]', data.type);
    setText('[data-modal-visual-label]', data.visual);
    setText('[data-modal-description]', data.description);
    setText('[data-modal-location]', data.location);
    setText('[data-modal-visit]', data.visit);
    const heroImage = modal.querySelector('[data-modal-image="hero"]');
    heroImage.classList.toggle('has-photo', Boolean(data.images?.hero));
    heroImage.style.backgroundImage = data.images?.hero ? `url("${data.images.hero}")` : '';
    modal.querySelector('[data-modal-tags]').innerHTML = data.tags.map(tag => `<span>${tag}</span>`).join('');
    modal.querySelector('[data-modal-programs]').innerHTML = data.programs.map((program, index) => {
      const image = data.images?.programs?.[index];
      return `<article class="program-card"><figure class="${image ? 'has-photo' : ''}" ${image ? `style="background-image:url('${image}')"` : ''} aria-label="${program[0]} 이미지"><span class="sr-only">${image ? program[0] : '추후 실제 이미지로 교체'}</span></figure><h4>${String(index + 1).padStart(2, '0')}. ${program[0]}</h4><p>${program[1]}</p></article>`;
    }).join('');
    modal.querySelector('[data-modal-reviews]').innerHTML = data.reviews.map(review => `<article class="review-entry"><header><span aria-label="별점 5점">★★★★★</span><small>${review[1]}</small></header><p>${review[0]}</p></article>`).join('');
  };

  const openModal = row => {
    opener = row;
    fillModal(row.dataset.resource);
    scrollArea.style.scrollBehavior = 'auto';
    scrollArea.scrollTop = 0;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    document.querySelectorAll('body > header, body > main, body > footer').forEach(el => { el.inert = true; });
    requestAnimationFrame(() => {
      scrollArea.scrollTop = 0;
      setActiveCategory('modal-home');
      modal.classList.add('is-open');
      modal.querySelector('.modal-close').focus();
      requestAnimationFrame(() => {
        scrollArea.scrollTop = 0;
        setActiveCategory('modal-home');
        scrollArea.style.removeProperty('scroll-behavior');
      });
    });
  };

  const closeModal = () => {
    scrollArea.style.scrollBehavior = 'auto';
    scrollArea.scrollTop = 0;
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    document.querySelectorAll('body > header, body > main, body > footer').forEach(el => { el.inert = false; });
    opener?.focus();
  };

  document.querySelectorAll('.resource-row').forEach(row => {
    row.addEventListener('click', () => openModal(row));
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openModal(row); }
    });
  });

  modal.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', closeModal));
  categoryButtons.forEach(button => button.addEventListener('click', () => {
    setActiveCategory(button.dataset.modalTarget);
  }));

  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('.modal-dialog button, .modal-dialog a[href], .modal-dialog input, .modal-dialog textarea, .modal-dialog select, .modal-dialog [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
});
