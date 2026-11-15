// Navigation uses ordinary offline links; search only filters the directory.
(() => {
  const menu = document.querySelector('.province-menu');
  if (!menu) return;
  const search = menu.querySelector('.region-search');
  const links = [...menu.querySelectorAll('[data-region-search]')];
  const groups = [...menu.querySelectorAll('.region-group')];
  const empty = menu.querySelector('.directory-empty');
  const filter = () => {
    const query = search.value.trim().toLowerCase().replace(/\s/g, '');
    links.forEach(link => { link.hidden = !link.dataset.regionSearch.includes(query); });
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('a')].some(a => !a.hidden); });
    empty.hidden = links.some(link => !link.hidden);
  };
  search.addEventListener('input', filter);
  menu.addEventListener('toggle', () => {
    if (menu.open) { search.value = ''; filter(); }
  });
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    menu.open = false;
    menu.querySelector('summary').focus();
    event.preventDefault();
  });
})();
