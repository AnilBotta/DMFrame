const plan = $('Build Run Plan').first().json;
const cfg = plan.config;
const brief = plan.brief;
const proc = $('Process Candidates').first().json;
const cands = $('Split Candidates').all().map((i) => i.json);
const outs = $input.all().map((i) => i.json);
const findAi = (o) => {
  if (o === null || o === undefined) return null;
  if (typeof o === 'string') {
    if (o.indexOf('relevance_to_business') > -1) { try { return JSON.parse(o); } catch (e) { return null; } }
    return null;
  }
  if (typeof o === 'object') {
    if (o.relevance_to_business !== undefined) return o;
    for (const k of Object.keys(o)) { const t = findAi(o[k]); if (t) return t; }
  }
  return null;
};
const rows = [];
let aiFailed = 0;
for (let i = 0; i < cands.length; i++) {
  const c = cands[i];
  const a = findAi(outs[i]);
  if (!a) { aiFailed++; continue; }
  const rel = Number(a.relevance_to_business) || 0;
  const hook = Number(a.hook_strength) || 0;
  const qual = Number(a.content_quality) || 0;
  if (rel < cfg.minRelevance) continue;
  const flags = Array.isArray(a.compliance_flags) ? a.compliance_flags.filter((f) => f !== 'none') : [];
  const aiScore = Math.min(100, 10 * (0.45 * rel + 0.3 * hook + 0.25 * qual) + (a.cta_present ? 5 : 0));
  const penalty = Math.min(flags.length * cfg.compliancePenalty, 45);
  const finalScore = Math.max(0, cfg.finalWeights.metrics * c.metrics_score + cfg.finalWeights.ai * aiScore - penalty);
  rows.push({
    run_id: plan.run_id, run_date: plan.run_date, client_name: brief.client_name, rank: 0,
    platform: c.platform, post_url: c.url, creator: c.creator || '', followers: c.followers === null ? '' : c.followers,
    views: c.views === null ? '' : c.views, likes: c.likes === null ? '' : c.likes, comments: c.comments === null ? '' : c.comments, shares: c.shares === null ? '' : c.shares,
    engagement_rate_pct: c.engagement_rate === null ? '' : Math.round(c.engagement_rate * 10000) / 100,
    posted_at: c.posted_at || '', final_score: Math.round(finalScore * 10) / 10, metrics_score: c.metrics_score, ai_score: Math.round(aiScore * 10) / 10,
    content_format: a.content_format || '', hook_strength: hook, why_it_works: a.why_it_works || '', how_to_replicate: a.how_to_replicate || '',
    compliance_flags: flags.join(', '), risk_flags: Array.isArray(a.risk_flags) ? a.risk_flags.join(', ') : '', confidence: c.confidence,
    caption_preview: String(c.caption || '').slice(0, 200)
  });
}
rows.sort((x, y) => y.final_score - x.final_score);
const top = rows.slice(0, brief.max_results);
top.forEach((r, idx) => { r.rank = idx + 1; });
const store = $getWorkflowStaticData('global');
store.seen = store.seen || {};
const nowMs = Date.now();
for (const r of top) { store.seen[brief.client_name.toLowerCase() + '|' + r.post_url] = nowMs; }
for (const k of Object.keys(store.seen)) { if (nowMs - store.seen[k] > 120 * 86400000) delete store.seen[k]; }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lines = [];
lines.push('Viral video research done for ' + brief.client_name + ' (' + plan.run_id + ')');
lines.push('Kept ' + top.length + ' of ' + proc.candidates_found + ' scraped posts (' + cands.length + ' videos AI-scored' + (aiFailed ? ', ' + aiFailed + ' AI failures' : '') + '). Platforms with data: ' + (proc.platforms_with_data || 'none') + '. Errors/blocked: ' + (proc.platforms_with_errors || 'none') + '.');
top.slice(0, 3).forEach((r, i) => { lines.push((i + 1) + '. [' + r.platform + '] score ' + r.final_score + ' - ' + r.post_url); });
lines.push('Full ranked list is in the Results tab of the DMFrame sheet.');
return [{ json: {
  run_id: plan.run_id, run_date: plan.run_date, client_name: brief.client_name,
  platforms_requested: proc.platforms_requested, platforms_with_data: proc.platforms_with_data,
  candidates_found: proc.candidates_found, videos_kept: top.length,
  top_urls: top.slice(0, 3).map((r) => r.post_url).join(' | '),
  status: top.length ? 'ok' : (aiFailed === cands.length ? 'ai_scoring_failed' : 'no_results_after_ai_scoring'),
  summary_text: esc(lines.join('\n')), rows: top
} }];
