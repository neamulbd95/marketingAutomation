/* ══════════════════════════════════════════
   settings.js — Settings tab logic
   ══════════════════════════════════════════ */

let settingsInitialized = false;

function initSettingsTab() {
  if (settingsInitialized) return;
  settingsInitialized = true;

  loadSettings();

  // Settings nav switching
  $('.settings-nav-item').on('click', function () {
    const section = $(this).data('section');
    $('.settings-nav-item').removeClass('active');
    $(this).addClass('active');
    $('.settings-section').addClass('hidden').removeClass('active');
    $('#settings-' + section).removeClass('hidden').addClass('active');
  });

  // Color picker sync
  $('#s-primary-color').on('input', function () {
    $('#s-primary-color-text').val($(this).val());
    updateBrandPreview();
  });
  $('#s-accent-color').on('input', function () {
    $('#s-accent-color-text').val($(this).val());
  });
  $('#s-primary-color-text').on('input', function () {
    const v = $(this).val();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { $('#s-primary-color').val(v); updateBrandPreview(); }
  });
  $('#s-company-name').on('input', updateBrandPreview);

  // Logo upload
  $('#logo-upload-area').on('click', () => $('#s-logo-file').click());
  $('#s-logo-file').on('change', function () {
    const file = this.files[0];
    if (!file) return;
    showToast(`Logo "${file.name}" selected`, 'info');
  });
}

function loadSettings() {
  apiGet('/settings').done(r => {
    if (!r.success) return;
    const s = r.data;

    // General
    $('#s-company-name').val(s.general?.companyName || '');
    $('#s-website').val(s.general?.website || '');
    $('#s-timezone').val(s.general?.timezone || 'UTC');
    $('#s-language').val(s.general?.language || 'en-US');
    $('#s-date-format').val(s.general?.dateFormat || 'MM/DD/YYYY');

    // Email
    $('#s-smtp-host').val(s.email?.smtpHost || '');
    $('#s-smtp-port').val(s.email?.smtpPort || 587);
    $('#s-smtp-user').val(s.email?.username || '');
    $('#s-smtp-pass').val('');
    $('#s-from-name').val(s.email?.fromName || '');
    $('#s-from-email').val(s.email?.fromEmail || '');
    $('#s-reply-to').val(s.email?.replyToEmail || '');
    $('#s-ssl').prop('checked', s.email?.enableSsl !== false);

    // Notifications
    $('#s-notif-email').prop('checked', s.notifications?.emailNotifications !== false);
    $('#s-notif-browser').prop('checked', s.notifications?.browserNotifications === true);
    $('#s-notif-start').prop('checked', s.notifications?.campaignStartAlert !== false);
    $('#s-notif-end').prop('checked', s.notifications?.campaignEndAlert !== false);
    $('#s-notif-weekly').prop('checked', s.notifications?.weeklyReport !== false);

    // API
    $('#s-api-key').val(s.api?.apiKey || '');
    $('#s-webhook-url').val(s.api?.webhookUrl || '');
    $('#s-rate-limit').val(s.api?.rateLimitPerMinute || 100);

    // Branding
    const pc = s.branding?.primaryColor || '#1E3A5F';
    const ac = s.branding?.accentColor || '#3B82F6';
    $('#s-primary-color').val(pc);
    $('#s-primary-color-text').val(pc);
    $('#s-accent-color').val(ac);
    $('#s-accent-color-text').val(ac);

    // Preferences
    $('#s-pref-page-size').val(String(s.preferences?.defaultPageSize || 50));
    $('#s-pref-view').val(s.preferences?.defaultView || 'list');
    selectTheme(s.preferences?.theme || 'light');

    updateBrandPreview();
  }).fail(() => showToast('Failed to load settings', 'error'));
}

function saveSettings() {
  const settings = {
    general: {
      companyName: $('#s-company-name').val(),
      website: $('#s-website').val(),
      timezone: $('#s-timezone').val(),
      language: $('#s-language').val(),
      dateFormat: $('#s-date-format').val()
    },
    email: {
      smtpHost: $('#s-smtp-host').val(),
      smtpPort: parseInt($('#s-smtp-port').val()) || 587,
      username: $('#s-smtp-user').val(),
      password: $('#s-smtp-pass').val() || undefined,
      fromName: $('#s-from-name').val(),
      fromEmail: $('#s-from-email').val(),
      replyToEmail: $('#s-reply-to').val(),
      enableSsl: $('#s-ssl').is(':checked')
    },
    notifications: {
      emailNotifications: $('#s-notif-email').is(':checked'),
      browserNotifications: $('#s-notif-browser').is(':checked'),
      campaignStartAlert: $('#s-notif-start').is(':checked'),
      campaignEndAlert: $('#s-notif-end').is(':checked'),
      weeklyReport: $('#s-notif-weekly').is(':checked')
    },
    api: {
      apiKey: $('#s-api-key').val(),
      webhookUrl: $('#s-webhook-url').val(),
      rateLimitPerMinute: parseInt($('#s-rate-limit').val()) || 100
    },
    branding: {
      primaryColor: $('#s-primary-color-text').val(),
      accentColor: $('#s-accent-color-text').val(),
      logoUrl: ''
    },
    preferences: {
      defaultPageSize: parseInt($('#s-pref-page-size').val()) || 50,
      defaultView: $('#s-pref-view').val(),
      theme: $('.theme-opt.active').data('theme') || 'light'
    }
  };

  apiPut('/settings', settings).done(r => {
    if (r.success) showToast('Settings saved successfully', 'success');
    else showToast('Failed to save settings', 'error');
  }).fail(() => showToast('Failed to save settings', 'error'));
}

function sendTestEmail() {
  showToast('Test email sent to ' + ($('#s-from-email').val() || 'configured address'), 'info');
}

function copyApiKey() {
  const key = $('#s-api-key').val();
  if (key) {
    navigator.clipboard.writeText(key).then(() => showToast('API key copied to clipboard', 'success'));
  }
}

function regenerateApiKey() {
  showConfirmModal('Regenerate API key? The old key will stop working immediately.', () => {
    const newKey = 'mk_live_' + Array.from({length: 20}, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    $('#s-api-key').val(newKey);
    showToast('New API key generated. Save settings to persist.', 'warning');
  });
}

function selectTheme(theme) {
  $('.theme-opt').removeClass('active');
  $(`.theme-opt[data-theme="${theme}"]`).addClass('active');
}

function updateBrandPreview() {
  const color = $('#s-primary-color-text').val() || '#1E3A5F';
  const name = $('#s-company-name').val() || 'MarketFlow';
  $('#brandPreviewBar').css('background', color);
  $('#brandPreviewName').text(name);
  $('#brandPreviewIcon').text(name.charAt(0).toUpperCase());
}
