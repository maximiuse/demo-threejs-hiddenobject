/* Kép-S – progressive enhancements. The site works without this file. */
(function () {
  'use strict';

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 1060px)').addEventListener('change', function () { setOpen(false); });
  }

  // Before / after retouch slider
  document.querySelectorAll('.ba').forEach(function (ba) {
    var range = ba.querySelector('.ba-range');
    if (!range) return;
    var update = function () { ba.style.setProperty('--pos', range.value + '%'); };
    range.addEventListener('input', update);
    update();
  });

  // Gallery lightbox
  var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
  if (!links.length || typeof HTMLDialogElement !== 'function') return;

  var dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Képnézegető');
  dlg.innerHTML =
    '<div class="lb-stage"><img alt=""></div>' +
    '<button class="lb-btn lb-close" type="button" aria-label="Bezárás">×</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Előző kép">‹</button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Következő kép">›</button>' +
    '<p class="lb-count" aria-live="polite"></p>';
  document.body.appendChild(dlg);

  var stage = dlg.querySelector('.lb-stage');
  var image = stage.querySelector('img');
  var count = dlg.querySelector('.lb-count');
  var index = 0;

  function show(i) {
    index = (i + links.length) % links.length;
    var a = links[index];
    var thumb = a.querySelector('img');
    image.src = a.href;
    image.alt = thumb ? thumb.alt : '';
    image.width = +a.dataset.w || 0;
    image.height = +a.dataset.h || 0;
    count.textContent = (index + 1) + ' / ' + links.length;
    // preload neighbours
    [index + 1, index - 1].forEach(function (n) {
      var l = links[(n + links.length) % links.length];
      if (l) { var p = new Image(); p.src = l.href; }
    });
  }

  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      show(i);
      dlg.showModal();
    });
  });

  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
  dlg.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
  var swiped = false;
  dlg.addEventListener('click', function (e) {
    if (swiped) { swiped = false; return; } // a swipe also fires a click – don't close
    if (e.target === dlg || e.target === stage) dlg.close();
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
  });
  dlg.addEventListener('close', function () {
    var a = links[index];
    if (a) a.focus({ preventScroll: false });
  });

  // swipe
  var startX = null, startY = null;
  stage.addEventListener('pointerdown', function (e) { startX = e.clientX; startY = e.clientY; });
  stage.addEventListener('pointerup', function (e) {
    if (startX === null) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      setTimeout(function () { swiped = false; }, 300);
      show(index + (dx < 0 ? 1 : -1));
    }
  });
})();
