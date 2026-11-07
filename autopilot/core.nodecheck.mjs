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
    setValue:v=>{rows[r-2][c-1]=v;},setValues:vv=>{vv.forEach((row,i)=>row.forEach((v,j)=>{rows[r-2+i][c-1+j]=v;}));}
  })};
  const context=vm.createContext({PropertiesService:{getScriptProperties:()=>({getProperty:k=>values[k],setProperty:(k,v)=>{values[k]=v;}})}, SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}}, LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})}, Utilities:{getUuid:()=>crypto.randomUUID()},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
  vm.runInContext(readFileSync(new URL('./google-sheet-script.gs',import.meta.url),'utf8'),context);
  const call=(action,data={})=>context.doPost({postData:{contents:JSON.stringify({secret:values.SHARED_SECRET,action,...data})}});
  return {values,rows,call};
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
