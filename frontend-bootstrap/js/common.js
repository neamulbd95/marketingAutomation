/* ══════════════════════════════════════════
   common.js — App shell, navigation, shared utilities
   (Bootstrap edition — drop this whole frontend-bootstrap
   folder into any product; only API_BASE needs pointing
   at that product's backend.)
   ══════════════════════════════════════════ */

const API_BASE = 'http://localhost:5000/api';

/* ── Section / View Routing ── */
$(document).ready(function () {
  $('.tab-item[data-section]').on('click', function () {
    showSection($(this).data('section'));
  });

  $('#global-search').on('keydown', function (e) {
    if (e.key === 'Enter') showToast('Global search coming soon', 'info');
  });

  if ($('.tab-item[data-section]').length) {
    showSection('dashboard');
  }

  $('#confirm-modal-ok').on('click', function () {
    if (confirmCallback) confirmCallback();
    hideModal('confirmModal');
  });
});

function showSection(section) {
  $('.tab-item').removeClass('active');
  $(`.tab-item[data-section="${section}"]`).addClass('active');

  $('.page-section').removeClass('active').addClass('d-none');
  const $sec = $(`#section-${section}`);
  if ($sec.length) $sec.removeClass('d-none').addClass('active');

  if (section === 'dashboard' && typeof initDashboard === 'function') initDashboard();
  if (section === 'campaigns' && typeof initCampaignTab === 'function') initCampaignTab();
  if (section === 'segments' && typeof initSegmentTab === 'function') initSegmentTab();
  if (section === 'emailtemplates' && typeof initEtTab === 'function') initEtTab();
  if (section === 'settings' && typeof initSettingsTab === 'function') initSettingsTab();
}

/* ── Bootstrap modal helpers ── */
function showModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  bootstrap.Modal.getOrCreateInstance(el).show();
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const inst = bootstrap.Modal.getInstance(el);
  if (inst) inst.hide();
}

/* ── Bootstrap offcanvas helpers (right-side filter panels) ── */
function hideOffcanvas(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const inst = bootstrap.Offcanvas.getInstance(el);
  if (inst) inst.hide();
}

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
      $('#sb-camp-count').text(n || '').toggleClass('d-none', !n);
    }
    if (sr[0].success) {
      const n = sr[0].data.all;
      $('#sb-seg-count').text(n || '').toggleClass('d-none', !n);
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

/* ── Toast (Bootstrap toast component) ── */
function showToast(message, type = 'info') {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const bg = { success: 'text-bg-success', error: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-dark' };
  const $toast = $(`
    <div class="toast align-items-center ${bg[type] || bg.info} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body"><i class="fa-solid ${icons[type] || icons.info} me-2"></i>${escHtml(message)}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  $('#toastContainer').append($toast);
  const t = new bootstrap.Toast($toast[0], { delay: 3000 });
  $toast.on('hidden.bs.toast', () => $toast.remove());
  t.show();
}

/* ── Confirm Modal ── */
let confirmCallback = null;
function showConfirmModal(msg, onConfirm) {
  confirmCallback = onConfirm;
  $('#confirm-modal-msg').text(msg);
  showModal('confirmModal');
}

/* ── Folder Modal ── */
function showNewFolderModal(type, id, currentName) {
  $('#folder-modal-type').val(type);
  $('#folder-modal-id').val(id || '');
  $('#folder-modal-name').val(currentName || '');
  $('#folder-modal-title').text(id ? 'Rename Folder' : 'New Folder');
  showModal('folderModal');
  setTimeout(() => $('#folder-modal-name').trigger('focus'), 150);
}
function saveFolder() {
  const name = $('#folder-modal-name').val().trim();
  const type = $('#folder-modal-type').val();
  const id = $('#folder-modal-id').val();
  if (!name) { showToast('Folder name is required', 'warning'); return; }
  const req = id ? apiPut(`/${type}-folders/${id}`, { name }) : apiPost(`/${type}-folders`, { name, createBy: 'admin@acmecorp.com' });
  req.done(r => {
    if (r.success) {
      showToast(r.message || 'Folder saved', 'success');
      hideModal('folderModal');
      type === 'campaign' ? loadCampaignFolders() : loadSegmentFolders();
    }
  }).fail(() => showToast('Failed to save folder', 'error'));
}

/* ── Move Modal ── */
let moveCallback = null;
function executeMove() {
  const folderId = $('#move-folder-select').val() || null;
  if (moveCallback) moveCallback(folderId);
  hideModal('moveModal');
}

/* ── Pagination (Bootstrap pagination component) ── */
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
  const $ul = $('<ul class="pagination pagination-sm mb-0"></ul>');
  $ul.append(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button class="page-link" data-page="${currentPage - 1}"><i class="fa-solid fa-chevron-left"></i></button></li>`);
  pages.forEach(p => {
    if (p === '...') $ul.append('<li class="page-item disabled"><span class="page-link">…</span></li>');
    else $ul.append(`<li class="page-item ${p === currentPage ? 'active' : ''}"><button class="page-link" data-page="${p}">${p}</button></li>`);
  });
  $ul.append(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button class="page-link" data-page="${currentPage + 1}"><i class="fa-solid fa-chevron-right"></i></button></li>`);
  $ul.find('.page-link[data-page]').on('click', function () {
    if ($(this).closest('.page-item').hasClass('disabled')) return;
    onPageChange(parseInt($(this).data('page')));
  });
  $c.html($ul);
}

/* ── Badge Helpers ── */
function typeBadge(type) {
  const map = {'Email':'type-email','SMS':'type-sms','Push Notification':'type-push','Social':'type-social','Multi-channel':'type-multichannel'};
  const icons = {'Email':'fa-envelope','SMS':'fa-message','Push Notification':'fa-bell','Social':'fa-share-nodes','Multi-channel':'fa-layer-group'};
  return `<span class="badge type-badge ${map[type]||'type-email'}"><i class="fa-solid ${icons[type]||'fa-envelope'}"></i> ${escHtml(type)}</span>`;
}
function statusBadge(status) { return `<span class="badge badge-${(status||'').toLowerCase()}">${escHtml(status)}</span>`; }
function segTypeBadge(type) { return `<span class="badge seg-${(type||'').toLowerCase().replace(/\s+/g,'')}">${escHtml(type)}</span>`; }
function etCategoryBadge(cat) { return `<span class="badge et-cat-${(cat||'').toLowerCase().replace(/[\s\/]+/g,'-')}">${escHtml(cat)}</span>`; }

/* ── Sort Headers ── */
function updateSortHeaders(tableSelector, col, dir) {
  $(`${tableSelector} .th-sortable`).removeClass('sort-asc sort-desc');
  $(`${tableSelector} .th-sortable[data-col="${col}"]`).addClass(dir === 'asc' ? 'sort-asc' : 'sort-desc');
}
