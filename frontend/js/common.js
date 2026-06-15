/* ══════════════════════════════════════════
   common.js — App shell, navigation, shared utilities
   ══════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';

/* ── Section / View Routing ── */
$(document).ready(function () {
  // Tab nav
  $('.tab-item[data-section]').on('click', function () {
    showSection($(this).data('section'));
  });

  // Global search placeholder
  $('#global-search').on('keydown', function (e) {
    if (e.key === 'Enter') showToast('Global search coming soon', 'info');
  });

  // Escape key closes modals (not designer)
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
      $('.modal-overlay:not(.hidden)').addClass('hidden');
    }
  });

  // Modal overlay click-outside
  $('.modal-overlay').on('click', function (e) {
    if ($(e.target).hasClass('modal-overlay')) $(this).addClass('hidden');
  });

  // Initialize first section (only on index page which has tab nav)
  if ($('.tab-item[data-section]').length) {
    showSection('dashboard');
  }
});

function showSection(section) {
  $('.tab-item').removeClass('active');
  $(`.tab-item[data-section="${section}"]`).addClass('active');

  // Must remove 'hidden' class before show() — hidden uses !important which beats inline style
  $('.page-section').removeClass('active hidden').hide();
  const $sec = $(`#section-${section}`);
  if ($sec.length) $sec.addClass('active').show();

  if (section === 'dashboard' && typeof initDashboard === 'function') initDashboard();
  if (section === 'campaigns' && typeof initCampaignTab === 'function') initCampaignTab();
  if (section === 'segments' && typeof initSegmentTab === 'function') initSegmentTab();
  if (section === 'emailtemplates' && typeof initEtTab === 'function') initEtTab();
  if (section === 'settings' && typeof initSettingsTab === 'function') initSettingsTab();
}

function setBreadcrumb(...parts) { /* no-op */ }

/* ── Safe iframe writer (avoids file:// same-origin restriction) ── */
function writeIframe(frameEl, html) {
  if (!frameEl) return;
  const prev = frameEl._blobUrl;
  if (prev) URL.revokeObjectURL(prev);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  frameEl._blobUrl = url;
  frameEl.src = url;
}

function updateSidebarCounts() {
  $.when(
    apiGet('/campaigns/folder-counts'),
    apiGet('/segments/folder-counts')
  ).done((cr, sr) => {
    if (cr[0].success) {
      const n = cr[0].data.all;
      $('#sb-camp-count').text(n || '').toggleClass('hidden', !n);
    }
    if (sr[0].success) {
      const n = sr[0].data.all;
      $('#sb-seg-count').text(n || '').toggleClass('hidden', !n);
    }
  });
}

/* ── API Helpers ── */
function apiGet(url, params = {}) { return $.ajax({ url: API_BASE + url, method: 'GET', data: params }); }
function apiPost(url, data) { return $.ajax({ url: API_BASE + url, method: 'POST', contentType: 'application/json', data: JSON.stringify(data) }); }
function apiPut(url, data) { return $.ajax({ url: API_BASE + url, method: 'PUT', contentType: 'application/json', data: JSON.stringify(data) }); }
function apiDelete(url) { return $.ajax({ url: API_BASE + url, method: 'DELETE' }); }

/* ── Date Helpers ── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function toInputDate(d) { return d ? String(d).substring(0, 10) : ''; }
function formatCurrency(n) { return n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatNumber(n) { return (n == null) ? '—' : Number(n).toLocaleString('en-US'); }
function debounce(fn, delay) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), delay); }; }
function escHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : ''; }

/* ── Toast ── */
function showToast(message, type = 'info') {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  const colors = { success:'#16a34a', error:'#dc2626', warning:'#d97706', info:'#2563eb' };
  const toast = $(`<div class="toast ${type}"><i class="fa-solid ${icons[type]||icons.info}" style="color:${colors[type]};font-size:15px;flex-shrink:0"></i><span>${escHtml(message)}</span></div>`);
  $('#toastContainer').append(toast);
  setTimeout(() => { toast.addClass('toast-fade'); setTimeout(() => toast.remove(), 200); }, 3000);
}

/* ── Confirm Modal ── */
let confirmCallback = null;
function showConfirmModal(msg, onConfirm) {
  confirmCallback = onConfirm;
  $('#confirm-modal-msg').text(msg);
  $('#confirm-modal-overlay').removeClass('hidden');
}
function closeConfirmModal() { confirmCallback = null; $('#confirm-modal-overlay').addClass('hidden'); }
$('#confirm-modal-ok').on('click', function () { if (confirmCallback) confirmCallback(); closeConfirmModal(); });

/* ── Folder Modal ── */
function showNewFolderModal(type, id, currentName) {
  $('#folder-modal-type').val(type);
  $('#folder-modal-id').val(id || '');
  $('#folder-modal-name').val(currentName || '');
  $('#folder-modal-title').text(id ? 'Rename Folder' : 'New Folder');
  $('#folder-modal-overlay').removeClass('hidden');
  setTimeout(() => $('#folder-modal-name').focus(), 80);
}
function closeFolderModal() { $('#folder-modal-overlay').addClass('hidden'); }
function saveFolder() {
  const name = $('#folder-modal-name').val().trim();
  const type = $('#folder-modal-type').val();
  const id = $('#folder-modal-id').val();
  if (!name) { showToast('Folder name is required', 'warning'); return; }
  const req = id ? apiPut(`/${type}-folders/${id}`, { name }) : apiPost(`/${type}-folders`, { name, createBy: 'admin@acmecorp.com' });
  req.done(r => {
    if (r.success) {
      showToast(r.message || 'Folder saved', 'success');
      closeFolderModal();
      type === 'campaign' ? loadCampaignFolders() : loadSegmentFolders();
    }
  }).fail(() => showToast('Failed to save folder', 'error'));
}

/* ── Move Modal ── */
let moveCallback = null;
function closeMoveModal() { $('#move-modal-overlay').addClass('hidden'); }
function executeMove() {
  const folderId = $('#move-folder-select').val() || null;
  if (moveCallback) moveCallback(folderId);
  closeMoveModal();
}

/* ── Pagination ── */
function buildPagination(containerId, currentPage, totalPages, onPageChange) {
  const $c = $('#' + containerId);
  if (totalPages <= 1) { $c.html(''); return; }
  let pages = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else {
    pages = [1];
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  const $pages = $('<div class="pagination-pages"></div>');
  $pages.append(`<button class="page-btn" ${currentPage===1?'disabled':''} data-page="${currentPage-1}"><i class="fa-solid fa-chevron-left text-xs"></i></button>`);
  pages.forEach(p => {
    if (p === '...') $pages.append('<span class="page-ellipsis">…</span>');
    else $pages.append(`<button class="page-btn ${p===currentPage?'active':''}" data-page="${p}">${p}</button>`);
  });
  $pages.append(`<button class="page-btn" ${currentPage===totalPages?'disabled':''} data-page="${currentPage+1}"><i class="fa-solid fa-chevron-right text-xs"></i></button>`);
  $pages.find('.page-btn:not([disabled])').on('click', function () { onPageChange(parseInt($(this).data('page'))); });
  $c.html($pages);
}

/* ── Badge Helpers ── */
function typeBadge(type) {
  const map = {'Email':'type-email','SMS':'type-sms','Push Notification':'type-push','Social':'type-social','Multi-channel':'type-multichannel'};
  const icons = {'Email':'fa-envelope','SMS':'fa-message','Push Notification':'fa-bell','Social':'fa-share-nodes','Multi-channel':'fa-layer-group'};
  return `<span class="type-badge ${map[type]||'type-email'}"><i class="fa-solid ${icons[type]||'fa-envelope'}"></i> ${escHtml(type)}</span>`;
}
function statusBadge(status) { return `<span class="badge badge-${(status||'').toLowerCase()}">${escHtml(status)}</span>`; }
function segTypeBadge(type) { return `<span class="segment-type-badge seg-${(type||'').toLowerCase().replace(/\s+/g,'')}">${escHtml(type)}</span>`; }
function etCategoryBadge(cat) { return `<span class="et-category-badge et-cat-${(cat||'').toLowerCase().replace(/[\s\/]+/g,'-')}">${escHtml(cat)}</span>`; }
function planBadge(plan) { return `<span class="plan-badge plan-${(plan||'').toLowerCase()}">${escHtml(plan)}</span>`; }
function custStatusBadge(status) {
  const cls = { active:'cust-status-active', inactive:'cust-status-inactive', churned:'cust-status-churned' }[status?.toLowerCase()] || '';
  return `<span class="${cls}">${escHtml(status)}</span>`;
}

/* ── Sort Headers ── */
function updateSortHeaders(tableSelector, col, dir) {
  $(`${tableSelector} .th-sortable`).removeClass('sort-asc sort-desc');
  $(`${tableSelector} .th-sortable[data-col="${col}"]`).addClass(dir === 'asc' ? 'sort-asc' : 'sort-desc');
}

/* ── Detail Tab Switching ── */
$(document).on('click', '.detail-tab', function () {
  const tab = $(this).data('dtab');
  // Works both on index.html (inside .page-section) and standalone detail pages (inside .detail-content)
  const $section = $(this).closest('.page-section').length
    ? $(this).closest('.page-section')
    : $(this).closest('.detail-content');
  $section.find('.detail-tab').removeClass('active');
  $(this).addClass('active');
  $section.find('.detail-tab-pane').addClass('hidden');
  $section.find(`#dtab-${tab}`).removeClass('hidden');
});
