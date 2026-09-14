// Local interactions for the unmodified Shofy DOM snapshots; no React/API runtime.
(() => {
  const all = (s, root = document) => [...root.querySelectorAll(s)];
  const toggle = (s, c, on) => all(s).forEach(e => e.classList.toggle(c, on));
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a,[role="tab"]');
    if (!target) return;
    if (target.matches('.tp-offcanvas-open-btn')) toggle('.offcanvas__area', 'offcanvas-opened', true);
    if (target.matches('.offcanvas-close-btn')) toggle('.offcanvas__area', 'offcanvas-opened', false);
    if (target.matches('.tp-filter-btn')) toggle('.tp-filter-offcanvas-area', 'offcanvas-opened', true);
    if (target.matches('.filter-close-btn')) toggle('.tp-filter-offcanvas-area', 'offcanvas-opened', false);
    if (target.dataset.bsTarget) {
      const pane = document.querySelector(target.dataset.bsTarget);
      if (pane) {
        event.preventDefault();
        all('[data-bs-target]', target.closest('[role="tablist"]') || target.parentElement).forEach(e => {
          e.classList.toggle('active', e === target);
          e.setAttribute('aria-selected', String(e === target));
        });
        [...pane.parentElement.children].forEach(e => {
          e.classList.toggle('active', e === pane);
          e.classList.toggle('show', e === pane);
        });
      }
    }
    if (target.matches('.back-to-top-btn')) window.scrollTo({top: 0, behavior: 'smooth'});
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggle('.offcanvas__area,.tp-filter-offcanvas-area', 'offcanvas-opened', false);
  });
  // Freeze each carousel on its original first slide without desktop pixel widths.
  all('.swiper-wrapper').forEach(wrapper => {
    const slides = all(':scope > .swiper-slide', wrapper);
    slides.forEach((slide, index) => { slide.hidden = index > 0; });
    wrapper.style.transform = 'none';
  });
  // Only search the products actually captured from the original demo.
  const params = new URLSearchParams(location.search);
  const search = all('input').find(e => /search/i.test(e.placeholder));
  const filterProducts = value => {
    const q = value.trim().toLowerCase();
    let count = 0;
    all('#grid-tab-pane .tp-product-title-2').forEach(title => {
      const card = title.closest('[class*="col-"]');
      if (!card) return;
      card.hidden = !card.textContent.toLowerCase().includes(q);
      if (!card.hidden) count++;
    });
    all('#list-tab-pane .tp-product-title-2').forEach(title => {
      const card = title.closest('.tp-product-list-item') || title.closest('[class*="col-"]');
      if (card) card.hidden = !card.textContent.toLowerCase().includes(q);
    });
    const result = document.querySelector('.tp-shop-top-result');
    if (result) result.textContent = `${count} demo ürünü`;
  };
  all('form').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    if (input && /search/i.test(input.placeholder)) location.href = `arama.html?q=${encodeURIComponent(input.value)}`;
  }));
  if (search && document.querySelector('#grid-tab-pane')) {
    search.value = params.get('q') || '';
    search.addEventListener('input', () => filterProducts(search.value));
    filterProducts(search.value);
  }
})();
