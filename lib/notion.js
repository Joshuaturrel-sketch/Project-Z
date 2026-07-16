import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export function getConfig() {
  if (!NOTION_TOKEN) throw new Error('Missing NOTION_TOKEN');
  if (!NOTION_DATABASE_ID) throw new Error('Missing NOTION_DATABASE_ID');
  return { NOTION_TOKEN, NOTION_DATABASE_ID };
}

function extractTitleFromProperties(properties = {}) {
  for (const prop of Object.values(properties)) {
    if (prop?.type === 'title') {
      return (prop.title || []).map(item => item.plain_text || '').join('').trim();
    }
  }
  return null;
}

async function fetchPageTitle(notion, pageId) {
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    return extractTitleFromProperties(page.properties) || pageId;
  } catch {
    return pageId;
  }
}

async function resolveRelationNames(notion, results) {
  const relationIds = new Set();

  for (const page of results) {
    for (const prop of Object.values(page.properties || {})) {
      if (prop?.type === 'relation') {
        for (const rel of prop.relation || []) {
          if (rel?.id) relationIds.add(rel.id);
        }
      }
    }
  }

  const relationNameMap = {};

  await Promise.all(
    [...relationIds].map(async id => {
      relationNameMap[id] = await fetchPageTitle(notion, id);
    })
  );

  return relationNameMap;
}

export async function fetchDatabaseRows() {
  const { NOTION_TOKEN, NOTION_DATABASE_ID } = getConfig();
  const notion = new Client({ auth: NOTION_TOKEN });
  const results = [];
  let cursor = undefined;

  while (true) {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100
    });

    results.push(...response.results);

    if (!response.has_more || !response.next_cursor) break;
    cursor = response.next_cursor;
  }

  const relationNameMap = await resolveRelationNames(notion, results);

  return {
    fetchedAt: new Date().toISOString(),
    databaseId: NOTION_DATABASE_ID,
    relationNameMap,
    results
  };
}
