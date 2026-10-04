# Setup

## 1. Import
In n8n: Workflows > Import from file > `workflows/dmframe-viral-video-research-agent.json`.

## 2. Credentials (re-select after import, IDs are instance-specific)
| Node group | Credential type | Used by |
|---|---|---|
| Scrape * (Apify) | Apify API | four Apify nodes |
| AI Score Video | OpenAI API | model `gpt-5.6-luna` (change in the node if unavailable) |
| Google Sheets nodes | Google Sheets OAuth2 | Save To Results Sheet, Save * Videos, Create Results Spreadsheet |
| Telegram nodes | Telegram API (bot `syncaidm_bot`) | Send Telegram Summary, Send Sheet Link, Send Failure Alert |

Apify actor IDs (internal IDs, the slug form is rejected by the node):

| Platform | Actor | ID |
|---|---|---|
| Instagram | apify/instagram-scraper | `shu8hvrXbJbY3Eb9W` |
| Facebook | apify/facebook-posts-scraper | `KoJrdxJCTtpon81KY` |
| X | apidojo/tweet-scraper (V2) | `61RPP7dywgiy0JPD0` |
| LinkedIn | harvestapi/linkedin-post-search | `buIWk2uOUzTmcLsuB` |

## 3. Data tables
Create two n8n data tables:
- `dmframe_briefs`: client_name, business_description, industry, target_audience, location, language, keywords, hashtags, competitor_urls, platforms, content_goal, brand_tone, min_views_override, max_results, active (boolean), submitted_at
- `dmframe_run_log`: run_id, run_date, client_name, platforms_requested, platforms_with_data, candidates_found, videos_kept, top_urls, status

Re-select them in the `Save Raw Brief`, `Get Active Briefs` and `Log Run` nodes.

## 4. Sheet and Telegram
- Run the `One-Time Setup: Create Results Sheet` trigger once. It creates the `DMFrame` spreadsheet with all five tabs and sends the link to Telegram. Then point every Google Sheets node at the new document ID (the current ID is `1lgyPCEZl_AZwlkwktGX3SyyhtRyN3rdFvB7NrkdTD0M`).
- Set the Telegram chat ID in the three Telegram nodes (currently `7095384890`).

## 5. Publish
Publish the workflow. The weekly schedule and the failure alert only run on a published workflow. Submit a brief at `/form/dmframe-brief` to test.

## Tuning
All thresholds and weights are in the `cfg` object at the top of `code/build-run-plan.js` (30-day window, minimum views per platform, score weights, minimum AI relevance, compliance penalty).
