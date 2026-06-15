/* ══════════════════════════════════════════
   email-designer.js — Drag-and-drop email builder
   ══════════════════════════════════════════ */

const designerState = {
  blocks: [],
  selectedId: null,
  history: [],
  historyIdx: -1,
  context: null,       // { type: 'campaign'|'emailtemplate', id, name }
  dragFromPalette: null,
  dragSrcId: null,
  dropTargetId: null
};

/* ── Default block props by type ── */
const BLOCK_DEFAULTS = {
  header: { logoText: 'BRAND', title: 'Newsletter Title', subtitle: 'Your tagline here', bgColor: '#1e293b', textColor: '#ffffff', align: 'center' },
  text:   { content: 'Write your message here. Keep it clear, concise, and compelling.', fontSize: 14, color: '#374151', align: 'left', padding: 24 },
  image:  { src: 'https://placehold.co/600x200/e2e8f0/94a3b8?text=Image', alt: 'Image', link: '', width: '100%', align: 'center' },
  button: { label: 'Click Here', url: '#', bgColor: '#2563EB', textColor: '#ffffff', align: 'center', borderRadius: 6, padding: '12 28' },
  columns: { leftContent: 'Left column — add your content here.', rightContent: 'Right column — add your content here.', bgColor: '#ffffff', gap: 20 },
  divider: { color: '#e2e8f0', thickness: 1, margin: 24 },
  spacer:  { height: 32 },
  social:  { networks: 'facebook,twitter,linkedin', align: 'center', iconColor: '#475569' },
  footer:  { company: 'Company Name', address: '123 Main Street, City, Country', unsubscribeText: 'Unsubscribe', color: '#94a3b8', bgColor: '#f8fafc' }
};

function genId() { return 'b' + Math.random().toString(36).substr(2,9); }

/* ════════════════════════════════
   Open / Close
   ════════════════════════════════ */
function openDesignerForCampaign(campaign, preloadHtml) {
  designerState.context = { type: 'campaign', id: campaign.id, name: campaign.name };
  _initDesigner(campaign.emailDesignJson, preloadHtml);
}
function openDesignerForEt(template) {
  designerState.context = { type: 'emailtemplate', id: template.id, name: template.name };
  _initDesigner(template.emailDesignJson, null);
}

function _initDesigner(designJson, preloadHtml) {
  designerState.selectedId = null;
  designerState.history = [];
  designerState.historyIdx = -1;

  if (designJson) {
    try { designerState.blocks = JSON.parse(designJson); }
    catch { designerState.blocks = []; }
  } else if (preloadHtml) {
    // Load template HTML as a single text block
    designerState.blocks = [{ id: genId(), type: 'text', props: { ...BLOCK_DEFAULTS.text, content: preloadHtml } }];
  } else {
    designerState.blocks = [];
  }

  _saveHistory();
  $('#designer-for-label').text(designerState.context.name);
  $('#designer-overlay').removeClass('hidden');
  renderCanvas();
  renderPropsPanel(null);
  loadDesignerTemplates();
  setDesignerView('desktop');
}

function closeEmailDesigner() {
  if (designerState.history.length > 1 && designerState.historyIdx > 0) {
    const leave = confirm('You have unsaved changes. Close anyway?');
    if (!leave) return;
  }
  $('#designer-overlay').addClass('hidden');
  designerState.blocks = [];
  designerState.selectedId = null;
  designerState.context = null;
}

function saveDesign() {
  const ctx = designerState.context;
  if (!ctx) return;
  const designJson = JSON.stringify(designerState.blocks);
  const htmlBody = renderBlocksToHtml(designerState.blocks);

  let req;
  if (ctx.type === 'campaign') {
    const camp = (typeof campDetailState !== 'undefined') ? campDetailState.campaign : null;
    const payload = camp ? { ...camp, emailDesignJson: designJson, updatedBy: 'admin@acmecorp.com' } : { emailDesignJson: designJson, updatedBy: 'admin@acmecorp.com' };
    req = apiPut('/campaigns/' + ctx.id, payload);
  } else {
    const tmpl = (typeof etDetailState !== 'undefined') ? etDetailState.template : null;
    const payload = tmpl ? { ...tmpl, emailDesignJson: designJson, htmlBody, updatedBy: 'admin@acmecorp.com' } : { emailDesignJson: designJson, htmlBody, updatedBy: 'admin@acmecorp.com' };
    req = apiPut('/email-templates/' + ctx.id, payload);
  }

  req.done(r => {
    if (r.success) {
      showToast('Design saved', 'success');
      $('#designer-overlay').addClass('hidden');
      if (ctx.type === 'campaign' && typeof campDetailState !== 'undefined') {
        campDetailState.campaign = r.data;
        loadCampaignEmailPreview(r.data);
      } else if (ctx.type === 'emailtemplate' && typeof etDetailState !== 'undefined') {
        etDetailState.template = r.data;
        if (typeof renderEtPreviewFrame === 'function') renderEtPreviewFrame(r.data);
      }
    }
  }).fail(() => showToast('Failed to save', 'error'));
}

/* ════════════════════════════════
   Canvas Rendering
   ════════════════════════════════ */
function renderCanvas() {
  const $canvas = $('#designer-canvas');
  if (!designerState.blocks.length) {
    $canvas.html(`<div class="designer-drop-hint" id="designer-drop-hint">
      <i class="fa-solid fa-plus-circle" style="font-size:2rem;color:#cbd5e1"></i>
      <p style="color:#94a3b8;font-size:13px;margin-top:8px">Drag blocks here to build your email</p>
    </div>`);
    return;
  }
  $canvas.html(designerState.blocks.map((b, idx) => renderBlockToCanvas(b, idx)).join(''));
  _bindCanvasEvents();
  _highlightSelected();
}

function renderBlockToCanvas(block, idx) {
  const isSelected = designerState.selectedId === block.id;
  const preview = _renderBlockPreview(block);
  return `<div class="canvas-block${isSelected?' selected':''}" data-id="${block.id}" data-idx="${idx}" draggable="true">
    <div class="canvas-block-toolbar">
      <button title="Move Up" onclick="moveBlock('${block.id}',-1)"><i class="fa-solid fa-chevron-up"></i></button>
      <button title="Move Down" onclick="moveBlock('${block.id}',1)"><i class="fa-solid fa-chevron-down"></i></button>
      <span style="font-size:10px;color:rgba(255,255,255,0.6);padding:0 6px;text-transform:uppercase;letter-spacing:1px">${block.type}</span>
      <button title="Duplicate" onclick="duplicateBlock('${block.id}')"><i class="fa-regular fa-copy"></i></button>
      <button style="color:#fca5a5" title="Delete" onclick="removeBlock('${block.id}')"><i class="fa-solid fa-trash"></i></button>
    </div>
    ${preview}
  </div>`;
}

function _renderBlockPreview(block) {
  const p = block.props;
  switch (block.type) {
    case 'header':
      return `<div class="eb-header" style="background:${p.bgColor||'#1e293b'};text-align:${p.align||'center'};padding:32px 24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:${p.textColor||'#fff'}99;margin-bottom:8px">${escHtml(p.logoText||'BRAND')}</div>
        <div style="font-size:22px;font-weight:700;color:${p.textColor||'#ffffff'}">${escHtml(p.title||'')}</div>
        ${p.subtitle?`<div style="font-size:13px;color:${p.textColor||'#fff'}bb;margin-top:6px">${escHtml(p.subtitle)}</div>`:''}
      </div>`;
    case 'text':
      return `<div class="eb-text" style="padding:${p.padding||24}px;font-size:${p.fontSize||14}px;color:${p.color||'#374151'};text-align:${p.align||'left'};line-height:1.7;white-space:pre-wrap">${escHtml(p.content||'')}</div>`;
    case 'image':
      return `<div class="eb-image" style="padding:12px;text-align:${p.align||'center'}"><img src="${escHtml(p.src||'')}" alt="${escHtml(p.alt||'')}" style="width:${p.width||'100%'};max-width:100%;display:inline-block;border-radius:4px" onerror="this.src='https://placehold.co/600x160/f1f5f9/94a3b8?text=Image'" /></div>`;
    case 'button':
      const [pt,ph] = (p.padding||'12 28').toString().split(' ').map(Number);
      return `<div class="eb-button" style="padding:20px;text-align:${p.align||'center'}"><a href="${escHtml(p.url||'#')}" style="display:inline-block;background:${p.bgColor||'#2563EB'};color:${p.textColor||'#ffffff'};padding:${pt||12}px ${ph||28}px;border-radius:${p.borderRadius||6}px;text-decoration:none;font-size:14px;font-weight:600">${escHtml(p.label||'Click Here')}</a></div>`;
    case 'columns':
      return `<div class="eb-columns" style="display:grid;grid-template-columns:1fr 1fr;gap:${p.gap||20}px;padding:16px 12px;background:${p.bgColor||'#ffffff'}">
        <div style="padding:12px;border:1px dashed #e2e8f0;border-radius:4px;font-size:13px;color:#64748b;min-height:60px">${escHtml(p.leftContent||'Left column')}</div>
        <div style="padding:12px;border:1px dashed #e2e8f0;border-radius:4px;font-size:13px;color:#64748b;min-height:60px">${escHtml(p.rightContent||'Right column')}</div>
      </div>`;
    case 'divider':
      return `<div class="eb-divider" style="padding:${p.margin||24}px 24px"><hr style="border:none;border-top:${p.thickness||1}px solid ${p.color||'#e2e8f0'};margin:0" /></div>`;
    case 'spacer':
      return `<div class="eb-spacer" style="height:${p.height||32}px;background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc 4px,#f1f5f9 4px,#f1f5f9 8px)"></div>`;
    case 'social': {
      const icons = { facebook:'fa-facebook-f', twitter:'fa-x-twitter', linkedin:'fa-linkedin-in', instagram:'fa-instagram', youtube:'fa-youtube', pinterest:'fa-pinterest-p' };
      const nets = (p.networks||'facebook,twitter,linkedin').split(',').map(n=>n.trim()).filter(Boolean);
      const btns = nets.map(n=>`<a style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:${p.iconColor||'#475569'};color:#fff;text-decoration:none;margin:0 4px;font-size:14px"><i class="fa-brands ${icons[n]||'fa-globe'}"></i></a>`).join('');
      return `<div class="eb-social" style="padding:20px;text-align:${p.align||'center'}">${btns}</div>`;
    }
    case 'footer':
      return `<div class="eb-footer" style="padding:24px;background:${p.bgColor||'#f8fafc'};text-align:center;font-size:12px;color:${p.color||'#94a3b8'}">
        <div style="font-weight:600;margin-bottom:4px">${escHtml(p.company||'Company')}</div>
        <div>${escHtml(p.address||'')}</div>
        <div style="margin-top:8px"><a href="#" style="color:${p.color||'#94a3b8'};text-decoration:underline">${escHtml(p.unsubscribeText||'Unsubscribe')}</a></div>
      </div>`;
    default: return `<div style="padding:16px;color:#94a3b8;font-size:13px">Unknown block: ${escHtml(block.type)}</div>`;
  }
}

/* ── Canvas event binding ── */
function _bindCanvasEvents() {
  // Block click → select
  $('#designer-canvas').off('click.dblock').on('click.dblock', '.canvas-block', function (e) {
    e.stopPropagation();
    const id = $(this).data('id');
    designerState.selectedId = id;
    _highlightSelected();
    const block = designerState.blocks.find(b => b.id === id);
    renderPropsPanel(block);
  });

  // Canvas click outside → deselect
  $('#designer-canvas').off('click.dcanvas').on('click.dcanvas', function (e) {
    if ($(e.target).is('#designer-canvas')) {
      designerState.selectedId = null;
      _highlightSelected();
      renderPropsPanel(null);
    }
  });

  // Block drag (reorder)
  $('#designer-canvas').off('dragstart.dblock').on('dragstart.dblock', '.canvas-block', function (e) {
    designerState.dragSrcId = $(this).data('id');
    designerState.dragFromPalette = null;
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    $(this).addClass('dragging');
  });
  $('#designer-canvas').off('dragend.dblock').on('dragend.dblock', '.canvas-block', function () {
    designerState.dragSrcId = null;
    $('#designer-canvas .canvas-block').removeClass('dragging drop-above drop-below');
  });
  $('#designer-canvas').off('dragover.dblock').on('dragover.dblock', '.canvas-block', function (e) {
    e.preventDefault();
    const srcId = designerState.dragSrcId;
    const tgtId = $(this).data('id');
    if (!srcId || srcId === tgtId) return;
    const rect = this.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    $(this).removeClass('drop-above drop-below');
    if (e.originalEvent.clientY < midY) $(this).addClass('drop-above');
    else $(this).addClass('drop-below');
    designerState.dropTargetId = tgtId;
  });
  $('#designer-canvas').off('drop.dblock').on('drop.dblock', '.canvas-block', function (e) {
    e.preventDefault();
    const srcId = designerState.dragSrcId;
    const tgtId = $(this).data('id');
    $(this).removeClass('drop-above drop-below');
    if (!srcId) return; // palette drag — let it bubble to canvas-area drop handler
    e.stopPropagation();
    if (srcId === tgtId) return;
    const rect = this.getBoundingClientRect();
    const after = e.originalEvent.clientY >= rect.top + rect.height / 2;
    _reorderBlock(srcId, tgtId, after);
  });
}

function _reorderBlock(srcId, tgtId, after) {
  const blocks = [...designerState.blocks];
  const srcIdx = blocks.findIndex(b => b.id === srcId);
  const [moved] = blocks.splice(srcIdx, 1);
  let tgtIdx = blocks.findIndex(b => b.id === tgtId);
  if (after) tgtIdx++;
  blocks.splice(tgtIdx, 0, moved);
  designerState.blocks = blocks;
  _saveHistory();
  renderCanvas();
}

function _highlightSelected() {
  $('#designer-canvas .canvas-block').removeClass('selected');
  if (designerState.selectedId) {
    $(`#designer-canvas .canvas-block[data-id="${designerState.selectedId}"]`).addClass('selected');
  }
}

/* ── Palette drag-drop ── */
$(document).on('dragstart', '.block-item[data-block]', function (e) {
  designerState.dragFromPalette = $(this).data('block');
  designerState.dragSrcId = null;
  e.originalEvent.dataTransfer.effectAllowed = 'copy';
});
$(document).on('dragend', '.block-item[data-block]', function () {
  designerState.dragFromPalette = null;
});

$('#designer-canvas-area').on('dragover', function (e) {
  e.preventDefault();
  e.originalEvent.dataTransfer.dropEffect = designerState.dragFromPalette ? 'copy' : 'move';
});
$('#designer-canvas-area').on('drop', function (e) {
  e.preventDefault();
  if (!designerState.dragFromPalette) return;
  const type = designerState.dragFromPalette;
  designerState.dragFromPalette = null;
  const newBlock = { id: genId(), type, props: { ...BLOCK_DEFAULTS[type] } };
  designerState.blocks.push(newBlock);
  _saveHistory();
  designerState.selectedId = newBlock.id;
  renderCanvas();
  renderPropsPanel(newBlock);
  $('#designer-drop-hint').hide();
});

/* ════════════════════════════════
   Block Operations
   ════════════════════════════════ */
function moveBlock(id, dir) {
  const idx = designerState.blocks.findIndex(b => b.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= designerState.blocks.length) return;
  const blocks = [...designerState.blocks];
  [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
  designerState.blocks = blocks;
  _saveHistory();
  renderCanvas();
  _highlightSelected();
}

function duplicateBlock(id) {
  const idx = designerState.blocks.findIndex(b => b.id === id);
  if (idx < 0) return;
  const copy = { ...designerState.blocks[idx], id: genId(), props: { ...designerState.blocks[idx].props } };
  designerState.blocks.splice(idx + 1, 0, copy);
  _saveHistory();
  designerState.selectedId = copy.id;
  renderCanvas();
  renderPropsPanel(copy);
}

function removeBlock(id) {
  designerState.blocks = designerState.blocks.filter(b => b.id !== id);
  if (designerState.selectedId === id) {
    designerState.selectedId = null;
    renderPropsPanel(null);
  }
  _saveHistory();
  renderCanvas();
}

/* ════════════════════════════════
   Properties Panel
   ════════════════════════════════ */
function renderPropsPanel(block) {
  const $c = $('#designer-props-content');
  if (!block) {
    $c.html(`<div class="designer-props-empty"><i class="fa-regular fa-hand-pointer" style="font-size:1.8rem;color:#cbd5e1"></i><p style="color:#94a3b8;font-size:13px;margin-top:8px">Select a block to edit</p></div>`);
    return;
  }
  $c.html(_buildPropsForm(block));
  // Bind all input changes to update block props live
  $c.find('.props-input, .props-textarea, .props-select').off('input change').on('input change', function () {
    if ($(this).hasClass('props-color-hex')) return; // handled separately
    const key = $(this).data('prop');
    if (!key) return;
    const b = designerState.blocks.find(x => x.id === block.id);
    if (!b) return;
    const val = $(this).attr('type') === 'number' ? Number($(this).val()) : $(this).val();
    b.props[key] = val;
    _refreshBlockInCanvas(b);
  });
  $c.find('.props-color-picker').off('input').on('input', function () {
    const key = $(this).data('prop');
    const hex = $(this).val();
    const b = designerState.blocks.find(x => x.id === block.id);
    if (!b) return;
    b.props[key] = hex;
    $(this).siblings('.props-color-hex').val(hex);
    _refreshBlockInCanvas(b);
  });
  $c.find('.props-color-hex').off('input').on('input', function () {
    const key = $(this).data('prop');
    const val = $(this).val();
    if (!/^#[0-9a-fA-F]{6}$/.test(val)) return;
    const b = designerState.blocks.find(x => x.id === block.id);
    if (!b) return;
    b.props[key] = val;
    $(this).siblings('.props-color-picker').val(val);
    _refreshBlockInCanvas(b);
  });
}

function _refreshBlockInCanvas(block) {
  const $el = $(`#designer-canvas .canvas-block[data-id="${block.id}"]`);
  if (!$el.length) return;
  const newHtml = renderBlockToCanvas(block, 0);
  const $new = $(newHtml);
  $el.replaceWith($new);
  _bindCanvasEvents();
  _highlightSelected();
  // Re-attach props updates since we rebuilt the block
  // (we don't need to re-render props panel as inputs are still bound)
}

function _buildPropsForm(block) {
  const p = block.props;
  const label = (key, txt) => `<label class="props-label">${txt}</label>`;
  const input = (key, val, type='text') => `<input class="props-input" type="${type}" data-prop="${key}" value="${escHtml(String(val??''))}" />`;
  const textarea = (key, val) => `<textarea class="props-textarea" data-prop="${key}" rows="4">${escHtml(String(val??''))}</textarea>`;
  const colorRow = (key, val) => `<div class="props-color-row"><input class="props-color-picker" type="color" data-prop="${key}" value="${val||'#000000'}" /><input class="props-color-hex props-input" type="text" data-prop="${key}" value="${val||'#000000'}" style="font-family:monospace;font-size:11.5px" /></div>`;
  const alignBtns = (key, val) => `<div class="props-align-btns">${['left','center','right'].map(a=>`<button class="props-align-btn${val===a?' active':''}" data-prop="${key}" data-val="${a}" onclick="setBlockProp('${block.id}','${key}','${a}',this)">${a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</div>`;

  let rows = `<div class="props-section-title" style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f1f5f9">${block.type.charAt(0).toUpperCase()+block.type.slice(1)} Block</div>`;

  switch (block.type) {
    case 'header':
      rows += `${label('logoText','Brand/Logo Text')}${input('logoText',p.logoText)}
        ${label('title','Title')}${input('title',p.title)}
        ${label('subtitle','Subtitle')}${input('subtitle',p.subtitle||'')}
        ${label('bgColor','Background')}${colorRow('bgColor',p.bgColor)}
        ${label('textColor','Text Color')}${colorRow('textColor',p.textColor)}
        ${label('align','Alignment')}${alignBtns('align',p.align)}`;
      break;
    case 'text':
      rows += `${label('content','Content')}${textarea('content',p.content)}
        ${label('fontSize','Font Size (px)')}${input('fontSize',p.fontSize,'number')}
        ${label('color','Text Color')}${colorRow('color',p.color)}
        ${label('align','Alignment')}${alignBtns('align',p.align)}
        ${label('padding','Padding (px)')}${input('padding',p.padding,'number')}`;
      break;
    case 'image':
      rows += `${label('src','Image URL')}${input('src',p.src)}
        ${label('alt','Alt Text')}${input('alt',p.alt||'')}
        ${label('link','Link URL')}${input('link',p.link||'')}
        ${label('width','Width (e.g. 100%)')}${input('width',p.width||'100%')}
        ${label('align','Alignment')}${alignBtns('align',p.align)}`;
      break;
    case 'button':
      rows += `${label('label','Button Text')}${input('label',p.label)}
        ${label('url','Link URL')}${input('url',p.url||'#')}
        ${label('bgColor','Button Color')}${colorRow('bgColor',p.bgColor)}
        ${label('textColor','Text Color')}${colorRow('textColor',p.textColor)}
        ${label('borderRadius','Border Radius (px)')}${input('borderRadius',p.borderRadius,'number')}
        ${label('align','Alignment')}${alignBtns('align',p.align)}`;
      break;
    case 'columns':
      rows += `${label('leftContent','Left Column')}${textarea('leftContent',p.leftContent)}
        ${label('rightContent','Right Column')}${textarea('rightContent',p.rightContent)}
        ${label('gap','Gap (px)')}${input('gap',p.gap,'number')}
        ${label('bgColor','Background')}${colorRow('bgColor',p.bgColor)}`;
      break;
    case 'divider':
      rows += `${label('color','Line Color')}${colorRow('color',p.color)}
        ${label('thickness','Thickness (px)')}${input('thickness',p.thickness,'number')}
        ${label('margin','Margin (px)')}${input('margin',p.margin,'number')}`;
      break;
    case 'spacer':
      rows += `${label('height','Height (px)')}${input('height',p.height,'number')}`;
      break;
    case 'social':
      rows += `${label('networks','Networks (comma-separated)')}${input('networks',p.networks)}
        <div class="props-hint" style="font-size:11px;color:#94a3b8;margin-top:2px">Options: facebook, twitter, linkedin, instagram, youtube, pinterest</div>
        ${label('iconColor','Icon Color')}${colorRow('iconColor',p.iconColor)}
        ${label('align','Alignment')}${alignBtns('align',p.align)}`;
      break;
    case 'footer':
      rows += `${label('company','Company Name')}${input('company',p.company)}
        ${label('address','Address')}${input('address',p.address||'')}
        ${label('unsubscribeText','Unsubscribe Text')}${input('unsubscribeText',p.unsubscribeText||'Unsubscribe')}
        ${label('color','Text Color')}${colorRow('color',p.color)}
        ${label('bgColor','Background')}${colorRow('bgColor',p.bgColor)}`;
      break;
  }
  return rows;
}

function setBlockProp(blockId, key, val, el) {
  const b = designerState.blocks.find(x => x.id === blockId);
  if (!b) return;
  b.props[key] = val;
  $(el).closest('.props-align-btns').find('.props-align-btn').removeClass('active');
  $(el).addClass('active');
  _refreshBlockInCanvas(b);
}

/* ════════════════════════════════
   History (Undo/Redo)
   ════════════════════════════════ */
function _saveHistory() {
  designerState.history = designerState.history.slice(0, designerState.historyIdx + 1);
  designerState.history.push(JSON.stringify(designerState.blocks));
  designerState.historyIdx = designerState.history.length - 1;
}
function undoDesigner() {
  if (designerState.historyIdx <= 0) { showToast('Nothing to undo','info'); return; }
  designerState.historyIdx--;
  designerState.blocks = JSON.parse(designerState.history[designerState.historyIdx]);
  designerState.selectedId = null;
  renderCanvas();
  renderPropsPanel(null);
}
function redoDesigner() {
  if (designerState.historyIdx >= designerState.history.length - 1) { showToast('Nothing to redo','info'); return; }
  designerState.historyIdx++;
  designerState.blocks = JSON.parse(designerState.history[designerState.historyIdx]);
  designerState.selectedId = null;
  renderCanvas();
  renderPropsPanel(null);
}

/* ════════════════════════════════
   View Toggle (Desktop / Mobile)
   ════════════════════════════════ */
function setDesignerView(view) {
  const $canvas = $('#designer-canvas');
  const $btns = $('.designer-view-btn');
  $btns.removeClass('active');
  if (view === 'mobile') {
    $canvas.addClass('mobile-view');
    $btns.eq(1).addClass('active');
  } else {
    $canvas.removeClass('mobile-view');
    $btns.eq(0).addClass('active');
  }
}

/* ════════════════════════════════
   Preview
   ════════════════════════════════ */
function previewDesign() {
  const html = renderBlocksToHtml(designerState.blocks);
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ════════════════════════════════
   Templates list in designer panel
   ════════════════════════════════ */
function loadDesignerTemplates() {
  apiGet('/email-templates', { page: 1, pageSize: 30 }).done(r => {
    if (!r.success || !r.data.data.length) {
      $('#designer-templates-list').html('<div style="font-size:12px;color:#94a3b8;padding:8px 4px">No saved templates</div>');
      return;
    }
    const html = r.data.data.map(t => `
      <div class="designer-tmpl-item" onclick="loadDesignerTemplate('${t.id}')">
        <i class="fa-solid fa-envelope-open-text" style="color:#94a3b8;font-size:13px;flex-shrink:0"></i>
        <span>${escHtml(t.name)}</span>
      </div>`).join('');
    $('#designer-templates-list').html(html);
  });
}

function loadDesignerTemplate(id) {
  apiGet('/email-templates/' + id).done(r => {
    if (!r.success) return;
    const t = r.data;
    const confirmLoad = designerState.blocks.length
      ? confirm(`Load template "${t.name}"? This will replace your current design.`)
      : true;
    if (!confirmLoad) return;
    if (t.emailDesignJson) {
      try {
        designerState.blocks = JSON.parse(t.emailDesignJson);
      } catch {
        designerState.blocks = [];
      }
    } else {
      designerState.blocks = [];
    }
    designerState.selectedId = null;
    _saveHistory();
    renderCanvas();
    renderPropsPanel(null);
    showToast(`Loaded: ${t.name}`, 'success');
  });
}

/* ════════════════════════════════
   HTML Export (for preview & save)
   ════════════════════════════════ */
function renderBlocksToHtml(blocks) {
  if (!blocks || !blocks.length) return '<html><body style="font-family:sans-serif;color:#374151;padding:40px;text-align:center"><p>No content</p></body></html>';

  const blockHtml = blocks.map(b => {
    const p = b.props;
    switch (b.type) {
      case 'header':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${p.bgColor||'#1e293b'}">
          <tr><td align="${p.align||'center'}" style="padding:32px 24px">
            <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:${p.textColor||'#fff'}99;margin-bottom:8px">${_he(p.logoText||'BRAND')}</div>
            <div style="font-size:22px;font-weight:700;color:${p.textColor||'#ffffff'}">${_he(p.title||'')}</div>
            ${p.subtitle?`<div style="font-size:13px;color:${p.textColor||'#fff'}bb;margin-top:6px">${_he(p.subtitle)}</div>`:''}
          </td></tr></table>`;
      case 'text':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${p.padding||24}px">
          <p style="margin:0;font-size:${p.fontSize||14}px;color:${p.color||'#374151'};text-align:${p.align||'left'};line-height:1.7">${_he(p.content||'').replace(/\n/g,'<br>')}</p>
        </td></tr></table>`;
      case 'image':
        const imgTag = `<img src="${_he(p.src||'')}" alt="${_he(p.alt||'')}" width="${p.width||'100%'}" style="display:inline-block;max-width:100%;border-radius:4px" />`;
        const linked = p.link ? `<a href="${_he(p.link)}">${imgTag}</a>` : imgTag;
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${p.align||'center'}" style="padding:12px">${linked}</td></tr></table>`;
      case 'button':
        const [pt2,ph2] = (p.padding||'12 28').toString().split(' ').map(Number);
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${p.align||'center'}" style="padding:20px">
          <a href="${_he(p.url||'#')}" style="display:inline-block;background-color:${p.bgColor||'#2563EB'};color:${p.textColor||'#ffffff'};padding:${pt2||12}px ${ph2||28}px;border-radius:${p.borderRadius||6}px;text-decoration:none;font-size:14px;font-weight:600;font-family:Arial,sans-serif">${_he(p.label||'Click Here')}</a>
        </td></tr></table>`;
      case 'columns':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${p.bgColor||'#ffffff'}"><tr>
          <td width="50%" style="padding:${p.gap||20}px 12px;vertical-align:top;font-size:13px;color:#64748b;font-family:Arial,sans-serif">${_he(p.leftContent||'')}</td>
          <td width="50%" style="padding:${p.gap||20}px 12px;vertical-align:top;font-size:13px;color:#64748b;font-family:Arial,sans-serif">${_he(p.rightContent||'')}</td>
        </tr></table>`;
      case 'divider':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:${p.margin||24}px 24px"><hr style="border:none;border-top:${p.thickness||1}px solid ${p.color||'#e2e8f0'};margin:0" /></td></tr></table>`;
      case 'spacer':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="${p.height||32}" style="line-height:${p.height||32}px;font-size:0">&nbsp;</td></tr></table>`;
      case 'social': {
        const siMap = { facebook:'f', twitter:'t', linkedin:'in', instagram:'ig', youtube:'yt', pinterest:'p' };
        const nets = (p.networks||'facebook,twitter,linkedin').split(',').map(n=>n.trim()).filter(Boolean);
        const links = nets.map(n=>`<a href="#" style="display:inline-block;width:34px;height:34px;line-height:34px;border-radius:50%;background-color:${p.iconColor||'#475569'};color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;text-align:center;margin:0 4px;font-family:Arial,sans-serif">${(siMap[n]||n[0]).toUpperCase()}</a>`).join('');
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${p.align||'center'}" style="padding:20px">${links}</td></tr></table>`;
      }
      case 'footer':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${p.bgColor||'#f8fafc'}"><tr><td align="center" style="padding:24px;font-size:12px;color:${p.color||'#94a3b8'};font-family:Arial,sans-serif">
          <div style="font-weight:600;margin-bottom:4px">${_he(p.company||'')}</div>
          <div>${_he(p.address||'')}</div>
          <div style="margin-top:8px"><a href="#" style="color:${p.color||'#94a3b8'};text-decoration:underline">${_he(p.unsubscribeText||'Unsubscribe')}</a></div>
        </td></tr></table>`;
      default: return '';
    }
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9"><tr><td align="center" style="padding:20px 0">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;width:100%;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td>
${blockHtml}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

function _he(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : ''; }
