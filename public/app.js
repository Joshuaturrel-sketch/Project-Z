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
  const body = document.getElementById('accounts-table');
  body.innerHTML = '';

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
    body.append(tr);
  }
}

function renderEquityChart(entries) {
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
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
        marker: { size: 6 }
      }
    ],
    {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 10, r: 20, b: 40, l: 50 },
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
  Plotly.newPlot(
    'account-chart',
    [
      {
        x: accounts.map(a => a.account),
        y: accounts.map(a => a.totalPnl),
        type: 'bar',
        marker: { color: '#1d4ed8' }
      }
    ],
    {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 10, r: 20, b: 80, l: 50 },
      xaxis: { automargin: true },
      yaxis: { title: 'Total P&L' }
    },
    {
      responsive: true,
      displayModeBar: false
    }
  );
}

async function init() {
  const response = await fetch('/api/data');
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API did not return JSON: ${text.slice(0, 120)}`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Could not load Project Z data');
  }

  document.getElementById('generated-at').textContent =
    `${data.meta.projectName} live sync ${new Date(data.meta.generatedAt).toLocaleString()}`;

  renderKpis(data.summary);
  renderAccountsTable(data.accounts);
  renderEquityChart(data.entries);
  renderAccountChart(data.accounts);
}
