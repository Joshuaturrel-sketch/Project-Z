import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export function getConfig() {
  if (!NOTION_TOKEN) throw new Error('Missing NOTION_TOKEN');
  if (!NOTION_DATABASE_ID) throw new Error('Missing NOTION_DATABASE_ID');
  return { NOTION_TOKEN, NOTION_DATABASE_ID };
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

  return {
    fetchedAt: new Date().toISOString(),
    databaseId: NOTION_DATABASE_ID,
    results
  };
}
