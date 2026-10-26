/* Only the local isolated fixture server is accepted. Never targets Supabase. */
const assert=require('node:assert/strict');
const origin='http://127.0.0.1:8879';
const fixtureId='33333333-3333-3333-3333-333333333333';
async function request(path,body,admin=false,method='POST'){
 const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer qa-admin-token'}:{})},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 assert.equal(response.headers.get('X-OVE-Test-Environment'),'isolated-pglite','Refusing to modify an unrecognized server');
 return {status:response.status,body:await response.json()};
}
const list=()=>request('/rest/v1/rpc/list_visitor_reviews',{p_resource:'beomeosa',p_offset:0});
(async()=>{
 const config=await request('/data/chatbot-config.json',undefined,false,'GET');assert.equal(config.body.supabaseUrl,origin);assert.equal(config.body.publishableKey,'sb_publishable_test');
 assert.equal((await list()).body.length,0);
 assert.equal((await request('/rest/v1/visitor_reviews',undefined,false,'GET')).status,403);
 assert.equal((await request('/rest/v1/visitor_reviews?request_id=eq.'+fixtureId,{status:'published'},false,'PATCH')).status,403);
 assert.equal((await request('/rest/v1/rpc/set_visitor_review_deleted',{p_request_id:fixtureId,p_deleted:true})).status,403);
 const publish=await request('/rest/v1/visitor_reviews?request_id=eq.'+fixtureId,{status:'published'},true,'PATCH');assert.equal(publish.status,200);assert.equal(publish.body.length,1);const original=publish.body[0].message;
 assert.equal((await list()).body.length,1);
 const deleted=await request('/rest/v1/rpc/set_visitor_review_deleted',{p_request_id:fixtureId,p_deleted:true},true);assert.equal(deleted.status,200);assert.equal((await list()).body.length,0);
 const deletedList=await request('/rest/v1/visitor_reviews?deleted_at=not.is.null',undefined,true,'GET');assert.equal(deletedList.body.length,1);assert.equal(deletedList.body[0].message,original);
 const restored=await request('/rest/v1/rpc/set_visitor_review_deleted',{p_request_id:fixtureId,p_deleted:false},true);assert.equal(restored.status,200);assert.equal((await list()).body.length,0);
 const pending=await request('/rest/v1/visitor_reviews?deleted_at=is.null&status=eq.pending',undefined,true,'GET');assert.equal(pending.body[0].message,original);assert.equal(pending.body[0].deleted_at,null);
 console.log('PASS: isolated server guard, anonymous read/approval/deletion denied, admin approval visible publicly, recoverable deletion hidden publicly, preserved original, restore requires reapproval.');
})().catch(e=>{console.error(e);process.exitCode=1;});
