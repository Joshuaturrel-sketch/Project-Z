# Project Z

Cloud-only Vercel dashboard for Project Z.

## Architecture

- `public/index.html` renders the dashboard UI
- `public/app.js` fetches live data from `/api/data`
- `api/data.js` queries the Notion Daily Log database on demand
- `lib/notion.js` handles Notion API access
- `lib/transform.js` normalizes Notion pages into dashboard-friendly JSON

## Required environment variables

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

## Deploy

1. Push this project to GitHub.
2. Import it into Vercel.
3. Set Framework Preset to `Other`.
4. Add `NOTION_TOKEN` and `NOTION_DATABASE_ID` in Vercel Project Settings.
5. Deploy.

## Behavior

Every dashboard page load requests `/api/data`. That Vercel Function fetches the current rows from Notion and returns transformed JSON to the browser.
