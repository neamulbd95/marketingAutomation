/* ══════════════════════════════════════════
   segment.js — Segment list tab
   ══════════════════════════════════════════ */

const segState = {
  page: 1, pageSize: 50, search: '', sortBy: 'createDate', sortDir: 'desc',
  type: '', dateFrom: '', dateTo: '',
  folderId: null, selectedIds: new Set(), folders: [], initialized: false
};

function initSegmentTab() {
  if (segState.initialized) return;
  segState.initialized = true;
  loadSegmentFolders();
  loadSegments();

  $('#seg-search').on('input', debounce(function () {
    segState.search = $(this).val().trim();
    $('#seg-search-clear').toggleClass('hidden', !segState.search);
    segState.page = 1; loadSegments();
  }, 350));

  $('#seg-search-clear').on('click', function () {
    $('#seg-search').val(''); segState.search = ''; $(this).addClass('hidden');
    segState.page = 1; loadSegments();
  });

  $('#seg-page-size').on('change', function () {
    segState.pageSize = parseInt($(this).val()); segState.page = 1; loadSegments();
  });

  $('#seg-table thead').on('click', '.th-sortable', function () {
    const col = $(this).data('col');
    segState.sortDir = segState.sortBy === col ? (segState.sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    segState.sortBy = col;
    updateSortHeaders('#seg-table', col, segState.sortDir);
    segState.page = 1; loadSegments();
  });

  $('#seg-master-check').on('change', function () {
    const checked = $(this).is(':checked');
    $('#seg-tbody input[type="checkbox"]').each(function () {
      const id = $(this).data('id'); $(this).prop('checked', checked);
      checked ? segState.selectedIds.add(id) : segState.selectedIds.delete(id);
      $(this).closest('tr').toggleClass('selected', checked);
    });
    updateSegmentBulkActions();
  });
}

function loadSegmentFolders() {
  apiGet('/segment-folders').done(r => {
    if (!r.success) return;
    segState.folders = r.data;
    renderSegmentFolderTree();
    populateSegmentFolderSelect();
    apiGet('/segments/folder-counts').done(cr => { if (cr.success) renderSegmentFolderTree(cr.data); });
  });
}

function renderSegmentFolderTree(counts = {}) {
  const allC = counts.all !== undefined ? counts.all : '';
  const unC = counts.unassigned !== undefined ? counts.unassigned : '';
  let html = `
    <div class="folder-item ${segState.folderId===null?'active':''}" onclick="setSegmentFolder(null)">
      <i class="fa-solid fa-layer-group folder-icon" style="color:var(--brand)"></i>
      <span class="folder-name">All Segments</span>
      ${allC!==''?`<span class="folder-count">${allC}</span>`:''}
    </div>
    <div class="folder-item ${segState.folderId==='unassigned'?'active':''}" onclick="setSegmentFolder('unassigned')">
      <i class="fa-regular fa-folder-open folder-icon" style="color:#94a3b8"></i>
      <span class="folder-name">Unassigned</span>
      ${unC!==''?`<span class="folder-count">${unC}</span>`:''}
    </div>
    <div style="height:1px;background:#F1F5F9;margin:5px 10px"></div>`;
  segState.folders.forEach(f => {
    const cnt = counts[f.id] !== undefined ? counts[f.id] : '';
    const isActive = segState.folderId === f.id;
    html += `<div class="folder-item ${isActive?'active':''}" onclick="setSegmentFolder('${f.id}')">
      <i class="fa-${isActive?'solid':'regular'} fa-folder folder-icon" style="color:${isActive?'var(--brand)':'#94a3b8'}"></i>
      <span class="folder-name">${escHtml(f.name)}</span>
      ${cnt!==''?`<span class="folder-count">${cnt}</span>`:''}
      <div class="folder-actions">
        <button class="folder-action-btn" title="Rename" onclick="event.stopPropagation();showNewFolderModal('segment','${f.id}','${escHtml(f.name)}')"><i class="fa-solid fa-pencil"></i></button>
        <button class="folder-action-btn del" title="Delete" onclick="event.stopPropagation();deleteSegmentFolder('${f.id}','${escHtml(f.name)}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  });
  $('#seg-folder-tree').html(html);
}

function setSegmentFolder(id) {
  segState.folderId = id; segState.page = 1;
  segState.selectedIds.clear(); updateSegmentBulkActions();
  loadSegmentFolderCounts(); loadSegments();
}
function loadSegmentFolderCounts() {
  apiGet('/segments/folder-counts').done(r => { if (r.success) renderSegmentFolderTree(r.data); });
}
function deleteSegmentFolder(id, name) {
  showConfirmModal(`Delete folder "${name}"? Segments inside become unassigned.`, () => {
    apiDelete('/segment-folders/' + id).done(r => {
      if (r.success) {
        showToast('Folder deleted','success');
        if (segState.folderId === id) segState.folderId = null;
        loadSegmentFolders(); loadSegments();
      }
    }).fail(() => showToast('Failed','error'));
  });
}

function loadSegments() {
  $('#seg-tbody').html(`<tr><td colspan="7" class="table-empty"><div class="spinner"></div></td></tr>`);
  const params = { page: segState.page, pageSize: segState.pageSize, search: segState.search, sortBy: segState.sortBy, sortDir: segState.sortDir, type: segState.type, dateFrom: segState.dateFrom, dateTo: segState.dateTo };
  if (segState.folderId !== null) params.folderId = segState.folderId;
  apiGet('/segments', params).done(r => {
    if (!r.success) return;
    const { data, totalCount, page, pageSize, totalPages } = r.data;
    renderSegmentTable(data);
    const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, totalCount);
    $('#seg-result-info').text(totalCount > 0 ? `${from}–${to} of ${totalCount}` : 'No results');
    buildPagination('seg-pagination', page, totalPages, p => { segState.page = p; loadSegments(); });
  }).fail(() => {
    $('#seg-tbody').html(`<tr><td colspan="7"><div class="no-data-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load</p></div></td></tr>`);
  });
}

function renderSegmentTable(data) {
  if (!data || !data.length) {
    $('#seg-tbody').html(`<tr><td colspan="7"><div class="no-data-msg"><i class="fa-solid fa-users-viewfinder"></i><p>No segments found</p></div></td></tr>`);
    return;
  }
  const html = data.map(s => {
    const checked = segState.selectedIds.has(s.id);
    return `<tr class="${checked?'selected':''} clickable-row">
      <td class="td-check" onclick="event.stopPropagation()">
        <input type="checkbox" data-id="${s.id}" ${checked?'checked':''} onchange="toggleSegmentRow(this,'${s.id}')" />
      </td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'"><span style="font-weight:600;color:#0f172a">${escHtml(s.name)}</span></td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'">${segTypeBadge(s.type)}</td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'"><code class="seg-filter-text" title="${escHtml(s.filter)}">${escHtml(s.filter)}</code></td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'" style="font-weight:600;font-size:13px">${formatNumber(s.estimatedCount)}</td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'" style="font-size:12.5px;color:#64748b">${formatDate(s.createDate)}</td>
      <td onclick="location.href='segment-detail.html?id=${s.id}'" style="font-size:12px;color:#94a3b8">${s.createBy||'—'}</td>
    </tr>`;
  }).join('');
  $('#seg-tbody').html(html);
  const allVisible = data.every(s => segState.selectedIds.has(s.id));
  $('#seg-master-check').prop('checked', allVisible && data.length > 0).prop('indeterminate', segState.selectedIds.size > 0 && !allVisible);
}

function toggleSegmentRow(el, id) {
  el.checked ? segState.selectedIds.add(id) : segState.selectedIds.delete(id);
  $(el).closest('tr').toggleClass('selected', el.checked);
  const total = $('#seg-tbody input[type="checkbox"]').length;
  const checked = $('#seg-tbody input[type="checkbox"]:checked').length;
  $('#seg-master-check').prop('checked', checked===total&&total>0).prop('indeterminate', checked>0&&checked<total);
  updateSegmentBulkActions();
}
function updateSegmentBulkActions() {
  const n = segState.selectedIds.size;
  $('#seg-bulk-delete-btn').toggleClass('hidden', n===0);
  $('#seg-move-btn').toggleClass('hidden', n===0);
  $('#seg-selected-count').text(n);
}
function segmentBulkDelete() {
  showConfirmModal(`Delete ${segState.selectedIds.size} segment(s)?`, () => {
    apiPost('/segments/bulk-delete', { ids: [...segState.selectedIds] }).done(r => {
      if (r.success) { showToast(r.message,'success'); segState.selectedIds.clear(); loadSegments(); loadSegmentFolderCounts(); updateSidebarCounts(); }
    }).fail(() => showToast('Failed','error'));
  });
}
function showMoveSegmentModal() {
  $('#move-modal-type').val('segment');
  const $sel = $('#move-folder-select').html('<option value="">Unassigned</option>');
  segState.folders.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
  moveCallback = fid => {
    apiPost('/segments/bulk-move', { ids: [...segState.selectedIds], folderId: fid||null }).done(r => {
      if (r.success) { showToast(r.message,'success'); segState.selectedIds.clear(); loadSegments(); loadSegmentFolderCounts(); }
    }).fail(() => showToast('Failed','error'));
  };
  $('#move-modal-overlay').removeClass('hidden');
}

/* ── CRUD Modal ── */
function populateSegmentFolderSelect() {
  const $sel = $('#seg-folder').html('<option value="">Unassigned</option>');
  segState.folders.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
}
function showSegmentModal() {
  $('#seg-id,#seg-name,#seg-filter,#seg-count').val('');
  $('#seg-type,#seg-folder').val('');
  populateSegmentFolderSelect();
  $('#segment-modal-title').text('New Segment');
  $('#segment-modal-overlay').removeClass('hidden');
  setTimeout(() => $('#seg-name').focus(), 80);
}
function closeSegmentModal() { $('#segment-modal-overlay').addClass('hidden'); }
function saveSegment() {
  const name = $('#seg-name').val().trim(), type = $('#seg-type').val();
  if (!name) { showToast('Name required','warning'); return; }
  if (!type) { showToast('Type required','warning'); return; }
  const id = $('#seg-id').val();
  const payload = { name, type, filter: $('#seg-filter').val().trim(), estimatedCount: parseInt($('#seg-count').val())||0, segmentFolderId: $('#seg-folder').val()||null, createBy:'admin@acmecorp.com', updatedBy:'admin@acmecorp.com' };
  const req = id ? apiPut('/segments/'+id, payload) : apiPost('/segments', payload);
  req.done(r => {
    if (r.success) { showToast(r.message,'success'); closeSegmentModal(); loadSegments(); loadSegmentFolderCounts(); updateSidebarCounts(); }
  }).fail(() => showToast('Failed','error'));
}

/* ── Filters ── */
function applySegmentFilters() {
  segState.type = $('#seg-filter-type').val();
  segState.dateFrom = $('#seg-filter-date-from').val();
  segState.dateTo = $('#seg-filter-date-to').val();
  segState.page = 1;
  const n = [segState.type,segState.dateFrom,segState.dateTo].filter(Boolean).length;
  $('#seg-filter-badge').text(n).toggleClass('hidden', n===0);
  loadSegments();
}
function clearSegmentFilters() {
  segState.type=segState.dateFrom=segState.dateTo='';
  $('#seg-filter-type,#seg-filter-date-from,#seg-filter-date-to').val('');
  $('#seg-filter-badge').addClass('hidden'); segState.page=1; loadSegments();
}
