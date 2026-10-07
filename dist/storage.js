// Talind secure private document storage.
// Requires the private Supabase Storage bucket and RLS policies in supabase/profile-documents.sql.

const TALIND_DOCUMENT_BUCKET='profile-documents';
const TALIND_DOCUMENT_MAX_BYTES=10*1024*1024;
const TALIND_DOCUMENT_MIME_TYPES=[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

function talindDocumentFileAllowed(file){
  if(!file||file.size>TALIND_DOCUMENT_MAX_BYTES)return false;
  const extensionOk=/\.(pdf|docx|jpe?g|png)$/i.test(file.name||'');
  return extensionOk&&(TALIND_DOCUMENT_MIME_TYPES.includes(file.type)||!file.type);
}
function talindSafeFileName(name){
  const cleaned=String(name||'document').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  return (cleaned||'document').slice(-140);
}
function talindDocumentPath(file,purpose='general'){
  const role=state.role||'profile';
  const safePurpose=String(purpose||'general').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'')||'general';
  const id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
  return talindCurrentUser.id+'/'+role+'/'+safePurpose+'/'+id+'-'+talindSafeFileName(file.name);
}
async function talindUploadEvidenceFile(file,meta={}){
  if(!talindCurrentUser){authScreen('login');throw new Error('Sign in before uploading documents.')}
  if(!talindDocumentFileAllowed(file))throw new Error('Choose a PDF, DOCX, JPG or PNG up to 10 MB.');
  const storagePath=talindDocumentPath(file,meta.purpose||meta.kind||'general');
  const result=await talindSupabase.storage.from(TALIND_DOCUMENT_BUCKET).upload(storagePath,file,{
    cacheControl:'3600',
    upsert:false,
    contentType:file.type||undefined
  });
  if(result.error)throw result.error;
  return {
    name:file.name,
    size:file.size,
    kind:meta.kind||'Document',
    skill:meta.skill||'',
    purpose:meta.purpose||'',
    bucket:TALIND_DOCUMENT_BUCKET,
    storagePath,
    mime:file.type||'',
    uploadedAt:new Date().toISOString(),
    url:''
  };
}
async function talindDeleteStoredEvidence(item){
  if(!item||!item.storagePath)return;
  const result=await talindSupabase.storage.from(item.bucket||TALIND_DOCUMENT_BUCKET).remove([item.storagePath]);
  if(result.error)throw result.error;
}
async function talindOpenEvidence(index,download=false){
  const item=record().evidence[index];
  if(!item)return;
  if(item.storagePath){
    const options=download?{download:item.name||true}:undefined;
    const result=await talindSupabase.storage.from(item.bucket||TALIND_DOCUMENT_BUCKET).createSignedUrl(item.storagePath,90,options);
    if(result.error){toast(result.error.message||'Could not open this document.');return}
    const link=document.createElement('a');
    link.href=result.data.signedUrl;
    link.target=download?'_self':'_blank';
    link.rel='noopener';
    if(download)link.download=item.name||'document';
    document.body.appendChild(link);link.click();link.remove();
    return;
  }
  if(item.url){
    const link=document.createElement('a');link.href=item.url;link.target=download?'_self':'_blank';
    if(download)link.download=item.name||'document';document.body.appendChild(link);link.click();link.remove();return;
  }
  toast('This document is not available in secure storage yet.');
}
function talindEvidenceActions(item,index){
  if(item&&item.storagePath){
    return '<button type="button" class="btn light" onclick="talindOpenEvidence('+index+',false)">View</button>'+
      '<button type="button" class="btn outline" onclick="talindOpenEvidence('+index+',true)">Download</button>'+
      '<button type="button" class="text-button" onclick="removeEvidence('+index+')">Remove</button>';
  }
  return '<span class="badge">Upload required</span><button type="button" class="text-button" onclick="removeEvidence('+index+')">Remove</button>';
}

const talindStorageSafeRecordBase=cloudSafeRecord;
cloudSafeRecord=function(r){
  const data=talindStorageSafeRecordBase(r);
  data.evidence=(r.evidence||[]).map(function(e){
    return {
      name:e.name||'',
      size:Number(e.size||0),
      kind:e.kind||'',
      skill:e.skill||'',
      purpose:e.purpose||'',
      bucket:e.bucket||'',
      storagePath:e.storagePath||'',
      mime:e.mime||'',
      uploadedAt:e.uploadedAt||'',
      url:''
    };
  });
  return data;
};

const talindStorageStepsBase=steps;
steps=function(){
  const list=talindStorageStepsBase();
  if(state.role==='learner'||list.some(function(x){return x.id==='evidence'}))return list;
  const out=[...list];
  const consentIndex=out.findIndex(function(x){return x.id==='consent'});
  out.splice(consentIndex<0?out.length:consentIndex,0,{id:'evidence',title:'Evidence & documents'});
  return out;
};

function talindEvidenceTypes(){
  const types=[],links=[];
  if(state.role==='teacher'){
    if(hasPurpose('Find a job'))types.push('Résumé / CV','Qualification certificate','Experience letter');
    if(hasPurpose('Offer tuition / coaching / training'))types.push('Coaching portfolio','Skill certificate','Workshop outline');
    links.push('Teaching / coaching demo','Skill demonstration','Portfolio website','Certificate verification page');
  }
  if(state.role==='institution'){
    if(hasPurpose('Hire teachers / professors'))types.push('Recruitment brochure','Job description');
    if(hasPurpose('Promote admissions'))types.push('Institution brochure','Affiliation certificate','Programme prospectus','Fee information');
    if(hasPurpose('Training association / partnership'))types.push('Training requirement brief','Partnership proposal');
    links.push('Official website','Campus tour','Programme information','Partnership information');
  }
  if(state.role==='training'){
    types.push('Trainer résumé','Trainer qualification','Course brochure','Skill / accreditation certificate');
    if(hasPurpose('Institutional partnerships'))types.push('Institutional proposal','Past training portfolio');
    links.push('Training demo','Trainer introduction','Course outline','Certificate verification page');
  }
  return {types:[...new Set(types)],links:[...new Set(links)]};
}

evidenceHTML=function(){
  if(state.role==='learner')return '';
  const r=record(),cfg=talindEvidenceTypes();
  const documents=(r.evidence||[]).filter(function(e){return e.purpose!=='admissions'});
  return '<p class="muted">Upload relevant evidence to private Talind storage. Evidence remains unverified unless Talind later adds a verification process.</p>'+
    '<div class="notice document-storage-note"><strong>Private by default.</strong> These files are stored under your signed-in account and are not exposed as public file URLs.</div>'+
    '<div class="skill-builder">'+
      '<label>Document type<select id="evidence-kind">'+cfg.types.map(function(s){return '<option>'+esc(s)+'</option>'}).join('')+'</select></label>'+
      '<label>Related skill<select id="evidence-skill"><option value="">General profile</option>'+(r.skills||[]).map(function(s){return '<option>'+esc(s.name)+'</option>'}).join('')+'</select></label>'+
      '<label class="full">Select PDF, DOCX, JPG or PNG (10 MB maximum)<input type="file" id="evidence-file" accept=".pdf,.docx,.jpg,.jpeg,.png"></label>'+
    '</div><button type="button" class="btn light" id="evidence-upload-btn" onclick="attachFile()">+ Upload document</button>'+
    '<div class="skill-list">'+(documents.length?documents.map(function(e){
      const i=r.evidence.indexOf(e);
      return '<div class="skill-row"><div><strong>'+esc(e.name)+'</strong><p>'+esc(e.kind)+' · '+esc(e.skill||'General profile')+' · '+Math.ceil(Number(e.size||0)/1024)+' KB · '+(e.storagePath?'Private cloud storage':'Upload required')+'</p></div><div class="workspace-links">'+talindEvidenceActions(e,i)+'</div></div>';
    }).join(''):'<p class="muted">No documents uploaded yet.</p>')+'</div>'+
    '<h3>Videos & other evidence links</h3>'+
    '<div class="skill-builder"><label>Link type<select id="link-kind">'+cfg.links.map(function(s){return '<option>'+esc(s)+'</option>'}).join('')+'</select></label>'+
      '<label>Related skill<select id="link-skill"><option value="">General profile</option>'+(r.skills||[]).map(function(s){return '<option>'+esc(s.name)+'</option>'}).join('')+'</select></label>'+
      '<label>Title<input id="link-title" maxlength="150" placeholder="e.g. My teaching demonstration"></label>'+
      '<label>Video / evidence URL<input id="link-url" type="url" placeholder="https://..."></label></div>'+
    '<button type="button" class="btn light" onclick="addEvidenceLink()">+ Add evidence link</button>'+
    (r.links||[]).filter(function(e){return e.purpose!=='admissions'}).map(function(e){
      const i=r.links.indexOf(e);
      return '<div class="skill-row"><div><a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.title)+' ↗</a><p>'+esc(e.kind)+' · '+esc(e.skill||'General profile')+' · Unverified</p></div><button type="button" class="text-button" onclick="removeLink('+i+')">Remove</button></div>';
    }).join('');
};

attachFile=async function(){
  const input=$('#evidence-file'),file=input&&input.files&&input.files[0],button=$('#evidence-upload-btn');
  if(!file){toast('Select a file first.');return}
  if(button){button.disabled=true;button.textContent='Uploading…'}
  try{
    const item=await talindUploadEvidenceFile(file,{
      kind:$('#evidence-kind')?.value||'Document',
      skill:$('#evidence-skill')?.value||'',
      purpose:'profile'
    });
    record().evidence.push(item);record().complete=false;
    await cloudSaveCurrentRole();
    profile();toast('Document uploaded securely.');
  }catch(error){
    console.error('Talind document upload failed',error);
    const message=/bucket|not found|row-level security|policy/i.test(error?.message||'')
      ?'Secure document storage is not activated on Supabase yet.'
      :(error?.message||'Document upload failed.');
    toast(message);
    if(button){button.disabled=false;button.textContent='+ Upload document'}
  }
};

removeEvidence=async function(index){
  const item=record().evidence[index];if(!item)return;
  try{
    await talindDeleteStoredEvidence(item);
    if(item.url)try{URL.revokeObjectURL(item.url)}catch{}
    record().evidence.splice(index,1);record().complete=false;
    await cloudSaveCurrentRole();
    profile();toast('Document removed.');
  }catch(error){console.error('Talind document removal failed',error);toast(error?.message||'Could not remove this document.')}
};

const talindStorageAdmissionsBase=institutionAdmissionsHTML;
institutionAdmissionsHTML=function(){
  const fields=adaptiveFields('admissions'),r=record(),files=admissionEvidence(),links=admissionLinks();
  return '<div class="institution-input-section"><span class="eyebrow">ADMISSION DETAILS</span><h3>Information students and parents should see</h3><p class="muted">Keep admission information separate from recruitment. These details can power admission matching and promotions.</p><div class="fields">'+fields.map(fieldHTML).join('')+'</div></div>'+
    '<div class="institution-input-section admission-assets"><span class="eyebrow">ADMISSION ASSETS</span><h3>Website, e-brochure & supporting documents</h3><p class="muted">Upload the materials families may need while evaluating your institution. Files remain private until Talind adds an approved sharing flow.</p>'+
      '<div class="skill-builder"><label>Document type<select id="admission-file-kind"><option>E-brochure / prospectus</option><option>Fee structure</option><option>Affiliation / accreditation document</option><option>Admission application form</option><option>Scholarship information</option><option>Programme brochure</option><option>Other admission document</option></select></label>'+
      '<label class="full">Upload PDF, DOCX, JPG or PNG (10 MB maximum)<input type="file" id="admission-file" accept=".pdf,.docx,.jpg,.jpeg,.png"></label></div>'+
      '<button type="button" class="btn light" id="admission-upload-btn" onclick="attachAdmissionFile()">+ Upload admission document</button>'+
      '<div class="admission-asset-list">'+(files.length?files.map(function(e){
        const i=r.evidence.indexOf(e);
        return '<div class="admission-asset-row"><div><strong>'+esc(e.name)+'</strong><p>'+esc(e.kind)+' · '+Math.ceil(Number(e.size||0)/1024)+' KB · '+(e.storagePath?'Private cloud storage':'Upload required')+'</p></div><div class="workspace-links">'+talindEvidenceActions(e,i)+'</div></div>';
      }).join(''):'<p class="muted">No admission documents uploaded yet.</p>')+'</div>'+
      '<h3>Useful admission links</h3><div class="skill-builder"><label>Link type<select id="admission-link-kind"><option>Virtual campus tour</option><option>Admission information page</option><option>Online application portal</option><option>Programme / course page</option><option>Fee information page</option><option>Other useful link</option></select></label>'+
      '<label>Title<input id="admission-link-title" maxlength="150" placeholder="e.g. Virtual campus tour"></label><label class="full">URL<input id="admission-link-url" type="url" placeholder="https://..."></label></div>'+
      '<button type="button" class="btn light" onclick="addAdmissionLink()">+ Add admission link</button>'+
      '<div class="admission-asset-list">'+links.map(function(e){const i=r.links.indexOf(e);return '<div class="admission-asset-row"><div><a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">'+esc(e.title)+' ↗</a><p>'+esc(e.kind)+'</p></div><button type="button" class="text-button" onclick="removeAdmissionLink('+i+')">Remove</button></div>'}).join('')+'</div>'+
      '<div class="notice admission-upload-note"><strong>Private storage:</strong> documents persist with the institution account. Public admission links remain separate from private files.</div>'+
    '</div>';
};

attachAdmissionFile=async function(){
  const input=$('#admission-file'),file=input&&input.files&&input.files[0],button=$('#admission-upload-btn');
  if(!file){toast('Select an admission document first.');return}
  if(button){button.disabled=true;button.textContent='Uploading…'}
  try{
    const item=await talindUploadEvidenceFile(file,{
      kind:$('#admission-file-kind')?.value||'Admission document',
      skill:'Admissions',
      purpose:'admissions'
    });
    record().evidence.push(item);record().complete=false;
    await cloudSaveCurrentRole();
    profile();toast('Admission document uploaded securely.');
  }catch(error){
    console.error('Admission document upload failed',error);
    const message=/bucket|not found|row-level security|policy/i.test(error?.message||'')
      ?'Secure document storage is not activated on Supabase yet.'
      :(error?.message||'Document upload failed.');
    toast(message);
    if(button){button.disabled=false;button.textContent='+ Upload admission document'}
  }
};
removeAdmissionEvidence=async function(index){return removeEvidence(index)};

const talindStorageReviewBase=reviewAdaptive;
reviewAdaptive=function(){
  let html=talindStorageReviewBase();
  if(state.role!=='learner'){
    const stored=(record().evidence||[]).filter(function(e){return !!e.storagePath}).length;
    html=html.replace(/\d+ document\(s\)[^<]*/,' '+stored+' securely stored document(s) · '+(record().links||[]).length+' evidence link(s). ');
  }
  return html;
};

const talindStorageProfileBase=profile;
profile=function(){
  talindStorageProfileBase();
  if(state.role==='learner')return;
  const firstNotice=document.querySelector('#main .notice');
  if(firstNotice&&/Selected local files are not uploaded yet|Documents uploaded through Talind/i.test(firstNotice.textContent)){
    firstNotice.textContent='Your profile fields and uploaded documents are saved to your Talind account. Documents are private by default.';
  }
};
