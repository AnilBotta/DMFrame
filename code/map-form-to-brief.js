const f = $input.first().json;
const g = (k) => (f[k] === undefined || f[k] === null ? '' : f[k]);
const plats = Array.isArray(g('Platforms')) ? g('Platforms').join(', ') : String(g('Platforms'));
return [{ json: {
  client_name: String(g('Client name')),
  business_description: String(g('Business description')),
  industry: String(g('Industry')),
  target_audience: String(g('Target audience')),
  location: String(g('Location')),
  language: String(g('Language')),
  keywords: String(g('Keywords')),
  hashtags: String(g('Hashtags')),
  competitor_urls: String(g('Competitor URLs')),
  platforms: plats,
  content_goal: String(g('Content goal')),
  brand_tone: String(g('Brand tone')),
  min_views_override: Number(g('Minimum views override')) || 0,
  max_results: Number(g('Max results')) || 20,
  active: String(g('Run weekly')).toLowerCase() !== 'no',
  submitted_at: new Date().toISOString()
} }];
