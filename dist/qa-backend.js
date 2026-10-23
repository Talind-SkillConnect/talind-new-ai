/* Talind FULL-SITE QA, simulated browser database.
   Loaded ONLY by /testing.html; the production index loads the real Supabase SDK.
   There is no network, real login, email delivery, payment, or SQL authorization test. */
(function(){
'use strict';
const KEY='talind_fullsite_qa_v1';
const TABLES=['profiles','role_profiles','profile_skills','public_profiles','learner_requirements','match_connections','match_messages','engagement_agreements','memberships'];
const fresh=()=>({accounts:[],activeId:null,tables:Object.fromEntries(TABLES.map(x=>[x,[]]))});
let data;
try{
  const raw=localStorage.getItem(KEY);
  data=raw?JSON.parse(raw):fresh();
  if(!data||!Array.isArray(data.accounts)||!data.tables)throw Error('invalid local data');
  TABLES.forEach(t=>{if(!Array.isArray(data.tables[t]))data.tables[t]=[];});
}catch(e){data=fresh();}
let warning='';
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(data));warning='';}
  catch(e){warning='Browser storage is full. Export or clear large test data.';console.warn(warning,e);}
}
function uuid(){
  return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'qa-'+Date.now()+'-'+Math.random().toString(36).slice(2);
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function active(){return data.accounts.find(a=>a.id===data.activeId)||null;}
function session(){const a=active();return a?{user:{id:a.id,email:a.email,user_metadata:{role:a.role},app_metadata:{qa:true}}}:null;}
function member(uid,plan){return data.tables.memberships.some(m=>m.user_id===uid&&m.plan_code===plan&&m.status==='active');}
function connectionFor(id){return data.tables.match_connections.find(c=>c.id===id);}
function accessError(message){return {data:null,error:{message:message}};}
function roleFor(uid){return data.accounts.find(a=>a.id===uid)?.role||null;}
function contactDecision(params){
 const caller=active();
 if(!caller)return {allowed:false,reason:'Choose a test account first.'};
 const target=data.accounts.find(x=>x.id===params.p_target_user);
 if(!target)return {allowed:false,reason:'No such dummy test account.'};
 const callerRole=caller.role,role=target.role;
 const c=data.tables.match_connections.find(x=>x.id===params.p_connection_id &&
  ((x.initiator_user_id===caller.id&&x.target_user_id===target.id)||
   (x.target_user_id===caller.id&&x.initiator_user_id===target.id)));
 let allowed=false,reason='Contact is not available for this scenario.';
 if(callerRole==='learner'&&role!=='learner'&&role!=='teacher'){allowed=true;}
 else if(callerRole==='teacher'&&role==='institution'){allowed=!!c;reason='Connect with the institution first.';}
 else if(callerRole==='learner'&&role==='teacher'||callerRole==='teacher'&&role==='learner'){
    const approved=!!c&&c.status==='accepted';
    const teacherId=callerRole==='teacher'?caller.id:target.id;
    const providerAgreement=data.tables.engagement_agreements.some(a=>a.connection_id===c?.id&&a.user_id===teacherId&&a.agreement_type==='provider_professional');
    const guardianId=callerRole==='learner'?caller.id:target.id;
    const parentAgreement=data.tables.engagement_agreements.some(a=>a.connection_id===c?.id&&a.user_id===guardianId&&a.agreement_type==='guardian_contact_consent');
    allowed=approved&&member(teacherId,'teacher-services')&&providerAgreement&&parentAgreement;
    reason='Quote acceptance, active Teacher Services membership and both agreements are required.';
 }else if(callerRole==='institution'&&role==='teacher'){allowed=member(caller.id,'institution')&&!!c;reason='Institution membership and a connection are required.';}
 else if(callerRole==='training'&&role!=='training'){allowed=member(caller.id,'training')&&!!c;reason='Training Provider membership and a connection are required.';}
 else if(callerRole==='institution'&&role==='training'){allowed=member(caller.id,'institution')&&!!c;reason='Institution membership and a connection are required.';}
 return allowed?{allowed:true,reason:'Allowed in simulated QA',display_name:target.nickname||target.email,email:target.email,phone:'Not provided (demo)',whatsapp:'Not provided (demo)'}:{allowed:false,reason};
}
function writeGuard(table,operation,rows,changes={}){
 const a=active();
 if(!a)throw Error('Select a QA account.');
 const uid=a.id;
 for(const row of rows){
   if(['profiles','role_profiles','profile_skills','public_profiles','learner_requirements','memberships','engagement_agreements'].includes(table) &&
      row.user_id!=null && row.user_id!==uid && !(table==='profiles'&&row.id===uid)) throw Error('QA ownership check failed.');
   if(table==='profiles'&&row.id!==uid)throw Error('QA profile ownership check failed.');
   if(table==='match_connections'){
     const existing=operation==='update'?connectionFor(row.id):null;
     const c=existing?Object.assign({},existing,row):row;
     if(c.initiator_user_id!==uid&&c.target_user_id!==uid)throw Error('This is not your match.');
     if(operation==='insert'){
       if(c.initiator_user_id!==uid||c.initiator_role!==a.role||roleFor(c.target_user_id)!==c.target_role)throw Error('QA role authorization denied.');
       const targetRole=c.target_role;
       if(a.role==='teacher'&&targetRole==='learner'&&!member(uid,'teacher-services'))throw Error('Teacher Services membership required.');
       if(a.role==='institution'&&!member(uid,'institution'))throw Error('Institution membership required.');
       if(a.role==='training'&&!member(uid,'training'))throw Error('Training membership required.');
     }
     if(operation==='update'&&'quote_amount' in changes){
       if(a.role!=='teacher'||!(c.initiator_role==='learner'||c.target_role==='learner')||!member(uid,'teacher-services'))throw Error('Only active Teacher Services members may submit quotes.');
     }
     if(operation==='update'&&changes.status==='accepted'&&c.quote_amount!=null&&a.role!=='learner')throw Error('Only a learner/parent can accept a teacher quote.');
   }
   if(table==='match_messages'){
     const c=connectionFor(row.connection_id);
     if(!c||(c.initiator_user_id!==uid&&c.target_user_id!==uid))throw Error('Not part of this conversation.');
     if(row.sender_user_id!==uid)throw Error('Cannot send as another account.');
     const targetRole=c.initiator_user_id===uid?c.target_role:c.initiator_role;
     if(a.role==='teacher'&&targetRole==='learner'&&!member(uid,'teacher-services')){
       const incoming=data.tables.match_messages.some(x=>x.connection_id===c.id&&x.sender_user_id!==uid);
       if(!incoming)throw Error('Teacher Services membership or an incoming learner message required.');
     }
     if(a.role==='institution'&&!member(uid,'institution'))throw Error('Institution membership required.');
     if(a.role==='training'&&!member(uid,'training'))throw Error('Training membership required.');
   }
   if(table==='engagement_agreements'){
     const c=connectionFor(row.connection_id);
     if(!c||c.status!=='accepted'||row.user_id!==uid)throw Error('An accepted connection is required.');
     if(row.agreement_type==='provider_professional'&&a.role!=='teacher')throw Error('Professional agreement is for teachers.');
     if(row.agreement_type==='guardian_contact_consent'&&a.role!=='learner')throw Error('Guardian consent is for learners/parents.');
   }
 }
}
class Query{
 constructor(table){this.table=table;this.action='select';this.payload=null;this.conditions=[];this.orClauses=[];this.cols='*';this.one=false;this.maybe=false;this.ordering=null;this.take=null;this.returnRows=false;this.conflict='';}
 select(columns='*'){this.cols=columns;this.returnRows=true;return this;}
 eq(k,v){this.conditions.push(r=>r[k]===v);return this;}
 neq(k,v){this.conditions.push(r=>r[k]!==v);return this;}
 is(k,v){this.conditions.push(r=>r[k]===v);return this;}
 in(k,vs){this.conditions.push(r=>vs.includes(r[k]));return this;}
 or(raw){const parts=String(raw).split(',').map(s=>s.match(/^([a-z_]+)\.eq\.(.*)$/)).filter(Boolean);this.orClauses.push(r=>parts.some(p=>String(r[p[1]])===p[2]));return this;}
 order(col,opts={}){this.ordering={col,asc:opts.ascending!==false};return this;}
 limit(n){this.take=n;return this;}
 insert(payload){this.action='insert';this.payload=payload;return this;}
 update(payload){this.action='update';this.payload=payload;return this;}
 delete(){this.action='delete';return this;}
 upsert(payload,opts={}){this.action='upsert';this.payload=payload;this.conflict=opts.onConflict||'';return this;}
 single(){this.one=true;this.maybe=false;return this.run();}
 maybeSingle(){this.one=true;this.maybe=true;return this.run();}
 then(resolve,reject){return this.run().then(resolve,reject);}
 async run(){
  try{
   const table=data.tables[this.table];
   if(!table)throw Error('Unsupported QA table '+this.table);
   const where=r=>this.conditions.every(fn=>fn(r))&&this.orClauses.every(fn=>fn(r));
   let rows=[];
   if(this.action==='select'){rows=table.filter(where).map(clone);}
   else if(this.action==='insert'||this.action==='upsert'){
     const incoming=(Array.isArray(this.payload)?this.payload:[this.payload]).map(clone);
     writeGuard(this.table,this.action,incoming);
     const conflictKeys=(this.conflict||({profiles:'id',role_profiles:'user_id,role',public_profiles:'user_id,role',learner_requirements:'user_id,slot',memberships:'user_id,plan_code',engagement_agreements:'connection_id,user_id,agreement_type'}[this.table]||'id')).split(',').map(x=>x.trim());
     for(const row of incoming){
       if(!row.id && !['profiles','role_profiles','public_profiles','memberships'].includes(this.table))row.id=uuid();
       const n=table.findIndex(x=>conflictKeys.every(k=>x[k]===row[k]));
       if(this.action==='upsert'&&n>=0){table[n]=Object.assign({},table[n],row,{updated_at:new Date().toISOString()});rows.push(clone(table[n]));}
       else{const created=Object.assign({created_at:new Date().toISOString()},row);table.push(created);rows.push(clone(created));}
     }
     save();
   }else if(this.action==='update'){
     const found=table.filter(where);
     const incoming=found.map(r=>Object.assign({},r,this.payload));
     writeGuard(this.table,'update',incoming,this.payload);
     for(const row of incoming){
       const n=table.findIndex(r=>r.id===row.id || (this.table==='profiles'&&r.id===row.id));
       if(n>=0){table[n]=Object.assign({},row,{updated_at:new Date().toISOString()});rows.push(clone(table[n]));}
     }
     save();
   }else if(this.action==='delete'){
     const found=table.filter(where);
     if(['profile_skills','learner_requirements','engagement_agreements'].includes(this.table))writeGuard(this.table,'delete',found);
     data.tables[this.table]=table.filter(r=>!where(r));
     rows=found.map(clone);save();
   }
   if(this.ordering)rows.sort((a,b)=>{const v1=a[this.ordering.col]||'',v2=b[this.ordering.col]||'';return this.ordering.asc?String(v1).localeCompare(String(v2)):String(v2).localeCompare(String(v1));});
   if(this.take!==null)rows=rows.slice(0,this.take);
   if(this.cols!=='*'&&this.action==='select'){const keys=String(this.cols).split(',').map(s=>s.trim());rows=rows.map(x=>Object.fromEntries(keys.map(k=>[k,x[k]])));}
   if(this.one)return {data:rows[0]||null,error:rows.length===0&&!this.maybe?{message:'No matching QA record.'}:null};
   if(this.action==='select'||this.returnRows)return {data:rows,error:null};
   return {data:null,error:null};
  }catch(e){return accessError(e.message||String(e));}
 }
}
function buildEmail(role){let n=1;while(data.accounts.some(a=>a.email==='qa-'+role+'-'+String(n).padStart(3,'0')+'@example.invalid'))n++;return 'qa-'+role+'-'+String(n).padStart(3,'0')+'@example.invalid';}
function create(role,nickname,email){
 if(!['learner','teacher','institution','training'].includes(role))throw Error('Unsupported stakeholder category.');
 email=String(email||buildEmail(role)).trim().toLowerCase();
 if(!/^[a-z0-9._+-]+@example\.invalid$/.test(email))throw Error('For safety use a dummy email ending @example.invalid.');
 if(data.accounts.some(a=>a.email===email))throw Error('This dummy email is already in use. Select the existing account.');
 const a={id:uuid(),role,email,nickname:String(nickname||'').trim().slice(0,90),createdAt:new Date().toISOString()};
 data.accounts.push(a);data.activeId=a.id;save();return a;
}
function activate(id){if(!data.accounts.some(a=>a.id===id))throw Error('Test account not found.');data.activeId=id;save();return session();}
function toggleMembership(plan,on){
 const a=active();if(!a)throw Error('Select a test account first.');
 if(!['teacher-services','institution','training'].includes(plan))throw Error('Unsupported membership plan.');
 data.tables.memberships=data.tables.memberships.filter(x=>!(x.user_id===a.id&&x.plan_code===plan));
 if(on)data.tables.memberships.push({id:uuid(),user_id:a.id,plan_code:plan,status:'active',starts_at:new Date().toISOString(),ends_at:null});
 save();
}
const client={
 auth:{
  getSession:async()=>({data:{session:session()},error:null}),
  signUp:async({email,options})=>{
   try{const a=create(options?.data?.role||'learner','',email);return {data:{user:session().user,session:session()},error:null};}catch(e){return {data:{user:null,session:null},error:{message:e.message}}}
  },
  signInWithPassword:async({email})=>{
   const a=data.accounts.find(x=>x.email===String(email||'').toLowerCase());
   if(!a)return {data:{session:null},error:{message:'Dummy account not found.'}};
   activate(a.id);return {data:{session:session()},error:null};
  },
  signOut:async()=>{data.activeId=null;save();return {error:null};},
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  resetPasswordForEmail:async()=>({error:{message:'Not available in simulated QA.'}}),
  updateUser:async()=>({error:{message:'Not available in simulated QA.'}})
 },
 from:(table)=>new Query(table),
 rpc:async(name,params)=>({data:[contactDecision(params||{})],error:null}),
 storage:{from:()=>({
  upload:async()=>({data:{path:'qa-metadata-only'},error:null}),
  remove:async()=>({data:[],error:null}),
  createSignedUrl:async()=>({data:null,error:{message:'QA stores document metadata only; files are not uploaded or retained.'}})
 })}
};
window.supabase={createClient:()=>client};
window.talindQADatabase={
 create,activate,session,active,buildEmail,toggleMembership,member,
 list:()=>clone(data.accounts),
 counters:()=>Object.fromEntries(TABLES.map(k=>[k,data.tables[k].length])),
 export:()=>clone(data),
 clear:()=>{data=fresh();save();},
 warning:()=>warning,
 hasData:()=>data.accounts.length>0
};
})();
