document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const main = document.querySelector('main');
  const footer = document.querySelector('.site-footer');
  const brand = document.querySelector('.site-header .brand');
  if (toggle && nav) {
    const mobile = window.matchMedia('(max-width: 900px)');
    const setMenu = (open, restoreFocus = false) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = open ? '메뉴 닫기' : '메뉴 열기';
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      [main, footer, brand].forEach(el => { if (el) el.inert = open; });
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    mobile.addEventListener('change', () => setMenu(false));
    document.addEventListener('keydown', event => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
      if (event.key === 'Tab') {
        const links = [...nav.querySelectorAll('a[href]')];
        const last = links.at(-1);
        if (event.shiftKey && document.activeElement === toggle) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); toggle.focus(); }
      }
    });
    document.documentElement.classList.add('nav-ready');
  }
  document.querySelectorAll('[data-current-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
});
