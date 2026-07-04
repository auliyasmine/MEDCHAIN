/**
 * MedChain — ui.js
 * Toast notifications, loading states, skeleton loaders,
 * sidebar behaviour, and shared UI utilities.
 */

'use strict';

const UI = (() => {

  /* ══════════════════════════════════════
     TOAST SYSTEM
  ══════════════════════════════════════ */

  const toastTypes = {
    success: { icon: 'fa-check-circle',     color: 'var(--color-green)',  cls: 'toast-success' },
    error:   { icon: 'fa-exclamation-circle',color: 'var(--color-red)',   cls: 'toast-error'   },
    info:    { icon: 'fa-info-circle',        color: 'var(--color-cyan)', cls: 'toast-info'    },
    loading: { icon: 'fa-spinner',            color: 'var(--color-amber)', cls: 'toast-loading' },
    warning: { icon: 'fa-exclamation-triangle',color:'var(--color-amber)', cls: 'toast-loading' },
  };

  let _activeToasts = new Set();

  /**
   * Show a toast notification.
   * @param {string} title   - Bold header text
   * @param {string} message - Subtext (optional)
   * @param {'success'|'error'|'info'|'loading'|'warning'} type
   * @param {number}  duration - ms before auto-dismiss (0 = manual)
   * @returns {HTMLElement} The toast element (so caller can remove it)
   */
  function toast(title, message = '', type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const cfg = toastTypes[type] || toastTypes.info;
    const el  = document.createElement('div');
    el.className = `toast ${cfg.cls}`;
    el.innerHTML = `
      <i class="fas ${cfg.icon} toast-icon" style="color:${cfg.color}"></i>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title)}</div>
        ${message ? `<div class="toast-msg">${escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-dismiss" onclick="this.closest('.toast').remove()"
        style="background:none;border:none;cursor:pointer;color:var(--color-navy-300);font-size:14px;padding:0 0 0 8px;align-self:flex-start;">
        <i class="fas fa-times"></i>
      </button>
    `;

    el.addEventListener('click', (e) => {
      if (!e.target.closest('.toast-dismiss')) return;
    });

    container.appendChild(el);
    _activeToasts.add(el);

    if (duration > 0) {
      setTimeout(() => dismissToast(el), duration);
    }
    return el;
  }

  function dismissToast(el) {
    if (!el || !el.parentNode) return;
    el.style.transition = 'all 0.25s ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(20px)';
    setTimeout(() => { el.remove(); _activeToasts.delete(el); }, 260);
  }

  function clearAllToasts() {
    _activeToasts.forEach(dismissToast);
    _activeToasts.clear();
  }

  /* Convenience wrappers */
  const Toast = {
    success: (title, msg, d = 4000) => toast(title, msg, 'success', d),
    error:   (title, msg, d = 5000) => toast(title, msg, 'error',   d),
    info:    (title, msg, d = 4000) => toast(title, msg, 'info',    d),
    warning: (title, msg, d = 5000) => toast(title, msg, 'warning', d),
    loading: (title, msg)           => toast(title, msg, 'loading', 0),
    dismiss: dismissToast,
    clear:   clearAllToasts,
  };


  /* ══════════════════════════════════════
     LOADING BUTTON
  ══════════════════════════════════════ */

  /**
   * Show a spinner on a button and disable it.
   * @param {HTMLButtonElement} btn
   * @param {string} loadingText
   * @returns {Function} restore() - call to reset button
   */
  function setButtonLoading(btn, loadingText = 'Processing…') {
    const original    = btn.innerHTML;
    const originalW   = btn.offsetWidth;
    btn.style.minWidth = `${originalW}px`;
    btn.disabled      = true;
    btn.innerHTML     = `<i class="fas fa-spinner" style="animation:spin 1s linear infinite"></i> ${escapeHtml(loadingText)}`;

    return function restore() {
      btn.disabled     = false;
      btn.innerHTML    = original;
      btn.style.minWidth = '';
    };
  }


  /* ══════════════════════════════════════
     SKELETON LOADERS
  ══════════════════════════════════════ */

  function showTableSkeleton(tbodyEl, rows = 3, cols = 4) {
    tbodyEl.innerHTML = Array.from({ length: rows }, () =>
      `<tr>${Array.from({ length: cols }, () =>
        `<td style="padding:12px 14px">
           <div class="skeleton skeleton-text" style="width:${60 + Math.random()*35|0}%"></div>
         </td>`).join('')}</tr>`
    ).join('');
  }

  function showCardSkeleton(container, count = 4) {
    container.innerHTML = Array.from({ length: count }, () =>
      `<div class="skeleton skeleton-card"></div>`
    ).join('');
  }


  /* ══════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════ */

  let _sidebarOpen = false;

  function initSidebar() {
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');
    const toggleBtn = document.querySelector('.sidebar-toggle');
    if (!sidebar) return;

    toggleBtn?.addEventListener('click', toggleSidebar);
    overlay?.addEventListener('click', closeSidebar);

    // Highlight active nav item
    const current = window.location.pathname.split('/').pop();
    sidebar.querySelectorAll('.sidebar-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      if (href && href.includes(current)) item.classList.add('active');
    });
  }

  function toggleSidebar() {
    _sidebarOpen ? closeSidebar() : openSidebar();
  }
  function openSidebar() {
    _sidebarOpen = true;
    document.querySelector('.sidebar')?.classList.add('open');
    document.querySelector('.sidebar-overlay')?.classList.add('active');
  }
  function closeSidebar() {
    _sidebarOpen = false;
    document.querySelector('.sidebar')?.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
  }


  /* ══════════════════════════════════════
     VIEWS (tab switching)
  ══════════════════════════════════════ */

  /**
   * Switch between named views in the same page.
   * Views should have class="view" and id="view-<name>".
   * Nav items should have data-view="<name>".
   */
  function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === name);
    });
    const target = document.getElementById(`view-${name}`);
    if (target) target.classList.add('active');
    if (window.innerWidth < 768) closeSidebar();
  }


  /* ══════════════════════════════════════
     MODAL
  ══════════════════════════════════════ */

  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    document.body.style.overflow = '';
  }

  function initModals() {
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });
    // Close on [data-close-modal]
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
      });
    });
  }


  /* ══════════════════════════════════════
     TABS
  ══════════════════════════════════════ */

  function initTabs(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const content = container.querySelector(`#${target}`);
        if (content) content.classList.add('active');
      });
    });

    // Activate first tab by default
    container.querySelector('.tab-btn')?.click();
  }


  /* ══════════════════════════════════════
     WALLET UI HELPERS
  ══════════════════════════════════════ */

  function updateWalletUI(account, network, simulated = false) {
    // Update all wallet address pills
    document.querySelectorAll('.wallet-addr-display').forEach(el => {
      el.textContent = Wallet.shortAddress(account);
    });

    // Network badges
    document.querySelectorAll('.network-badge-text').forEach(el => {
      el.textContent = simulated
        ? 'Demo Mode'
        : (network?.name || 'Unknown');
    });

    // Show connected state elements, hide disconnected
    document.querySelectorAll('[data-show-when="connected"]').forEach(el => {
      el.classList.remove('hidden');
    });
    document.querySelectorAll('[data-show-when="disconnected"]').forEach(el => {
      el.classList.add('hidden');
    });
  }

  function resetWalletUI() {
    document.querySelectorAll('[data-show-when="connected"]').forEach(el => {
      el.classList.add('hidden');
    });
    document.querySelectorAll('[data-show-when="disconnected"]').forEach(el => {
      el.classList.remove('hidden');
    });
  }


  /* ══════════════════════════════════════
     FORM UTILITIES
  ══════════════════════════════════════ */

  /** Quick Ethereum address validation */
  function isValidAddress(addr) {
    return /^0x[0-9a-fA-F]{40}$/.test(addr);
  }

  /** Shorten a tx hash */
  function shortHash(hash) {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  }

  /** Format timestamp */
  function formatTime(date = new Date()) {
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /** Escape HTML to prevent XSS */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Copy text to clipboard */
  async function copyToClipboard(text, feedbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      if (feedbackEl) {
        const orig = feedbackEl.textContent;
        feedbackEl.textContent = 'Copied!';
        setTimeout(() => { feedbackEl.textContent = orig; }, 1500);
      }
      Toast.success('Disalin!', text);
    } catch {
      Toast.error('Gagal menyalin', '');
    }
  }

  /** Simulate blockchain tx delay with loading toast */
  async function simulateTx(label, minMs = 1200, maxMs = 2800) {
    const t = Toast.loading('Menandatangani Transaksi…', label);
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(r => setTimeout(r, delay));
    Toast.dismiss(t);
    return '0x' + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }


  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */

  function init() {
    initSidebar();
    initModals();
    // Keyboard shortcut: Escape closes modals/sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
      closeSidebar();
    });
  }


  /* ── Public API ── */
  return {
    Toast,
    toast,
    setButtonLoading,
    showTableSkeleton,
    showCardSkeleton,
    initSidebar,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    showView,
    openModal,
    closeModal,
    initModals,
    initTabs,
    updateWalletUI,
    resetWalletUI,
    isValidAddress,
    shortHash,
    formatTime,
    escapeHtml,
    copyToClipboard,
    simulateTx,
    init,
  };
})();

window.UI = UI;
