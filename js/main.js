/* President Guest Lodge — page behaviour
   1. Router: #rooms, #facilities, #gallery are separate pages; other hashes
      (#about, #reviews, #location...) are sections on the home page.
   2. Nav: solid background after scrolling, mobile menu, active link.
   3. WhatsApp button: appears once the visitor scrolls past the first screen.
   4. Photo sliders: endless looping with a counter and arrow buttons.
   5. Gallery lightbox: click or Enter to enlarge, Escape to close. */
(function () {
  'use strict';

  var PAGES = ['rooms', 'facilities', 'gallery'];
  var ALIASES = { boardroom: 'facilities', dining: 'facilities' };
  var root = document.documentElement;
  var nav = document.getElementById('nav');
  var menu = document.getElementById('mobileMenu');
  var hamburger = document.querySelector('.hamburger');
  var whatsapp = document.querySelector('.whatsapp-fab');
  var sliders = [];

  /* ---------- 1. Router ---------- */
  function currentRoute() {
    var hash = location.hash.slice(1);
    hash = ALIASES[hash] || hash;
    return { hash: hash, page: PAGES.indexOf(hash) > -1 ? hash : 'home' };
  }

  function route() {
    var r = currentRoute();
    root.dataset.page = r.page;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + r.page);
    });
    closeMenu();

    var target = r.page === 'home' && r.hash && r.hash !== 'home' ? document.getElementById(r.hash) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    onScroll();
    sliders.forEach(function (s) { s.reset(); }); // sliders on a newly shown page need their width
  }

  /* ---------- 2. Nav + 3. WhatsApp button ---------- */
  var scrollQueued = false;
  function updateOnScroll() {
    scrollQueued = false;
    nav.classList.toggle('scrolled', window.scrollY > 50);
    whatsapp.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
  }
  // At most one update per frame, so scrolling never waits on this
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateOnScroll);
  }

  function closeMenu() {
    menu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu();
  });

  /* ---------- 4. Endless photo sliders ----------
     A copy of the last photo goes in front and a copy of the first at the end.
     When a swipe lands on a copy, we jump (without animation) to the real photo. */
  function Slider(el) {
    var track = el.querySelector('.car-track');
    var counter = el.querySelector('.car-count');
    var count = track.children.length;
    var timer;

    track.insertBefore(track.lastElementChild.cloneNode(true), track.firstElementChild);
    track.appendChild(track.children[1].cloneNode(true));
    // copies are decoration for screen readers
    track.firstElementChild.setAttribute('aria-hidden', 'true');
    track.lastElementChild.setAttribute('aria-hidden', 'true');

    function width() { return track.clientWidth; }
    function position() { return Math.round(track.scrollLeft / width()); }
    function jumpTo(i) {
      track.style.scrollSnapType = 'none';
      track.scrollLeft = i * width();
      void track.offsetHeight; // apply the jump before snapping comes back
      track.style.scrollSnapType = '';
    }
    function showCount(p) { counter.textContent = (((p - 1) % count + count) % count + 1) + ' / ' + count; }

    track.addEventListener('scroll', function () {
      showCount(position());
      clearTimeout(timer);
      timer = setTimeout(function () {
        var p = position();
        if (p === 0) jumpTo(count);
        else if (p === count + 1) jumpTo(1);
      }, 120);
    }, { passive: true });

    el.querySelector('.prev').addEventListener('click', function () { track.scrollBy({ left: -width(), behavior: 'smooth' }); });
    el.querySelector('.next').addEventListener('click', function () { track.scrollBy({ left: width(), behavior: 'smooth' }); });

    this.reset = function () {
      if (width()) jumpTo(1);
      showCount(1);
    };
  }

  document.querySelectorAll('.carousel').forEach(function (el) {
    var track = el.querySelector('.car-track');
    if (track.children.length > 1 && el.querySelector('.car-count')) sliders.push(new Slider(el));
  });

  /* ---------- 5. Gallery lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lastFocus = null;

  function openLightbox(item) {
    var img = item.querySelector('img');
    lightboxImg.src = img.getAttribute('src'); // full-size version
    lightboxImg.alt = img.alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lastFocus = item;
    lightbox.querySelector('.lightbox-close').focus();
  }
  function closeLightbox() {
    if (!lightbox.classList.contains('open')) return;
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('.g-item').forEach(function (item) {
    item.addEventListener('click', function () { openLightbox(item); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(item); }
    });
  });
  lightbox.addEventListener('click', function (e) {
    if (e.target !== lightboxImg) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLightbox(); closeMenu(); }
  });

  /* ---------- Start ---------- */
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', function () { sliders.forEach(function (s) { s.reset(); }); });
  route();
})();
