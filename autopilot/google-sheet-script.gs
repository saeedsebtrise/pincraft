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
    if (data.action === 'claim') {
      recoverStale_(s, rows);
      // An interrupted publish requires manual reconciliation before any more publishing.
      if (rows.some(r => ['Processing', 'Publishing', 'Needs review'].includes(String(r[2])))) return json_({ ok:true, job:null });
      if (!due_()) return json_({ ok:true, job:null });
      const index = rows.findIndex(r => r[0] && ['', 'Pending', 'Retry'].includes(String(r[2])));
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
      if (rows.some((r,i) => i !== index && canonical_(r[0]) === canonical_(row[0]) && String(r[2]) === 'Posted')) {
        s.getRange(index+2,3).setValue('Skip'); s.getRange(index+2,5).setValue('Duplicate of an already posted article.');
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
function tick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const p = props_(), s = sheet_(), rows = rows_();
    recoverStale_(s, rows);
    if (!due_() || rows.some(r => ['Processing','Publishing','Needs review'].includes(String(r[2]))) || !rows.some(r => r[0] && ['', 'Pending', 'Retry'].includes(String(r[2])))) return;
    if (Date.now() - Number(p.getProperty('LAST_DISPATCH') || 0) < 15*60000) return;
    const repo = p.getProperty('GITHUB_REPO'), ref = p.getProperty('GITHUB_REF') || 'main';
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('Set owner/repo');
    const response = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/actions/workflows/pinterest-autopilot.yml/dispatches', {
      method:'post', contentType:'application/json', muteHttpExceptions:true,
      headers:{ Authorization:'Bearer ' + p.getProperty('GITHUB_TOKEN'), Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2026-03-10' },
      payload:JSON.stringify({ ref:ref, inputs:{ mode:'publish' } })
    });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('GitHub dispatch failed: ' + response.getResponseCode());
    p.setProperty('LAST_DISPATCH', String(Date.now()));
  } finally { lock.releaseLock(); }
}
function installTimer() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'tick').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(15).create();
}
