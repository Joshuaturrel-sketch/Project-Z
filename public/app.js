const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatMoney(value) {
  return currency.format(Number(value || 0));
}

function renderKpis(summary) {
  const kpis = document.getElementById('kpis');
  const items = [
    ['Total P&L', formatMoney(summary.totalPnl)],
    ['Entries', String(summary.totalEntries)],
    ['Winning Days', String(summary.winDays)],
    ['Losing Days', String(summary.lossDays)]
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
  const table = document.getElementById('accounts-table');
  if (!table) return;
  table.innerHTML = '';

  for (const account of accounts) {
    const tr = document.createElement('tr');
    [
      account.account,
      String(account.tradeCount),
      formatMoney(account.totalPnl),
      formatMoney(account.averagePnl)
    ].forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    });
    table.append(tr);
  }
}

function renderEquityChart(entries) {
  if (!window.Plotly) throw new Error('Plotly did not load');

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const x = [];
  const y = [];

  for (const row of sorted) {
    running += Number(row.pnl || 0);
    x.push(row.date || row.createdTime);
    y.push(running);
  }

  Plotly.newPlot('equity-chart', [{
    x,
    y,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#0f766e', width: 3 },
    marker: { size: 6 }
  }], {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { t: 10, r: 20, b: 40, l: 50 },
    xaxis: { title: 'Date' },
    yaxis: { title: 'Cumulative P&L' }
  }, {
    responsive: true,
    displayModeBar: false
  });
}

function renderAccountChart(accounts) {
  if (!window.Plotly) throw new Error('Plotly did not load');

  Plotly.newPlot('account-chart', [{
    x: accounts.map(a => a.account),
    y: accounts.map(a => a.totalPnl),
    type: 'bar',
    marker: { color: '#1d4ed8' }
  }], {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    margin: { t: 10, r: 20, b: 80, l: 50 },
    xaxis: { automargin: true },
    yaxis: { title: 'Total P&L' }
  }, {
    responsive: true,
    displayModeBar: false
  });
}

async function init() {
  const status = document.getElementById('generated-at');

  try {
    status.textContent = 'Fetching /api/data...';

    const response = await fetch('/api/data');
    const rawText = await response.text();

    status.textContent = `API status: ${response.status}`;

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`API did not return JSON: ${rawText.slice(0, 160)}`);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Could not load Project Z data');
    }

    status.textContent = `${data.meta.projectName} live sync ${new Date(data.meta.generatedAt).toLocaleString()}`;

    renderKpis(data.summary);
    renderAccountsTable(data.accounts || []);
    renderEquityChart(data.entries || []);
    renderAccountChart(data.accounts || []);
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    console.error(error);
  }
}

window.addEventListener('load', init);
