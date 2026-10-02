// Live Talind user-to-user matching using safe public discovery records.
const liveDiscovery={profiles:[],requirements:[],loaded:false,error:null};

function liveNorm(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function liveWords(v){return new Set(liveNorm(Array.isArray(v)?v.join(' '):v).split(/\s+/).filter(function(x){return x.length>2}))}
function liveOverlap(a,b){const A=liveWords(a),B=liveWords(b);let n=0;for(const x of A)if(B.has(x))n++;return n}
function liveInitials(name){return String(name||'T').split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return (x[0]||'T').toUpperCase()}).join('')||'T'}

function liveCurrentSignals(){
  const r=record(),f=r.fields||{};
  const skills=(r.skills||[]).map(function(s){return s.name}).filter(Boolean);
  const more=Object.entries(f).filter(function(kv){return /^main_|^second_/.test(kv[0])}).map(function(kv){return kv[1]});
  return {skills:skills,text:[f.needs,f.secondNeed,f.goals,f.subjects,f.grades,f.boards,f.serviceTypes,f.preferredLocations,f.mode,f.city].concat(more).filter(Boolean).join(' '),city:f.city||'',mode:f.mode||f.format||''};
}
function liveMatchScore(item){
  const sig=liveCurrentSignals();
  const itemText=[item.title,item.desc,item.location,item.mode].concat(item.tags||[]).join(' ');
  const skillHits=liveOverlap(sig.skills,item.tags||[]);
  const textHits=liveOverlap(sig.text,itemText);
  const sameCity=sig.city&&item.location&&liveNorm(sig.city)===liveNorm(item.location);
  const online=liveNorm(item.mode).indexOf('online')>=0||liveNorm(item.mode).indexOf('flexible')>=0;
  let score=skillHits*50+textHits*12+(sameCity?18:0)+(online?6:0);
  if(item.kind==='teacher'&&state.role==='learner')score+=8;
  if(item.kind==='requirement'&&['teacher','training'].includes(state.role))score+=8;
  return score;
}
function liveReason(item){
  const sig=liveCurrentSignals();
  const hits=(item.tags||[]).filter(function(t){return liveOverlap(sig.skills,[t])>0}).slice(0,3);
  if(hits.length)return 'Skill match: '+hits.join(', ');
  if(sig.city&&item.location&&liveNorm(sig.city)===liveNorm(item.location))return 'Same location';
  if(liveNorm(item.mode).indexOf('online')>=0)return 'Online option available';
  return 'Relevant to your selected Talind role and goals';
}
function liveTeacherItems(){
  return (liveDiscovery.profiles||[]).filter(function(p){return p.role==='teacher'&&p.is_active&&p.user_id!==talindCurrentUser?.id}).map(function(p,i){
    const x={live:true,kind:'teacher',key:'teacher:'+p.user_id,id:700000+i,name:p.display_name||'Teacher / Expert',initials:liveInitials(p.display_name),type:'Teacher / Expert',title:p.headline||'Teacher / Expert',subtitle:p.city||p.region||'Location not specified',desc:p.bio||'Talind teacher profile',tags:Array.isArray(p.skills)?p.skills:[],location:p.city||p.region||p.country||'Not specified',mode:p.mode||'Flexible',price:'Connect through Talind',note:'Contact details stay private',publicRow:p};
    x.matchScore=liveMatchScore(x);x.matchReason=liveReason(x);return x;
  }).sort(function(a,b){return b.matchScore-a.matchScore});
}
function liveRequirementItems(){
  return (liveDiscovery.requirements||[]).filter(function(r){return r.status==='active'&&r.user_id!==talindCurrentUser?.id}).map(function(r,i){
    const d=r.details||{};
    const x={live:true,kind:'requirement',key:'requirement:'+r.id,id:800000+i,name:'Student / Parent requirement',initials:'SP',type:'Learning Requirement',title:r.title||r.requirement_type||'Learning requirement',subtitle:r.requirement_type||'Student / Parent',desc:[r.subject_skill,r.timing?'Timing: '+r.timing:'',d.budget_text?'Budget: '+d.budget_text:''].filter(Boolean).join(' - '),tags:[r.requirement_type,r.subject_skill,d.grade,d.curriculum,d.learner_stage].filter(Boolean),location:r.location||'Not specified',mode:r.mode||'Flexible',price:d.budget_text||'Budget to be discussed',note:'Parent/adult-managed enquiry',requirementRow:r};
    x.matchScore=liveMatchScore(x);x.matchReason=liveReason(x);return x;
  }).sort(function(a,b){return b.matchScore-a.matchScore});
}
function liveMatchCard(i){
  return '<article class="card"><div class="card-top"><span class="badge">'+esc(i.type)+'</span><span class="badge">'+esc(i.matchReason)+'</span></div><div class="card-body"><div class="identity"><div class="initials">'+esc(i.initials)+'</div><div><h3>'+esc(i.name)+'</h3><small>'+esc(i.subtitle)+'</small></div></div><h3>'+esc(i.title)+'</h3><p class="desc">'+esc(i.desc||'')+'</p><div class="tags">'+(i.tags||[]).slice(0,6).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div><div class="meta"><span>Location: '+esc(i.location)+'</span><span>Mode: '+esc(i.mode)+'</span></div></div><div class="card-foot"><div class="price">'+esc(i.price)+'<small>'+esc(i.note)+'</small></div><button class="btn light" onclick="liveMatchDetail(\''+i.key+'\')">View match</button></div></article>';
}
function liveFind(key){
  if(String(key).startsWith('teacher:'))return liveTeacherItems().find(function(x){return x.key===key});
  return liveRequirementItems().find(function(x){return x.key===key});
}
function liveMatchDetail(key){
  const i=liveFind(key);if(!i)return;
  if(i.kind==='teacher'){
    modal('<span class="eyebrow">TALIND MATCH - TEACHER / EXPERT</span><h2>'+esc(i.name)+'</h2><p class="muted">'+esc(i.title)+' - '+esc(i.location)+' - '+esc(i.mode)+'</p><div class="tags">'+i.tags.map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div><p class="muted">'+esc(i.desc)+'</p><div class="notice"><strong>'+esc(i.matchReason)+'</strong><br>Contact information stays private until an enquiry is accepted.</div><div class="dialog-actions"><button class="btn" onclick="liveStartConnection(\''+i.key+'\')">Express interest</button></div>');
  }else{
    modal('<span class="eyebrow">TALIND MATCH - LEARNING REQUIREMENT</span><h2>'+esc(i.title)+'</h2><p class="muted">'+esc(i.location)+' - '+esc(i.mode)+'</p><div class="tags">'+i.tags.map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div><p class="muted">'+esc(i.desc)+'</p><div class="notice"><strong>'+esc(i.matchReason)+'</strong><br>No learner or parent contact details are exposed.</div><div class="dialog-actions"><button class="btn" onclick="liveStartConnection(\''+i.key+'\')">Offer relevant support</button></div>');
  }
}
function liveStartConnection(key){
  const i=liveFind(key);if(!i)return;$('#modal').close();
  toast(i.kind==='teacher'?'Interest noted. Direct enquiry messaging is the next integration.':'Offer intent noted. Direct enquiry messaging is the next integration.');
}
async function liveLoadDiscovery(){
  if(!talindCurrentUser){liveDiscovery.profiles=[];liveDiscovery.requirements=[];liveDiscovery.loaded=false;return}
  try{
    const out=await Promise.all([
      talindSupabase.from('public_profiles').select('user_id,role,display_name,headline,bio,city,region,country,mode,skills,purposes,is_active').eq('is_active',true),
      talindSupabase.from('learner_requirements').select('id,user_id,slot,title,requirement_type,subject_skill,location,mode,budget_unit,timing,start_preference,details,status').eq('status','active')
    ]);
    if(out[0].error)throw out[0].error;if(out[1].error)throw out[1].error;
    liveDiscovery.profiles=out[0].data||[];liveDiscovery.requirements=out[1].data||[];liveDiscovery.loaded=true;liveDiscovery.error=null;
  }catch(error){liveDiscovery.error=error;console.warn('Talind live matching data unavailable',error)}
}
opportunitySection=function(section){
  return '<section class="opportunity-section"><div class="section-top"><div><h2>'+esc(section.name)+'</h2><p>'+esc(section.why)+'</p></div></div><div class="cards">'+(section.items.length?section.items.slice(0,6).map(function(i){return i.live?liveMatchCard(i):card(i)}).join(''):'<div class="empty"><h3>No matching opportunities yet</h3><p class="muted">Complete your profile with clear skills, location and preferences. New matches will appear as relevant members publish their profiles.</p></div>')+'</div></section>';
};
window.opportunitiesForRole=function(){
  if(state.role==='learner')return [{name:'Teacher & expert matches',why:'Matched from your learning needs, skills, location and preferred mode.',items:liveTeacherItems()}];
  if(state.role==='teacher')return [{name:'Student / parent requirements',why:'Matched from the skills you can teach and your service preferences.',items:liveRequirementItems()}];
  if(state.role==='institution')return [{name:'Teacher & expert profiles',why:'Published teacher profiles relevant to your institution.',items:liveTeacherItems()}];
  if(state.role==='training')return [{name:'Individual learner requirements',why:'Published learner needs relevant to your training expertise.',items:liveRequirementItems()}];
  return [];
};
const liveBaseWorkspace=workspace;
workspace=function(){
  liveBaseWorkspace();
  if(talindCurrentUser&&!liveDiscovery.loaded&&!liveDiscovery.error){
    $('#main').insertAdjacentHTML('afterbegin','<div class="notice"><strong>Loading Talind matches...</strong></div>');
    liveLoadDiscovery().then(function(){render()});
  }else if(liveDiscovery.error){
    $('#main').insertAdjacentHTML('afterbegin','<div class="notice"><strong>Matching setup is not active yet.</strong> Complete the database discovery step, then refresh.</div>');
  }
};
const liveBaseExplore=explore;
explore=function(){
  if(state.role==='learner'&&talindCurrentUser){
    const items=liveTeacherItems();
    $('#main').innerHTML=intro('TALIND MATCH','Find teachers and experts matched to your goals.','Matches use published skills, location and learning preferences.','Free for students & parents')+'<div class="section-top"><div><h2>Teacher & expert matches</h2><p>Relevant published profiles from Talind.</p></div><span class="count">'+items.length+' results</span></div><div class="cards">'+(items.length?items.map(liveMatchCard).join(''):'<div class="empty"><h3>No matches yet</h3><p class="muted">Complete your profile and learning requirements. Matching profiles will appear here when available.</p></div>');
    side('explore');return;
  }
  if(state.role==='teacher'&&talindCurrentUser){
    const items=liveRequirementItems();
    $('#main').innerHTML=intro('TALIND MATCH','Find learners who need your skills.','Published requirements are matched to the skills and services in your profile.','Job seeking is free')+'<div class="section-top"><div><h2>Student / parent requirements</h2><p>Relevant learning needs from Talind.</p></div><span class="count">'+items.length+' results</span></div><div class="cards">'+(items.length?items.map(liveMatchCard).join(''):'<div class="empty"><h3>No matches yet</h3><p class="muted">Complete your teaching skills and service preferences. Relevant learner requirements will appear here.</p></div>');
    side('explore');return;
  }
  liveBaseExplore();
};
(async function(){
  try{
    const x=await talindSupabase.auth.getSession();
    if(x.data&&x.data.session&&x.data.session.user){await liveLoadDiscovery();render()}
  }catch(e){console.warn('Talind match init pending',e)}
})();
