/* Talind full-website manual QA controls; loaded only by /testing.html. */
(function(){
'use strict';
const qa=window.talindQADatabase;
if(!qa)throw Error('QA test adapter missing.');
const css=document.createElement('style');
css.textContent=[
'body{padding-top:77px}',
'.qa-topbar{position:fixed;z-index:9999;top:0;left:0;right:0;background:#142f2b;color:#e3f6eb;border-bottom:2px solid #b3e9be;padding:10px clamp(12px,2vw,35px);font:13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;flex-wrap:wrap;box-shadow:0 4px 20px #0002}',
'.qa-topbar strong{font-weight:800;white-space:nowrap;color:#b5f3c6}',
'.qa-topbar label{color:#fff;font:12px system-ui,sans-serif;display:flex;align-items:center;gap:6px;margin:0}',
'.qa-topbar select{width:auto;min-width:160px;max-width:240px;font:12px system-ui,sans-serif;height:34px;min-height:34px;padding:5px;border:1px solid #acd6c1;border-radius:6px;color:#12392a;background:white}',
'.qa-topbar button{font:600 12px system-ui,sans-serif;padding:8px 10px;border-radius:7px;cursor:pointer;border:1px solid #b1e6c1;background:#d8f6e3;color:#084331}',
'.qa-topbar button.secondary{background:transparent;color:#d9f7e1}',
'.qa-test-badge{background:#cfeadd;color:#145441;font-size:10px;font-weight:850;border-radius:7px;padding:4px 7px}',
'@media(max-width:850px){body{padding-top:128px}.qa-topbar{min-height:118px}.qa-topbar select{min-width:130px}}',
'.qa-dialog-tip{background:#eaf7ed;padding:12px;border:1px solid #bbe0c6;border-radius:9px;font-size:13px;color:#215646;margin-bottom:15px}'
].join('');
document.head.appendChild(css);
document.body.classList.add('qa-mode');
document.title='TESTING MODE · Talind Full Website';
const strip=document.createElement('div');strip.id='qa-toolbar';strip.className='qa-topbar';strip.setAttribute('role','region');strip.setAttribute('aria-label','Talind testing controls');document.body.insertBefore(strip,document.body.firstChild);

function qaCount(){const c=qa.counters();return (c.public_profiles||0)+' profiles · '+(c.learner_requirements||0)+' requirements · '+(c.match_connections||0)+' connections';}
function qaRefreshBar(){
 const accounts=qa.list(),current=qa.active();
 const opts='<option value="">Choose dummy account…</option>'+accounts.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===current?.id?'selected':'')+'>'+esc((a.nickname||a.email)+' · '+roleNames[a.role])+'</option>').join('');
 strip.innerHTML='<span class="qa-test-badge">TEST MODE</span><strong>Manual full-site QA</strong>'+
 '<label for="qa-account-list">Account <select id="qa-account-list" aria-label="Switch QA account">'+opts+'</select></label>'+
 '<button type="button" onclick="qaCreateAccount()">+ New stakeholder</button>'+
 (current?'<button type="button" class="secondary" onclick="qaMembershipPanel()">Test membership</button>':'')+
 '<button type="button" class="secondary" onclick="qaExportData()">Export data</button>'+
 '<button type="button" class="secondary" onclick="qaResetData()">Reset</button>'+
 '<span style="font-size:10px;color:#bcd9cd">'+esc(qaCount())+'</span>';
 const select=document.getElementById('qa-account-list');
 select.onchange=async function(){await qaSwitchAccount(select.value);};
 updateAuthHeader();
}
function updateAuthHeader(){
 const h=document.getElementById('auth-actions');if(!h)return;
 const a=qa.active();
 h.innerHTML=a
  ?'<button class="btn light" onclick="navigate(\'profile\')">Edit test profile</button><button class="text-button" onclick="qaCreateAccount()">+ Add dummy account</button>'
  :'<button class="btn" onclick="qaCreateAccount()">Create dummy account</button>';
}
function authScreen(){qaCreateAccount();}
async function qaSwitchAccount(id,skipSave=false){
 try{
   if(!skipSave&&talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();
   if(id)qa.activate(id);
   else await talindSupabase.auth.signOut();
   registration.records={};registration.step=0;
   state.saved=new Set();state.enquiries=[];state.applications=[];state.requirements=[];state.services=[];
   if(typeof shortlistCompareSelection!=='undefined')shortlistCompareSelection.clear();
   if(typeof liveDiscovery!=='undefined'){liveDiscovery.loaded=false;liveDiscovery.error=null;}
   const next=qa.session();
   await cloudHandleSession(next);
   if(next?.user){
     await liveLoadDiscovery();
     location.hash='#workspace';
   }else location.hash='#explore';
   qaRefreshBar();render();
   if(!next?.user)toast('Select or create a dummy account to begin manual testing.');
 }catch(e){console.error('QA switch failed',e);toast(e.message||'Could not change QA account.');qaRefreshBar();}
}
function qaCreateAccount(){
 const roleOpts=Object.entries(roleNames).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
 modal('<span class="eyebrow">TALIND · MANUAL TESTING</span><h2>Create a dummy stakeholder account</h2>'+
 '<div class="qa-dialog-tip">No password, login or email confirmation. Each account has its own editable profile, matches, messages and test membership state. All entries remain in this browser only; please do not use real personal information.</div>'+
 '<form id="qa-create-form"><div class="fields">'+
 '<label class="full">Stakeholder category<select name="role" id="qa-create-role" required>'+roleOpts+'</select></label>'+
 '<label class="full">Testing account label<input name="nickname" placeholder="Example: CBSE Maths Teacher A" required maxlength="90"></label>'+
 '<label class="full">Dummy email address<input type="email" name="email" id="qa-create-email" required value="'+esc(qa.buildEmail('learner'))+'" placeholder="qa-learner-001@example.invalid"></label>'+
 '</div><p id="qa-create-error" role="alert" class="form-error"></p><div class="dialog-actions"><button type="submit" class="btn">Create & open full profile</button><button type="button" class="btn outline" onclick="$(\'#modal\').close()">Cancel</button></div></form>');
 document.getElementById('qa-create-role').onchange=function(){document.getElementById('qa-create-email').value=qa.buildEmail(this.value);};
 document.getElementById('qa-create-form').onsubmit=async function(e){
   e.preventDefault();
   const error=document.getElementById('qa-create-error'),submit=this.querySelector('[type=submit]');
   submit.disabled=true;error.textContent='';
   try{
     if(talindCurrentUser)await cloudSaveCurrentRole();
     const d=new FormData(this);
     const account=qa.create(d.get('role'),d.get('nickname'),d.get('email'));
     document.getElementById('modal').close();
     await qaSwitchAccount(account.id,true);
     navigate('profile');
     toast('Test account ready. Enter the full stakeholder details.');
   }catch(ex){error.textContent=ex.message||'Could not create QA account.';}
   finally{submit.disabled=false;}
 };
}
function qaMembershipPanel(){
 const account=qa.active();if(!account)return qaCreateAccount();
 const roles={teacher:'teacher-services',institution:'institution',training:'training'};
 const plan=roles[account.role];
 if(!plan){
   modal('<h2>Student / Parent</h2><p class="muted">Discovery and initiating enquiries are free for learners and parents in this test.</p><button class="btn" onclick="$(\'#modal\').close()">Close</button>');
   return;
 }
 const current=qa.member(account.id,plan);
 modal('<span class="eyebrow">SIMULATED MEMBERSHIP</span><h2>Test paid versus free access</h2>'+
 '<div class="qa-dialog-tip">This switch simulates membership responses only. It does not charge, activate a real subscription, call Razorpay, or test production RLS.</div>'+
 '<p><strong>'+esc(roleNames[account.role])+'</strong> · '+esc(account.email)+'</p>'+
 '<p>Membership: <strong>'+(current?'ACTIVE (TEST)':'INACTIVE (TEST)')+'</strong></p>'+
 '<div class="dialog-actions"><button class="btn" onclick="qaSetMembership('+(!current)+')">'+(current?'Deactivate test membership':'Activate test membership')+'</button><button class="btn outline" onclick="$(\'#modal\').close()">Close</button></div>');
}
async function qaSetMembership(value){
 const a=qa.active();if(!a)return;
 const plan={teacher:'teacher-services',institution:'institution',training:'training'}[a.role];
 if(!plan)return;
 qa.toggleMembership(plan,value);
 await matchLoadState();
 document.getElementById('modal').close();
 qaRefreshBar();render();
 toast(value?'Test membership ACTIVE — no payment made.':'Test membership inactive.');
}
function qaExportData(){
 const snapshot=qa.export();
 const blob=new Blob([JSON.stringify({label:'TALIND QA DATA - NOT FOR LIVE IMPORT',exportedAt:new Date().toISOString(),...snapshot},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='talind-manual-qa-backup.json';document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
 toast('QA snapshot saved to your downloads.');
}
async function qaResetData(){
 if(!confirm('Delete all dummy accounts, profiles, chats, requirements and simulated memberships from THIS browser? This cannot be undone. Export a backup first if needed.'))return;
 qa.clear();registration.records={};registration.step=0;
 await cloudHandleSession(null);location.hash='#explore';qaRefreshBar();render();toast('Dummy QA browser data cleared.');
}
async function demoLogout(){await qaSwitchAccount('');}
Object.assign(window,{qaSwitchAccount,qaCreateAccount,qaMembershipPanel,qaSetMembership,qaExportData,qaResetData});
qaRefreshBar();
if(!qa.active()){
 const showOnLoad=()=>{if(!qa.active())qaCreateAccount();};
 setTimeout(showOnLoad,350);
}
})();
