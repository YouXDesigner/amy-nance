const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const headerInner = document.querySelector('.header-inner');
const btnHeader = document.querySelector('.btn-header');
const overlayHeader = document.querySelector('.site-header-overlay');
const mobileNavQuery = window.matchMedia('(max-width: 767px)');
const NAV_CTA_GAP = 24;
let navModeLock = false;

function updateHeader() {
  if (!overlayHeader) return;
  const solid = window.scrollY > 40 || siteNav.classList.contains('open');
  overlayHeader.classList.toggle('is-solid', solid);
}

function updateNavMode() {
  if (navModeLock || !headerInner || !btnHeader) return;
  navModeLock = true;

  const wasOpen = siteNav.classList.contains('open');
  const forceMobile = mobileNavQuery.matches;
  const logo = headerInner.querySelector('.logo');

  document.documentElement.classList.remove('nav-compact', 'nav-compact-mobile');
  siteNav.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');

  // Measure expanded desktop layout before deciding.
  void headerInner.offsetWidth;

  const styles = getComputedStyle(headerInner);
  const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const flexGap = parseFloat(styles.columnGap || styles.gap) || 32;
  const available = headerInner.clientWidth - padX;
  const needed =
    (logo ? logo.offsetWidth : 0) +
    siteNav.scrollWidth +
    btnHeader.offsetWidth +
    flexGap * 2 +
    NAV_CTA_GAP;

  const navRect = siteNav.getBoundingClientRect();
  const ctaRect = btnHeader.getBoundingClientRect();
  const overlapsCta = ctaRect.width > 0 && navRect.right + NAV_CTA_GAP > ctaRect.left;
  const overflowsHeader = headerInner.scrollWidth > headerInner.clientWidth + 1;
  const needsCompact = forceMobile || overlapsCta || overflowsHeader || needed > available;

  document.documentElement.classList.toggle('nav-compact', needsCompact);
  document.documentElement.classList.toggle('nav-compact-mobile', forceMobile);

  if (needsCompact && wasOpen) {
    siteNav.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
  }

  updateHeader();
  requestAnimationFrame(() => {
    navModeLock = false;
  });
}

navToggle.addEventListener('click', () => {
  const isOpen = siteNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  updateHeader();
});

window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('resize', updateNavMode);
if (typeof ResizeObserver !== 'undefined' && headerInner) {
  new ResizeObserver(updateNavMode).observe(headerInner);
}
if (typeof mobileNavQuery.addEventListener === 'function') {
  mobileNavQuery.addEventListener('change', updateNavMode);
} else if (typeof mobileNavQuery.addListener === 'function') {
  mobileNavQuery.addListener(updateNavMode);
}
updateNavMode();

document.getElementById('year').textContent = new Date().getFullYear();

(function keepShortWordsWithNext() {
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'SAMP']);
  // Treat curly/straight apostrophes as part of the word so "That's" / "you'd" stay intact.
  const shortBeforeSpace = /(?<![\p{L}'’])([\p{L}]{1,2})(?![\p{L}'’])\s+(?=\S)/gu;
  const shortAtEnd = /(?<![\p{L}'’])([\p{L}]{1,2})\s*$/u;

  function shouldSkip(node) {
    let el = node.parentElement;
    while (el) {
      if (skipTags.has(el.tagName)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function nextSignificantSibling(node) {
    let n = node.nextSibling;
    while (n && n.nodeType === Node.TEXT_NODE && !/\S/.test(n.nodeValue)) {
      n = n.nextSibling;
    }
    return n;
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || shouldSkip(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const next = nextSignificantSibling(node);
    if (next && next.nodeType === Node.ELEMENT_NODE && next.tagName === 'BR') {
      const match = node.nodeValue.match(shortAtEnd);
      if (match) {
        const word = match[1];
        node.nodeValue = node.nodeValue.slice(0, match.index);
        const after = nextSignificantSibling(next);
        if (after && after.nodeType === Node.TEXT_NODE) {
          after.nodeValue = word + '\u00A0' + after.nodeValue.replace(/^\s*/, '');
        } else {
          next.after(document.createTextNode(word + '\u00A0'));
        }
      }
    }

    node.nodeValue = node.nodeValue.replace(shortBeforeSpace, '$1\u00A0');
  }
})();

(function keepTwoWordsOnLastLine() {
  function glueLastTwoWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue) nodes.push(walker.currentNode);
    }
    if (!nodes.length) return;

    let full = '';
    const ranges = [];
    for (const node of nodes) {
      ranges.push({ node, start: full.length, end: full.length + node.nodeValue.length });
      full += node.nodeValue;
    }

    const match = full.match(/(\S+)(\s+)(\S+)\s*$/);
    if (!match) return;

    const spaceStart = match.index + match[1].length;
    const spaceEnd = spaceStart + match[2].length;

    for (let i = 0; i < ranges.length; i++) {
      const { node, start, end } = ranges[i];
      if (spaceStart < end && spaceStart >= start) {
        const localStart = spaceStart - start;
        if (spaceEnd <= end) {
          node.nodeValue =
            node.nodeValue.slice(0, localStart) +
            '\u00A0' +
            node.nodeValue.slice(spaceEnd - start);
          return;
        }

        // Whitespace spans text nodes: keep the words joined with one nbsp.
        node.nodeValue = node.nodeValue.slice(0, localStart) + '\u00A0';
        let remaining = spaceEnd - end;
        for (let j = i + 1; j < ranges.length && remaining > 0; j++) {
          const next = ranges[j].node;
          const leading = next.nodeValue.match(/^\s*/)[0].length;
          const drop = Math.min(leading, remaining);
          next.nodeValue = next.nodeValue.slice(drop);
          remaining -= drop;
        }
        return;
      }
    }
  }

  document.querySelectorAll('p').forEach(glueLastTwoWords);
})();
