const plan = $('Build Run Plan').first().json;
const cfg = plan.config;
const brief = plan.brief;
const requested = $('Build Run Plan').all().map((i) => i.json.platform);
const all = $input.all().map((i) => i.json);
const errs = {};
const raw = [];
for (const r of all) {
  if (!r) continue;
  if (r.error || r.noResults) { errs[r._platform] = (errs[r._platform] || 0) + 1; continue; }
  raw.push(r);
}
const num = (...vals) => { for (const v of vals) { if (v === undefined || v === null || v === '') continue; const x = typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : Number(v); if (Number.isFinite(x)) return x; } return null; };
const when = (...vals) => { for (const v of vals) { if (!v) continue; const t = typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v); if (Number.isFinite(t)) return new Date(t).toISOString(); } return null; };
const first = (...vals) => { for (const v of vals) { if (v !== undefined && v !== null && v !== '') return v; } return null; };
const norm = {
  instagram: (r) => ({
    url: first(r.url, r.shortCode ? 'https://www.instagram.com/reel/' + r.shortCode + '/' : null),
    is_video: r.type === 'Video' || r.productType === 'clips' || !!r.videoUrl,
    views: num(r.videoPlayCount, r.videoViewCount, r.playsCount),
    likes: num(r.likesCount), comments: num(r.commentsCount), shares: null,
    posted_at: when(r.timestamp, r.takenAtTimestamp),
    creator: first(r.ownerUsername, r.ownerFullName),
    followers: num(r.ownerFollowersCount, r.followersCount),
    caption: first(r.caption), duration: num(r.videoDuration)
  }),
  facebook: (r) => ({
    url: first(r.url, r.postUrl, r.topLevelUrl),
    is_video: !!(r.isVideo || r.videoUrl || r.video || (r.media && r.media.some && r.media.some((m) => /video/i.test(String(m.__typename || m.type || ''))))),
    views: num(r.viewsCount, r.videoViewCount, r.playCount, r.views),
    likes: num(r.likes, r.likesCount, r.reactionsCount), comments: num(r.comments, r.commentsCount), shares: num(r.shares, r.sharesCount),
    posted_at: when(r.time, r.timestamp, r.date),
    creator: first(r.pageName, r.user && r.user.name),
    followers: num(r.pageFollowers, r.followers),
    caption: first(r.text, r.message), duration: num(r.videoDuration)
  }),
  x: (r) => {
    const media = (r.extendedEntities && r.extendedEntities.media) || r.media || [];
    return {
      url: first(r.url, r.twitterUrl),
      is_video: !!(r.hasVideo || (media.some && media.some((m) => m.type === 'video' || m.type === 'animated_gif'))),
      views: num(r.viewCount, r.views), likes: num(r.likeCount), comments: num(r.replyCount),
      shares: (num(r.retweetCount) || 0) + (num(r.quoteCount) || 0),
      posted_at: when(r.createdAt),
      creator: first(r.author && r.author.userName, r.author && r.author.username),
      followers: num(r.author && r.author.followers, r.author && r.author.followersCount),
      caption: first(r.fullText, r.text), duration: null
    };
  },
  linkedin: (r) => ({
    url: first(r.linkedinUrl, r.url, r.postUrl),
    is_video: !!(r.postVideo || r.video || r.videoUrl),
    views: num(r.viewsCount, r.views, r.engagement && r.engagement.views),
    likes: num(r.engagement && r.engagement.likes, r.likes, r.numLikes),
    comments: num(r.engagement && r.engagement.comments, r.comments, r.numComments),
    shares: num(r.engagement && r.engagement.shares, r.shares, r.numShares),
    posted_at: when(r.postedAt && r.postedAt.timestamp, r.postedAt && r.postedAt.date, r.postedAt, r.time),
    creator: first(r.author && r.author.name),
    followers: num(r.author && r.author.followers, r.author && r.author.followersCount),
    caption: first(r.content, r.text), duration: null
  })
};
const store = $getWorkflowStaticData('global');
const seen = store.seen || {};
const now = Date.now();
const counts = {};
const keys = {};
const pool = [];
const scraped = [];
const scrapedKeys = {};
const tabOf = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X (Twitter)' };
for (const r of raw) {
  const p = r._platform;
  counts[p] = (counts[p] || 0) + 1;
  const fn = norm[p];
  if (!fn) continue;
  const v = fn(r);
  if (!v.url || !v.is_video) continue;
  v.url = p === 'facebook' ? String(v.url) : String(v.url).replace(/[?#].*$/, '');
  const ageDays = v.posted_at ? (now - Date.parse(v.posted_at)) / 86400000 : null;
  const srow = {
    tab: tabOf[p] || p, run_id: plan.run_id, run_date: plan.run_date, client_name: brief.client_name, platform: p, post_url: v.url,
    creator: v.creator || '', followers: v.followers === null ? '' : v.followers, views: v.views === null ? '' : v.views,
    likes: v.likes === null ? '' : v.likes, comments: v.comments === null ? '' : v.comments, shares: v.shares === null ? '' : v.shares,
    posted_at: v.posted_at || '', status: 'candidate', metrics_score: '', caption_preview: String(v.caption || '').slice(0, 200)
  };
  const sk = p + '|' + v.url;
  if (!scrapedKeys[sk]) { scrapedKeys[sk] = true; scraped.push(srow); }
  if (ageDays !== null && ageDays > cfg.maxAgeDays) { srow.status = 'too_old'; continue; }
  const interactions = (v.likes || 0) + (v.comments || 0) * 2 + (v.shares || 0) * 3;
  const minViews = brief.min_views_override || cfg.minViews[p];
  if (v.views !== null) { if (v.views < minViews) { srow.status = 'below_min_views'; continue; } } else if (interactions < cfg.fallbackMinInteractions) { srow.status = 'below_min_engagement'; continue; }
  const key = brief.client_name.toLowerCase() + '|' + v.url;
  if (keys[key] || seen[key]) { srow.status = 'already_seen'; continue; }
  keys[key] = true;
  const days = Math.max(ageDays === null ? 14 : ageDays, 1);
  v.platform = p;
  v._srow = srow;
  v.interactions = interactions;
  v.velocity = v.views !== null ? v.views / days : (interactions * 10) / days;
  v.engagement_rate = v.views ? interactions / v.views : (v.followers ? interactions / v.followers : null);
  v.leverage = (v.views !== null && v.followers) ? v.views / v.followers : null;
  v.recency = days <= 7 ? 1 : (days <= 14 ? 0.6 : 0.3);
  v.views_estimated = v.views === null;
  pool.push(v);
}
const pct = (list, x) => { if (x === null || x === undefined || list.length < 5) return null; let c = 0; for (const y of list) { if (y <= x) c++; } return c / list.length; };
const logScale = (x, cap) => (x === null || x === undefined) ? null : Math.min(Math.log10(x + 1) / cap, 1);
const pick = (a, b) => (a !== null ? a : b);
for (const c of pool) {
  const grp = pool.filter((z) => z.platform === c.platform);
  const parts = {
    velocity: pick(pct(grp.map((z) => z.velocity), c.velocity), logScale(c.velocity, 5)),
    engagement: pick(pct(grp.filter((z) => z.engagement_rate !== null).map((z) => z.engagement_rate), c.engagement_rate), c.engagement_rate === null ? null : Math.min(c.engagement_rate / 0.1, 1)),
    leverage: pick(pct(grp.filter((z) => z.leverage !== null).map((z) => z.leverage), c.leverage), logScale(c.leverage, 3)),
    recency: c.recency
  };
  let tot = 0; let acc = 0;
  for (const k of Object.keys(cfg.weights)) { const s = parts[k]; if (s !== null && s !== undefined) { tot += cfg.weights[k]; acc += cfg.weights[k] * s; } }
  c.metrics_score = tot > 0 ? Math.round((acc / tot) * 1000) / 10 : 0;
  c.confidence = Math.round(tot * 100) / 100;
  if (c._srow) { c._srow.metrics_score = c.metrics_score; }
}
pool.sort((a, b) => b.metrics_score - a.metrics_score);
const ctx = {
  run_id: plan.run_id, run_date: plan.run_date, client_name: brief.client_name,
  business_description: brief.business_description, industry: brief.industry,
  target_audience: brief.target_audience, location: brief.location, language: brief.language,
  content_goal: brief.content_goal, brand_tone: brief.brand_tone, max_results: brief.max_results
};
const candidates = pool.slice(0, cfg.aiCandidates).map((c) => { c.ctx = ctx; delete c._srow; return c; });
for (const c of pool.slice(cfg.aiCandidates)) { if (c._srow) c._srow.status = 'not_ai_scored'; }
const withData = Object.keys(counts);
const withErrors = Object.keys(errs);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const note = 'No new qualifying videos for ' + brief.client_name + ' (' + plan.run_id + '). Platforms with data: ' + (withData.join(', ') || 'none') + '. Platforms with errors/blocked: ' + (withErrors.join(', ') || 'none') + '. Requested: ' + requested.join(', ') + '.';
return [{ json: {
  run_id: plan.run_id, run_date: plan.run_date, client_name: brief.client_name,
  platforms_requested: requested.join(', '), platforms_with_data: withData.join(', '),
  platforms_with_errors: withErrors.join(', '),
  candidates_found: raw.length, videos_kept: 0, top_urls: '',
  status: candidates.length ? 'candidates_ready' : 'no_new_videos',
  summary_text: esc(note), scraped: scraped, candidates: candidates
} }];
