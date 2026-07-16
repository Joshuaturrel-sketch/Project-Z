import { fetchDatabaseRows } from '../lib/notion.js';
import { transformDatabase } from '../lib/transform.js';

export default async function handler(req, res) {
  try {
    const raw = await fetchDatabaseRows();
    const data = transformDatabase(raw);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Failed to load Project Z data',
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
