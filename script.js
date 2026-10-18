const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

const overlayHeader = document.querySelector('.site-header-overlay');

function updateHeader() {
  if (!overlayHeader) return;
  const solid = window.scrollY > 40 || siteNav.classList.contains('open');
  overlayHeader.classList.toggle('is-solid', solid);
}

navToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  updateHeader();
});

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

document.getElementById('year').textContent = new Date().getFullYear();
