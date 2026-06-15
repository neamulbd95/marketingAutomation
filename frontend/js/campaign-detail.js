/* ══════════════════════════════════════════
   campaign-detail.js — Standalone campaign detail page
   ══════════════════════════════════════════ */

const campDetailState = {
  campaign: null,
  segment: null,
  custPage: 1, custPageSize: 25, custSearch: '', custSortBy: 'lastActivityDate', custSortDir: 'desc'
};

$(document).ready(function () {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { showToast('No campaign ID specified', 'error'); return; }
  loadCampaignDetail(id);
});

function loadCampaignDetail(id) {
  apiGet('/campaigns/' + id).done(r => {
    if (!r.success) { showToast('Failed to load campaign', 'error'); return; }
    const c = r.data;
    campDetailState.campaign = c;
    campDetailState.segment = null;

    document.title = c.name + ' — MarketFlow';
    $('#camp-detail-name').text(c.name);
    $('#camp-detail-badges').html(statusBadge(c.status) + ' ' + typeBadge(c.type));
    $('#camp-detail-id').val(c.id);

    $('#cdf-name').val(c.name);
    $('#cdf-type').val(c.type);
    $('#cdf-status').val(c.status);
    $('#cdf-start-date').val(toInputDate(c.startDate));
    $('#cdf-end-date').val(toInputDate(c.endDate));

    // Load folders from API for the select
    const $sel = $('#cdf-folder').html('<option value="">Unassigned</option>');
    apiGet('/campaign-folders').done(fr => {
      if (fr.success) {
        fr.data.forEach(f => $sel.append(`<option value="${f.id}">${escHtml(f.name)}</option>`));
      }
      $sel.val(c.campaignFolderId || '');
    });

    $('#camp-detail-info').html(`
      <div class="detail-info-row"><span class="detail-info-key">ID</span><span class="detail-info-val" style="font-size:11px;font-family:monospace;color:#94a3b8">${c.id.substring(0,8)}…</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created</span><span class="detail-info-val">${formatDate(c.createDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created By</span><span class="detail-info-val">${escHtml(c.createBy||'—')}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Last Updated</span><span class="detail-info-val">${formatDate(c.updatedDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Duration</span><span class="detail-info-val">${campaignDuration(c)}</span></div>
    `);

    loadCampaignSegmentArea(c);
    loadCampaignEmailPreview(c);
  }).fail(() => showToast('Failed to load campaign', 'error'));
}

function campaignDuration(c) {
  if (!c.startDate || !c.endDate) return '—';
  const days = Math.round((new Date(c.endDate) - new Date(c.startDate)) / 86400000);
  return days + ' day' + (days !== 1 ? 's' : '');
}

/* ── Save Campaign Detail ── */
function saveCampaignDetail() {
  const id = $('#camp-detail-id').val();
  const name = $('#cdf-name').val().trim();
  if (!name) { showToast('Name is required', 'warning'); return; }
  const payload = {
    name, type: $('#cdf-type').val(), status: $('#cdf-status').val(),
    startDate: $('#cdf-start-date').val() || null,
    endDate: $('#cdf-end-date').val() || null,
    campaignFolderId: $('#cdf-folder').val() || null,
    segmentId: campDetailState.campaign?.segmentId || null,
    updatedBy: 'admin@acmecorp.com'
  };
  apiPut('/campaigns/' + id, payload).done(r => {
    if (r.success) {
      campDetailState.campaign = r.data;
      document.title = r.data.name + ' — MarketFlow';
      $('#camp-detail-name').text(r.data.name);
      $('#camp-detail-badges').html(statusBadge(r.data.status) + ' ' + typeBadge(r.data.type));
      showToast('Campaign saved', 'success');
    }
  }).fail(() => showToast('Failed to save', 'error'));
}

function deleteCampaignFromDetail() {
  const name = campDetailState.campaign?.name || 'this campaign';
  showConfirmModal(`Delete campaign "${name}"?`, () => {
    apiDelete('/campaigns/' + campDetailState.campaign.id).done(r => {
      if (r.success) {
        showToast('Campaign deleted', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    }).fail(() => showToast('Failed', 'error'));
  });
}

/* ── Audience Tab ── */
function loadCampaignSegmentArea(campaign) {
  const segId = campaign.segmentId;
  if (segId) {
    apiGet('/segments/' + segId).done(r => {
      if (r.success) {
        campDetailState.segment = r.data;
        renderAttachedSegment(r.data);
        loadCampaignCustomers();
      } else {
        renderNoSegment();
      }
    }).fail(renderNoSegment);
  } else {
    renderNoSegment();
    $('#camp-segment-stats').html('');
  }
}

function renderAttachedSegment(seg) {
  const html = `
    <div class="segment-attached">
      <div class="segment-attached-info">
        <div class="segment-attached-name">${escHtml(seg.name)}</div>
        <div class="segment-attached-type">${segTypeBadge(seg.type)} &nbsp; <span style="font-size:12px;color:#64748b">~${formatNumber(seg.estimatedCount)} contacts</span></div>
        ${seg.filter ? `<div class="segment-attached-filter">${escHtml(seg.filter)}</div>` : ''}
      </div>
      <button class="btn-danger-soft" style="font-size:12px;padding:6px 10px" onclick="detachSegment()">
        <i class="fa-solid fa-xmark mr-1"></i>Remove
      </button>
    </div>
    <button class="btn-secondary" style="width:100%;justify-content:center" onclick="showSegmentSelector()">
      <i class="fa-solid fa-arrows-rotate mr-1.5"></i>Change Segment
    </button>`;
  $('#camp-segment-area').html(html);
  $('#camp-segment-stats').html(`
    <div class="detail-info-row"><span class="detail-info-key">Segment Type</span><span class="detail-info-val">${escHtml(seg.type)}</span></div>
    <div class="detail-info-row"><span class="detail-info-key">Est. Contacts</span><span class="detail-info-val">${formatNumber(seg.estimatedCount)}</span></div>
    <div class="detail-info-row"><span class="detail-info-key">Filter</span><span class="detail-info-val" style="font-family:monospace;font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(seg.filter)}">${escHtml(seg.filter)||'—'}</span></div>
    <div class="detail-info-row"><span class="detail-info-key">Created</span><span class="detail-info-val">${formatDate(seg.createDate)}</span></div>
  `);
}

function renderNoSegment() {
  $('#camp-segment-area').html(`
    <div class="segment-empty-state">
      <i class="fa-solid fa-users-viewfinder"></i>
      <p>No segment attached</p>
    </div>
    <button class="btn-primary" style="width:100%;justify-content:center" onclick="showSegmentSelector()">
      <i class="fa-solid fa-plus mr-1.5"></i>Attach Segment
    </button>`);
  $('#camp-segment-stats').html(`<div class="no-data-msg" style="padding:20px 0"><i class="fa-solid fa-users-viewfinder"></i><p>No segment attached</p></div>`);
  $('#cust-tbody').html(`<tr><td colspan="8"><div class="no-data-msg"><i class="fa-solid fa-user-slash"></i><p>Attach a segment to see customers</p></div></td></tr>`);
  buildPagination('cust-pagination', 1, 1, () => {});
}

function showSegmentSelector() {
  $('#seg-select-list').html('<div class="no-data-msg"><div class="spinner"></div></div>');
  $('#seg-select-modal-overlay').removeClass('hidden');
  loadSegmentSelectorList('');

  $('#seg-select-search').off('input').on('input', debounce(function () {
    loadSegmentSelectorList($(this).val().trim());
  }, 300));
}

function loadSegmentSelectorList(search) {
  apiGet('/segments', { page: 1, pageSize: 50, search }).done(r => {
    if (!r.success || !r.data.data.length) {
      $('#seg-select-list').html('<div class="no-data-msg"><i class="fa-solid fa-users-viewfinder"></i><p>No segments found</p></div>');
      return;
    }
    const html = r.data.data.map(s => `
      <div class="seg-select-item" onclick="attachSegment('${s.id}')">
        <div class="seg-select-item-icon"><i class="fa-solid fa-users-viewfinder"></i></div>
        <div class="seg-select-item-info">
          <div class="seg-select-item-name">${escHtml(s.name)}</div>
          <div class="seg-select-item-meta">${escHtml(s.type)} · ~${formatNumber(s.estimatedCount)} contacts</div>
        </div>
        <i class="fa-solid fa-chevron-right text-slate-300 text-xs"></i>
      </div>`).join('');
    $('#seg-select-list').html(html);
  });
}

function attachSegment(segId) {
  const id = $('#camp-detail-id').val();
  const payload = { ...campDetailState.campaign, segmentId: segId, updatedBy: 'admin@acmecorp.com' };
  apiPut('/campaigns/' + id, payload).done(r => {
    if (r.success) {
      campDetailState.campaign = r.data;
      $('#seg-select-modal-overlay').addClass('hidden');
      showToast('Segment attached', 'success');
      loadCampaignSegmentArea(r.data);
    }
  }).fail(() => showToast('Failed to attach segment', 'error'));
}

function detachSegment() {
  const id = $('#camp-detail-id').val();
  const payload = { ...campDetailState.campaign, segmentId: null, updatedBy: 'admin@acmecorp.com' };
  apiPut('/campaigns/' + id, payload).done(r => {
    if (r.success) {
      campDetailState.campaign = r.data;
      campDetailState.segment = null;
      renderNoSegment();
      showToast('Segment removed', 'success');
    }
  }).fail(() => showToast('Failed to detach segment', 'error'));
}

/* ── Customer List ── */
function loadCampaignCustomers() {
  if (!campDetailState.campaign?.segmentId) return;
  $('#cust-tbody').html(`<tr><td colspan="8" class="table-empty"><div class="spinner"></div></td></tr>`);
  const params = {
    page: campDetailState.custPage, pageSize: campDetailState.custPageSize,
    search: campDetailState.custSearch, sortBy: campDetailState.custSortBy, sortDir: campDetailState.custSortDir,
    segmentId: campDetailState.campaign.segmentId
  };
  apiGet('/customers', params).done(r => {
    if (!r.success) return;
    const { data, totalCount, page, pageSize, totalPages } = r.data;
    renderCustomerTable(data);
    const from = (page-1)*pageSize+1, to = Math.min(page*pageSize, totalCount);
    $('#cust-result-info').text(`${from}–${to} of ${totalCount} customers`);
    buildPagination('cust-pagination', page, totalPages, p => { campDetailState.custPage = p; loadCampaignCustomers(); });
  });
}

function renderCustomerTable(data) {
  if (!data || !data.length) {
    $('#cust-tbody').html(`<tr><td colspan="8"><div class="no-data-msg"><i class="fa-solid fa-user-slash"></i><p>No matching customers</p></div></td></tr>`);
    return;
  }
  const html = data.map(c => `
    <tr>
      <td><div style="font-weight:600;font-size:13px">${escHtml(c.firstName)} ${escHtml(c.lastName)}</div><div style="font-size:11.5px;color:#94a3b8">${escHtml(c.jobTitle)}</div></td>
      <td style="font-size:12.5px;color:#475569">${escHtml(c.email)}</td>
      <td>${planBadge(c.plan)}</td>
      <td style="font-size:12.5px;color:#64748b">${c.age}</td>
      <td style="font-size:12.5px;color:#64748b">${escHtml(c.city)}</td>
      <td style="font-weight:600;font-size:13px">${formatCurrency(c.totalSpend)}</td>
      <td style="font-size:12px;color:#94a3b8">${formatDate(c.lastActivityDate)}</td>
      <td>${custStatusBadge(c.status)}</td>
    </tr>`).join('');
  $('#cust-tbody').html(html);
}

$('#cust-search').on('input', debounce(function () {
  campDetailState.custSearch = $(this).val().trim();
  campDetailState.custPage = 1;
  loadCampaignCustomers();
}, 350));

$('#cust-table thead').on('click', '.th-sortable', function () {
  const col = $(this).data('col');
  campDetailState.custSortDir = campDetailState.custSortBy === col ? (campDetailState.custSortDir === 'asc' ? 'desc' : 'asc') : 'desc';
  campDetailState.custSortBy = col;
  updateSortHeaders('#cust-table', col, campDetailState.custSortDir);
  campDetailState.custPage = 1;
  loadCampaignCustomers();
});

/* ── Email Content Tab ── */
function loadCampaignEmailPreview(campaign) {
  const $preview = $('#camp-email-preview');
  if (campaign.emailDesignJson) {
    try {
      const blocks = JSON.parse(campaign.emailDesignJson);
      if (blocks && blocks.length) {
        const html = renderBlocksToHtml(blocks);
        $preview.html(`<iframe class="email-preview-iframe" id="camp-email-frame"></iframe>`);
        setTimeout(() => writeIframe(document.getElementById('camp-email-frame'), html), 50);
        return;
      }
    } catch (e) { /* fallthrough */ }
  }
  $preview.html(`<div class="email-empty-state"><i class="fa-regular fa-envelope text-4xl text-slate-300"></i><p class="text-slate-500 mt-3 font-medium">No email designed yet</p><p class="text-slate-400 text-sm mt-1">Click "Open Designer" to create your campaign email</p></div>`);
}

function openEmailDesigner() {
  const c = campDetailState.campaign;
  if (!c) return;
  openDesignerForCampaign(c);
}

function loadTemplateForCampaign() {
  loadTemplateSelectorList();
  $('#tmpl-select-modal-overlay').removeClass('hidden');
  window._tmplSelectCallback = (htmlBody) => {
    $('#tmpl-select-modal-overlay').addClass('hidden');
    openDesignerForCampaign(campDetailState.campaign, htmlBody);
  };
}

function loadTemplateSelectorList() {
  apiGet('/email-templates', { page: 1, pageSize: 50 }).done(r => {
    if (!r.success) return;
    const html = r.data.data.map(t => `
      <div class="tmpl-select-item" onclick="selectTemplate('${t.id}')">
        <div class="tmpl-select-item-icon"><i class="fa-solid fa-envelope-open-text"></i></div>
        <div class="tmpl-select-item-info">
          <div class="tmpl-select-item-name">${escHtml(t.name)}</div>
          <div class="tmpl-select-item-meta">${escHtml(t.category||'—')} · ${escHtml(t.subject)}</div>
        </div>
      </div>`).join('');
    $('#tmpl-select-list').html(html);
  });
}

function selectTemplate(id) {
  apiGet('/email-templates/' + id).done(r => {
    if (r.success && window._tmplSelectCallback) window._tmplSelectCallback(r.data.htmlBody);
  });
}
