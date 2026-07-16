function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function plainRichText(items = []) {
  return items.map(item => item.plain_text || '').join('').trim();
}

function titleValue(prop) {
  return plainRichText(prop?.title || []);
}

function richTextValue(prop) {
  return plainRichText(prop?.rich_text || []);
}

function numberValue(prop) {
  return typeof prop?.number === 'number' ? prop.number : null;
}

function selectValue(prop) {
  return prop?.select?.name || null;
}

function multiSelectValue(prop) {
  return (prop?.multi_select || []).map(item => item.name);
}

function dateValue(prop) {
  return prop?.date?.start || null;
}

function checkboxValue(prop) {
  return typeof prop?.checkbox === 'boolean' ? prop.checkbox : null;
}

function urlValue(prop) {
  return prop?.url || null;
}

function emailValue(prop) {
  return prop?.email || null;
}

function phoneValue(prop) {
  return prop?.phone_number || null;
}

function formulaValue(prop) {
  const formula = prop?.formula;
  if (!formula) return null;
  return formula.string ?? formula.number ?? formula.boolean ?? formula.date?.start ?? null;
}

function propertyValue(prop) {
  switch (prop?.type) {
    case 'title':
      return titleValue(prop);
    case 'rich_text':
      return richTextValue(prop);
    case 'number':
      return numberValue(prop);
    case 'select':
      return selectValue(prop);
    case 'multi_select':
      return multiSelectValue(prop);
    case 'date':
      return dateValue(prop);
    case 'checkbox':
      return checkboxValue(prop);
    case 'url':
      return urlValue(prop);
    case 'email':
      return emailValue(prop);
    case 'phone_number':
      return phoneValue(prop);
    case 'formula':
      return formulaValue(prop);
    default:
      return null;
  }
}

function normalizeKeys(properties) {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [slugify(key), value])
  );
}

function pickFirst(record, keys) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

function parsePage(page) {
  const source = {};
  for (const [name, prop] of Object.entries(page.properties || {})) {
    source[name] = propertyValue(prop);
  }

  const normalized = normalizeKeys(source);

  const account =
    pickFirst(normalized, ['account', 'trading-account', 'account-name', 'broker-account']) ||
    'Unassigned';

  const date =
    pickFirst(normalized, ['date', 'day', 'trading-date', 'session-date', 'created']) ||
    page.created_time ||
    null;

  const pnl =
    pickFirst(normalized, [
      'daily-p-l',
      'daily-pnl',
      'p-l',
      'pnl',
      'net-pnl',
      'profit-loss',
      'profit'
    ]) ?? 0;

  const trades = pickFirst(normalized, ['trades']) ?? 0;
  const equity = pickFirst(normalized, ['equity']) ?? null;
  const bestTrade = pickFirst(normalized, ['best-trade']) ?? null;
  const losses = pickFirst(normalized, ['losses']) ?? 0;
  const maxDrawdown = pickFirst(normalized, ['max-drawdown']) ?? null;
  const winRate = pickFirst(normalized, ['win-rate']) ?? null;
  const wins = pickFirst(normalized, ['wins']) ?? 0;
  const worstTrade = pickFirst(normalized, ['worst-trade']) ?? null;
  const balance = pickFirst(normalized, ['balance']) ?? null;
  const symbol = pickFirst(normalized, ['symbol', 'ticker', 'pair', 'market']) || null;
  const setup = pickFirst(normalized, ['setup', 'playbook', 'strategy', 'model']) || null;
  const notes =
    pickFirst(normalized, ['notes', 'journal', 'comment', 'comments', 'description']) || null;

  return {
    id: page.id,
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
    account,
    accountSlug: slugify(account || 'unassigned'),
    date,
    pnl: typeof pnl === 'number' ? pnl : Number(pnl) || 0,
    trades: typeof trades === 'number' ? trades : Number(trades) || 0,
    equity: typeof equity === 'number' ? equity : Number(equity) || null,
    bestTrade: typeof bestTrade === 'number' ? bestTrade : Number(bestTrade) || null,
    losses: typeof losses === 'number' ? losses : Number(losses) || 0,
    maxDrawdown: typeof maxDrawdown === 'number' ? maxDrawdown : Number(maxDrawdown) || null,
    winRate: typeof winRate === 'number' ? winRate : Number(winRate) || null,
    wins: typeof wins === 'number' ? wins : Number(wins) || 0,
    worstTrade: typeof worstTrade === 'number' ? worstTrade : Number(worstTrade) || null,
    balance: typeof balance === 'number' ? balance : Number(balance) || null,
    symbol,
    setup,
    notes,
    fields: source
  };
}
