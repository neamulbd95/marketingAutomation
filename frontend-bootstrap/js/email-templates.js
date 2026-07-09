/* ══════════════════════════════════════════
   email-templates.js — Email Template list tab
   ══════════════════════════════════════════ */

const etState = {
  page: 1, pageSize: 50, search: '', sortBy: 'createDate', sortDir: 'desc',
  type: '', dateFrom: '', dateTo: '',
  selectedIds: new Set(), initialized: false
};

function initEtTab() {
  if (etState.initialized) return;
  etState.initialized = true;
  loadEmailTemplates();

  $('#et-search').on('input', debounce(function () {
    etState.search = $(this).val().trim();
    $('#et-search-clear').toggleClass('d-none', !etState.search);
    etState.page = 1; loadEmailTemplates();
  }, 350));

  $('#et-search-clear').on('click', function () {
    $('#et-search').val(''); etState.search = ''; $(this).addClass('d-none');
    etState.page = 1; loadEmailTemplates();
  });

  $('#et-page-size').on('change', function () {
    etState.pageSize = parseInt($(this).val()); etState.page = 1; loadEmailTemplates();
  });

  $('#et-table thead').on('click', '.th-sortable', function () {
    const col = $(this).data('col');
    etState.sortDir = etState.sortBy === col ? (etState.sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    etState.sortBy = col;
    updateSortHeaders('#et-table', col, etState.sortDir);
    etState.page = 1; loadEmailTemplates();
  });

  $('#et-master-check').on('change', function () {
    const checked = $(this).is(':checked');
    $('#et-tbody input[type="checkbox"]').each(function () {
      const id = $(this).data('id'); $(this).prop('checked', checked);
      checked ? etState.selectedIds.add(id) : etState.selectedIds.delete(id);
      $(this).closest('tr').toggleClass('selected', checked);
    });
    updateEtBulkActions();
  });

  $('#et-filter-offcanvas')
    .on('show.bs.offcanvas', () => $('#et-filter-btn').addClass('active'))
    .on('hidden.bs.offcanvas', () => $('#et-filter-btn').removeClass('active'));
}

function loadEmailTemplates() {
  $('#et-tbody').html(`<tr><td colspan="8" class="text-center py-5"><div class="spinner-border spinner-brand"></div></td></tr>`);
  const params = {
    page: etState.page, pageSize: etState.pageSize,
    search: etState.search, sortBy: etState.sortBy, sortDir: etState.sortDir,
    type: etState.type, dateFrom: etState.dateFrom, dateTo: etState.dateTo
  };
  apiGet('/email-templates', params).done(r => {
    if (!r.success) return;
    const { data, totalCount, page, pageSize, totalPages } = r.data;
    renderEtTable(data);
    const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, totalCount);
    $('#et-result-info').text(totalCount > 0 ? `${from}–${to} of ${totalCount}` : 'No results');
    buildPagination('et-pagination', page, totalPages, p => { etState.page = p; loadEmailTemplates(); });
  }).fail(() => {
    $('#et-tbody').html(`<tr><td colspan="8"><div class="no-data-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load. Is the API running?</p></div></td></tr>`);
  });
}

function renderEtTable(data) {
  if (!data || !data.length) {
    $('#et-tbody').html(`<tr><td colspan="8"><div class="no-data-msg"><i class="fa-solid fa-envelope-open-text"></i><p>No templates found</p></div></td></tr>`);
    return;
  }
  const html = data.map(t => {
    const checked = etState.selectedIds.has(t.id);
    return `<tr class="${checked?'selected':''} clickable-row">
      <td class="td-check" onclick="event.stopPropagation()">
        <input type="checkbox" class="form-check-input" data-id="${t.id}" ${checked?'checked':''} onchange="toggleEtRow(this,'${t.id}')" />
      </td>
      <td onclick="location.href='et-detail.html?id=${t.id}'"><span style="font-weight:600;color:#0f172a;font-size:13.5px">${escHtml(t.name)}</span></td>
      <td onclick="location.href='et-detail.html?id=${t.id}'"><span style="font-size:12.5px;color:#475569;max-width:220px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(t.subject)}">${escHtml(t.subject)}</span></td>
      <td onclick="location.href='et-detail.html?id=${t.id}'">${t.category ? etCategoryBadge(t.category) : '<span style="color:#cbd5e1">—</span>'}</td>
      <td onclick="location.href='et-detail.html?id=${t.id}'" style="font-size:12.5px;color:#64748b">${formatDate(t.createDate)}</td>
      <td onclick="location.href='et-detail.html?id=${t.id}'" style="font-size:12px;color:#94a3b8">${t.createBy||'—'}</td>
      <td onclick="location.href='et-detail.html?id=${t.id}'" style="font-size:12px;color:#94a3b8">${formatDate(t.updatedDate)}</td>
      <td class="td-action" onclick="event.stopPropagation()">
        <button class="btn btn-outline-secondary btn-sm btn-row-preview" onclick="previewEt('${t.id}')" title="Preview template">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
  $('#et-tbody').html(html);
  const allVisible = data.every(t => etState.selectedIds.has(t.id));
  $('#et-master-check').prop('checked', allVisible && data.length > 0).prop('indeterminate', etState.selectedIds.size > 0 && !allVisible);
}

function toggleEtRow(el, id) {
  el.checked ? etState.selectedIds.add(id) : etState.selectedIds.delete(id);
  $(el).closest('tr').toggleClass('selected', el.checked);
  const total = $('#et-tbody input[type="checkbox"]').length;
  const checked = $('#et-tbody input[type="checkbox"]:checked').length;
  $('#et-master-check').prop('checked', checked===total&&total>0).prop('indeterminate', checked>0&&checked<total);
  updateEtBulkActions();
}
function updateEtBulkActions() {
  const n = etState.selectedIds.size;
  $('#et-bulk-delete-btn').toggleClass('d-none', n===0);
  $('#et-selected-count').text(n);
}
function etBulkDelete() {
  showConfirmModal(`Delete ${etState.selectedIds.size} template(s)?`, () => {
    apiPost('/email-templates/bulk-delete', { ids: [...etState.selectedIds] }).done(r => {
      if (r.success) { showToast(r.message,'success'); etState.selectedIds.clear(); loadEmailTemplates(); }
    }).fail(() => showToast('Failed','error'));
  });
}

/* ── Create Modal ── */
function showEtModal() {
  $('#et-id,#et-name,#et-subject,#et-body').val('');
  $('#et-category').val('');
  $('#et-modal-title').text('New Email Template');
  showModal('etModal');
  setTimeout(() => $('#et-name').trigger('focus'), 150);
}
function saveEt() {
  const name = $('#et-name').val().trim(), subject = $('#et-subject').val().trim();
  if (!name) { showToast('Name required','warning'); return; }
  if (!subject) { showToast('Subject required','warning'); return; }
  const id = $('#et-id').val();
  const payload = { name, subject, category: $('#et-category').val(), htmlBody: $('#et-body').val(), createBy:'admin@acmecorp.com', updatedBy:'admin@acmecorp.com' };
  const req = id ? apiPut('/email-templates/'+id, payload) : apiPost('/email-templates', payload);
  req.done(r => {
    if (r.success) { showToast(r.message,'success'); hideModal('etModal'); loadEmailTemplates(); }
  }).fail(() => showToast('Failed','error'));
}

/* ── Filters ── */
function applyEtFilters() {
  etState.type = $('#et-filter-type').val();
  etState.dateFrom = $('#et-filter-date-from').val();
  etState.dateTo = $('#et-filter-date-to').val();
  etState.page = 1;
  const n = [etState.type, etState.dateFrom, etState.dateTo].filter(Boolean).length;
  $('#et-filter-badge').text(n).toggleClass('d-none', n===0);
  loadEmailTemplates();
  hideOffcanvas('et-filter-offcanvas');
}
function clearEtFilters() {
  etState.type = etState.dateFrom = etState.dateTo = '';
  $('#et-filter-type,#et-filter-date-from,#et-filter-date-to').val('');
  $('#et-filter-badge').addClass('d-none'); etState.page = 1; loadEmailTemplates();
}

/* ── Row Preview ── */
function previewEt(id) {
  $('#et-preview-modal-name').text('Loading…');
  $('#et-preview-modal-subject').text('');
  showModal('etPreviewModal');
  apiGet('/email-templates/' + id).done(r => {
    if (!r.success) { showToast('Failed to load preview', 'error'); hideModal('etPreviewModal'); return; }
    const t = r.data;
    $('#et-preview-modal-name').text(t.name);
    $('#et-preview-modal-subject').text(t.subject);
    const html = t.htmlBody || '<div style="font-family:sans-serif;color:#94a3b8;padding:60px;text-align:center;font-size:14px">No HTML content yet.</div>';
    writeIframe(document.getElementById('et-preview-modal-frame'), html);
  }).fail(() => { showToast('Failed to load preview', 'error'); hideModal('etPreviewModal'); });
}

document.getElementById('etPreviewModal')?.addEventListener('hidden.bs.modal', function () {
  const frame = document.getElementById('et-preview-modal-frame');
  if (frame && frame._blobUrl) { URL.revokeObjectURL(frame._blobUrl); frame._blobUrl = null; frame.src = 'about:blank'; }
});
