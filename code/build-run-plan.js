const row = $input.first().json;
const list = (v) => String(v == null ? '' : v).split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
const tagify = (s) => String(s).toLowerCase().replace(/[^a-z0-9_]/g, '');
const cfg = {
  maxAgeDays: 30,
  aiCandidates: 40,
  perPlatformLimit: 30,
  maxQueries: 5,
  minViews: { instagram: 5000, facebook: 5000, x: 1000, linkedin: 500 },
  fallbackMinInteractions: 50,
  weights: { velocity: 0.4, engagement: 0.25, leverage: 0.2, recency: 0.15 },
  finalWeights: { metrics: 0.6, ai: 0.4 },
  minRelevance: 5,
  compliancePenalty: 15,
  defaultMaxResults: 20
};
const keywords = list(row.keywords);
const hashtags = list(row.hashtags).map(tagify).filter(Boolean);
const brief = {
  client_name: String(row.client_name || 'Unnamed client'),
  business_description: String(row.business_description || ''),
  industry: String(row.industry || ''),
  target_audience: String(row.target_audience || ''),
  location: String(row.location || ''),
  language: String(row.language || 'English'),
  content_goal: String(row.content_goal || ''),
  brand_tone: String(row.brand_tone || ''),
  keywords: keywords,
  hashtags: hashtags,
  competitor_urls: list(row.competitor_urls),
  min_views_override: Number(row.min_views_override) > 0 ? Number(row.min_views_override) : null,
  max_results: Number(row.max_results) > 0 ? Number(row.max_results) : cfg.defaultMaxResults
};
const wanted = String(row.platforms || '').toLowerCase();
const all = !wanted.trim();
const platforms = [];
if (all || wanted.indexOf('instagram') > -1) platforms.push('instagram');
if ((all || wanted.indexOf('facebook') > -1) && /facebook\.com|fb\.com/i.test(String(row.competitor_urls || ''))) platforms.push('facebook');
if (all || wanted.indexOf('twitter') > -1 || /(^|[^a-z])x([^a-z]|$)/.test(wanted)) platforms.push('x');
if (all || wanted.indexOf('linkedin') > -1) platforms.push('linkedin');
const tagPool = hashtags.concat(keywords.map(tagify)).filter(Boolean);
const tags = tagPool.filter((t, i) => tagPool.indexOf(t) === i).slice(0, cfg.maxQueries);
const terms = keywords.concat(hashtags.map((h) => '#' + h)).concat([brief.industry]).filter(Boolean).slice(0, cfg.maxQueries);
const ofHost = (re) => brief.competitor_urls.filter((u) => re.test(u));
const igUrls = ofHost(/instagram\.com/i);
const fbUrls = ofHost(/facebook\.com|fb\.com/i);
const xUrls = ofHost(/twitter\.com|x\.com/i);
const handle = (u) => String(u).replace(/[?#].*$/, '').split('/').filter(Boolean).pop();
const since = new Date(Date.now() - cfg.maxAgeDays * 86400000).toISOString().slice(0, 10);
const inputs = {
  instagram: {
    directUrls: tags.map((t) => 'https://www.instagram.com/explore/tags/' + t + '/').concat(igUrls),
    resultsType: 'reels',
    resultsLimit: cfg.perPlatformLimit
  },
  facebook: {
    startUrls: fbUrls.map((u) => ({ url: u })),
    resultsLimit: cfg.perPlatformLimit
  },
  x: {
    searchTerms: terms.map((t) => t + ' filter:native_video min_faves:5 since:' + since),
    twitterHandles: xUrls.map(handle),
    maxItems: 60,
    sort: 'Top',
    onlyVideo: true
  },
  linkedin: {
    searchQueries: terms.slice(0, 3),
    postedLimit: 'month',
    sortBy: 'relevance',
    maxPosts: cfg.perPlatformLimit
  }
};
const runDate = new Date().toISOString();
const runId = 'run_' + runDate.slice(0, 10).replace(/-/g, '') + '_' + Math.random().toString(36).slice(2, 7);
return platforms.map((p) => ({ json: { platform: p, apifyInput: inputs[p], brief: brief, config: cfg, run_id: runId, run_date: runDate } }));
