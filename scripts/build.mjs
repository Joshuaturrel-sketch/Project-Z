import fs from 'fs';

const rows = JSON.parse(fs.readFileSync('data/notion-cache.json', 'utf8'));
rows.sort((a,b)=>new Date(a.date)-new Date(b.date));
const byAccount = {};
for (const r of rows) (byAccount[r.account] ??= []).push(r);

const totals = Object.entries(byAccount).map(([account, arr]) => ({
  account,
  pnl: arr.reduce((s, r) => s + (+r.pnl || 0), 0),
  balance: arr.at(-1)?.balance ?? null,
  drawdown: Math.max(...arr.map(r => +r.drawdown || 0)),
  best_trade: Math.max(...arr.map(r => +r.best_trade || -Infinity)),
  worst_trade: Math.min(...arr.map(r => +r.worst_trade || Infinity)),
})).sort((a,b)=>b.pnl-a.pnl);

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/data.json', JSON.stringify({ rows, byAccount, totals }, null, 2));
console.log('Wrote public/data.json');
