const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const numberFmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return currency.format(Number(value));
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return numberFmt.format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${numberFmt.format(Number(value))}%`;
}

function setStatus(text) {
  const target = document.getElementById('generated-at');
  if (target) target.textContent = text;
}

function renderEmptyChart(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:320px;color:#64748b;font-size:14px;">${message}</div>`;
}

function renderKpis(summary) {
  const kpis = document.getElementById('kpis');
  if (!kpis) return;

  const items = [
    ['Total P&L', formatMoney(summary.totalPnl)],
    ['Entries', formatNumber(summary.totalEntries)],
    ['Total Trades', formatNumber(summary.totalTrades)],
    ['Total Wins', formatNumber(summary.totalWins)],
    ['Total Losses', formatNumber(summary.totalLosses)],
    ['Avg Win Rate', formatPercent(summary.averageWinRate)],
    ['Latest Balance', formatMoney(summary.latestBalance)],
    ['Latest Equity', formatMoney(summary.latestEquity)]
  ];

  kpis.innerHTML = '';

  for (const [label, value] of items) {
    const card = el('article', 'kpi');
    card.append(el('span', 'kpi-label', label));
    card.append(el('strong', 'kpi-value', value));
    kpis.append(card);
  }
}

function renderAccountsTable(accounts) {
  const body = document.getElementById('accounts-table');
  if (!body) return;

  body.innerHTML = '';

  for (const account of accounts) {
    const tr = document.createElement('tr');

    const values = [
      account.account,
      formatNumber(account.tradeCount),
      formatNumber(account.totalTrades),
      formatMoney(account.totalPnl),
      formatMoney(account.averagePnl),
      formatPercent(account.winRate),
      formatMoney(account.latestBalance),
      formatMoney(account.latestEquity)
    ];

    values.forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    });

    body.append(tr);
  }
}

function renderEquityChart(entries) {
  if (!window.Plotly) throw new Error('Plotly did not load');

  const sorted = [...entries]
    .filter(entry => entry.date || entry.createdTime)
    .sort((a, b) => new Date(a.date || a.createdTime) - new Date(b.date || b.createdTime));

  if (!sorted.length) {
    renderEmptyChart('equity-chart', 'No dated entries available for the cumulative P&L chart.');
    return;
  }

  let running = 0;
  const x = [];
  const y = [];

  for (const row of sorted) {
    running += Number(row.pnl || 0);
    x.push(row.date || row.createdTime);
    y.push(running);
  }

  Plotly.newPlot(
    'equity-chart',
    [
      {
        x,
        y,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#0f766e', width: 3 },
        marker: { size: 6 },
        hovertemplate: '%{x}<br>Cumulative P&L: %{y:.2f}<extra></extra>'
      }
    ],
    {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 10, r: 20, b: 40, l: 60 },
      xaxis: { title: 'Date' },
      yaxis: { title: 'Cumulative P&L' }
    },
    {
      responsive: true,
      displayModeBar: false
    }
  );
}

function renderAccountChart(accounts) {
  if (!window.Plotly) throw new Error('Plotly did not load');

  if (!accounts.length) {
    renderEmptyChart('account-chart', 'No account data available.');
    return;
  }

  Plotly.newPlot(
    'account-chart',
    [
      {
        x: accounts.map(a => a.account),
        y: accounts.map(a => Number(a.totalPnl || 0)),
        type: 'bar',
        marker: {
          color: accounts.map(a => Number(a.totalPnl || 0) >= 0 ? '#0f766e' : '#b91c1c')
        },
        hovertemplate: '%{x}<br>Total P&L: %{y:.2f}<extra></extra>'
      }
    ],
    {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 10, r: 20, b: 80, l: 60 },
      xaxis: { automargin: true, title: 'Account' },
      yaxis: { title: 'Total P&L' }
    },
    {
      responsive: true,
      displayModeBar: false
    }
  );
}

async function fetchApiData() {
  const response = await fetch('/api/data');
  const rawText = await response.text();

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`API did not return JSON: ${rawText.slice(0, 160)}`);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Could not load Project Z data');
  }

  return data;
}

async function init() {
  try {
    setStatus('Fetching live data...');

    const data = await fetchApiData();

    setStatus(
      `${data.meta.projectName} live sync ${new Date(data.meta.generatedAt).toLocaleString()}`
    );

    renderKpis(data.summary || {});
    renderAccountsTable(data.accounts || []);
    renderEquityChart(data.entries || []);
    renderAccountChart(data.accounts || []);
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`);
    renderEmptyChart('equity-chart', 'Could not load chart data.');
    renderEmptyChart('account-chart', 'Could not load account chart.');
  }
}

window.addEventListener('load', init);
