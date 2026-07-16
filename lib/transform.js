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
    pickFirst(normalized, ['p-l', 'pnl', 'net-pnl', 'profit-loss', 'profit', 'daily-pnl']) ?? 0;

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
    symbol,
    setup,
    notes,
    fields: source
  };
}

export function transformDatabase(raw) {
  const entries = (raw.results || [])
    .map(parsePage)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const byAccountMap = new Map();

  for (const entry of entries) {
    const existing = byAccountMap.get(entry.account) || {
      account: entry.account,
      accountSlug: entry.accountSlug,
      totalPnl: 0,
      tradeCount: 0,
      entries: []
    };

    existing.totalPnl += entry.pnl || 0;
    existing.tradeCount += 1;
    existing.entries.push(entry);

    byAccountMap.set(entry.account, existing);
  }

  const accounts = Array.from(byAccountMap.values())
    .map(account => ({
      ...account,
      averagePnl: account.tradeCount ? account.totalPnl / account.tradeCount : 0
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceFetchedAt: raw.fetchedAt,
      databaseId: raw.databaseId,
      totalEntries: entries.length,
      totalAccounts: accounts.length,
      live: true,
      projectName: 'Project Z'
    },
    summary: {
      totalPnl: entries.reduce((sum, entry) => sum + (entry.pnl || 0), 0),
      totalEntries: entries.length,
      winDays: entries.filter(entry => (entry.pnl || 0) > 0).length,
      lossDays: entries.filter(entry => (entry.pnl || 0) < 0).length,
      flatDays: entries.filter(entry => (entry.pnl || 0) === 0).length
    },
    accounts,
    entries
  };
}
