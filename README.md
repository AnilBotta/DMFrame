# DMFrame – Viral Video Research Agent

A single n8n workflow that finds the best-performing **public** short videos on Instagram, X (Twitter), LinkedIn and Facebook for a defined business, ranks them with metrics plus AI scoring, writes the results to Google Sheets and reports on Telegram.

Built for SyncAi Technologies. First test client: World Financial Group (WFG).

## What it does

1. **Input** – a client brief form (`/form/dmframe-brief`) or a weekly schedule (Mondays 7am) that re-runs every brief in the `dmframe_briefs` data table where `active = true`.
2. **Scrape** – Apify actors per platform (hashtag/keyword discovery and competitor profiles/pages).
3. **Normalise and filter** – videos only, last 30 days, per-platform minimum views, de-duplication across runs.
4. **Score** – metrics score (60%) plus AI score (40%) minus compliance penalty. See `docs/scoring.md`.
5. **Output**
   - Google Sheet `DMFrame`: `Results` (ranked top picks with AI notes) and one tab per platform (`Instagram`, `Facebook`, `LinkedIn`, `X (Twitter)`) with every scraped video and its status.
   - Telegram summary per run, and a failure alert if the workflow errors.
   - `dmframe_run_log` data table row per run.

## Repo layout

| Path | Contents |
|---|---|
| `workflows/dmframe-viral-video-research-agent.json` | Importable n8n workflow (44 nodes) |
| `code/` | The JavaScript from each Code node, for review and diffs |
| `prompts/` | AI scoring system prompt, user prompt template and JSON schema |
| `docs/` | Setup, scoring and known limitations |

The workflow JSON is the source of truth. The files in `code/` and `prompts/` are extracted copies. After editing them, paste the change back into the matching n8n node.

## Setup

See `docs/setup.md`. In short: import the workflow, attach credentials (Apify, OpenAI, Google Sheets, Telegram), create the two data tables, run the one-time setup branch once, publish.

## Status

Live-tested end to end on the WFG test brief: Instagram, X and LinkedIn return data; five ranked videos written to the sheet; Telegram summary delivered. See `docs/limitations.md` for what is not solved yet.

## Compliance note

Only public data is scraped, through Apify. Social platforms restrict automated collection in their terms of service. Review that risk before using this commercially. The AI step flags financial-advertising risks (income claims, guaranteed returns, unlicensed advice, misleading recruitment) because the first client is in financial services.
