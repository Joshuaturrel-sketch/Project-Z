function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function plainRichText(items = []) {
  return items.map(item => item?.plain_text || '').join('').trim();
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

function statusValue(prop) {
  return prop?.status?.name || null;
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

function peopleValue(prop) {
  return (prop?.people || []).map(person => person?.name || person?.id).filter(Boolean);
}

function filesValue(prop) {
  return (prop?.files || []).map(file => ({
    name: file?.name || null,
    type: file?.type || null,
    url: file?.file?.url || file?.external?.url || null
  }));
}

function relationValue(prop) {
  return (prop?.relation || []).map(item => item?.id).filter(Boolean);
}

function createdTimeValue(prop) {
  return prop?.created_time || null;
}

function lastEditedTimeValue(prop) {
  return prop?.last_edited_time || null;
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
    case 'status':
      return statusValue(prop);
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
    case 'people':
      return peopleValue(prop);
    case 'files':
      return filesValue(prop);
    case 'relation':
      return relationValue(prop);
    case 'created_time':
      return createdTimeValue(prop);
    case 'last_edited_time':
      return lastEditedTimeValue(prop);
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

function parseNumberOr(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function resolveAccountName(rawAccount, relationNameMap = {}) {
  if (Array.isArray(rawAccount) && rawAccount.length > 0) {
    const resolved = rawAccount
      .map(id => relationNameMap[id] || id)
      .filter(Boolean)
      .join(', ');
    return resolved || 'Unassigned';
  }

  if (typeof rawAccount === 'string' && relationNameMap[rawAccount]) {
    return relationNameMap[rawAccount];
  }

  return rawAccount || 'Unassigned';
}

function parsePage(page, relationNameMap = {}) {
  const source = {};
  for (const [name, prop] of Object.entries(page.properties || {})) {
    source[name] = propertyValue(prop);
  }

  const normalized = normalizeKeys(source);

  const rawAccount =
    pickFirst(normalized, [
      'account',
      'trading-account',
      'account-name',
      'broker-account'
    ]) || 'Unassigned';

  const account = resolveAccountName(rawAccount, relationNameMap);

  const date =
    pickFirst(normalized, [
      'date',
      'day',
      'trading-date',
      'session-date',
      'created'
    ]) || page.created_time || null;

  const pnl =
    pickFirst(normalized, [
      'daily-p-l',
      'daily-pnl',
      'p-l',
      'pnl',
      'net-pnl',
      'profit-loss',
      'profit',
      'total-profit'
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
    pnl: parseNumberOr(pnl, 0),
    trades: parseNumberOr(trades, 0),
    equity: parseNumberOr(equity, null),
    bestTrade: parseNumberOr(bestTrade, null),
    losses: parseNumberOr(losses, 0),
    maxDrawdown: parseNumberOr(maxDrawdown, null),
    winRate: parseNumberOr(winRate, null),
    wins: parseNumberOr(wins, 0),
    worstTrade: parseNumberOr(worstTrade, null),
    balance: parseNumberOr(balance, null),
    symbol,
    setup,
    notes,
    fields: source
  };
}

export function transformDatabase(raw) {
  const relationNameMap = raw.relationNameMap || {};

  const entries = (raw.results || [])
    .map(page => parsePage(page, relationNameMap))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const byAccountMap = new Map();

  for (const entry of entries) {
    const existing = byAccountMap.get(entry.account) || {
      account: entry.account,
      accountSlug: entry.accountSlug,
      totalPnl: 0,
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      tradeCount: 0,
      latestBalance: null,
      latestEquity: null,
      entries: []
    };

    existing.totalPnl += entry.pnl || 0;
    existing.totalTrades += entry.trades || 0;
    existing.totalWins += entry.wins || 0;
    existing.totalLosses += entry.losses || 0;
    existing.tradeCount += 1;
    existing.latestBalance = entry.balance ?? existing.latestBalance;
    existing.latestEquity = entry.equity ?? existing.latestEquity;
    existing.entries.push(entry);

    byAccountMap.set(entry.account, existing);
  }

  const accounts = Array.from(byAccountMap.values())
    .map(account => ({
      ...account,
      averagePnl: account.tradeCount ? account.totalPnl / account.tradeCount : 0,
      averageTrades: account.tradeCount ? account.totalTrades / account.tradeCount : 0,
      winRate:
        account.totalWins + account.totalLosses > 0
          ? (account.totalWins / (account.totalWins + account.totalLosses)) * 100
          : null
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl);

  const bestTradeValue = entries.reduce((max, entry) => {
    const value = entry.bestTrade ?? -Infinity;
    return value > max ? value : max;
  }, -Infinity);

  const worstTradeValue = entries.reduce((min, entry) => {
    const value = entry.worstTrade ?? Infinity;
    return value < min ? value : min;
  }, Infinity);

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
      totalTrades: entries.reduce((sum, entry) => sum + (entry.trades || 0), 0),
      totalWins: entries.reduce((sum, entry) => sum + (entry.wins || 0), 0),
      totalLosses: entries.reduce((sum, entry) => sum + (entry.losses || 0), 0),
      averageWinRate:
        entries.reduce((sum, entry) => sum + ((entry.wins || 0) + (entry.losses || 0)), 0) > 0
          ? (
              entries.reduce((sum, entry) => sum + (entry.wins || 0), 0) /
              entries.reduce((sum, entry) => sum + ((entry.wins || 0) + (entry.losses || 0)), 0)
            ) * 100
          : null,
      winDays: entries.filter(entry => (entry.pnl || 0) > 0).length,
      lossDays: entries.filter(entry => (entry.pnl || 0) < 0).length,
      flatDays: entries.filter(entry => (entry.pnl || 0) === 0).length,
      bestTrade: bestTradeValue === -Infinity ? null : bestTradeValue,
      worstTrade: worstTradeValue === Infinity ? null : worstTradeValue,
      latestBalance: entries.length ? entries[entries.length - 1].balance ?? null : null,
      latestEquity: entries.length ? entries[entries.length - 1].equity ?? null : null
    },
    accounts,
    entries
  };
}
