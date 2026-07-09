/* ══════════════════════════════════════════
   dashboard.js — Dashboard tab logic
   ══════════════════════════════════════════ */

let perfChart = null;
let statusChart = null;
let dashInitialized = false;
let calYear, calMonth;

function initDashboard() {
  if (dashInitialized) return;
  dashInitialized = true;
  loadDashboardStats();
  buildPerformanceChart();
  buildStatusChart();
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
  buildActivityFeed();

  $('#calPrev').on('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  $('#calNext').on('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });

  $('.chart-tab').on('click', function () {
    $('.chart-tab').removeClass('active');
    $(this).addClass('active');
    updatePerformanceChart($(this).data('metric'));
  });
}

function refreshDashboard() {
  loadDashboardStats();
  showToast('Dashboard refreshed', 'success');
}

function loadDashboardStats() {
  $.when(
    apiGet('/campaigns', { page: 1, pageSize: 1 }),
    apiGet('/segments', { page: 1, pageSize: 1 }),
    apiGet('/email-templates', { page: 1, pageSize: 1 })
  ).done((cRes, sRes, etRes) => {
    const total = cRes[0].data.totalCount;
    countUp('stat-campaigns', total);

    const active = Math.floor(total * 0.3);
    countUp('stat-active', active);

    const segs = sRes[0].data.totalCount;
    countUp('stat-segments', segs);

    const tmpl = etRes[0].data.totalCount;
    countUp('stat-templates', tmpl);
  }).fail(() => {
    $('#stat-campaigns, #stat-active, #stat-segments, #stat-templates').text('N/A');
  });
}

function countUp(id, target) {
  const $el = $('#' + id);
  const duration = 900;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    $el.text(formatNumber(Math.floor(current)));
    if (current >= target) clearInterval(timer);
  }, 16);
}

/* ── Performance Chart ── */
const performanceData = {
  labels: generateLast30DaysLabels(),
  sent: generateData(30, 400, 1200),
  opened: generateData(30, 120, 480),
  clicked: generateData(30, 30, 180)
};

function generateLast30DaysLabels() {
  const labels = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return labels;
}

function generateData(count, min, max) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min) + min));
}

function buildPerformanceChart() {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  perfChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: performanceData.labels,
      datasets: [{
        label: 'Emails Sent',
        data: performanceData.sent,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f1f5f9', borderColor: '#334155', borderWidth: 1, padding: 10, cornerRadius: 8 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 8, maxRotation: 0 } },
        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });
}

function updatePerformanceChart(metric) {
  const colors = { sent: '#3B82F6', opened: '#10B981', clicked: '#F59E0B' };
  const bgs = { sent: 'rgba(59,130,246,0.08)', opened: 'rgba(16,185,129,0.08)', clicked: 'rgba(245,158,11,0.08)' };
  perfChart.data.datasets[0].data = performanceData[metric];
  perfChart.data.datasets[0].borderColor = colors[metric];
  perfChart.data.datasets[0].backgroundColor = bgs[metric];
  perfChart.update('active');
}

/* ── Status Donut Chart ── */
function buildStatusChart() {
  const statuses = ['Active', 'Draft', 'Scheduled', 'Paused', 'Completed', 'Archived'];
  const values = [28, 35, 18, 8, 14, 7];
  const colors = ['#10B981', '#94a3b8', '#3B82F6', '#F59E0B', '#8B5CF6', '#CBD5E1'];

  const ctx = document.getElementById('statusChart').getContext('2d');
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: statuses, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1e293b', titleColor: '#94a3b8', bodyColor: '#f1f5f9', borderColor: '#334155', borderWidth: 1, padding: 10, cornerRadius: 8 }
      }
    }
  });

  const $legend = $('#donutLegend');
  statuses.forEach((s, i) => {
    $legend.append(`
      <div class="donut-legend-item">
        <span class="donut-legend-label"><span class="donut-legend-dot" style="background:${colors[i]}"></span>${s}</span>
        <span class="donut-legend-count">${values[i]}</span>
      </div>
    `);
  });
}

/* ── Calendar ── */
function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  $('#calMonthLabel').text(`${months[calMonth]} ${calYear}`);

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();

  const sampleEvents = {};
  const eventTypes = ['email', 'sms', 'push', 'social', 'multi'];
  const eventNames = ['Spring Sale', 'Welcome Email', 'Flash Deal', 'Push Alert', 'Newsletter', 'Reengagement', 'VIP Offer'];
  for (let i = 1; i <= daysInMonth; i++) {
    if (Math.random() > 0.65) {
      const count = Math.floor(Math.random() * 3) + 1;
      sampleEvents[i] = Array.from({length: count}, () => ({
        name: eventNames[Math.floor(Math.random() * eventNames.length)],
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)]
      }));
    }
  }

  const weekdayRow = weekdays.map(d => `<div class="calendar-weekday">${d}</div>`).join('');
  let daysHtml = '';

  for (let i = 0; i < firstDay; i++) daysHtml += `<div class="calendar-day other-month"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const events = sampleEvents[d] || [];
    const eventsHtml = events.slice(0, 2).map(e => `<span class="day-event-dot type-${e.type}" title="${e.name}">${e.name}</span>`).join('');
    const moreHtml = events.length > 2 ? `<span class="more-events">+${events.length - 2}</span>` : '';
    daysHtml += `
      <div class="calendar-day ${isToday ? 'today' : ''}">
        <span class="day-num">${d}</span>
        <div class="day-events">${eventsHtml}${moreHtml}</div>
      </div>`;
  }

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let i = firstDay + daysInMonth; i < totalCells; i++) daysHtml += `<div class="calendar-day other-month"></div>`;

  $('#calendarGrid').html(`<div class="calendar-weekdays">${weekdayRow}</div><div class="calendar-days">${daysHtml}</div>`);
}

/* ── Activity Feed ── */
function buildActivityFeed() {
  const activities = [
    { icon: 'fa-bullhorn', color: 'bg-primary-subtle text-primary', text: '<strong>Summer Sale 2025</strong> campaign was activated', time: '2 minutes ago' },
    { icon: 'fa-users', color: 'bg-purple-subtle text-purple', text: 'New segment <strong>Premium Users Q2</strong> created', time: '18 minutes ago' },
    { icon: 'fa-envelope', color: 'bg-warning-subtle text-warning', text: '<strong>Welcome Series v2</strong> template updated', time: '45 minutes ago' },
    { icon: 'fa-folder-plus', color: 'bg-success-subtle text-success', text: 'Folder <strong>Product Launch</strong> created', time: '2 hours ago' },
    { icon: 'fa-pause-circle', color: 'bg-warning-subtle text-warning', text: '<strong>Flash Sale Alert</strong> campaign paused', time: '3 hours ago' },
    { icon: 'fa-chart-bar', color: 'bg-primary-subtle text-primary', text: 'Weekly performance report generated', time: '5 hours ago' },
    { icon: 'fa-trash', color: 'bg-danger-subtle text-danger', text: '<strong>Old Newsletter Mar</strong> template archived', time: '1 day ago' },
    { icon: 'fa-check-circle', color: 'bg-success-subtle text-success', text: '<strong>Q1 Retention Drive</strong> completed successfully', time: '1 day ago' },
  ];

  const html = activities.map(a => `
    <div class="activity-item">
      <div class="activity-icon ${a.color}"><i class="fa-solid ${a.icon}"></i></div>
      <div class="flex-grow-1 min-w-0">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time"><i class="fa-regular fa-clock me-1"></i>${a.time}</div>
      </div>
    </div>
  `).join('');
  $('#activityFeed').html(html);
}
