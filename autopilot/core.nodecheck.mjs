import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import sharp from 'sharp';
import { validateCopy, validatePinResponse, validateWebhook, runJob } from './core.mjs';
import { designPin } from './design.mjs';
const copy = { keyword:'decor', title:'12 Beautiful Home Decor Ideas', description:'Explore home decor ideas.', alt_text:'Home decor photos with a title.', cta:'Explore the ideas', board_id:'123' };
test('copy constrains boards and field lengths', () => {
  assert.equal(validateCopy(copy, [{id:'123'}]).board_id, '123');
  assert.throws(() => validateCopy(copy, [{id:'456'}]));
  assert.throws(() => validateCopy(copy, [{id:'123'}], '456'));
  assert.throws(() => validateCopy({...copy,title:'x'.repeat(101)}, [{id:'123'}]));
});
test('Make response must identify an actual pin; webhook restricted', () => {
  assert.throws(() => validatePinResponse({ accepted:true }));
  assert.equal(validatePinResponse({id:'123'}).pinUrl, 'https://www.pinterest.com/pin/123/');
  assert.throws(() => validateWebhook('https://evil.example/webhook'));
  assert.equal(validateWebhook('https://hook.eu2.make.com/test'), 'https://hook.eu2.make.com/test');
});
test('success transitions through publishing before sending', async () => {
  const calls=[];
  await runJob({ sheet:async (action) => {calls.push(action);return action==='claim'?{job:{id:'one',lease:'lease',articleUrl:'https://example.com',boardId:''}}:{ok:true};}, prepare:async()=>copy, publish:async()=>{calls.push('send'); return {id:'123'};} });
  assert.deepEqual(calls,['claim','publishing','send','complete']);
});
test('preparation failure is retryable, ambiguous publishing is not', async () => {
  for (const stage of ['prepare','publish','complete']) {
    let failure;
    const sheet=async(action,fields)=>{
      if(action==='claim')return {job:{id:'one',lease:'lease',articleUrl:'https://example.com',boardId:''}};
      if(action==='complete' && stage==='complete')throw Error('sheet unavailable');
      if(action==='fail')failure=fields;
      return {ok:true};
    };
    await assert.rejects(runJob({sheet,prepare:async()=>{if(stage==='prepare')throw Error();return copy;},publish:async()=>{if(stage==='publish')throw Error();return {id:'123'};}}));
    assert.equal(failure.uncertain, stage!=='prepare');
  }
});
test('idle queue never generates or publishes', async()=>{
  const result=await runJob({sheet:async()=>({job:null}),prepare:()=>assert.fail(),publish:()=>assert.fail()});
  assert.equal(result.status,'idle');
});
test('renderer produces a real 1000x1500 PNG from photos and escaped text', async()=>{
  const image=await sharp({create:{width:640,height:800,channels:3,background:'#6799a0'}}).png().toBuffer();
  const result=await designPin([image,image,image,image],{...copy,title:'12 Home & Garden <Ideas>'},'https://example.com/post');
  const meta=await sharp(result).metadata();
  assert.equal(meta.width,1000); assert.equal(meta.height,1500); assert.equal(meta.format,'png');
});
function scriptHarness() {
  const values={SHARED_SECRET:'a'.repeat(32), ENABLED:'true'};
  const rows=[['https://example.com/post','','Pending','','','','','']];
  const sheet={getLastRow:()=>rows.length+1,getRange:(r,c,n=1,w=1)=>({
    getValues:()=>rows.slice(r-2,r-2+n).map(row=>row.slice(c-1,c-1+w)),
    setValue:v=>{rows[r-2][c-1]=v;},setValues:vv=>{vv.forEach((row,i)=>{rows[r-2+i]??=Array(8).fill('');row.forEach((v,j)=>{rows[r-2+i][c-1+j]=v;});});}
  })};
  const fetches=[];
  const context=vm.createContext({UrlFetchApp:{fetch:(url,opts={})=>{fetches.push({url,opts});return {getResponseCode:()=>url.includes('/runs')?200:204,getContentText:()=>JSON.stringify({workflow_runs:[{id:1,run_number:7,event:'workflow_dispatch',status:'completed',conclusion:'success',created_at:'2026-11-07T10:00:00Z',html_url:'https://github.com/o/r/actions/runs/1'}]})};}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k],setProperty:(k,v)=>{values[k]=v;}})}, SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}}, LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}, Utilities:{getUuid:()=>crypto.randomUUID()},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
  vm.runInContext(readFileSync(new URL('./google-sheet-script.gs',import.meta.url),'utf8'),context);
  const call=(action,data={})=>context.doPost({postData:{contents:JSON.stringify({secret:values.SHARED_SECRET,action,...data})}});
  return {values,rows,call,fetches};
}
test('Sheet authenticates, leases, serializes and enforces spacing',()=>{
  const h=scriptHarness();
  assert.equal(h.call('claim',{secret:'wrong'}).ok,false);
  const job=h.call('claim').job; assert.ok(job);
  assert.equal(h.call('claim').job,null);
  assert.equal(h.call('publishing',{...job,lease:'wrong'}).ok,false);
  assert.equal(h.call('publishing',job).ok,true);
  assert.equal(h.call('complete',{...job,pinUrl:'https://www.pinterest.com/pin/123/'}).ok,true);
  h.rows.push(['https://example.com/next','','Pending','','','','','']);
  assert.equal(h.call('claim').job,null);
  h.values.ATTEMPTS=JSON.stringify([Date.now()-121*60000]);
  assert.ok(h.call('claim').job);
});
test('uncertain outcome blocks queue; duplicate article skipped',()=>{
  const h=scriptHarness(); const job=h.call('claim').job;
  h.call('publishing',job);h.call('fail',{...job,uncertain:true});
  assert.equal(h.rows[0][2],'Needs review');
  h.values.ATTEMPTS='[]'; assert.equal(h.call('claim').job,null);
  h.rows[0][2]='Posted';h.rows.push(['https://example.com/post#section','','Pending','','','','','']);
  assert.equal(h.call('claim').job,null);assert.equal(h.rows[1][2],'Skip');
});
test('rolling daily limit and pause prevent claims',()=>{
  const h=scriptHarness();h.values.ENABLED='false';assert.equal(h.call('claim').job,null);
  h.values.ENABLED='true';h.values.ATTEMPTS=JSON.stringify(Array(10).fill(Date.now()-3*3600000));
  assert.equal(h.call('claim').job,null);
});

test('control panel: overview, add, settings and safe status changes',()=>{
  const h=scriptHarness();
  const o=h.call('overview');
  assert.equal(o.ok,true); assert.equal(o.total,1); assert.equal(o.rows[0].status,'Pending'); assert.equal(o.settings.dailyLimit,10);
  const a=h.call('add',{urls:['https://example.com/post/','https://example.com/new','not a url','javascript:alert(1)']});
  assert.deepEqual([a.added,a.skipped],[1,3]); assert.equal(h.rows[1][0],'https://example.com/new'); assert.equal(h.rows[1][2],'Pending');
  assert.equal(h.call('add',{urls:['https://example.com/x'],boardId:'abc'}).ok,false);
  assert.equal(h.call('settings',{dailyLimit:11}).ok,false);
  assert.equal(h.call('settings',{dailyLimit:3,enabled:false}).ok,true); assert.equal(h.values.DAILY_LIMIT,'3'); assert.equal(h.values.ENABLED,'false');
  assert.equal(h.call('setStatus',{row:2,status:'Skip'}).ok,true); assert.equal(h.rows[0][2],'Skip');
  assert.equal(h.call('setStatus',{row:2,status:'Pending'}).ok,true);
  assert.equal(h.call('setStatus',{row:2,status:'Retry'}).ok,false);
  h.rows[0][2]='Needs review';
  assert.equal(h.call('setStatus',{row:2,status:'Skip'}).ok,false);
  assert.equal(h.call('overview',{secret:'wrong'}).ok,false);
});
test('control panel: starts a preview run and lists runs through GitHub',()=>{
  const h=scriptHarness(); h.values.GITHUB_REPO='o/r'; h.values.GITHUB_TOKEN='t';
  assert.equal(h.call('dispatch',{mode:'preview',articleUrl:'ftp://x'}).ok,false);
  assert.equal(h.call('dispatch',{mode:'preview',articleUrl:'https://example.com/post'}).ok,true);
  const body=JSON.parse(h.fetches[0].opts.payload); assert.deepEqual(body.inputs,{mode:'preview',article_url:'https://example.com/post'});
  assert.equal(h.values.LAST_DISPATCH,undefined);
  assert.equal(h.call('dispatch',{mode:'publish'}).ok,true); assert.ok(h.values.LAST_DISPATCH);
  assert.equal(h.call('runs').runs[0].number,7);
});
