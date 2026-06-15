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
  var isHandleTap    = false; // Penanda baru untuk mendeteksi area ketukan

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

  function isExpanded() {
    return currentY < collapsedTranslate() / 2;
  }

  function getClientY(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientY;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientY;
    return e.clientY;
  }

  function onPointerDown(e) {
    if (!isMobile()) return;

    var target = e.target;

    // Abaikan interaksi pada tombol, tautan, atau input
    var interactiveTags = ['BUTTON', 'A', 'SELECT', 'OPTION', 'INPUT'];
    if (interactiveTags.indexOf(target.tagName) !== -1 || target.closest('button, a, select')) {
      return;
    }

    dragging = true;
    moved = false;
    startClientY = getClientY(e);
    startTranslate = currentY;

    // Deteksi apakah yang disentuh adalah area HANDLE (untuk izin tap)
    isHandleTap = !!target.closest('#panel-handle');

    // Tandai jika area yang diklik adalah area yang bisa di-scroll (overflow)
    panel._dragScrollContainer = target.closest('.panel-content, #index-list, nav');

    panel.classList.add('eph-dragging');

    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function onPointerMove(e) {
    if (!dragging) return;

    var clientY = getClientY(e);
    var delta = clientY - startClientY;

    // Logika Scroll vs Drag
    if (panel._dragScrollContainer) {
      var sc = panel._dragScrollContainer;
      
      // Jika scroll ke atas atau sedang tidak di puncak, batalkan drag panel
      if (delta < 0 || (delta > 0 && sc.scrollTop > 0)) {
        dragging = false;
        panel.classList.remove('eph-dragging');
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        return;
      }
    }

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      moved = true;
      if (e.cancelable) e.preventDefault(); 
    }

    applyTransform(clampY(startTranslate + delta));
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);

    var collapsed = collapsedTranslate();

    if (!moved) {
      // PERBAIKAN: Jika TIDAK DIGESER (hanya disentuh/tap)
      // Panel HANYA akan bereaksi jika yang ditap adalah area handle.
      // Jika yang ditap area lain (header, dll), abaikan saja.
      if (isHandleTap) {
        setExpanded(currentY > collapsed / 2);
      }
    } else {
      // Jika ditarik/digeser, cek posisi terakhir untuk membuka/menutup
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

    // Event listener diletakkan pada keseluruhan panel
    panel.addEventListener('pointerdown', onPointerDown);

    if (window.Map) {
      Map.on('popupopen', function() {
        if (isMobile()) setExpanded(true);
      });
    }
  });

  window.addEventListener('resize', handleViewportChange);

})();
