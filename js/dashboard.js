document.addEventListener('DOMContentLoaded', () => {
  const period = document.querySelector('.dashboard-toolbar select');
  if (period) {
    period.disabled = true;
    period.title = '기간별 데이터가 아직 등록되지 않았습니다.';
  }
  const counters = document.querySelectorAll('[data-count]');
  const animate = element => {
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || '';
    const decimals = Number.isInteger(target) ? 0 : 1;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.textContent = target.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      return;
    }
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = (target * eased).toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { animate(entry.target); observer.unobserve(entry.target); } }), { threshold: .5 });
    counters.forEach(counter => observer.observe(counter));
  } else { counters.forEach(animate); }
});
