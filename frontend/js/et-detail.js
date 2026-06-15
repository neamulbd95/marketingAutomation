/* ══════════════════════════════════════════
   et-detail.js — Standalone email template detail page
   ══════════════════════════════════════════ */

const etDetailState = { template: null };

$(document).ready(function () {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { showToast('No template ID specified', 'error'); return; }
  loadEtDetail(id);
});

function loadEtDetail(id) {
  apiGet('/email-templates/' + id).done(r => {
    if (!r.success) { showToast('Failed to load', 'error'); return; }
    const t = r.data;
    etDetailState.template = t;

    document.title = t.name + ' — MarketFlow';
    $('#et-detail-name').text(t.name);
    $('#et-detail-badges').html(t.category ? etCategoryBadge(t.category) : '');
    $('#et-detail-id').val(t.id);

    $('#etdf-name').val(t.name);
    $('#etdf-subject').val(t.subject);
    $('#etdf-category').val(t.category || '');
    $('#etdf-body').val(t.htmlBody || '');

    $('#et-detail-info').html(`
      <div class="detail-info-row"><span class="detail-info-key">ID</span><span class="detail-info-val" style="font-size:11px;font-family:monospace;color:#94a3b8">${t.id.substring(0,8)}…</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created</span><span class="detail-info-val">${formatDate(t.createDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Created By</span><span class="detail-info-val">${escHtml(t.createBy||'—')}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Last Updated</span><span class="detail-info-val">${formatDate(t.updatedDate)}</span></div>
      <div class="detail-info-row"><span class="detail-info-key">Has Design</span><span class="detail-info-val">${t.emailDesignJson ? '<span style="color:#16a34a">Yes</span>' : '<span style="color:#94a3b8">No</span>'}</span></div>
    `);

    renderEtPreviewFrame(t);
  }).fail(() => showToast('Failed to load', 'error'));
}

function renderEtPreviewFrame(t) {
  const frame = document.getElementById('et-preview-frame');
  if (!frame) return;
  const html = t.htmlBody || '<div style="font-family:sans-serif;color:#94a3b8;padding:40px;text-align:center">No HTML content yet.<br>Click "Edit in Designer" to build your template.</div>';
  writeIframe(frame, html);
}

// Render preview whenever user switches to Preview tab
$(document).on('click', '.detail-tab[data-dtab="et-preview"]', function () {
  if (etDetailState.template) renderEtPreviewFrame(etDetailState.template);
});

function saveEtDetail() {
  const id = $('#et-detail-id').val();
  const name = $('#etdf-name').val().trim();
  const subject = $('#etdf-subject').val().trim();
  if (!name) { showToast('Name is required', 'warning'); return; }
  if (!subject) { showToast('Subject is required', 'warning'); return; }
  const payload = {
    name, subject,
    category: $('#etdf-category').val(),
    htmlBody: $('#etdf-body').val(),
    emailDesignJson: etDetailState.template?.emailDesignJson || null,
    updatedBy: 'admin@acmecorp.com'
  };
  apiPut('/email-templates/' + id, payload).done(r => {
    if (r.success) {
      etDetailState.template = r.data;
      document.title = r.data.name + ' — MarketFlow';
      $('#et-detail-name').text(r.data.name);
      $('#et-detail-badges').html(r.data.category ? etCategoryBadge(r.data.category) : '');
      renderEtPreviewFrame(r.data);
      showToast('Template saved', 'success');
    }
  }).fail(() => showToast('Failed to save', 'error'));
}

function deleteEtFromDetail() {
  const name = etDetailState.template?.name || 'this template';
  showConfirmModal(`Delete template "${name}"?`, () => {
    apiDelete('/email-templates/' + etDetailState.template.id).done(r => {
      if (r.success) {
        showToast('Template deleted', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    }).fail(() => showToast('Failed', 'error'));
  });
}

function openEtDesigner() {
  const t = etDetailState.template;
  if (!t) return;
  openDesignerForEt(t);
}

function openEtInNewTab() {
  const t = etDetailState.template;
  if (!t) return;
  const html = t.htmlBody || '<p style="font-family:sans-serif;color:#94a3b8;padding:40px;text-align:center">No HTML content.</p>';
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  win.document.open();
  win.document.write(html);
  win.document.close();
}
