/** Bound Google Apps Script. Configure Script Properties before setup(). */
const HEADERS = ['Article URL', 'Board ID', 'Status', 'Pin URL', 'Error', 'Job ID', 'Lease', 'Updated At'];
// Longer than the worker's 15-minute workflow timeout. Expiry never retries a Pin.
const LEASE_MS = 20 * 60000;
function props_() { return PropertiesService.getScriptProperties(); }
function sheet_() { return SpreadsheetApp.openById(props_().getProperty('SHEET_ID')).getSheetByName('Pins'); }
function setup() {
  const p = props_();
  if (!p.getProperty('SHEET_ID')) p.setProperty('SHEET_ID', SpreadsheetApp.getActiveSpreadsheet().getId());
  const book = SpreadsheetApp.openById(p.getProperty('SHEET_ID'));
  const sheet = book.getSheetByName('Pins') || book.insertSheet('Pins');
  if (!sheet.getLastRow()) sheet.appendRow(HEADERS);
  if (sheet.getRange(1,1,1,8).getValues()[0].join('|') !== HEADERS.join('|')) throw new Error('Existing Pins headers differ. Use a new sheet or match documented columns.');
  sheet.setFrozenRows(1);
  sheet.getRange('A:H').setNumberFormat('@');
  if (!p.getProperty('ENABLED')) p.setProperty('ENABLED', 'false');
}
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function history_() {
  const history = JSON.parse(props_().getProperty('ATTEMPTS') || '[]');
  if (!Array.isArray(history) || history.some(t => !Number.isSafeInteger(t) || t < 0)) throw new Error('Invalid attempt history. Review before resetting.');
  // Keep the last attempt even outside the daily window so intervals >24 hours
  // still apply. Quotas below count only attempts within the rolling window.
  const last = Math.max.apply(null, history);
  return history.filter(t => t > Date.now() - 86400000 || t === last);
}
function due_() {
  const p = props_(), history = history_();
  const limit = Number(p.getProperty('DAILY_LIMIT') || 10), gap = Number(p.getProperty('INTERVAL_MINUTES') || 120);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10 || !Number.isFinite(gap) || gap < 120) throw new Error('Daily limit 1-10; interval at least 120 minutes.');
  const recent = history.filter(t => t > Date.now() - 86400000);
  return p.getProperty('ENABLED') === 'true' && recent.length < limit && (!history.length || Date.now() - Math.max.apply(null, history) >= gap * 60000);
}
function rows_() { const s = sheet_(); return s.getLastRow() < 2 ? [] : s.getRange(2,1,s.getLastRow()-1,8).getValues(); }
function canonical_(url) {
  const match = String(url).trim().match(/^(https?):\/\/([^/?#]+)([^#]*)/i);
  if (!match) return String(url).trim();
  const protocol = match[1].toLowerCase();
  const host = match[2].toLowerCase().replace(protocol === 'https' ? /:443$/ : /:80$/, '');
  const rest = match[3].split('?');
  return protocol + '://' + host + rest[0].replace(/\/$/, '') + (rest.length > 1 ? '?' + rest.slice(1).join('?') : '');
}
/** One Pin of an article: "…/post#pin-2" is Pin 2 of …/post; a plain link is Pin 1. */
function pinNumber_(url) {
  const m = String(url).trim().match(/#pin-(\d{1,2})$/);
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 5 ? Number(m[1]) : 1;
}
function pinKey_(url) {
  const n = pinNumber_(url);
  return canonical_(url) + (n > 1 ? '#pin-' + n : '');
}
/** Hours between two Pins of the same article (Script Property SAME_ARTICLE_GAP_HOURS, default 24). */
function articleGapMs_() {
  const h = Number(props_().getProperty('SAME_ARTICLE_GAP_HOURS') || 24);
  return (Number.isFinite(h) && h >= 0 && h <= 720 ? h : 24) * 3600000;
}
/** False while another Pin of this row's article went out less than the gap ago. */
function spacedOut_(rows, row) {
  const base = canonical_(row[0]), gap = articleGapMs_();
  return !rows.some(r => r !== row && canonical_(r[0]) === base && ['Posted', 'Publishing', 'Processing'].includes(String(r[2])) && Date.now() - Date.parse(String(r[7])) < gap);
}
/** The next row to publish: the first waiting one whose article hasn't had a Pin too recently. */
function nextIndex_(rows) {
  return rows.findIndex(r => r[0] && ['', 'Pending', 'Retry'].includes(String(r[2])) && spacedOut_(rows, r));
}
function stale_(row) {
  const at = Date.parse(String(row[7]));
  return !Number.isFinite(at) || Date.now() - at >= LEASE_MS;
}
function recoverStale_(s, rows) {
  rows.forEach((row, index) => {
    if (!['Processing', 'Publishing'].includes(String(row[2])) || !stale_(row)) return;
    const publishing = row[2] === 'Publishing';
    row[2] = publishing ? 'Needs review' : 'Error';
    row[4] = publishing ? 'Worker interrupted during publishing. Check Pinterest and Make before Retry; if posted, enter Pin URL and set Posted.' : 'Worker interrupted before publishing. Check its run, then set Retry.';
    row[7] = new Date().toISOString();
    s.getRange(index + 2, 3, 1, 6).setValues([[row[2], row[3], row[4], row[5], row[6], row[7]]]);
  });
  SpreadsheetApp.flush();
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const data = JSON.parse(e.postData.contents);
    const secret = props_().getProperty('SHARED_SECRET');
    if (!secret || secret.length < 32 || data.secret !== secret) return json_({ ok:false });
    locked = lock.tryLock(10000);
    if (!locked) return json_({ ok:false });
    const s = sheet_(), rows = rows_();
    // Control panel (the PinCraft Autopilot page, through its server). Same secret, same lock.
    if (data.action === 'overview') return json_(overview_(rows));
    if (data.action === 'add') return json_(addRows_(s, rows, data));
    if (data.action === 'settings') return json_(settings_(data));
    if (data.action === 'setStatus') return json_(setStatus_(s, rows, data));
    if (data.action === 'dispatch') return json_(dispatch_(data.mode === 'preview' ? 'preview' : 'publish', data.articleUrl, data.pins));
    if (data.action === 'runs') return json_(runs_());
    if (data.action === 'claim') {
      recoverStale_(s, rows);
      // An interrupted publish requires manual reconciliation before any more publishing.
      if (rows.some(r => ['Processing', 'Publishing', 'Needs review'].includes(String(r[2])))) return json_({ ok:true, job:null });
      if (!due_()) return json_({ ok:true, job:null });
      // A Pin already posted (same article and Pin number) is marked Skip as soon as it's seen.
      const posted = {};
      rows.forEach(r => { if (String(r[2]) === 'Posted') posted[pinKey_(r[0])] = true; });
      let skipped = false;
      rows.forEach((r, i) => {
        if (!r[0] || !['', 'Pending', 'Retry'].includes(String(r[2])) || !posted[pinKey_(r[0])]) return;
        r[2] = 'Skip';
        s.getRange(i+2,3).setValue('Skip'); s.getRange(i+2,5).setValue('Duplicate of an already posted Pin.');
        s.getRange(i+2,8).setValue(new Date().toISOString());
        skipped = true;
      });
      if (skipped) { SpreadsheetApp.flush(); return json_({ ok:true, job:null }); }
      const index = nextIndex_(rows);
      if (index < 0) return json_({ ok:true, job:null });
      const row = rows[index];
      const articleUrl = String(row[0]).trim(), boardId = String(row[1] || '').trim();
      if (articleUrl.length > 4096 || !/^https?:\/\/[^/?#@\s]+(?:[/?#][^\s]*)?$/i.test(articleUrl) || (boardId && !/^\d{1,40}$/.test(boardId)) || (typeof row[1] === 'number' && !Number.isSafeInteger(row[1]))) {
        s.getRange(index+2,3).setValue('Error');
        s.getRange(index+2,5).setValue('Use a valid public article URL and a Board ID stored as plain text, or leave Board ID blank.');
        s.getRange(index+2,8).setValue(new Date().toISOString());
        SpreadsheetApp.flush();
        return json_({ ok:true, job:null });
      }
      const id = String(row[5] || Utilities.getUuid()), lease = Utilities.getUuid();
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || rows.some((r,i) => i !== index && String(r[5]) === id)) {
        s.getRange(index+2,3).setValue('Error');
        s.getRange(index+2,5).setValue('Invalid or duplicate Job ID. Clear Job ID and Lease, then set Retry.');
        s.getRange(index+2,8).setValue(new Date().toISOString());
        SpreadsheetApp.flush();
        return json_({ ok:true, job:null });
      }
      s.getRange(index+2,3,1,6).setValues([['Processing','','',id,lease,new Date().toISOString()]]);
      SpreadsheetApp.flush();
      return json_({ ok:true, job:{ id, lease, articleUrl:articleUrl, boardId:boardId } });
    }
    if (typeof data.id !== 'string' || typeof data.lease !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(data.id) || !/^[a-zA-Z0-9-]{1,80}$/.test(data.lease)) throw new Error('Invalid lease');
    const index = rows.findIndex(r => String(r[5]) === data.id && String(r[6]) === data.lease);
    if (index < 0) throw new Error('Lease mismatch');
    const row = rows[index], at = index+2;
    if (data.action === 'publishing') {
      if (row[2] !== 'Processing' || stale_(row) || !due_() || rows.some((r,i) => i !== index && ['Processing','Publishing','Needs review'].includes(String(r[2])))) throw new Error('Publishing not permitted');
      const history = history_(); history.push(Date.now());
      props_().setProperty('ATTEMPTS', JSON.stringify(history));
      s.getRange(at,3).setValue('Publishing');
    } else if (data.action === 'complete') {
      if (row[2] !== 'Publishing' || typeof data.pinUrl !== 'string' || !/^https:\/\/www\.pinterest\.com\/pin\/\d{1,40}\/$/.test(data.pinUrl)) throw new Error('Invalid completion');
      s.getRange(at,3,1,3).setValues([['Posted', data.pinUrl, '']]);
    } else if (data.action === 'fail') {
      if (!['Processing','Publishing'].includes(String(row[2]))) throw new Error('Invalid state');
      const uncertain = row[2] === 'Publishing' || data.uncertain;
      s.getRange(at,3).setValue(uncertain ? 'Needs review' : 'Error');
      s.getRange(at,5).setValue(uncertain ? 'Check Pinterest and Make history before Retry. If posted, enter Pin URL and set Posted.' : 'Preparation failed. Fix article/configuration, then set Retry.');
    } else throw new Error('Unknown action');
    s.getRange(at,8).setValue(new Date().toISOString());
    SpreadsheetApp.flush();
    return json_({ ok:true });
  } catch (_) { return json_({ ok:false }); }
  finally { if (locked) lock.releaseLock(); }
}
// ---------------------------------------------------------------- control panel actions

const URL_RE_ = /^https?:\/\/[^/?#@\s]+(?:[/?#][^\s]*)?$/i;

/** Queue rows, settings and when the next publishing slot opens. */
function overview_(rows) {
  const p = props_(), history = history_();
  const limit = Number(p.getProperty('DAILY_LIMIT') || 10), gap = Number(p.getProperty('INTERVAL_MINUTES') || 120);
  const recent = history.filter(t => t > Date.now() - 86400000);
  const last = history.length ? Math.max.apply(null, history) : 0;
  const nextSlotAt = Math.max(last ? last + gap * 60000 : 0, recent.length >= limit ? Math.min.apply(null, recent) + 86400000 : 0);
  return {
    ok: true,
    settings: { enabled: p.getProperty('ENABLED') === 'true', dailyLimit: limit, intervalMinutes: gap, photoLayout: design_().photos, pinSizes: design_().sizes },
    postedLast24h: recent.length,
    nextSlotAt: nextSlotAt,
    lastDispatchAt: Number(p.getProperty('LAST_DISPATCH') || 0),
    total: rows.length,
    rows: rows.slice(0, 500).map((r, i) => ({ row: i + 2, url: String(r[0]), boardId: String(r[1]), status: String(r[2] || 'Pending'), pinUrl: String(r[3]), error: String(r[4]), updatedAt: String(r[7]) })),
  };
}

/**
 * Appends article links as Pending rows, `pinsPerArticle` (1-5) rows per article: the plain link
 * is Pin 1, then "#pin-2", "#pin-3" … Each Pin gets its own design and copy, and Pins of one
 * article go out at least SAME_ARTICLE_GAP_HOURS apart. Pins already in the Sheet are skipped,
 * so adding a posted article again with more Pins adds only the new ones.
 */
function addRows_(s, rows, data) {
  const urls = Array.isArray(data.urls) ? data.urls.slice(0, 200) : [];
  const board = String(data.boardId || '').trim();
  if (board && !/^\d{1,40}$/.test(board)) return { ok: false, error: 'Board ID must be digits.' };
  const pins = Number(data.pinsPerArticle || 1);
  if (!Number.isInteger(pins) || pins < 1 || pins > 5) return { ok: false, error: 'Pins per article must be 1-5.' };
  const seen = {};
  rows.forEach(r => { seen[pinKey_(r[0])] = true; });
  const added = [];
  urls.forEach(u => {
    const base = String(u).trim().replace(/#.*$/, '');
    if (base.length > 4000 || !URL_RE_.test(base)) return;
    for (let n = 1; n <= pins; n++) {
      const url = n > 1 ? base + '#pin-' + n : base;
      if (seen[pinKey_(url)]) continue;
      seen[pinKey_(url)] = true;
      added.push([url, board, 'Pending', '', '', '', '', new Date().toISOString()]);
    }
  });
  if (added.length) s.getRange(rows.length + 2, 1, added.length, 8).setValues(added);
  SpreadsheetApp.flush();
  return { ok: true, added: added.length, skipped: Math.max(0, urls.length * pins - added.length) };
}

/** Turns publishing on/off and sets the daily limit (1–10). The interval stays a Script Property. */
const PIN_SIZES_ = ['2:3', '1:2', '9:16', '3:4', '4:5', '1:1'];
/** Pin design settings: photos per Pin (random, 4, 6, 8) and the Pin sizes to rotate through. */
function design_() {
  const p = props_();
  const photos = ['random', '4', '6', '8'].indexOf(p.getProperty('PHOTO_LAYOUT')) >= 0 ? p.getProperty('PHOTO_LAYOUT') : 'random';
  const sizes = String(p.getProperty('PIN_SIZES') || '2:3').split(',').filter(x => PIN_SIZES_.indexOf(x) >= 0);
  return { photos: photos, sizes: sizes.length ? sizes : ['2:3'] };
}
function settings_(data) {
  const p = props_();
  if (data.photoLayout !== undefined) {
    if (['random', '4', '6', '8'].indexOf(String(data.photoLayout)) < 0) return { ok: false, error: 'Photos per Pin must be random, 4, 6 or 8.' };
    p.setProperty('PHOTO_LAYOUT', String(data.photoLayout));
  }
  if (data.pinSizes !== undefined) {
    const sizes = Array.isArray(data.pinSizes) ? data.pinSizes.map(String) : [];
    if (!sizes.length || sizes.some(x => PIN_SIZES_.indexOf(x) < 0)) return { ok: false, error: 'Choose at least one Pin size.' };
    p.setProperty('PIN_SIZES', sizes.filter((x, i) => sizes.indexOf(x) === i).join(','));
  }
  if (data.dailyLimit !== undefined) {
    const n = Number(data.dailyLimit);
    if (!Number.isInteger(n) || n < 1 || n > 10) return { ok: false, error: 'Daily limit must be 1–10.' };
    p.setProperty('DAILY_LIMIT', String(n));
  }
  if (typeof data.enabled === 'boolean') p.setProperty('ENABLED', data.enabled ? 'true' : 'false');
  return { ok: true };
}

/**
 * Safe status changes only: Error → Retry, Pending/Retry/Error → Skip, Skip → Pending.
 * Needs review is never changed here: check Pinterest and Make in the Sheet first.
 */
function setStatus_(s, rows, data) {
  const i = Number(data.row) - 2, row = rows[i];
  if (!Number.isInteger(i) || !row) return { ok: false, error: 'Row not found.' };
  const from = String(row[2] || 'Pending'), to = String(data.status);
  const allowed = { Retry: ['Error'], Skip: ['Pending', 'Retry', 'Error'], Pending: ['Skip'] };
  if (!allowed[to] || allowed[to].indexOf(from) < 0) return { ok: false, error: 'That status change is not allowed here.' };
  s.getRange(i + 2, 3).setValue(to);
  s.getRange(i + 2, 8).setValue(new Date().toISOString());
  SpreadsheetApp.flush();
  return { ok: true };
}

function ghHeaders_() {
  return { Authorization: 'Bearer ' + props_().getProperty('GITHUB_TOKEN'), Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' };
}

/** Starts the worker now: a preview for one article, or a publish run (which still obeys the limit and interval). */
function dispatch_(mode, articleUrl, pins) {
  const p = props_(), repo = p.getProperty('GITHUB_REPO'), ref = p.getProperty('GITHUB_REF') || 'main';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) return { ok: false, error: 'Set GITHUB_REPO in Script Properties.' };
  const design = design_();
  const inputs = { mode: mode, photos: design.photos, sizes: design.sizes.join(',') };
  if (mode === 'preview') {
    const url = String(articleUrl || '').trim();
    if (url.length > 2000 || !URL_RE_.test(url)) return { ok: false, error: 'Enter a public article URL.' };
    inputs.article_url = url;
    const n = Number(pins || 1);
    inputs.pins = String(Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1);
  }
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/pinterest-autopilot.yml/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: ghHeaders_(), payload: JSON.stringify({ ref: ref, inputs: inputs }),
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return { ok: false, error: 'GitHub did not start the run (' + response.getResponseCode() + '). Check GITHUB_TOKEN.' };
  if (mode === 'publish') p.setProperty('LAST_DISPATCH', String(Date.now()));
  return { ok: true };
}

/** The last ten worker runs, with links to their GitHub pages (previews are downloaded there). */
function runs_() {
  const repo = props_().getProperty('GITHUB_REPO');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) return { ok: true, runs: [] };
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/pinterest-autopilot.yml/runs?per_page=10', { muteHttpExceptions: true, headers: ghHeaders_() });
  if (response.getResponseCode() !== 200) return { ok: true, runs: [], error: 'GitHub runs could not be read (' + response.getResponseCode() + ').' };
  const list = JSON.parse(response.getContentText()).workflow_runs || [];
  return { ok: true, runs: list.map(w => ({ id: w.id, number: w.run_number, event: w.event, status: w.status, conclusion: w.conclusion, createdAt: w.created_at, url: w.html_url })) };
}

function tick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const p = props_(), s = sheet_(), rows = rows_();
    recoverStale_(s, rows);
    // No run unless a row can go out now (also not while its article had a Pin too recently).
    if (!due_() || rows.some(r => ['Processing','Publishing','Needs review'].includes(String(r[2]))) || nextIndex_(rows) < 0) return;
    if (Date.now() - Number(p.getProperty('LAST_DISPATCH') || 0) < 15*60000) return;
    const repo = p.getProperty('GITHUB_REPO'), ref = p.getProperty('GITHUB_REF') || 'main';
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Set owner/repo');
    const response = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/pinterest-autopilot.yml/dispatches', {
      method:'post', contentType:'application/json', muteHttpExceptions:true,
      headers:{ Authorization:'Bearer ' + p.getProperty('GITHUB_TOKEN'), Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10' },
      payload:JSON.stringify({ ref:ref, inputs:{ mode:'publish', photos:design_().photos, sizes:design_().sizes.join(',') } })
    });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('GitHub dispatch failed: ' + response.getResponseCode());
    p.setProperty('LAST_DISPATCH', String(Date.now()));
  } finally { lock.releaseLock(); }
}
function installTimer() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'tick').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(15).create();
}
