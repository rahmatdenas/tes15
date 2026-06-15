'use strict';

// ============================================================
// PENINGKATAN TAMPILAN PONSEL (Mobile Enhancements)
// ============================================================

(function() {

  var MOBILE_QUERY   = '(max-width: 800px)';
  var HANDLE_HEIGHT  = 56;   // harus sama dengan tinggi #panel-handle di CSS
  var DRAG_THRESHOLD = 5;    // px, toleransi gerakan untuk membedakan tap vs drag

  var panel, handle, handleLabel;
  var currentY       = 0;       
  var dragging       = false;
  var moved          = false;
  var startClientY   = 0;
  var startTranslate = 0;
  var isHandleTap    = false; 
  var activeScrollNode = null; 
  var preventNextClick = false; // Penanda untuk membatalkan klik link jika digeser

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
    
    var touch = e.touches ? e.touches[0] : e;
    var target = e.target.nodeType === 3 ? e.target.parentNode : e.target;

    // PENTING: 'A' (tautan) dihapus dari daftar pengecualian ini!
    // Hanya Input, Tombol, dan Dropdown yang memblokir tarikan panel
    var interactiveTags = ['BUTTON', 'SELECT', 'OPTION', 'INPUT'];
    if (interactiveTags.indexOf(target.tagName) !== -1 || target.closest('button, select, input')) {
      return;
    }

    dragging = true;
    moved = false;
    startClientY = touch.clientY;
    startTranslate = currentY;
    
    isHandleTap = !!target.closest('#panel-handle');
    activeScrollNode = getScrollableParent(target, panel);

    panel.classList.add('eph-dragging');
  }

  function onTouchMove(e) {
    if (!dragging) return;
    
    var touch = e.touches ? e.touches[0] : e;
    var delta = touch.clientY - startClientY;

    // Logika Pintar: Scroll vs Drag (Daftar Index)
    if (activeScrollNode) {
      if (delta < 0 || (delta > 0 && activeScrollNode.scrollTop > 0)) {
        dragging = false;
        panel.classList.remove('eph-dragging');
        return; // Biarkan browser melakukan scroll daftar (native scroll)
      }
    }

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      moved = true;
      if (e.cancelable) e.preventDefault(); // Matikan pull-to-refresh
    }

    applyTransform(clampY(startTranslate + delta));
  }

function onTouchEnd() {
    if (!dragging) return;
    dragging = false;

    var collapsed = collapsedTranslate();
    var panelMovedOrToggled = false; // Penanda apakah panel melakukan pergerakan

    if (!moved) {
      // Jika cuma disentuh (tap) di handle
      if (isHandleTap) {
        setExpanded(currentY > collapsed / 2);
        panelMovedOrToggled = true; // Tandai bahwa panel bergerak (naik/turun) karena ditap
      }
    } else {
      // --- LOGIKA DETEKSI SWIPE (TARIKAN PENDEK) ---
      var dragDistance = currentY - startTranslate; 
      var SWIPE_THRESHOLD = 50; 

      if (dragDistance > SWIPE_THRESHOLD) {
        setExpanded(false);
      } 
      else if (dragDistance < -SWIPE_THRESHOLD) {
        setExpanded(true);
      } 
      else {
        setExpanded(currentY < collapsed / 2);
      }
      panelMovedOrToggled = true; // Tandai bahwa panel ditarik
    }

    // --- PENCEGAH GHOST CLICK (KHUSUS SAFARI/iOS) ---
    // Jika panel merespons (entah ditarik ATAU handle-nya diketuk)
    if (panelMovedOrToggled) {
      preventNextClick = true;
      
      // Durasi dinaikkan menjadi 400ms untuk mengalahkan delay 300ms dari Safari
      setTimeout(function() {
        preventNextClick = false;
      }, 400); 
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

    panel.addEventListener('touchstart', onTouchStart, { passive: false });
    panel.addEventListener('touchmove', onTouchMove, { passive: false });
    panel.addEventListener('touchend', onTouchEnd);
    panel.addEventListener('touchcancel', onTouchEnd);

    // Mencegah klik pada tautan <a> jika pengguna baru saja menggeser/menarik (drag)
    panel.addEventListener('click', function(e) {
      if (preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true); // 'true' (useCapture) agar event dibajak sebelum sampai ke elemen <a>

    // Mencegah browser mobile memicu drag-and-drop bawaan pada gambar
    panel.addEventListener('dragstart', function(e) {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
      }
    });

    if (window.Map) {
      Map.on('popupopen', function() {
        if (isMobile()) setExpanded(true);
      });
    }
  });

  window.addEventListener('resize', handleViewportChange);

})();
