/* ══════════════════════════════════════════
   segment-detail.js — Standalone segment detail page
   ══════════════════════════════════════════ */

const segDetailState = {
  segment: null,
  custPage: 1, custPageSize: 25, custSearch: '', custSortBy: 'lastActivityDate', custSortDir: 'desc'
};

$(document).ready(function () {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { showToast('No segment ID specified', 'error'); return; }
  loadSegmentDetail(id);
});

function loadSegmentDetail(id) {
  apiGet('/segments/' + id).done(r => {
    if (!r.success) { showToast('Failed to load', 'error'); return; }
    const s = r.data;
    segDetailState.segment = s;

    document.title = s.name + ' — MarketFlow';
    $('#seg-detail-name').text(s.name);
    $('#seg-detail-badges').html(segTypeBadge(s.type));
    $('#seg-detail-id').val(s.id);

    $('#sdf-name').val(s.name);
    $('#sdf-type').val(s.type);
    $('#sdf-count').val(s.estimatedCount);
    $('#sdf-filter').val(s.filter);

    // Load folders from API
    const $sel = $('#sdf-folder').html('<option value="">Unassigned</option>');
    apiGet('/segment-folders').done(fr => {
      if (fr.success) {
        fr.data.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
      }
      $sel.val(s.segmentFolderId || '');
    });

    $('#seg-detail-info').html(`
      <div class="detail-info-row"><span class="detail-info-key">ID</span><span class="detail-info-val" style="font-size:11px;font-family:monospace;color:#94a3b8">${s.id.substring(0,8)}…</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created</span><span class="detail-info-val">${formatDate(s.createDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created By</span><span class="detail-info-val">${escHtml(s.createBy||'—')}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Last Updated</span><span class="detail-info-val">${formatDate(s.updatedDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Est. Contacts</span><span class="detail-info-val">${formatNumber(s.estimatedCount)}</span></div>
    `);

    loadSegmentCustomers();
  }).fail(() => showToast('Failed to load', 'error'));
}

function saveSegmentDetail() {
  const id = $('#seg-detail-id').val();
  const name = $('#sdf-name').val().trim();
  if (!name) { showToast('Name is required', 'warning'); return; }
  const payload = {
    name, type: $('#sdf-type').val(),
    filter: $('#sdf-filter').val().trim(),
    estimatedCount: parseInt($('#sdf-count').val()) || 0,
    segmentFolderId: $('#sdf-folder').val() || null,
    updatedBy: 'admin@acmecorp.com'
  };
  apiPut('/segments/' + id, payload).done(r => {
    if (r.success) {
      segDetailState.segment = r.data;
      document.title = r.data.name + ' — MarketFlow';
      $('#seg-detail-name').text(r.data.name);
      $('#seg-detail-badges').html(segTypeBadge(r.data.type));
      showToast('Segment saved', 'success');
      loadSegmentCustomers();
    }
  }).fail(() => showToast('Failed', 'error'));
}

function deleteSegmentFromDetail() {
  const name = segDetailState.segment?.name || 'this segment';
  showConfirmModal(`Delete segment "${name}"?`, () => {
    apiDelete('/segments/' + segDetailState.segment.id).done(r => {
      if (r.success) {
        showToast('Segment deleted', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    }).fail(() => showToast('Failed', 'error'));
  });
}

/* ── Customer List ── */
function loadSegmentCustomers() {
  const s = segDetailState.segment;
  if (!s) return;
  $('#seg-cust-tbody').html(`<tr><td colspan="8" class="table-empty"><div class="spinner"></div></td></tr>`);
  const params = {
    page: segDetailState.custPage, pageSize: segDetailState.custPageSize,
    search: segDetailState.custSearch, sortBy: segDetailState.custSortBy, sortDir: segDetailState.custSortDir,
    segmentId: s.id
  };
  apiGet('/customers', params).done(r => {
    if (!r.success) return;
    const { data, totalCount, page, pageSize, totalPages } = r.data;
    renderSegCustTable(data);
    const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, totalCount);
    $('#seg-cust-info').text(`${from}–${to} of ${totalCount} customers`);
    buildPagination('seg-cust-pagination', page, totalPages, p => { segDetailState.custPage = p; loadSegmentCustomers(); });
  });
}

function renderSegCustTable(data) {
  if (!data || !data.length) {
    $('#seg-cust-tbody').html(`<tr><td colspan="8"><div class="no-data-msg"><i class="fa-solid fa-user-slash"></i><p>No matching customers for this segment</p></div></td></tr>`);
    return;
  }
  const html = data.map(c => `
    <tr>
      <td><div style="font-weight:600;font-size:13px">${escHtml(c.firstName)} ${escHtml(c.lastName)}</div><div style="font-size:11px;color:#94a3b8">${escHtml(c.jobTitle)}</div></td>
      <td style="font-size:12.5px;color:#475569">${escHtml(c.email)}</td>
      <td>${planBadge(c.plan)}</td>
      <td style="font-size:12.5px;color:#64748b">${c.age}</td>
      <td style="font-size:12.5px;color:#64748b">${escHtml(c.city)}, ${escHtml(c.country)}</td>
      <td style="font-weight:600;font-size:13px">${formatCurrency(c.totalSpend)}</td>
      <td style="font-size:12px;color:#94a3b8">${formatDate(c.lastActivityDate)}</td>
      <td>${custStatusBadge(c.status)}</td>
    </tr>`).join('');
  $('#seg-cust-tbody').html(html);
}

$('#seg-cust-search').on('input', debounce(function () {
  segDetailState.custSearch = $(this).val().trim();
  segDetailState.custPage = 1;
  loadSegmentCustomers();
}, 350));

$('#seg-cust-table thead').on('click', '.th-sortable', function () {
  const col = $(this).data('col');
  segDetailState.custSortDir = segDetailState.custSortBy === col ? (segDetailState.custSortDir === 'asc' ? 'desc' : 'asc') : 'desc';
  segDetailState.custSortBy = col;
  updateSortHeaders('#seg-cust-table', col, segDetailState.custSortDir);
  segDetailState.custPage = 1;
  loadSegmentCustomers();
});
