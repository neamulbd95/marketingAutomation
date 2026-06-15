/* ══════════════════════════════════════════
   campaign.js — Campaign list tab
   ══════════════════════════════════════════ */

const campState = {
  page: 1, pageSize: 50, search: '', sortBy: 'createDate', sortDir: 'desc',
  status: '', type: '', dateFrom: '', dateTo: '',
  folderId: null, selectedIds: new Set(), folders: [], initialized: false
};

function initCampaignTab() {
  if (campState.initialized) return;
  campState.initialized = true;
  loadCampaignFolders();
  loadCampaigns();
  updateSidebarCounts();

  $('#camp-search').on('input', debounce(function () {
    campState.search = $(this).val().trim();
    $('#camp-search-clear').toggleClass('hidden', !campState.search);
    campState.page = 1; loadCampaigns();
  }, 350));

  $('#camp-search-clear').on('click', function () {
    $('#camp-search').val(''); campState.search = ''; $(this).addClass('hidden');
    campState.page = 1; loadCampaigns();
  });

  $('#camp-page-size').on('change', function () {
    campState.pageSize = parseInt($(this).val()); campState.page = 1; loadCampaigns();
  });

  $('#camp-table thead').on('click', '.th-sortable', function () {
    const col = $(this).data('col');
    campState.sortDir = campState.sortBy === col ? (campState.sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    campState.sortBy = col;
    updateSortHeaders('#camp-table', col, campState.sortDir);
    campState.page = 1; loadCampaigns();
  });

  $('#camp-master-check').on('change', function () {
    const checked = $(this).is(':checked');
    $('#camp-tbody input[type="checkbox"]').each(function () {
      const id = $(this).data('id'); $(this).prop('checked', checked);
      checked ? campState.selectedIds.add(id) : campState.selectedIds.delete(id);
      $(this).closest('tr').toggleClass('selected', checked);
    });
    updateCampaignBulkActions();
  });
}

function loadCampaignFolders() {
  apiGet('/campaign-folders').done(r => {
    if (!r.success) return;
    campState.folders = r.data;
    renderCampaignFolderTree();
    populateCampaignFolderSelect();
    apiGet('/campaigns/folder-counts').done(cr => { if (cr.success) renderCampaignFolderTree(cr.data); });
  });
}

function renderCampaignFolderTree(counts = {}) {
  const allC = counts.all !== undefined ? counts.all : '';
  const unC  = counts.unassigned !== undefined ? counts.unassigned : '';
  let html = `
    <div class="folder-item ${campState.folderId===null?'active':''}" onclick="setCampaignFolder(null)">
      <i class="fa-solid fa-layer-group folder-icon" style="color:var(--brand)"></i>
      <span class="folder-name">All Campaigns</span>
      ${allC!==''?`<span class="folder-count">${allC}</span>`:''}
    </div>
    <div class="folder-item ${campState.folderId==='unassigned'?'active':''}" onclick="setCampaignFolder('unassigned')">
      <i class="fa-regular fa-folder-open folder-icon" style="color:#94a3b8"></i>
      <span class="folder-name">Unassigned</span>
      ${unC!==''?`<span class="folder-count">${unC}</span>`:''}
    </div>
    <div style="height:1px;background:#F1F5F9;margin:5px 10px"></div>`;
  campState.folders.forEach(f => {
    const cnt = counts[f.id] !== undefined ? counts[f.id] : '';
    const isActive = campState.folderId === f.id;
    html += `<div class="folder-item ${isActive?'active':''}" onclick="setCampaignFolder('${f.id}')">
      <i class="fa-${isActive?'solid':'regular'} fa-folder folder-icon" style="color:${isActive?'var(--brand)':'#94a3b8'}"></i>
      <span class="folder-name">${escHtml(f.name)}</span>
      ${cnt!==''?`<span class="folder-count">${cnt}</span>`:''}
      <div class="folder-actions">
        <button class="folder-action-btn" title="Rename" onclick="event.stopPropagation();showNewFolderModal('campaign','${f.id}','${escHtml(f.name)}')"><i class="fa-solid fa-pencil"></i></button>
        <button class="folder-action-btn del" title="Delete" onclick="event.stopPropagation();deleteCampaignFolder('${f.id}','${escHtml(f.name)}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  });
  $('#camp-folder-tree').html(html);
}

function setCampaignFolder(id) {
  campState.folderId = id; campState.page = 1;
  campState.selectedIds.clear(); updateCampaignBulkActions();
  loadCampaignFolderCounts(); loadCampaigns();
}
function loadCampaignFolderCounts() {
  apiGet('/campaigns/folder-counts').done(r => { if (r.success) renderCampaignFolderTree(r.data); });
}
function deleteCampaignFolder(id, name) {
  showConfirmModal(`Delete folder "${name}"? Campaigns inside become unassigned.`, () => {
    apiDelete('/campaign-folders/' + id).done(r => {
      if (r.success) {
        showToast('Folder deleted', 'success');
        if (campState.folderId === id) campState.folderId = null;
        loadCampaignFolders(); loadCampaigns();
      }
    }).fail(() => showToast('Failed to delete folder', 'error'));
  });
}

function loadCampaigns() {
  $('#camp-tbody').html(`<tr><td colspan="7" class="table-empty"><div class="spinner"></div></td></tr>`);
  const params = { page: campState.page, pageSize: campState.pageSize, search: campState.search, sortBy: campState.sortBy, sortDir: campState.sortDir, status: campState.status, type: campState.type, dateFrom: campState.dateFrom, dateTo: campState.dateTo };
  if (campState.folderId !== null) params.folderId = campState.folderId;
  apiGet('/campaigns', params).done(r => {
    if (!r.success) return;
    const { data, totalCount, page, pageSize, totalPages } = r.data;
    renderCampaignTable(data);
    const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, totalCount);
    $('#camp-result-info').text(totalCount > 0 ? `${from}–${to} of ${totalCount}` : 'No results');
    buildPagination('camp-pagination', page, totalPages, p => { campState.page = p; loadCampaigns(); });
  }).fail(() => {
    $('#camp-tbody').html(`<tr><td colspan="7"><div class="no-data-msg"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load. Is the API running?</p></div></td></tr>`);
  });
}

function renderCampaignTable(data) {
  if (!data || !data.length) {
    $('#camp-tbody').html(`<tr><td colspan="7"><div class="no-data-msg"><i class="fa-solid fa-bullhorn"></i><p>No campaigns found</p></div></td></tr>`);
    return;
  }
  const folderMap = {};
  campState.folders.forEach(f => { folderMap[f.id] = f.name; });
  const html = data.map(c => {
    const checked = campState.selectedIds.has(c.id);
    const folderName = c.campaignFolderId ? (folderMap[c.campaignFolderId] || '') : '';
    return `<tr class="${checked?'selected':''} clickable-row">
      <td class="td-check" onclick="event.stopPropagation()">
        <input type="checkbox" data-id="${c.id}" ${checked?'checked':''} onchange="toggleCampaignRow(this,'${c.id}')" />
      </td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'">
        <div style="font-weight:600;color:#0f172a;font-size:13.5px">${escHtml(c.name)}</div>
        ${folderName?`<div style="font-size:11px;color:#94a3b8;margin-top:2px"><i class="fa-regular fa-folder mr-1"></i>${escHtml(folderName)}</div>`:''}
      </td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'">${typeBadge(c.type)}</td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'">${statusBadge(c.status)}</td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'" style="font-size:12.5px;color:#64748b">${formatDate(c.startDate)}</td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'" style="font-size:12.5px;color:#64748b">${formatDate(c.endDate)}</td>
      <td onclick="location.href='campaign-detail.html?id=${c.id}'" style="font-size:12px;color:#94a3b8">${c.createBy||'—'}</td>
    </tr>`;
  }).join('');
  $('#camp-tbody').html(html);
  const allVisible = data.every(c => campState.selectedIds.has(c.id));
  $('#camp-master-check').prop('checked', allVisible && data.length > 0).prop('indeterminate', campState.selectedIds.size > 0 && !allVisible);
}

function toggleCampaignRow(el, id) {
  el.checked ? campState.selectedIds.add(id) : campState.selectedIds.delete(id);
  $(el).closest('tr').toggleClass('selected', el.checked);
  const total = $('#camp-tbody input[type="checkbox"]').length;
  const checked = $('#camp-tbody input[type="checkbox"]:checked').length;
  $('#camp-master-check').prop('checked', checked===total&&total>0).prop('indeterminate', checked>0&&checked<total);
  updateCampaignBulkActions();
}
function updateCampaignBulkActions() {
  const n = campState.selectedIds.size;
  $('#camp-bulk-delete-btn').toggleClass('hidden', n===0);
  $('#camp-move-btn').toggleClass('hidden', n===0);
  $('#camp-selected-count').text(n);
}
function campaignBulkDelete() {
  showConfirmModal(`Delete ${campState.selectedIds.size} campaign(s)?`, () => {
    apiPost('/campaigns/bulk-delete', { ids: [...campState.selectedIds] }).done(r => {
      if (r.success) { showToast(r.message,'success'); campState.selectedIds.clear(); loadCampaigns(); loadCampaignFolderCounts(); updateSidebarCounts(); }
    }).fail(() => showToast('Failed','error'));
  });
}
function showMoveCampaignModal() {
  $('#move-modal-type').val('campaign');
  const $sel = $('#move-folder-select').html('<option value="">Unassigned</option>');
  campState.folders.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
  moveCallback = fid => {
    apiPost('/campaigns/bulk-move', { ids: [...campState.selectedIds], folderId: fid||null }).done(r => {
      if (r.success) { showToast(r.message,'success'); campState.selectedIds.clear(); loadCampaigns(); loadCampaignFolderCounts(); }
    }).fail(() => showToast('Failed','error'));
  };
  $('#move-modal-overlay').removeClass('hidden');
}

/* ── Campaign CRUD Modal ── */
function populateCampaignFolderSelect() {
  const $sel = $('#camp-folder').html('<option value="">Unassigned</option>');
  campState.folders.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
}
function showCampaignModal() {
  $('#camp-id,#camp-name,#camp-start-date,#camp-end-date').val('');
  $('#camp-type,#camp-folder').val('');
  $('#camp-status').val('Draft');
  populateCampaignFolderSelect();
  $('#campaign-modal-title').text('New Campaign');
  $('#campaign-modal-overlay').removeClass('hidden');
  setTimeout(() => $('#camp-name').focus(), 80);
}
function closeCampaignModal() { $('#campaign-modal-overlay').addClass('hidden'); }
function saveCampaign() {
  const name = $('#camp-name').val().trim(), type = $('#camp-type').val();
  if (!name) { showToast('Name required','warning'); return; }
  if (!type) { showToast('Type required','warning'); return; }
  const id = $('#camp-id').val();
  const payload = { name, type, status: $('#camp-status').val(), startDate: $('#camp-start-date').val()||null, endDate: $('#camp-end-date').val()||null, campaignFolderId: $('#camp-folder').val()||null, createBy: 'admin@acmecorp.com', updatedBy: 'admin@acmecorp.com' };
  const req = id ? apiPut('/campaigns/'+id, payload) : apiPost('/campaigns', payload);
  req.done(r => {
    if (r.success) { showToast(r.message,'success'); closeCampaignModal(); loadCampaigns(); loadCampaignFolderCounts(); updateSidebarCounts(); }
  }).fail(() => showToast('Failed','error'));
}

/* ── Filters ── */
function toggleFilter(module) {
  const id = {campaign:'camp',segment:'seg',emailtemplate:'et'}[module];
  $(`#${id}-filter-panel`).toggleClass('hidden');
  $(`#${id}-filter-btn`).toggleClass('active');
}
function applyCampaignFilters() {
  campState.status = $('#camp-filter-status').val();
  campState.type = $('#camp-filter-type').val();
  campState.dateFrom = $('#camp-filter-date-from').val();
  campState.dateTo = $('#camp-filter-date-to').val();
  campState.page = 1;
  const n = [campState.status,campState.type,campState.dateFrom,campState.dateTo].filter(Boolean).length;
  $('#camp-filter-badge').text(n).toggleClass('hidden', n===0);
  loadCampaigns();
}
function clearCampaignFilters() {
  campState.status=campState.type=campState.dateFrom=campState.dateTo='';
  $('#camp-filter-status,#camp-filter-type,#camp-filter-date-from,#camp-filter-date-to').val('');
  $('#camp-filter-badge').addClass('hidden'); campState.page=1; loadCampaigns();
}
