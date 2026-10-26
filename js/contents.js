document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-category]');
  buttons.forEach(button => {
    const count = button.querySelector('span');
    if (count) count.textContent = String([...cards].filter(card => button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter).length).padStart(2, '0');
  });
  buttons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    buttons.forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    cards.forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('is-hidden', !show);
      if (show) requestAnimationFrame(() => card.classList.add('is-visible'));
    });
  }));
});
