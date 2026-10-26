// Disposable local QA backend; no connection to any Supabase account.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const root=path.resolve(__dirname,'..'),db=new PGlite();
(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('11111111-1111-1111-1111-111111111111','admin@ove.example');`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/chatbot-inquiries.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/chatbot-admin.sql'),'utf8'));
 await db.exec(`insert into public.chatbot_admins(user_id)values('11111111-1111-1111-1111-111111111111');`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/visitor-reviews.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/visitor-reviews-deletion.sql'),'utf8'));
 await db.exec(`insert into public.visitor_reviews(request_id,resource,nickname,message) values('33333333-3333-3333-3333-333333333333','beomeosa','로컬 QA','관리자 후기 화면과 공개 상태 변경을 확인하는 테스트입니다.');`);
 let queue=Promise.resolve();
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-OVE-Test-Environment':'isolated-pglite'});res.end(JSON.stringify(body));};
 http.createServer((req,res)=>{queue=queue.then(async()=>{
  const url=new URL(req.url,'http://127.0.0.1:8879');let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};
  if(url.pathname==='/data/chatbot-config.json')return json(res,200,{supabaseUrl:'http://127.0.0.1:8879',publishableKey:'sb_publishable_test',adminEmail:'admin@ove.example',reviewsEnabled:true,reviewDeletionEnabled:true,rpc:'submit_chatbot_inquiry',privacy:{controller:'QA',contact:'qa@example.com',retention:'QA only'},consentVersion:'qa'});
  if(url.pathname==='/auth/v1/token')return body.email==='admin@ove.example'&&body.password==='test-only'?json(res,200,{access_token:'qa-admin-token',expires_in:3600}):json(res,400,{error:'bad_login'});
  if(url.pathname==='/auth/v1/logout')return json(res,200,{});
  if(url.pathname.startsWith('/rest/v1/')){
   const admin=req.headers.authorization==='Bearer qa-admin-token';await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin?'11111111-1111-1111-1111-111111111111':'']);await db.exec('set role '+(admin?'authenticated':'anon'));
   try{
    if(url.pathname.startsWith('/rest/v1/rpc/')){
     const name=url.pathname.split('/').pop();if(!/^[a-z_]+$/.test(name))throw new Error('bad rpc');
     const keys=Object.keys(body);if(keys.some(k=>!/^p_[a-z_]+$/.test(k)))throw new Error('bad args');
     const args=keys.map((k,i)=>k+'=> $'+(i+1)).join(',');const result=await db.query(name==='list_visitor_reviews'?'select * from public.'+name+'('+args+')':'select public.'+name+'('+args+') as value',Object.values(body));return json(res,200,name==='list_visitor_reviews'?result.rows:result.rows[0].value);
    }
    if(url.pathname==='/rest/v1/visitor_reviews'){
     if(req.method==='GET'){let sql='select * from public.visitor_reviews',args=[],conditions=[];const state=url.searchParams.get('status');if(state){conditions.push('status=$1');args.push(state.slice(3));}const deleted=url.searchParams.get('deleted_at');if(deleted==='is.null')conditions.push('deleted_at is null');else if(deleted==='not.is.null')conditions.push('deleted_at is not null');if(conditions.length)sql+=' where '+conditions.join(' and ');sql+=' order by created_at desc,request_id desc limit '+Number(url.searchParams.get('limit')||21)+' offset '+Number(url.searchParams.get('offset')||0);return json(res,200,(await db.query(sql,args)).rows);}
     if(req.method==='PATCH'){if(Object.keys(body).some(k=>k!=='status'))return json(res,403,{code:'42501',message:'Only status is writable'});return json(res,200,(await db.query('update public.visitor_reviews set status=$1 where request_id=$2 returning *',[body.status,url.searchParams.get('request_id').slice(3)])).rows);}
    }
    if(url.pathname==='/rest/v1/chatbot_inquiries'){
     if(req.method==='GET'){
      let sql='select request_id,name,email,message,created_at,status,consent_version,consented_at from public.chatbot_inquiries',args=[];const state=url.searchParams.get('status');if(state){sql+=' where status=$1';args.push(state.slice(3));}sql+=' order by created_at desc,request_id desc limit '+Number(url.searchParams.get('limit')||21)+' offset '+Number(url.searchParams.get('offset')||0);return json(res,200,(await db.query(sql,args)).rows);
     }
     if(req.method==='PATCH')return json(res,200,(await db.query('update public.chatbot_inquiries set status=$1 where request_id=$2 returning *',[body.status,url.searchParams.get('request_id').slice(3)])).rows);
    }
    return json(res,404,{});
   }catch(e){return json(res,e.code==='42501'?403:400,{code:e.code,message:e.message});}
  }
  let filename=path.join(root,decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!filename.startsWith(root+path.sep)||url.pathname.split('/').some(p=>p.startsWith('.')))return json(res,403,{});
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile())return json(res,404,{});
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(filename)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(fs.readFileSync(filename));
 }).catch(e=>json(res,500,{message:String(e)}));}).listen(8879,'127.0.0.1',()=>console.log('Disposable QA server http://127.0.0.1:8879 — test-only credentials, in-memory database'));
})();
