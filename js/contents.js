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
});
