# Known limitations

- **Facebook** only runs when the brief has competitor page URLs. Hashtag pages return nothing.
- **X** results are flaky: the Apify actor sometimes returns no results for a run.
- **Followers** are empty for Instagram and LinkedIn, which weakens the leverage signal. A profile-lookup step would fix this.
- **Instagram** sometimes reports hidden likes as `-1`. Not yet normalised.
- **Duplicate suppression** (`$getWorkflowStaticData`) only persists on published (production) runs, not manual test runs.
- **Platform terms of service** restrict automated collection. Apify absorbs the scraping risk but not the policy risk.
- Some AI-recommended videos are only loosely on topic in a small niche. Raise `minRelevance` in `code/build-run-plan.js` to be stricter.
