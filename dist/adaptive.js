// Purpose-adaptive registration: only fields relevant to the selected goal are required.
const originalRecord=record;record=function(){const r=originalRecord();r.openings??=[];r.courses??=[];return r};
const purposes={teacher:['Find a job','Offer tuition / coaching / training'],institution:['Hire teachers / professors','Promote admissions','Training association / partnership'],training:['Individual learner enrolment','Institutional partnerships']};
function selectedPurposes(){return record().fields.purposes||[]}
function hasPurpose(p){return selectedPurposes().includes(p)}
function steps(){const r=state.role;return [{id:'basics',title:'Account & authorised contact'},...(r==='learner'?[]:[{id:'purpose',title:'Your purpose'}]),{id:'background',title:r==='training'?'Provider expertise':r==='institution'?'Institution & programmes':'Background & goals'},...(r==='institution'?[]:[{id:'skills',title:r==='training'?'Skills offered & expertise':'Skills'}]),...(r==='institution'&&hasPurpose('Hire teachers / professors')?[{id:'openings',title:'Job openings'}]:[]),...(r==='institution'&&hasPurpose('Promote admissions')?[{id:'admissions',title:'Admissions promotion'}]:[]),...(r==='institution'&&hasPurpose('Training association / partnership')?[{id:'partnerships',title:'Training & partnerships'}]:[]),...(r==='training'?[{id:'courses',title:'Detailed courses'}]:[]),...(r==='institution'?[]:[{id:'preferences',title:'Preferences & availability'}]),{id:'consent',title:'Contact & consent'},{id:'review',title:'Review & complete'}]}
const courseMap={Preschool:['Playgroup','Nursery','LKG','UKG'],School:['Primary (Classes 1–5)','Middle (Classes 6–8)','Secondary (Classes 9–10)','Higher secondary (Classes 11–12)'],College:['BA','B.Sc.','B.Com.','BBA','BCA','B.E. / B.Tech.','B.Ed.','MA','M.Sc.','MBA','MCA','M.E. / M.Tech.','Diploma'],University:['Undergraduate','Postgraduate','Doctoral','Diploma','Certificate'],Other:['Certificate','Diploma','Other programme']};
const originalFieldHTML=fieldHTML;fieldHTML=function(f){if(f.type!=='multi')return originalFieldHTML(f);const value=record().fields[f.key]||[];return `<fieldset class="full choice-group"><legend>${f.label}${f.required?' *':''}</legend>${f.options.map(v=>`<label class="check-row"><input type="checkbox" name="${f.key}" value="${esc(v)}" ${value.includes(v)?'checked':''}><span>${esc(v)}</span></label>`).join('')}</fieldset>`};
function authFields(){const adult=state.role==='learner';return [field('authorisedPerson',adult?'Responsible adult / authorised guardian name':'Authorised contact person','text',[],true),field('contactDesignation',adult?'Relationship / capacity':'Designation / role','text',[],true),field('officialEmail',adult?'Adult / guardian contact email':'Working / official email','email',[],true),field('officialPhone',adult?'Adult / guardian contact phone':'Official phone with country code','tel',[],true),field('whatsapp','WhatsApp contact number (optional)'),field('alternateContact','Alternative authorised contact (optional)')]}
function adaptiveFields(id){let r=state.role,f=record().fields,qs=questions[r];if(id==='basics'){
 const byKey=k=>common.find(x=>x.key===k);
 if(r==='learner')return [field('name','Account holder name','text',[],true),byKey('country'),byKey('region'),byKey('city'),byKey('languages'),field('phone','Contact mobile (with country code)','tel',[],true),field('whatsapp','WhatsApp number')];
 if(r==='teacher')return [field('name','Full name','text',[],true),byKey('country'),byKey('region'),byKey('city'),byKey('languages'),field('phone','Contact mobile (with country code)','tel',[],true),field('whatsapp','WhatsApp number')];
 const orgName=r==='institution'?'Institution name':'Organisation / provider name';
 return [field('name',orgName,'text',[],true),byKey('country'),byKey('region'),byKey('city'),...(r==='institution'?[qs.background.find(x=>x.key==='institutionType')]:[]),...authFields().filter(x=>!['alternateContact'].includes(x.key))];
}if(id==='background'){
 if(r==='institution')return [...qs.background.filter(x=>!['institutionType','contactPerson','designation','programmes'].includes(x.key)),field('programmeSelection','Grades / courses offered','multi',courseMap[f.institutionType]||courseMap.Other,true),field('programmeSpecialisations','Departments / course specialisations','textarea',[],['College','University'].includes(f.institutionType)),field('programmeOther','Other programmes / custom course names','textarea')];
 if(r==='training')return [...qs.background.filter(x=>!['contactPerson','designation','programmes'].includes(x.key)),field('expertiseAreas','Areas of expertise and practical strengths','textarea',[],true),field('trainerExpertise','Trainer qualifications and domain experience','textarea',[],true)];
 if(r==='teacher')return qs.background.filter(x=>hasPurpose('Find a job')||!['teacherQualification','employment','currentRole','boards'].includes(x.key));return qs.background;
 }if(id==='preferences'){
 if(r==='learner')return qs.preferences;
 if(r==='teacher'){const jobs=hasPurpose('Find a job'),services=hasPurpose('Offer tuition / coaching / training');return qs.preferences.filter(x=>x.key!=='intent'&&(!['jobType','relocate','notice','salary'].includes(x.key)||jobs)&&(!['serviceTypes','fee','feeUnit'].includes(x.key)||services)).map(x=>({...x,required:x.required||(services&&['serviceTypes','fee','feeUnit'].includes(x.key))})).concat(services?[field('serviceAudience','Service audience / age groups','text',[],true),field('serviceDuration','Session duration / frequency','text',[],true)]:[])}
 if(r==='institution')return [];
 if(r==='training')return qs.preferences.filter(x=>x.key!=='intent'&&(!['customise','institutionTypes','contractSize','travel'].includes(x.key)||hasPurpose('Institutional partnerships'))&&(!['start'].includes(x.key)||hasPurpose('Individual learner enrolment')));
 }if(id==='admissions'&&r==='institution'){
  return [
    field('admissionStatus','Admission campaign status','select',['Admissions open','Enquiries open','Upcoming intake','Waitlist / limited seats'],true),
    field('admissionCycle','Academic year / intake','text',[],true),
    field('admissionGrades','Grades / programmes open for admission','textarea',[],true),
    field('admissionSeats','Seats available / intake capacity','text',[],true),
    field('feeRange','Indicative tuition fee range and period','text',[],true),
    field('admissionScholarship','Scholarship / concession information','textarea'),
    field('audience','Target locations / student audience','text',[],true),
    field('admissionMode','Application mode','select',['Online','On campus','Both'],true),
    field('admissionDeadline','Admission closing date / priority deadline','date'),
    field('admissionWebsite','Official institution website','url',[],true),
    field('admissionPage','Dedicated admission / application page','url'),
    field('admissionEnquiryEmail','Admission enquiry email','email'),
    field('admissionEnquiryPhone','Admission enquiry phone / WhatsApp','tel'),
    field('admissionProcess','Admission process, eligibility and enquiry steps','textarea',[],true),
    field('admissionHighlights','Key highlights to show parents / students','textarea',[],true)
  ];
 }if(id==='partnerships'&&r==='institution'){
  return [
    field('partnerNeed','Training / partnership objective','textarea',[],true),
    field('partnerSkills','Skills / programme areas needed','textarea',[],true),
    field('partnerAudience','Participants / departments','text',[],true),
    field('partnerCount','Expected participants','number',[],true),
    field('partnerMode','Preferred delivery','select',['Online','On campus','Hybrid'],true),
    field('partnerBudget','Budget range and period','text',[],true),
    field('partnerTimeline','Training timeline','text',[],true),
    field('partnerModel','Association model','select',['One-time workshop','Recurring programme','Long-term training partnership','Open to proposals'],true),
    field('partnerNotes','Other expectations / selection criteria','textarea')
  ];
 }if(id==='consent')return [field('decisionRole','Account responsibility','select',r==='learner'?['Self / adult learner','Parent / guardian']:['Decision maker','Authorised representative'],true),field('contactChannel','Preferred contact channel','select',['Email','Phone','WhatsApp'],true)];return []}
function purposeHTML(){
  if(state.role==='institution'){
    const defs=[
      ['Hire teachers / professors','Hiring','Post any number of vacancies. Each opening has its own role, subject, qualification, experience, salary, location and skills.','openings'],
      ['Promote admissions','Admissions promotion','Add admission intake details, website, application links, e-brochure, prospectus, fee information and related documents.','admissions'],
      ['Training association / partnership','Training & partnerships','Define workshops, teacher development, student programmes or long-term training partnership requirements.','partnerships']
    ];
    return '<p class="muted">Choose one or more purposes. Each purpose has its own independent input section.</p><div class="institution-purpose-selector">'+
      defs.map(function(d){
        const on=hasPurpose(d[0]);
        return '<div class="institution-purpose-option '+(on?'selected':'')+'"><label class="check-row"><input type="checkbox" name="purposes" value="'+esc(d[0])+'" '+(on?'checked':'')+'><span><strong>'+esc(d[1])+'</strong><small>'+esc(d[2])+'</small></span></label>'+
          (on?'<button type="button" class="btn light" onclick="saveFields();startInstitutionPurpose(\''+d[0].replace(/'/g,"\\'")+'\')">Configure '+esc(d[1])+' →</button>':'')+
        '</div>';
      }).join('')+
    '</div><p class="bottom-note">Institution Membership is designed to cover hiring, admissions promotion and training partnerships.</p>';
  }
  return `<p class="muted">Select every purpose that applies. Questions and required fields will adapt to your selection.</p><div class="purpose-options">${purposes[state.role].map(p=>`<label class="check-row"><input type="checkbox" name="purposes" value="${p}" ${hasPurpose(p)?'checked':''}><span>${p}</span></label>`).join('')}</div><p class="bottom-note">${state.role==='teacher'?'Job seeking is free. Selecting “Offer tuition / coaching / training” requires a paid Teacher Services membership before you can contact learners, quote, or provide services.':'Institution and training-provider access is paid. Online payment is not yet enabled.'}</p>`;
}
const arrayFields=['purposes','programmeSelection'];
saveFields=function(){const form=$('#registration-form');if(!form)return;const d=new FormData(form),id=steps()[registration.step]?.id;d.forEach((v,k)=>{if(!arrayFields.includes(k))record().fields[k]=v});for(const key of arrayFields){if((key==='purposes'&&id==='purpose')||(key==='programmeSelection'&&id==='background'&&state.role==='institution'))record().fields[key]=d.getAll(key)}if(id==='consent')for(const k of ['accuracy','guardian','authority','profilePublic','marketingEmail','marketingPhone','marketingWhatsapp','contactShare'])record().fields[k]=!!form.elements[k]?.checked;record().complete=false};
function validateFields(fields){const m=[],f=record().fields;for(const q of fields){const v=f[q.key];if(q.required&&(!v||(Array.isArray(v)?!v.length:!String(v).trim())))m.push(q.label);if(v&&q.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))m.push('Valid '+q.label);if(v!==undefined&&v!==''&&q.type==='number'&&(!Number.isFinite(Number(v))||Number(v)<0))m.push('Valid '+q.label)}return m}
missingFields=function(){let m=[];for(const s of steps())m.push(...validateFields(adaptiveFields(s.id)));if(state.role!=='learner'&&!selectedPurposes().length)m.push('At least one purpose');if(state.role!=='institution'&&!record().skills.length)m.push('At least one skill');if(state.role==='institution'&&hasPurpose('Hire teachers / professors')&&!record().openings.length)m.push('At least one job opening');if(state.role==='training'&&!record().courses.length)m.push('At least one detailed course');if(!record().fields.accuracy)m.push('Accuracy confirmation');if(!record().fields.authority)m.push('Authorised contact confirmation');if(state.role==='learner'&&record().fields.accountFor==='Adult learner (18+)'&&record().fields.ageBand!=='18+')m.push('Guardian account for a learner under 18');return m};
currentValid=function(){const form=$('#registration-form');if(form&&!form.reportValidity())return false;saveFields();const id=steps()[registration.step].id;let msg=validateFields(adaptiveFields(id));if(id==='purpose'&&!selectedPurposes().length)msg.push('Choose at least one purpose');if(id==='skills'&&!record().skills.length)msg.push('Add at least one skill');if(id==='openings'&&!record().openings.length)msg.push('Add at least one opening');if(id==='courses'&&!record().courses.length)msg.push('Add at least one course');if(msg.length){toast(msg[0]);return false}return true};
const jobFields=[field('category','Role category','select',['Teaching','Academic leadership','Administration & operations','Student support / counselling','Co-curricular / sports','Other'],true),field('title','Job title / designation','text',[],true),field('department','Subject / department','text',[],true),field('vacancies','Number of vacancies','number',[],true),field('curriculum','Board / curriculum / university context','text',[],true),field('level','Grades / course level','text',[],true),field('qualification','Required qualification','text',[],true),field('specialisation','Preferred specialisation / eligibility','text'),field('experience','Minimum experience (years)','number',[],true),field('employment','Employment type','select',['Full time','Part time','Contract','Visiting faculty','Temporary / leave vacancy'],true),field('workMode','Work mode','select',['On campus','Online','Hybrid'],true),field('location','Job location','text',[],true),field('salary','Salary range and period','text',[],true),field('joining','Expected joining / timeline','text',[],true),field('applicationDeadline','Application deadline / review date','date'),field('description','Responsibilities and expectations','textarea',[],true),field('additionalRequirements','Other requirements / notes','textarea')];
const courseFields=[field('title','Course / programme title','text',[],true),field('category','Category','select',['Subject tuition','Skill development','NEET','JEE','Teacher development','Professional training','Other'],true),field('audience','Target learners / age group','text',[],true),field('level','Course level','select',['Beginner','Intermediate','Advanced','All levels'],true),field('prerequisites','Prerequisites (or none)','textarea',[],true),field('syllabus','Syllabus / modules covered','textarea',[],true),field('outcomes','Learning outcomes','textarea',[],true),field('duration','Total duration and teaching hours','text',[],true),field('schedule','Days, timing and frequency','text',[],true),field('mode','Delivery mode','select',['Online','In person','Hybrid'],true),field('location','Location / online platform','text',[],true),field('batch','Batch size / capacity','number',[],true),field('start','Next start date / rolling intake','text',[],true),field('fee','Fee, currency, billing unit and inclusions','text',[],true),field('trainer','Trainer name / qualifications / expertise','textarea',[],true),field('assessment','Assessment method','textarea',[],true),field('certificate','Certificate / awarding body (or none)','text',[],true),field('demo','Trial / demo availability','select',['Available','Not available','On request'],true),field('customisation','Institutional customisation options (or none)','textarea',[],true),field('refundPolicy','Cancellation / refund policy','textarea',[],true)];
let editorSkills=[];
let editingOpeningIndex=-1;

function builderField(q,value=''){const safe=value==null?'':String(value);const o=q.type==='select'?`<select id="entry-${q.key}" data-required="${q.required}">${q.options.map(x=>`<option ${x===safe?'selected':''}>${esc(x)}</option>`).join('')}</select>`:q.type==='textarea'?`<textarea id="entry-${q.key}" maxlength="2500">${esc(safe)}</textarea>`:`<input id="entry-${q.key}" type="${q.type}" ${q.type==='number'?'min="0"':''} maxlength="500" value="${esc(safe)}">`;return `<label class="${q.type==='textarea'?'full':''}">${q.label}${q.required?' *':' (optional)'}${o}</label>`}
function entriesHTML(kind){const list=record()[kind],jobs=kind==='openings';return `<div class="${jobs?'multi-opening-intro':''}"><p class="muted">${jobs?'Add every vacancy separately. Each opening can have a different role, subject, qualification, experience, salary, location, joining date and required skills.':'List each course separately, including syllabus, outcomes, fees and trainer expertise.'}</p>${jobs?'<div class="notice"><strong>Example:</strong> TGT Mathematics – 2 vacancies, PGT Physics – 1 vacancy, Principal – 1 vacancy. Add them as three separate openings.</div>':''}</div><div class="${jobs?'opening-list':''}">${list.map((e,i)=>jobs?`<article class="opening-card"><div class="opening-card-head"><div><span class="eyebrow">OPENING ${i+1}</span><h3>${esc(e.title)}</h3><p>${esc(e.category||'Role')} · ${esc(e.department)} · ${esc(e.location)}</p></div><span class="badge">${esc(e.vacancies)} ${Number(e.vacancies)===1?'vacancy':'vacancies'}</span></div><div class="opening-meta"><span>${esc(e.employment)}</span><span>${esc(e.curriculum)}</span><span>${esc(e.level)}</span><span>${esc(e.salary)}</span></div><div class="tags">${(e.skills||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div><div class="workspace-links"><button type="button" class="btn light" onclick="editJobOpening(${i})">Edit</button><button type="button" class="btn outline" onclick="duplicateJobOpening(${i})">Duplicate</button><button type="button" class="text-button" onclick="removeEntry('openings',${i})">Remove</button></div></article>`:`<div class="skill-row"><div><strong>${esc(e.title)}</strong><p>${esc(e.category)} · ${esc(e.duration)}</p><div class="tags">${e.skills.map(s=>`<span>${esc(s)}</span>`).join('')}</div></div><button type="button" class="btn outline" onclick="removeEntry('${kind}',${i})">Remove</button></div>`).join('')}</div><details class="entry-builder" ${list.length?'':'open'}><summary>+ Add ${jobs?'another job opening':'detailed course'}</summary><div class="fields">${(jobs?jobFields:courseFields).map(q=>builderField(q,jobs&&editingOpeningIndex>=0?(list[editingOpeningIndex]||{})[q.key]||'':'')).join('')}</div><h3>${jobs?'Skills required for this opening':'Skills taught in this course'}</h3><div class="skill-builder"><label>Choose a skill<select id="entry-skill-pick"><option value="">Choose a skill</option>${catalog.map(s=>`<option>${s}</option>`).join('')}</select></label><label>Or enter a custom skill<input id="entry-skill-custom" maxlength="100"></label></div><button type="button" class="btn light" onclick="addEntrySkill()">+ Add skill</button><div class="tags" id="entry-skills" aria-live="polite"></div><p class="form-error" id="entry-error" role="alert"></p><div class="entry-save-actions">${jobs?'<button type="button" class="btn" onclick="saveEntry(\'openings\',true)">Save & add another opening</button><button type="button" class="btn outline" onclick="saveEntry(\'openings\',false)">Save this opening</button>':'<button type="button" class="btn" onclick="saveEntry(\'courses\',false)">Save course</button>'}</div></details>`}
function addEntrySkill(){const name=$('#entry-skill-custom').value.trim()||$('#entry-skill-pick').value;if(!name)return toast('Choose or type a skill.');if(!editorSkills.some(x=>x.toLowerCase()===name.toLowerCase()))editorSkills.push(name);$('#entry-skills').innerHTML=editorSkills.map((s,i)=>`<button class="chip" type="button" onclick="editorSkills.splice(${i},1);refreshEntrySkills()">${esc(s)} ×</button>`).join('');$('#entry-skill-custom').value=''}
function refreshEntrySkills(){$('#entry-skills').innerHTML=editorSkills.map((s,i)=>`<button class="chip" type="button" onclick="editorSkills.splice(${i},1);refreshEntrySkills()">${esc(s)} ×</button>`).join('')}
async function saveEntry(kind,addAnother=false){
  const fields=kind==='openings'?jobFields:courseFields,obj={};
  for(const q of fields){
    const el=$('#entry-'+q.key),v=el?el.value.trim():'';
    if(q.required&&!v){$('#entry-error').textContent='Please complete: '+q.label;el&&el.focus();return}
    if(el&&!el.reportValidity()){$('#entry-error').textContent='Please check: '+q.label;el.focus();return}
    obj[q.key]=v;
  }
  if(!editorSkills.length){$('#entry-error').textContent='Add at least one relevant skill.';return}
  obj.skills=[...editorSkills];
  if(kind==='openings'&&editingOpeningIndex>=0){record().openings[editingOpeningIndex]=obj;editingOpeningIndex=-1;}else{record()[kind].push(obj)}
  record().complete=false;editorSkills=[];
  if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();
  profile();
  toast(kind==='openings'?'Job opening saved.':'Course saved.');
  if(addAnother&&kind==='openings'){
    setTimeout(function(){const d=document.querySelector('.entry-builder');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}},50);
  }
}
async function removeEntry(kind,i){record()[kind].splice(i,1);record().complete=false;if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile()}
function editJobOpening(i){const src=record().openings[i];if(!src)return;editingOpeningIndex=i;editorSkills=[...(src.skills||[])];profile();setTimeout(function(){const d=document.querySelector('.entry-builder');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});refreshEntrySkills()}},30)}
async function duplicateJobOpening(i){const src=record().openings[i];if(!src)return;const copy={...src,title:(src.title||'Opening')+' - Copy',skills:[...(src.skills||[])]};record().openings.splice(i+1,0,copy);record().complete=false;if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile();toast('Job opening duplicated. You can now adjust the copied vacancy.')}
const baseEvidenceHTML=evidenceHTML;evidenceHTML=function(){if(state.role==='learner')return '';let types=[],links=[];if(state.role==='teacher'){if(hasPurpose('Find a job'))types.push('Résumé / CV','Qualification certificate','Experience letter');if(hasPurpose('Offer tuition / coaching / training'))types.push('Coaching portfolio','Skill certificate','Workshop outline');links=['Teaching / coaching demo','Skill demonstration','Portfolio website','Certificate verification page']}if(state.role==='institution'){if(hasPurpose('Hire teachers / professors'))types.push('Recruitment brochure','Job description');if(hasPurpose('Promote admissions'))types.push('Institution brochure','Affiliation certificate','Programme prospectus','Fee information');if(hasPurpose('Training association / partnership'))types.push('Training requirement brief','Partnership proposal');links=['Official website','Campus tour','Programme information','Partnership information']}if(state.role==='training'){types=['Trainer résumé','Trainer qualification','Course brochure','Skill / accreditation certificate'];if(hasPurpose('Institutional partnerships'))types.push('Institutional proposal','Past training portfolio');links=['Training demo','Trainer introduction','Course outline','Certificate verification page']}
const html=baseEvidenceHTML();return html.replace(/(<select id="evidence-kind">)[\s\S]*?(<\/select>)/,`$1${types.map(s=>`<option>${s}</option>`).join('')}$2`).replace(/(<select id="link-kind">)[\s\S]*?(<\/select>)/,`$1${links.map(s=>`<option>${s}</option>`).join('')}$2`)};

function admissionEvidence(){return (record().evidence||[]).filter(function(e){return e.purpose==='admissions'})}
function admissionLinks(){return (record().links||[]).filter(function(e){return e.purpose==='admissions'})}
function institutionAdmissionsHTML(){
  const fields=adaptiveFields('admissions');
  const files=admissionEvidence(),links=admissionLinks();
  return '<div class="institution-input-section"><span class="eyebrow">ADMISSION DETAILS</span><h3>Information students and parents should see</h3><p class="muted">Keep admission information separate from recruitment. These details can power admission matching and promotions.</p><div class="fields">'+fields.map(fieldHTML).join('')+'</div></div>'+
    '<div class="institution-input-section admission-assets"><span class="eyebrow">ADMISSION ASSETS</span><h3>Website, e-brochure & supporting documents</h3><p class="muted">Attach the materials families should use while evaluating your institution.</p>'+
      '<div class="skill-builder">'+
        '<label>Document type<select id="admission-file-kind"><option>E-brochure / prospectus</option><option>Fee structure</option><option>Affiliation / accreditation document</option><option>Admission application form</option><option>Scholarship information</option><option>Programme brochure</option><option>Other admission document</option></select></label>'+
        '<label class="full">Upload PDF, DOCX, JPG or PNG (10 MB maximum)<input type="file" id="admission-file" accept=".pdf,.docx,.jpg,.jpeg,.png"></label>'+
      '</div><button type="button" class="btn light" onclick="attachAdmissionFile()">+ Attach admission document</button>'+
      '<div class="admission-asset-list">'+(files.length?files.map(function(e){const index=record().evidence.indexOf(e);return '<div class="admission-asset-row"><div><strong>'+esc(e.name)+'</strong><p>'+esc(e.kind)+' · '+Math.ceil(Number(e.size||0)/1024)+' KB'+(e.url?' · Ready in this browser':' · File must be re-selected after a new login/session')+'</p></div><button type="button" class="text-button" onclick="removeAdmissionEvidence('+index+')">Remove</button></div>'}).join(''):'<p class="muted">No admission documents attached yet.</p>')+'</div>'+
      '<h3>Useful admission links</h3><div class="skill-builder"><label>Link type<select id="admission-link-kind"><option>Virtual campus tour</option><option>Admission information page</option><option>Online application portal</option><option>Programme / course page</option><option>Fee information page</option><option>Other useful link</option></select></label><label>Title<input id="admission-link-title" maxlength="150" placeholder="e.g. Virtual campus tour"></label><label class="full">URL<input id="admission-link-url" type="url" placeholder="https://..."></label></div>'+
      '<button type="button" class="btn light" onclick="addAdmissionLink()">+ Add admission link</button>'+
      '<div class="admission-asset-list">'+links.map(function(e){const index=record().links.indexOf(e);return '<div class="admission-asset-row"><div><a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.title)+' ↗</a><p>'+esc(e.kind)+'</p></div><button type="button" class="text-button" onclick="removeAdmissionLink('+index+')">Remove</button></div>'}).join('')+'</div>'+
      '<div class="notice admission-upload-note"><strong>Current preview note:</strong> website and link data are saved to the Talind account. File metadata is saved, but secure cloud file storage is not connected yet, so the actual uploaded document must be re-selected in a new browser session.</div>'+
    '</div>';
}
function institutionPartnershipHTML(){return '<div class="institution-input-section"><span class="eyebrow">TRAINING / PARTNERSHIP REQUIREMENT</span><h3>Tell providers exactly what your institution needs</h3><p class="muted">This information is kept separate from hiring and admissions so Talind can match the right training partners.</p><div class="fields">'+adaptiveFields('partnerships').map(fieldHTML).join('')+'</div></div>'}
function attachAdmissionFile(){
  const input=$('#admission-file'),f=input&&input.files&&input.files[0];
  if(!f){toast('Select an admission document first.');return}
  if(f.size>10*1024*1024||!/\.(pdf|docx|jpe?g|png)$/i.test(f.name)){toast('Choose a PDF, DOCX, JPG or PNG up to 10 MB.');return}
  record().evidence.push({name:f.name,size:f.size,url:URL.createObjectURL(f),kind:$('#admission-file-kind').value,skill:'Admissions',purpose:'admissions'});
  record().complete=false;profile();
}
function removeAdmissionEvidence(i){const e=record().evidence[i];if(e&&e.url)try{URL.revokeObjectURL(e.url)}catch{}record().evidence.splice(i,1);record().complete=false;profile()}
function addAdmissionLink(){
  const url=$('#admission-link-url').value.trim(),title=$('#admission-link-title').value.trim(),kind=$('#admission-link-kind').value;
  try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||!title)throw Error();record().links.push({url:u.href,title:title,kind:kind,skill:'Admissions',purpose:'admissions'});record().complete=false;profile();}catch{toast('Add a title and a valid https:// link.')}
}
function removeAdmissionLink(i){record().links.splice(i,1);record().complete=false;profile()}

function contextSummary(){return state.role==='learner'?'learning and admission enquiries':selectedPurposes().join(', ').toLowerCase()||'your selected services'}
consentHTML=function(){if(record().fields.profilePublic===undefined)record().fields.profilePublic=true;return `<p class="muted">Confirm how this account can be used for matching and contact.</p><div class="fields">${adaptiveFields('consent').map(fieldHTML).join('')}</div>${checkbox('accuracy','I confirm that the information in this profile is accurate.',true)}${checkbox('authority',state.role==='learner'?'I am the adult learner or the authorised parent / guardian for this account.':'I am authorised to represent this person or organisation.',true)}${checkbox('profilePublic','Show my completed profile / requirements in relevant Talind matching.')}${checkbox('contactShare','Allow my contact details to be shared only when Talind access rules permit it.')}<p class="bottom-note">You can change profile visibility later from My profile.</p>`};
function reviewAdaptive(){const r=record(),missing=missingFields();return `<div class="notice ${missing.length?'':'success'}">${missing.length?missing.length+' required items still need attention.':'Required information is complete.'}</div>${steps().filter(s=>!['review','evidence'].includes(s.id)).map(s=>`<section class="review-section"><div class="section-top"><h3>${s.title}</h3><button type="button" class="btn outline" onclick="jumpStep(${steps().findIndex(x=>x.id===s.id)})">Edit</button></div>${s.id==='purpose'?esc(selectedPurposes().join(', ')):s.id==='skills'?r.skills.map(x=>`<p>${esc(x.name)} · ${esc(x.purpose)} · ${x.level}</p>`).join(''):['openings','courses'].includes(s.id)?r[s.id].map(x=>`<details><summary>${esc(x.title)}</summary><dl>${Object.entries(x).map(([k,v])=>`<div><dt>${esc((s.id==='openings'?jobFields:courseFields).find(f=>f.key===k)?.label||k)}</dt><dd>${esc(Array.isArray(v)?v.join(', '):v)}</dd></div>`).join('')}</dl></details>`).join(''):`<dl>${adaptiveFields(s.id).map(q=>`<div><dt>${q.label}</dt><dd>${esc(Array.isArray(r.fields[q.key])?r.fields[q.key].join(', '):r.fields[q.key]||'Not provided')}</dd></div>`).join('')}</dl>`}</section>`).join('')}${state.role!=='learner'?`<p>${r.evidence.length} local document(s) · ${r.links.length} evidence link(s). Evidence is optional and unverified.</p>`:''}${missing.length?`<p class="form-error">Missing: ${missing.map(esc).join('; ')}</p>`:''}<button type="button" class="btn" onclick="completeProfile()">Complete registration</button>`}
profile=function(){let list=steps();registration.step=Math.min(registration.step,list.length-1);const n=registration.step,s=list[n];if(!(state.role==='institution'&&s.id==='openings'&&editingOpeningIndex>=0))editorSkills=[];$('#main').innerHTML=intro('MY PROFILE',record().complete?'Profile complete':'Complete your profile',`${roleNames[state.role]} · Only information relevant to your selected purpose is requested.`)+`<div class="notice">Your profile fields are saved to your Talind account when signed in. Selected local files are not uploaded yet. ${state.role==='learner'?'No evidence or documents are requested for students and parents.':''}</div>${state.role==='institution'?institutionProfilePurposeNav():''}<div class="onboard-layout"><div class="step-nav">${list.map((x,i)=>`<button type="button" class="step-button ${n===i?'active':''}" onclick="jumpStep(${i})"><span>${i+1}</span>${x.title}</button>`).join('')}</div><section class="panel onboarding-panel"><span class="eyebrow">STEP ${n+1} OF ${list.length}</span><h2>${s.title}</h2><form id="registration-form">${s.id==='purpose'?purposeHTML():s.id==='skills'?skillsHTML():s.id==='openings'||s.id==='courses'?entriesHTML(s.id):s.id==='admissions'?institutionAdmissionsHTML():s.id==='partnerships'?institutionPartnershipHTML():s.id==='evidence'?evidenceHTML():s.id==='consent'?consentHTML():s.id==='review'?reviewAdaptive():`<div class="fields">${adaptiveFields(s.id).map(fieldHTML).join('')}</div>`}<div class="step-actions">${n?'<button type="button" class="btn outline" onclick="backStep()">Back</button>':''}${n<list.length-1?'<button class="btn" type="submit">Save & continue →</button>':''}<button type="button" class="btn light" onclick="saveFields();toast('Draft saved.')">Save draft</button></div></form></section></div>`;$('#registration-form').onsubmit=e=>{e.preventDefault();advance()};const type=$('#registration-form select[name="institutionType"]');if(type)type.onchange=()=>{saveFields();record().fields.programmeSelection=[];profile()};
if(state.role==='institution'&&s.id==='purpose'){
  document.querySelectorAll('#registration-form input[name="purposes"]').forEach(function(el){
    el.onchange=async function(){saveFields();if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile()}
  });
}}
advance=function(){if(!currentValid())return;registration.step=Math.min(registration.step+1,steps().length-1);profile();window.scrollTo(0,0)};
jumpStep=function(n){const id=steps()[n]?.id;saveFields();registration.step=Math.max(0,steps().findIndex(s=>s.id===id));profile()};
openEvidence=function(){const i=steps().findIndex(s=>s.id==='evidence');if(i>=0){registration.step=i;navigate('profile')}};
async function institutionProfilePurposeNav(){
  const selected=selectedPurposes();
  const items=[
    ['Hire teachers / professors','Hiring','openings'],
    ['Promote admissions','Admissions','admissions'],
    ['Training association / partnership','Training partnerships','partnerships']
  ];
  return '<div class="institution-profile-purpose-nav">'+items.map(function(x){
    const on=selected.includes(x[0]),active=steps()[registration.step]&&steps()[registration.step].id===x[2];
    return '<button type="button" class="'+(active?'active':'')+'" onclick="startInstitutionPurpose(\''+x[0].replace(/'/g,"\\'")+'\')"><strong>'+x[1]+'</strong><small>'+(on?'Configured / selected':'Add purpose')+'</small></button>';
  }).join('')+'</div>';
}
async function startInstitutionPurpose(p){state.role='institution';$('#role').value='institution';if(!hasPurpose(p))record().fields.purposes=[...selectedPurposes(),p];if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();const target=p==='Hire teachers / professors'?'openings':p==='Promote admissions'?'admissions':'partnerships';registration.step=steps().findIndex(s=>s.id===target);navigate('profile')}
const previousWorkspace=workspace;workspace=function(){previousWorkspace();if(state.role==='institution')$('#main').insertAdjacentHTML('afterbegin',`<section class="panel"><h2>What would your institution like to do?</h2><div class="workspace-links" style="margin-top:18px"><button class="btn" onclick="navigate('explore')">Discover teachers / professors</button><button class="btn light" onclick="startInstitutionPurpose('Hire teachers / professors')">Post a job opening</button><button class="btn light" onclick="startInstitutionPurpose('Promote admissions')">Admission promotions</button><button class="btn light" onclick="startInstitutionPurpose('Training association / partnership')">Find training partners</button></div><p class="muted">Select one or more purposes; each has its own questions and contact preferences.</p></section>`)};
// Replace the old evidence shortcut with a dynamic destination.
if(location.hash==='#profile'||location.hash==='#workspace')render();
const evidenceByPurpose=evidenceHTML;evidenceHTML=function(){let html=evidenceByPurpose();if(state.role==='learner')return html;const names=[...new Set([...record().skills.map(s=>s.name),...record().openings.flatMap(o=>o.skills),...record().courses.flatMap(c=>c.skills)])];for(const id of ['evidence-skill','link-skill'])html=html.replace(new RegExp('(<select id="'+id+'">)[\\s\\S]*?(</select>)'),`$1<option value="">General profile</option>${names.map(s=>`<option>${esc(s)}</option>`).join('')}$2`);return html};
const adaptiveBeforeLabels=adaptiveFields;adaptiveFields=function(id){return adaptiveBeforeLabels(id).map(f=>state.role==='teacher'&&f.key==='grades'&&!hasPurpose('Find a job')?{...f,label:'Learner age groups / audience you teach'}:f)};
const workspaceBeforeEntries=workspace;workspace=function(){workspaceBeforeEntries();const r=record(),kind=state.role==='institution'?'openings':state.role==='training'?'courses':null;if(kind&&r[kind].length)$('#main').insertAdjacentHTML('beforeend',`<section class="panel"><h2>${kind==='openings'?'Your job postings':'Your courses'}</h2>${r[kind].map(x=>`<div class="row"><div><strong>${esc(x.title)}</strong><p>${x.skills.map(esc).join(', ')}</p></div><span class="badge">Saved draft</span></div>`).join('')}</section>`)};


// Talind Training Provider Inputs V10
// Gives Training Providers two independent business paths: individual learner
// programmes and institutional partnerships.

const trainingStepsBase=steps;
steps=function(){
  if(state.role!=='training')return trainingStepsBase();
  return [
    {id:'basics',title:'Account & authorised contact'},
    {id:'purpose',title:'Your business purpose'},
    {id:'background',title:'Provider expertise'},
    {id:'skills',title:'Skills offered & expertise'},
    ...(hasPurpose('Individual learner enrolment')?[{id:'courses',title:'Courses & programmes'}]:[]),
    ...(hasPurpose('Institutional partnerships')?[{id:'providerPartnerships',title:'Institutional partnerships'}]:[]),
    {id:'consent',title:'Contact & consent'},
    {id:'review',title:'Review & complete'}
  ];
};

const trainingAdaptiveBase=adaptiveFields;
adaptiveFields=function(id){
  if(state.role==='training'&&id==='providerPartnerships'){
    return [
      field('providerInstitutionTypes','Institutions you want to work with','text',[],true),
      field('providerPartnershipTypes','Partnership / programme types offered','textarea',[],true),
      field('providerInstitutionAudience','Target participants / departments','text',[],true),
      field('providerCustomise','Can programmes be customised?','select',['Yes','No','Depends on requirement'],true),
      field('providerDelivery','Institutional delivery mode','select',['Online','On campus','Hybrid','Flexible'],true),
      field('providerTravel','Travel / on-site delivery availability','text',[],true),
      field('providerGroupSize','Preferred participant / group size','text',[],true),
      field('providerDuration','Typical institutional programme duration','text',[],true),
      field('providerCommercialModel','Commercial model','select',['Per participant','Per session / workshop','Per programme','Monthly / annual retainer','Open to proposal'],true),
      field('providerContractRange','Indicative institutional fee / contract range','text',[],true),
      field('providerProposalTimeline','Proposal / mobilisation timeline','text',[],true),
      field('providerPastWork','Past institutional clients / outcomes','textarea'),
      field('providerPartnershipWebsite','Partnership / corporate training webpage','url'),
      field('providerProposalLink','Programme catalogue / proposal link','url'),
      field('providerPartnershipNotes','Other capabilities or conditions','textarea')
    ];
  }
  if(state.role==='training'&&id==='preferences')return [];
  return trainingAdaptiveBase(id);
};

const trainingPurposeBase=purposeHTML;
purposeHTML=function(){
  if(state.role!=='training')return trainingPurposeBase();
  const defs=[
    ['Individual learner enrolment','Individual learners','Publish multiple courses or coaching programmes for students, parents and individual learners.'],
    ['Institutional partnerships','Institutional partnerships','Offer workshops, teacher development, student skill programmes, customised training and longer-term institutional contracts.']
  ];
  return '<p class="muted">Choose one or both business paths. Talind keeps learner programmes and institutional business opportunities separate.</p>'+
    '<div class="training-purpose-selector">'+defs.map(function(d){
      const on=hasPurpose(d[0]);
      return '<div class="training-purpose-option '+(on?'selected':'')+'">'+
        '<label class="check-row"><input type="checkbox" name="purposes" value="'+esc(d[0])+'" '+(on?'checked':'')+'><span><strong>'+esc(d[1])+'</strong><small>'+esc(d[2])+'</small></span></label>'+
        (on?'<button type="button" class="btn light" onclick="saveFields();startTrainingPurpose(\''+d[0]+'\')">Configure '+esc(d[1])+' →</button>':'')+
      '</div>';
    }).join('')+'</div>'+
    '<p class="bottom-note">Training Provider membership covers learner discovery and institutional partnership access.</p>';
};

let editingTrainingCourseIndex=-1;
function trainingCourseCardsHTML(){
  const list=record().courses||[];
  return '<div class="provider-course-intro"><p class="muted">Add each course or programme separately. Fees, batch size, trainer, mode, schedule, outcomes and certification can be different for every programme.</p>'+
    '<div class="notice"><strong>Example:</strong> Phonics for ages 5–8, CBSE Mathematics tuition, and Teacher AI Workshop should be three separate programmes.</div></div>'+
    '<div class="provider-course-list">'+list.map(function(e,i){
      return '<article class="provider-course-card"><div class="provider-course-head"><div><span class="eyebrow">PROGRAMME '+(i+1)+'</span><h3>'+esc(e.title)+'</h3><p>'+esc(e.category)+' · '+esc(e.audience)+' · '+esc(e.mode)+'</p></div><span class="badge">'+esc(e.fee)+'</span></div>'+
        '<div class="provider-course-meta"><span>'+esc(e.duration)+'</span><span>'+esc(e.schedule)+'</span><span>Batch '+esc(e.batch)+'</span><span>'+esc(e.start)+'</span></div>'+
        '<div class="tags">'+(e.skills||[]).map(function(s){return '<span>'+esc(s)+'</span>'}).join('')+'</div>'+
        '<div class="workspace-links"><button type="button" class="btn light" onclick="editTrainingCourse('+i+')">Edit</button><button type="button" class="btn outline" onclick="duplicateTrainingCourse('+i+')">Duplicate</button><button type="button" class="text-button" onclick="removeTrainingCourse('+i+')">Remove</button></div></article>';
    }).join('')+'</div>'+
    '<details class="entry-builder provider-course-builder" '+(list.length&&editingTrainingCourseIndex<0?'':'open')+'><summary>+ '+(editingTrainingCourseIndex>=0?'Edit programme':'Add another course / programme')+'</summary>'+
      '<div class="fields">'+courseFields.map(function(q){const src=editingTrainingCourseIndex>=0?(list[editingTrainingCourseIndex]||{}):{};return builderField(q,src[q.key]||'')}).join('')+'</div>'+
      '<h3>Skills taught in this programme</h3><div class="skill-builder"><label>Choose a skill<select id="entry-skill-pick"><option value="">Choose a skill</option>'+catalog.map(function(s){return '<option>'+esc(s)+'</option>'}).join('')+'</select></label><label>Or enter a custom skill<input id="entry-skill-custom" maxlength="100"></label></div>'+
      '<button type="button" class="btn light" onclick="addEntrySkill()">+ Add skill</button><div class="tags" id="entry-skills" aria-live="polite"></div><p class="form-error" id="entry-error" role="alert"></p>'+
      '<div class="entry-save-actions"><button type="button" class="btn" onclick="saveTrainingCourse(true)">'+(editingTrainingCourseIndex>=0?'Update & add another programme':'Save & add another programme')+'</button><button type="button" class="btn outline" onclick="saveTrainingCourse(false)">'+(editingTrainingCourseIndex>=0?'Update programme':'Save programme')+'</button></div>'+
    '</details>';
}

async function saveTrainingCourse(addAnother){
  const obj={};
  for(const q of courseFields){
    const el=$('#entry-'+q.key),v=el?el.value.trim():'';
    if(q.required&&!v){$('#entry-error').textContent='Please complete: '+q.label;el&&el.focus();return}
    if(el&&!el.reportValidity()){$('#entry-error').textContent='Please check: '+q.label;el.focus();return}
    obj[q.key]=v;
  }
  if(!editorSkills.length){$('#entry-error').textContent='Add at least one skill taught in this programme.';return}
  obj.skills=[...editorSkills];
  if(editingTrainingCourseIndex>=0){record().courses[editingTrainingCourseIndex]=obj;editingTrainingCourseIndex=-1}
  else record().courses.push(obj);
  record().complete=false;editorSkills=[];
  if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();
  profile();toast('Programme saved.');
  if(addAnother)setTimeout(function(){const d=document.querySelector('.provider-course-builder');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}},40);
}
function editTrainingCourse(i){const src=record().courses[i];if(!src)return;editingTrainingCourseIndex=i;editorSkills=[...(src.skills||[])];profile();setTimeout(function(){const d=document.querySelector('.provider-course-builder');if(d){d.open=true;refreshEntrySkills();d.scrollIntoView({behavior:'smooth',block:'start'})}},30)}
async function duplicateTrainingCourse(i){const src=record().courses[i];if(!src)return;record().courses.splice(i+1,0,{...src,title:(src.title||'Programme')+' - Copy',skills:[...(src.skills||[])]});record().complete=false;if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile();toast('Programme duplicated.')}
async function removeTrainingCourse(i){record().courses.splice(i,1);record().complete=false;if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile()}

const trainingEntriesBase=entriesHTML;
entriesHTML=function(kind){
  if(state.role==='training'&&kind==='courses')return trainingCourseCardsHTML();
  return trainingEntriesBase(kind);
};

async function startTrainingPurpose(p){
  state.role='training';const select=$('#role');if(select)select.value='training';
  if(!hasPurpose(p))record().fields.purposes=[...selectedPurposes(),p];
  if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();
  const target=p==='Individual learner enrolment'?'courses':'providerPartnerships';
  registration.step=steps().findIndex(function(s){return s.id===target});
  navigate('profile');
}
function trainingProfilePurposeNav(){
  const selected=selectedPurposes();
  const items=[
    ['Individual learner enrolment','Learner programmes','courses'],
    ['Institutional partnerships','Institutional partnerships','providerPartnerships']
  ];
  return '<div class="training-profile-purpose-nav">'+items.map(function(x){
    const current=steps()[registration.step],active=current&&current.id===x[2],on=selected.includes(x[0]);
    return '<button type="button" class="'+(active?'active':'')+'" onclick="startTrainingPurpose(\''+x[0]+'\')"><strong>'+x[1]+'</strong><small>'+(on?'Selected / configured':'Add purpose')+'</small></button>';
  }).join('')+'</div>';
}

const trainingProfileBase=profile;
profile=function(){
  trainingProfileBase();
  if(state.role!=='training')return;
  const current=steps()[registration.step];
  if(current&&current.id==='purpose'){
    document.querySelectorAll('#registration-form input[name="purposes"]').forEach(function(el){
      el.onchange=async function(){saveFields();if(talindCurrentUser&&typeof cloudSaveCurrentRole==='function')await cloudSaveCurrentRole();profile()}
    });
  }
  const layout=document.querySelector('#main .onboard-layout');
  if(layout&&!document.querySelector('.training-profile-purpose-nav'))layout.insertAdjacentHTML('beforebegin',trainingProfilePurposeNav());
  if(current&&current.id==='courses'&&editingTrainingCourseIndex>=0)setTimeout(function(){refreshEntrySkills()},0);
};
