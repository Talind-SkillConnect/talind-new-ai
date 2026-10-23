// Talind Matching QA: synthetic fixtures only. No authentication and no API writes.
(function(){
'use strict';

const people = [
  {user_id:'qa-t01',role:'teacher',display_name:'Anita Mathematics (Demo)',headline:'CBSE Mathematics Tutor and TGT',bio:'Mathematics teacher for Classes 9 and 10. CBSE school teaching, online and hybrid tuition.',city:'Coimbatore',mode:'Hybrid',skills:['Mathematics','CBSE','Tuition'],purposes:['Find a job','Offer tuition / coaching / training']},
  {user_id:'qa-t02',role:'teacher',display_name:'Priya Phonics (Demo)',headline:'Primary English and Phonics Coach',bio:'English phonics, literacy and reading fluency for primary learners.',city:'Chennai',mode:'Online',skills:['English','Phonics','Literacy'],purposes:['Find a job','Offer tuition / coaching / training']},
  {user_id:'qa-t03',role:'teacher',display_name:'Ravi STEM (Demo)',headline:'Robotics and STEM Trainer',bio:'Robotics, STEM and Python coding workshops for schools and students.',city:'Coimbatore',mode:'Hybrid',skills:['Robotics','STEM','Python'],purposes:['Offer tuition / coaching / training']},
  {user_id:'qa-t04',role:'teacher',display_name:'Nisha Biology (Demo)',headline:'NEET Biology Educator',bio:'Biology preparation for NEET and senior secondary students.',city:'Erode',mode:'Online',skills:['NEET','Biology'],purposes:['Find a job','Offer tuition / coaching / training']},
  {user_id:'qa-t05',role:'teacher',display_name:'Divya Cambridge (Demo)',headline:'Cambridge English Educator',bio:'CAIE and Cambridge English teacher available for hiring.',city:'Chennai',mode:'In person',skills:['Cambridge','CAIE','English'],purposes:['Find a job']},
  {user_id:'qa-i01',role:'institution',display_name:'Sunrise CBSE Academy (Demo)',headline:'CBSE school · hiring, admission and development',bio:'CBSE Mathematics teaching jobs, school admission, STEM faculty development and training partnerships.',city:'Coimbatore',mode:'Hybrid',skills:['CBSE','Mathematics','School','Teacher training'],purposes:['Hire teachers / professors','Promote admissions','Training association / partnership']},
  {user_id:'qa-i02',role:'institution',display_name:'Cambridge International School (Demo)',headline:'Cambridge school · English vacancies and admissions',bio:'Cambridge and CAIE English teaching vacancies and international curriculum admissions.',city:'Chennai',mode:'In person',skills:['Cambridge','CAIE','English'],purposes:['Hire teachers / professors','Promote admissions']},
  {user_id:'qa-i03',role:'institution',display_name:'Campus Skills School (Demo)',headline:'School partnership opportunities',bio:'Robotics STEM teacher training and institutional partnership programmes for faculty.',city:'Madurai',mode:'Hybrid',skills:['Robotics','STEM','Teacher training'],purposes:['Training association / partnership']},
  {user_id:'qa-p01',role:'training',display_name:'STEM Learning Studio (Demo)',headline:'Robotics STEM Python training provider',bio:'Robotics STEM Python workshops for individual learners and institutional faculty training.',city:'Coimbatore',mode:'Hybrid',skills:['Robotics','STEM','Python'],purposes:['Individual learner enrolment','Institutional partnerships']},
  {user_id:'qa-p02',role:'training',display_name:'Bright Phonics Academy (Demo)',headline:'English phonics classes',bio:'Phonics and English learning courses for primary students.',city:'Chennai',mode:'Online',skills:['Phonics','English'],purposes:['Individual learner enrolment']},
  {user_id:'qa-p03',role:'training',display_name:'Maths Edge Coaching (Demo)',headline:'CBSE Mathematics tuition',bio:'CBSE Mathematics coaching for grade 10, individual students and exam revision.',city:'Coimbatore',mode:'Hybrid',skills:['Mathematics','CBSE','Tuition'],purposes:['Individual learner enrolment']},
  {user_id:'qa-p04',role:'training',display_name:'Faculty Skills Network (Demo)',headline:'Teacher training and school development',bio:'Teacher training and faculty development workshops for school partnerships.',city:'Madurai',mode:'Hybrid',skills:['Teacher training','Faculty development'],purposes:['Institutional partnerships']}
].map(function(x){return Object.assign({is_active:true,region:'Tamil Nadu',country:'India'},x);});

const requirements = [
  {id:'qa-r01',user_id:'qa-l01',status:'active',title:'Class 10 Mathematics tuition',requirement_type:'Subject tuition',subject_skill:'Mathematics CBSE',location:'Coimbatore',mode:'Hybrid',timing:'Weekday evenings',details:{grade:'Grade 10',curriculum:'CBSE',budget_text:'₹3,000/month'}},
  {id:'qa-r02',user_id:'qa-l02',status:'active',title:'Primary English Phonics coaching',requirement_type:'Skill development',subject_skill:'English Phonics',location:'Chennai',mode:'Online',timing:'Weekend',details:{grade:'Primary',budget_text:'₹2,000/month'}},
  {id:'qa-r03',user_id:'qa-l03',status:'active',title:'Robotics STEM programme',requirement_type:'Skill development',subject_skill:'Robotics STEM',location:'Coimbatore',mode:'Hybrid',timing:'Summer programme',details:{grade:'Grade 8',budget_text:'₹4,000/month'}},
  {id:'qa-r04',user_id:'qa-l04',status:'active',title:'NEET Biology coaching',requirement_type:'NEET coaching',subject_skill:'NEET Biology',location:'Erode',mode:'Online',timing:'Evenings',details:{grade:'Grade 12',budget_text:'₹5,000/month'}},
  {id:'qa-r05',user_id:'qa-l05',status:'active',title:'Cambridge English support',requirement_type:'Subject tuition',subject_skill:'Cambridge English',location:'Chennai',mode:'In person',timing:'Weekdays',details:{grade:'Grade 9',curriculum:'Cambridge'}}
];

const scenarios = [
  {id:'L01',name:'Learner · Class 10 Maths tuition',role:'learner',email:'learner01@example.invalid',uid:'qa-l99',skills:['Mathematics','CBSE'],needs:'Class 10 Mathematics tuition',second:'',city:'Coimbatore',mode:'Hybrid',goals:'Grade 10 CBSE',purposes:[],expected:'teacher:qa-t01'},
  {id:'L02',name:'Parent · CBSE school admission',role:'learner',email:'parent01@example.invalid',uid:'qa-l98',skills:['CBSE','School'],needs:'School admission',second:'',city:'Coimbatore',mode:'Hybrid',goals:'CBSE school Grade 6 admission',purposes:[],expected:'institution:qa-i01'},
  {id:'T01',name:'Teacher · Mathematics job search',role:'teacher',email:'teacher01@example.invalid',uid:'qa-t99',skills:['Mathematics','CBSE'],needs:'CBSE Mathematics teaching job',second:'',city:'Coimbatore',mode:'Hybrid',goals:'TGT teaching vacancies',purposes:['Find a job'],expected:'institution:qa-i01'},
  {id:'T02',name:'Teacher · Phonics coaching services',role:'teacher',email:'teacher02@example.invalid',uid:'qa-t98',skills:['English','Phonics'],needs:'English Phonics tuition',second:'',city:'Chennai',mode:'Online',goals:'Individual learner classes',purposes:['Offer tuition / coaching / training'],expected:'requirement:qa-r02'},
  {id:'I01',name:'School · Recruit Maths teacher',role:'institution',email:'school01@example.invalid',uid:'qa-i99',skills:['CBSE','Mathematics'],needs:'Recruit CBSE Mathematics teacher',second:'',city:'Coimbatore',mode:'Hybrid',goals:'Teacher for Grade 9 and 10',purposes:['Hire teachers / professors'],expected:'teacher:qa-t01'},
  {id:'I02',name:'School · Arrange STEM training',role:'institution',email:'school02@example.invalid',uid:'qa-i98',skills:['Robotics','STEM'],needs:'Robotics STEM workshops',second:'',city:'Coimbatore',mode:'Hybrid',goals:'Training provider for faculty and learners',purposes:['Training association / partnership'],expected:'training:qa-p01'},
  {id:'P01',name:'Provider · Find robotics learners',role:'training',email:'provider01@example.invalid',uid:'qa-p99',skills:['Robotics','STEM'],needs:'Robotics STEM programme',second:'',city:'Coimbatore',mode:'Hybrid',goals:'Individual learner enrolment',purposes:['Individual learner enrolment'],expected:'requirement:qa-r03'},
  {id:'P02',name:'Provider · School training partnership',role:'training',email:'provider02@example.invalid',uid:'qa-p98',skills:['Teacher training','Faculty development'],needs:'Teacher training and faculty development',second:'',city:'Madurai',mode:'Hybrid',goals:'Institutional partnership opportunities',purposes:['Institutional partnerships'],expected:'institution:qa-i03'}
];

const get = function(id){return document.getElementById(id)};
const store = Object.create(null);
let lastRun = [];
const baseScenario = function(){return scenarios.find(function(x){return x.id===get('scenario').value})||scenarios[0];};
const escaped = function(s){return esc(s);};
const rankClass = function(n){return n>=65?'high':n>=35?'medium':'low';};
const scoreLabel = function(n){return n>=65?'High relevance':n>=35?'Moderate relevance':'Limited relevance';};

function populate(){
  get('scenario').innerHTML=scenarios.map(function(x){return '<option value="'+escaped(x.id)+'">'+escaped(x.name)+'</option>'}).join('');
  get('scenario').value='L01';
  loadScenario(baseScenario());
}
function loadScenario(s){
  get('role').value=s.role;get('email').value=s.email;
  get('skills').value=s.skills.join(', ');
  get('needs').value=s.needs;get('second').value=s.second;get('city').value=s.city;
  get('mode').value=s.mode;get('goals').value=s.goals;
  matchNow();
}
function applyForm(s){
  state.role=get('role').value;
  talindCurrentUser={id:s.uid,email:s.email};
  qaRecord={fields:{
    needs:get('needs').value.trim(),secondNeed:get('second').value.trim(),
    city:get('city').value.trim(),mode:get('mode').value,
    goals:get('goals').value.trim(),purposes:s.purposes
  },skills:get('skills').value.split(',').map(function(x){return x.trim()}).filter(Boolean).map(function(name){return {name:name}})};
}
function allSections(){
  liveDiscovery.profiles=people;
  liveDiscovery.requirements=requirements;
  liveDiscovery.loaded=true;
  return window.opportunitiesForRole();
}
function rowHtml(section,i,index,s){
  const k=s.id+'|'+i.key;
  const v=store[k]||'Not reviewed';
  const choices=['Not reviewed','Correct match','Incorrect match','Needs manual check'];
  return '<tr><td><strong>'+escaped(i.name)+'</strong><small>'+escaped(section.name)+' · '+escaped(i.location)+' · '+escaped(i.mode)+'</small></td>'+
    '<td><strong class="score '+rankClass(i.matchScore)+'">'+i.matchScore+'%</strong><small>'+scoreLabel(i.matchScore)+'</small></td>'+
    '<td>'+escaped(i.matchReason)+'</td>'+
    '<td><select class="qa-select" data-review="'+escaped(k)+'" aria-label="Rate '+escaped(i.name)+'">'+choices.map(function(choice){return '<option'+(choice===v?' selected':'')+'>'+choice+'</option>'}).join('')+'</select></td></tr>';
}
function attachReviewListeners(){
  document.querySelectorAll('.qa-select').forEach(function(x){
    x.addEventListener('change',function(){store[x.getAttribute('data-review')]=x.value;});
  });
}
function matchNow(){
  const s=baseScenario();
  applyForm(s);
  const sections=allSections();
  const items=sections.flatMap(function(x){return x.items;});
  const excellent=items.filter(function(x){return x.matchScore>=65;}).length;
  const moderate=items.filter(function(x){return x.matchScore>=35&&x.matchScore<65;}).length;
  get('stats').innerHTML='<div class="stat"><b>'+items.length+'</b><span>Potential results</span></div><div class="stat"><b>'+excellent+'</b><span>High relevance</span></div><div class="stat"><b>'+moderate+'</b><span>Moderate relevance</span></div>';
  let html='';
  sections.forEach(function(sec){
    html+='<h3 style="margin-top:19px">'+escaped(sec.name)+'</h3><p class="subtle">'+escaped(sec.why)+'</p>';
    html+=sec.items.length
      ? '<div class="tablewrap"><table><thead><tr><th>Match</th><th>Relevance</th><th>Explanation</th><th>Your review</th></tr></thead><tbody>'+sec.items.map(function(item,idx){return rowHtml(sec,item,idx,s);}).join('')+'</tbody></table></div>'
      : '<div class="empty">No eligible profiles published in the current fixtures for this category.</div>';
  });
  get('results').innerHTML=html||'<div class="empty">No opportunity sections for this role.</div>';
  get('results-note').textContent='Using actual live-matching.js matching logic with fictitious data. Results are sorted within each opportunity section; they are not a verified candidate eligibility or payment outcome.';
  attachReviewListeners();
}
function evaluateScenario(s){
  state.role=s.role;
  talindCurrentUser={id:s.uid,email:s.email};
  qaRecord={fields:{needs:s.needs,secondNeed:s.second,city:s.city,mode:s.mode,goals:s.goals,purposes:s.purposes},skills:s.skills.map(function(name){return {name:name}})};
  const sections=allSections();
  let expected=null,sectionName='',rank=-1;
  for(const sec of sections){
    const n=sec.items.findIndex(function(x){return x.key===s.expected;});
    if(n>=0){expected=sec.items[n];sectionName=sec.name;rank=n+1;break;}
  }
  return {scenario:s.id,name:s.name,role:s.role,email:s.email,expected:s.expected,expectedName:expected?expected.name:'Not found',sectionName:sectionName,rank:rank,score:expected?expected.matchScore:0,pass:!!expected&&rank<=3&&expected.matchScore>=35,sections:sections};
}
function runAll(){
  const snapshot=baseScenario();
  const inputs=['skills','needs','second','city','mode','goals'].map(function(id){return get(id).value;});
  lastRun=scenarios.map(evaluateScenario);
  let passing=0;
  get('report').innerHTML='<p class="muted">Smoke-check acceptance criterion: expected profile is in the top three of its section with at least 35% term-based relevance.</p>'+
    lastRun.map(function(x){
      if(x.pass)passing++;
      return '<div class="report-row"><strong class="'+(x.pass?'pass':'fail')+'">'+(x.pass?'✓ PASS':'✕ REVIEW')+' · '+escaped(x.name)+'</strong>'+
        '<span>Expected: '+escaped(x.expectedName)+' · Rank: '+(x.rank<0?'not found':x.rank)+' · Score: '+x.score+'%'+(x.sectionName?' · '+escaped(x.sectionName):'')+'</span></div>';
    }).join('')+
    '<p><strong>'+passing+' / '+scenarios.length+'</strong> synthetic smoke checks passed.</p>'+
    '<p class="subtle">A failed check identifies a potential relevance problem for investigation; a passed check does not prove real data, authorisation, or messaging works.</p>';
  // Restore the user's current fields and scenario selection after the batch test.
  get('scenario').value=snapshot.id;
  loadScenario(snapshot);
  ['skills','needs','second','city','mode','goals'].forEach(function(id,i){get(id).value=inputs[i]});
  matchNow();
}
function csvCell(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}
function exportCSV(){
  if(!lastRun.length)runAll();
  const rows=[['Scenario','Stakeholder','Dummy email','Section','Candidate','Candidate key','Match %','Reason','Expected candidate','QA review','Smoke check pass']];
  for(const evaluation of lastRun){
    for(const section of evaluation.sections){
      for(const item of section.items){
        rows.push([evaluation.name,evaluation.role,evaluation.email,section.name,item.name,item.key,item.matchScore,item.matchReason,item.key===evaluation.expected?'Yes':'No',store[evaluation.scenario+'|'+item.key]||'Not reviewed',evaluation.pass?'PASS':'REVIEW']);
      }
    }
  }
  const csv='\ufeff'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download='talind_matching_qa_results.csv';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},2000);
}
get('scenario').addEventListener('change',function(){loadScenario(baseScenario());});
get('role').addEventListener('change',function(){
  const s=scenarios.find(function(x){return x.role===get('role').value});
  if(!s)return;get('scenario').value=s.id;loadScenario(s);
});
get('match').addEventListener('click',matchNow);
get('reset').addEventListener('click',function(){loadScenario(baseScenario());});
get('run-all').addEventListener('click',runAll);
get('export').addEventListener('click',exportCSV);
populate();
})();
