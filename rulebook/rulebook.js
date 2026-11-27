/* The rulebook on screen: the contents from the chapter titles (chapters only, to keep it to a few lines), the page size, the print button. Printing needs nothing from here. */
document.addEventListener('DOMContentLoaded', () => {
  const toc = document.querySelector('.toc');
  document.querySelectorAll('.chapter').forEach((c, n) => {
    const h = c.querySelector('h2');
    if (!c.id) c.id = `ch${n + 1}`;
    if (toc && c.dataset.part) toc.insertAdjacentHTML('beforeend', `<li class="toc-part">${c.dataset.part}</li>`);
    if (toc && h) toc.insertAdjacentHTML('beforeend', `<li><a href="#${c.id}">${n + 1}. ${h.textContent}</a></li>`);
    c.querySelectorAll('h3').forEach((h3, i) => {
      if (!h3.id) h3.id = `${c.id}-${i + 1}`;
    });
  });
  const size = document.querySelector('[data-size]'), page = document.getElementById('page-size');
  size?.addEventListener('change', () => { page.textContent = `@page { size: ${size.value}; }`; });
  document.querySelector('[data-print]')?.addEventListener('click', () => print());
});
