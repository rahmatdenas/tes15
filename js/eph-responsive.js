'use strict';

// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements)
// ============================================================

(function() {

  var MOBILE_QUERY   = '(max-width: 800px)';
  var HANDLE_HEIGHT  = 56;   // harus sama dengan tinggi #panel-handle di CSS
  var DRAG_THRESHOLD = 5;    // px, untuk membedakan tap vs drag

  var panel, handle, handleLabel;
  var currentY       = 0;       
  var dragging       = false;
  var moved          = false;
  var startClientY   = 0;
  var startTranslate = 0;
  var isHandleTap    = false; 
  var activeScrollNode = null; // Menyimpan elemen yang sedang discroll

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function collapsedTranslate() {
    return Math.max(panel.offsetHeight - HANDLE_HEIGHT, 0);
  }

  function clampY(y) {
    return Math.min(Math.max(y, 0), collapsedTranslate());
  }

  function applyTransform(y) {
    currentY = y;
    panel.style.transform = 'translateY(' + y + 'px)';
  }

  function updateLabel(expanded) {
    if (!handleLabel) return;
    handleLabel.textContent = expanded
      ? 'Tarik turun untuk lihat peta'
      : 'Tarik naik untuk lihat daftar';
  }

  function setExpanded(expand, animate) {
    if (animate !== false) {
      panel.classList.remove('eph-dragging');
    }
    applyTransform(expand ? 0 : collapsedTranslate());
    updateLabel(expand);
  }

  // Helper untuk mendeteksi apakah elemen yang disentuh bisa digulir (punya scroll)
  function getScrollableParent(node, root) {
    while (node && node !== root && node !== document.body) {
      if (node.scrollHeight > node.clientHeight) {
        var overflowY = window.getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return node;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function onTouchStart(e) {
    if (!isMobile()) return;
    
    // Gunakan touches untuk perangkat mobile
    var touch = e.touches ? e.touches[0] : e;
    
    // Pastikan kita mendapatkan elemen HTML (bukan text node)
    var target = e.target.nodeType === 3 ? e.target.parentNode : e.target;

    // Abaikan interaksi pada elemen input/tombol
    var interactiveTags = ['BUTTON', 'A', 'SELECT', 'OPTION', 'INPUT'];
    if (interactiveTags.indexOf(target.tagName) !== -1 || target.closest('button, a, select')) {
      return;
    }

    dragging = true;
    moved = false;
    startClientY = touch.clientY;
    startTranslate = currentY;
    
    // Cek apakah sentuhan pertama berada di handle
    isHandleTap = !!target.closest('#panel-handle');
    
    // Deteksi otomatis apakah target yang disentuh ada di dalam area yang bisa discroll
    activeScrollNode = getScrollableParent(target, panel);

    panel.classList.add('eph-dragging');
  }

  function onTouchMove(e) {
    if (!dragging) return;
    
    var touch = e.touches ? e.touches[0] : e;
    var delta = touch.clientY - startClientY;

    // Logika Pintar: Scroll vs Drag
    if (activeScrollNode) {
      // Jika pengguna sedang scroll isi daftar ke bawah, ATAU
      // scroll daftar ke atas tapi posisinya belum mentok di paling atas
      if (delta < 0 || (delta > 0 && activeScrollNode.scrollTop > 0)) {
        dragging = false;
        panel.classList.remove('eph-dragging');
        return; // Biarkan browser melakukan scroll bawaan
      }
    }

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      moved = true;
      // PENTING: Matikan efek 'pull-to-refresh' / scroll bawaan browser saat sedang menarik panel
      if (e.cancelable) e.preventDefault(); 
    }

    applyTransform(clampY(startTranslate + delta));
  }

  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;

    var collapsed = collapsedTranslate();

    if (!moved) {
      // Kalau cuma ditap (tidak ditarik), hanya handle yang boleh bereaksi
      if (isHandleTap) {
        setExpanded(currentY > collapsed / 2);
      }
    } else {
      // Kalau panel benar-benar ditarik, tutup/buka berdasarkan posisi terakhir
      setExpanded(currentY < collapsed / 2);
    }

    panel.classList.remove('eph-dragging');
  }

  function buildHandle() {
    handle = document.createElement('div');
    handle.id = 'panel-handle';

    var grip = document.createElement('div');
    grip.className = 'eph-grip';

    handleLabel = document.createElement('div');
    handleLabel.className = 'eph-handle-label';

    handle.appendChild(grip);
    handle.appendChild(handleLabel);
    panel.insertBefore(handle, panel.firstChild);
  }

  function handleViewportChange() {
    if (!panel) return;

    if (isMobile()) {
      if (!document.getElementById('panel-handle')) buildHandle();
      setExpanded(false, false);
    } else {
      panel.style.transform = '';
      panel.classList.remove('eph-dragging');
      currentY = 0;
    }
  }

  window.addEventListener('load', function() {
    panel = document.getElementById('panel');
    if (!panel) return;

    handleViewportChange();

    // MENGGUNAKAN TOUCH EVENTS MURNI DENGAN PASSIVE FALSE
    panel.addEventListener('touchstart', onTouchStart, { passive: false });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd);
    panel.addEventListener('touchcancel', onTouchEnd);

    if (window.Map) {
      Map.on('popupopen', function() {
        if (isMobile()) setExpanded(true);
      });
    }
  });

  window.addEventListener('resize', handleViewportChange);

})();
