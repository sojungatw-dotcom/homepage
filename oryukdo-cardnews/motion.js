(() => {
  const params = new URLSearchParams(location.search);
  const cardNumber = Number(params.get('card'));
  const staticMode = params.get('static') === '1';
  const cards = [...document.querySelectorAll('.card')];
  const navLinks = [...document.querySelectorAll('.card-nav a')];
  const replay = document.querySelector('#replay');

  if (cardNumber >= 1 && cardNumber <= cards.length) {
    document.body.classList.add('single');
    cards[cardNumber - 1].classList.add('is-selected');
    navLinks[cardNumber - 1].classList.add('active');
    document.title = `${String(cardNumber).padStart(2, '0')} · 오륙도 스카이워크 카드뉴스`;
  }

  const visibleCards = () => cards.filter(card => getComputedStyle(card).display !== 'none');
  function play() {
    visibleCards().forEach(card => {
      card.classList.remove('is-playing', 'is-static');
      void card.offsetWidth;
      card.classList.add(staticMode ? 'is-static' : 'is-playing');
    });
  }

  replay.addEventListener('click', play);
  if (staticMode) replay.hidden = true;
  requestAnimationFrame(play);
})();
