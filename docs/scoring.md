# Scoring

Final score = 0.6 x metrics score + 0.4 x AI score - compliance penalty.

## Metrics score (0-100)
Each video is ranked against the other videos from the same platform in the same run (percentile). Platforms with fewer than 5 videos fall back to a log scale.

| Signal | Weight | Definition |
|---|---|---|
| Velocity | 0.40 | views per day since posting |
| Engagement | 0.25 | (likes + 2 x comments + 3 x shares) / views |
| Leverage | 0.20 | views / follower count |
| Recency | 0.15 | 1.0 within 7 days, 0.6 within 14, 0.3 after |

Missing signals are skipped and the remaining weights rescaled. `confidence` in the sheet is the share of weight actually used. LinkedIn has no view counts, so velocity uses an interaction-based estimate.

## AI score (0-100)
`10 x (0.45 relevance + 0.30 hook + 0.25 quality) + 5 if a call to action is present`, capped at 100. Videos with relevance below 5 are dropped. The model also returns content format, why it works, how to replicate it, risk flags and compliance flags (`prompts/`).

## Compliance penalty
15 points per compliance flag, capped at 45.

## Use downstream
The ranked rows (format, hook, why it works, how to replicate, flags) are the input for a content-creation step. Treat the score as a ranking inside one run, not an absolute prediction.
