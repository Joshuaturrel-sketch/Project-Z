import fs from 'fs';
import { Client } from '@notionhq/client';

const token = process.env.NOTION_TOKEN;
const databaseId = process.env.NOTION_DATABASE_ID;
if (!token || !databaseId) throw new Error('Missing NOTION_TOKEN or NOTION_DATABASE_ID');

const notion = new Client({ auth: token });
const rows = [];
let cursor;

while (true) {
  const res = await notion.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor });
  rows.push(...res.results);
  if (!res.has_more) break;
  cursor = res.next_cursor;
}

const text = prop => (prop?.title || prop?.rich_text || []).map(x => x.plain_text).join('');
const num = prop => (typeof prop?.number === 'number' ? prop.number : null);
const sel = prop => prop?.select?.name || prop?.status?.name || (prop?.multi_select || []).map(x => x.name).join('|') || '';
const dt = prop => prop?.date?.start || '';

const data = rows.map(page => {
  const p = page.properties || {};
  return {
    id: page.id,
    date: dt(p.Date),
    account: sel(p.Account),
    pnl: num(p['Daily P&L (€)']),
    balance: num(p.Balance),
    equity: num(p.Equity),
    drawdown: num(p['Max Drawdown (%)']),
    best_trade: num(p['Best Trade (€)']),
    worst_trade: num(p['Worst Trade (€)']),
    trades: num(p.Trades),
    wins: num(p.Wins),
    losses: num(p.Losses),
    win_rate: num(p['Win Rate (%)']),
    notes: text(p.Notes || p.Name || p.Title),
  };
}).filter(r => r.date && r.account);

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/notion-cache.json', JSON.stringify(data, null, 2));
console.log(`Fetched ${data.length} rows`);
