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
  return (liveDiscovery.profiles||[]).filter(function(p){
    if(!(p.role==='teacher'&&p.is_active&&p.user_id!==talindCurrentUser?.id))return false;
    const purposes=Array.isArray(p.purposes)?p.purposes:[];
    if(state.role==='learner')return purposes.includes('Offer tuition / coaching / training');
    if(state.role==='institution')return purposes.includes('Find a job');
    return true;
  }).map(function(p,i){
    const x={live:true,kind:'teacher',key:'teacher:'+p.user_id,id:700000+i,name:p.display_name||'Teacher / Expert',initials:liveInitials(p.display_name),type:'Teacher / Expert',title:p.headline||'Teacher / Expert',subtitle:p.city||p.region||'Location not specified',desc:p.bio||'Talind teacher profile',tags:Array.isArray(p.skills)?p.skills:[],location:p.city||p.region||p.country||'Not specified',mode:p.mode||'Flexible',price:'Connect through Talind',note:'Contact details stay private',publicRow:p};
    x.matchScore=liveMatchScore(x);x.matchReason=liveReason(x);return x;
  }).sort(function(a,b){return b.matchScore-a.matchScore});
}
function livePublicProfileItems(role,kind,typeLabel){
  return (liveDiscovery.profiles||[]).filter(function(p){return p.role===role&&p.is_active&&p.user_id!==talindCurrentUser?.id}).map(function(p,i){
    const purposes=Array.isArray(p.purposes)?p.purposes:[];
    const tags=[].concat(Array.isArray(p.skills)?p.skills:[],purposes).filter(Boolean);
    const x={live:true,kind:kind,key:kind+':'+p.user_id,id:(role==='institution'?820000:830000)+i,name:p.display_name||(role==='institution'?'School / College':'Training Provider'),initials:liveInitials(p.display_name),type:typeLabel,title:p.headline||typeLabel,subtitle:p.city||p.region||'Location not specified',desc:p.bio||(role==='institution'?'Institution profile on Talind':'Training provider profile on Talind'),tags:tags,location:p.city||p.region||p.country||'Not specified',mode:p.mode||'Flexible',price:'Connect through Talind',note:'Published Talind profile',publicRow:p};
    x.matchScore=liveMatchScore(x);x.matchReason=liveReason(x);return x;
  }).sort(function(a,b){return b.matchScore-a.matchScore});
}
function liveInstitutionItems(){return livePublicProfileItems('institution','institution','School / College')}
function liveTrainingItems(){return livePublicProfileItems('training','training','Training Provider')}
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
  key=String(key);
  if(key.startsWith('teacher:'))return liveTeacherItems().find(function(x){return x.key===key});
  if(key.startsWith('institution:'))return liveInstitutionItems().find(function(x){return x.key===key});
  if(key.startsWith('training:'))return liveTrainingItems().find(function(x){return x.key===key});
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
  const f=record().fields||{},purposes=Array.isArray(f.purposes)?f.purposes:[];
  if(state.role==='learner'){
    const sections=[{name:'Teacher & expert matches',why:'Matched from your learning needs, skills, location and preferred mode.',items:liveTeacherItems()}];
    const wantsAdmission=/admission/i.test([f.needs,f.secondNeed].filter(Boolean).join(' '));
    const wantsCourses=/tuition|skill|neet|jee|coaching/i.test([f.needs,f.secondNeed,f.goals].filter(Boolean).join(' '));
    if(wantsCourses||!wantsAdmission)sections.push({name:'Training & coaching providers',why:'Providers offering relevant learning, coaching and skill-development opportunities.',items:liveTrainingItems().filter(function(i){return !i.publicRow.purposes?.length||i.publicRow.purposes.includes('Individual learner enrolment')})});
    if(wantsAdmission)sections.push({name:'Schools & colleges',why:'Institutions published for admissions and learner discovery.',items:liveInstitutionItems().filter(function(i){return !i.publicRow.purposes?.length||i.publicRow.purposes.includes('Promote admissions')})});
    return sections;
  }
  if(state.role==='teacher'){
    const sections=[];
    if(!purposes.length||purposes.includes('Find a job'))sections.push({name:'Hiring institutions',why:'Schools and colleges using Talind to discover teaching talent.',items:liveInstitutionItems().filter(function(i){return !i.publicRow.purposes?.length||i.publicRow.purposes.includes('Hire teachers / professors')})});
    if(!purposes.length||purposes.includes('Offer tuition / coaching / training'))sections.push({name:'Student / parent requirements',why:'Matched from the skills you can teach and your service preferences.',items:liveRequirementItems()});
    return sections;
  }
  if(state.role==='institution'){
    const sections=[{name:'Teacher & expert profiles',why:'Published teacher profiles relevant to your institution.',items:liveTeacherItems()}];
    if(purposes.includes('Training association / partnership'))sections.push({name:'Training partners',why:'Published training providers for workshops, staff development and partnerships.',items:liveTrainingItems().filter(function(i){return !i.publicRow.purposes?.length||i.publicRow.purposes.includes('Institutional partnerships')})});
    return sections;
  }
  if(state.role==='training'){
    const sections=[];
    if(!purposes.length||purposes.includes('Individual learner enrolment'))sections.push({name:'Individual learner requirements',why:'Published learner needs relevant to your training expertise.',items:liveRequirementItems()});
    if(purposes.includes('Institutional partnerships'))sections.push({name:'Institutional partnership opportunities',why:'Schools and colleges seeking training, development or partnership support.',items:liveInstitutionItems().filter(function(i){return i.publicRow.purposes?.includes('Training association / partnership')})});
    return sections;
  }
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
  if(talindCurrentUser&&['learner','teacher','institution'].includes(state.role)){
    const sections=opportunitiesForRole();
    const cfg={learner:['TALIND MATCH','Find the right people and institutions for your next step.','Matches use your requirements, skills, location and preferred mode.','Free for students & parents'],teacher:['TALIND MATCH','Turn your skills into work and service opportunities.','Explore hiring institutions and learner requirements relevant to your profile.','Job seeking is free'],institution:['TALIND MATCH','Build the team and partnerships your institution needs.','Discover teachers, experts and training providers through relevant profile signals.','Institution membership'] }[state.role];
    $('#main').innerHTML=intro(cfg[0],cfg[1],cfg[2],cfg[3])+sections.map(opportunitySection).join('');
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
