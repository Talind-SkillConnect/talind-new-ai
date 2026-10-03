// Talind production Supabase integration.
// The publishable key is safe for browser use. Database access is protected by RLS.
const TALIND_SUPABASE_URL='https://cghmnsukgaqdryqrktzd.supabase.co';
const TALIND_SUPABASE_PUBLISHABLE_KEY='sb_publishable_0IYwJXV49JuLHsQ3C-DNUA_b8tEUfOO';
const TALIND_AUTH_REDIRECT='https://www.talindeducation.com/';

const talindSupabase=window.supabase.createClient(
  TALIND_SUPABASE_URL,
  TALIND_SUPABASE_PUBLISHABLE_KEY,
  {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      flowType:'pkce'
    }
  }
);

window.talindSupabase=talindSupabase;
let talindCurrentUser=null;
let talindCloudBusy=false;
window.talindAccountRoles=[];

function cloudEmptyRecord(){
  return {fields:{},skills:[],evidence:[],links:[],openings:[],courses:[],complete:false};
}

function cloudSafeRecord(r){
  return {
    fields:{...(r.fields||{})},
    skills:(r.skills||[]).map(s=>({...s})),
    evidence:(r.evidence||[]).map(e=>({
      name:e.name||'',
      size:Number(e.size||0),
      kind:e.kind||'',
      skill:e.skill||'',
      url:''
    })),
    links:(r.links||[]).map(x=>({...x})),
    openings:(r.openings||[]).map(x=>({...x,skills:[...(x.skills||[])]})),
    courses:(r.courses||[]).map(x=>({...x,skills:[...(x.skills||[])]})),
    complete:!!r.complete
  };
}

function cloudApplyRoleRecord(role,row,skills=[]){
  const data=row?.form_data||{};
  const r=cloudEmptyRecord();
  r.fields={...(data.fields||{})};
  r.skills=skills.length?skills.map(s=>({
    name:s.skill_name,
    purpose:s.purpose||'',
    level:s.level||'Not assessed',
    years:s.years_experience==null?'':String(s.years_experience),
    priority:s.is_primary?'Primary':'Additional'
  })):(data.skills||[]);
  r.evidence=(data.evidence||[]).map(e=>({...e,url:''}));
  r.links=data.links||[];
  r.openings=data.openings||[];
  r.courses=data.courses||[];
  r.complete=!!(row?.profile_complete||data.complete);
  registration.records[role]=r;
}

function cloudUpdateVisibleProfile(role){
  const r=registration.records[role];
  if(!r)return;
  const f=r.fields||{};
  state.profiles[role]={
    name:f.name||f.authorisedPerson||'',
    title:f.headline||roleNames[role],
    location:f.city||'',
    skills:(r.skills||[]).map(s=>s.name).join(', '),
    bio:f.bio||f.goals||''
  };
}

async function cloudLoadUser(){
  if(!talindCurrentUser)return;
  const uid=talindCurrentUser.id;
  const [profileRes,rolesRes,skillsRes]=await Promise.all([
    talindSupabase.from('profiles').select('*').eq('id',uid).maybeSingle(),
    talindSupabase.from('role_profiles').select('*').eq('user_id',uid),
    talindSupabase.from('profile_skills').select('*').eq('user_id',uid)
  ]);
  if(profileRes.error)throw profileRes.error;
  if(rolesRes.error)throw rolesRes.error;
  if(skillsRes.error)throw skillsRes.error;

  const roleRows=rolesRes.data||[];
  const skillRows=skillsRes.data||[];
  for(const row of roleRows){
    cloudApplyRoleRecord(row.role,row,skillRows.filter(s=>s.role===row.role));
    cloudUpdateVisibleProfile(row.role);
  }

  const preferred=talindCurrentUser.user_metadata?.role;
  const available=roleRows.map(r=>r.role).filter(r=>Object.prototype.hasOwnProperty.call(roleNames,r));
  const selected=available.includes(preferred)?preferred:
    available[0]||preferred||'learner';
  // One signed-in account uses one primary account type. Legacy extra role rows
  // are ignored in the UI so analytics and permissions stay attributable.
  window.talindAccountRoles=[selected];

  state.role=Object.prototype.hasOwnProperty.call(roleNames,selected)?selected:'learner';
  $('#role').value=state.role;

  // Ensure an empty local record exists even for a newly added role.
  if(!registration.records[state.role])registration.records[state.role]=cloudEmptyRecord();

  const base=profileRes.data;
  if(base&&!registration.records[state.role].fields.email){
    registration.records[state.role].fields.email=talindCurrentUser.email||'';
  }
  cloudUpdateVisibleProfile(state.role);
}

async function cloudSaveCurrentRole({complete=false}={}){
  if(!talindCurrentUser||talindCloudBusy)return false;
  talindCloudBusy=true;
  try{
    if(typeof saveFields==='function')saveFields();
    const uid=talindCurrentUser.id;
    const role=state.role;
    const r=record();
    if(complete)r.complete=true;
    const f=r.fields||{};
    const payload=cloudSafeRecord(r);

    const {error:profileError}=await talindSupabase.from('profiles').upsert({
      id:uid,
      display_name:f.name||f.authorisedPerson||talindCurrentUser.email||'',
      phone:f.officialPhone||f.phone||null,
      whatsapp:f.whatsapp||null,
      country:f.country||'India',
      region:f.region||null,
      city:f.city||null,
      postal_code:f.postal||null
    },{onConflict:'id'});
    if(profileError)throw profileError;

    const {error:roleError}=await talindSupabase.from('role_profiles').upsert({
      user_id:uid,
      role,
      headline:f.headline||roleNames[role],
      bio:f.bio||f.goals||'',
      form_data:payload,
      profile_complete:!!r.complete,
      is_published:!!r.complete && f.profilePublic!==false
    },{onConflict:'user_id,role'});
    if(roleError)throw roleError;

    const {error:deleteSkillError}=await talindSupabase
      .from('profile_skills')
      .delete()
      .eq('user_id',uid)
      .eq('role',role);
    if(deleteSkillError)throw deleteSkillError;

    if((r.skills||[]).length){
      const rows=r.skills.map((s,i)=>({
        user_id:uid,
        role,
        skill_name:s.name,
        purpose:s.purpose||null,
        level:s.level||null,
        years_experience:s.years===''||s.years==null?null:Number(s.years),
        is_primary:s.priority==='Primary'||i===0,
        metadata:{custom:!!s.custom}
      }));
      const {error:skillError}=await talindSupabase.from('profile_skills').insert(rows);
      if(skillError)throw skillError;
    }


    // Publish only safe discovery fields; contact details remain private in profiles/role_profiles.
    try{
      let publicPurposes=Array.isArray(f.purposes)?[...f.purposes]:[];
      if(role==='teacher'&&publicPurposes.includes('Offer tuition / coaching / training')){
        const {data:serviceMemberships,error:serviceMembershipError}=await talindSupabase
          .from('memberships')
          .select('status,starts_at,ends_at')
          .eq('user_id',uid)
          .eq('plan_code','teacher-services')
          .eq('status','active');
        if(serviceMembershipError)throw serviceMembershipError;
        const now=Date.now();
        const serviceActive=(serviceMemberships||[]).some(function(m){
          const starts=!m.starts_at||new Date(m.starts_at).getTime()<=now;
          const ends=!m.ends_at||new Date(m.ends_at).getTime()>now;
          return starts&&ends;
        });
        if(!serviceActive){
          publicPurposes=publicPurposes.filter(function(p){return p!=='Offer tuition / coaching / training'});
        }
      }
      const publicProfile={
        user_id:uid,
        role,
        display_name:f.name||f.authorisedPerson||'Talind member',
        headline:f.headline||roleNames[role],
        bio:f.bio||f.goals||'',
        city:f.city||null,
        region:f.region||null,
        country:f.country||'India',
        mode:f.mode||f.format||null,
        skills:(r.skills||[]).map(s=>s.name).filter(Boolean),
        purposes:publicPurposes,
        is_active:!!r.complete && f.profilePublic!==false && (role!=='teacher'||publicPurposes.length>0)
      };
      const {error:publicError}=await talindSupabase.from('public_profiles').upsert(
        publicProfile,
        {onConflict:'user_id,role'}
      );
      if(publicError)throw publicError;

      if(role==='learner'){
        const makeReq=(slot,type)=>{
          if(!type||type==='No second requirement')return null;
          const slug=String(type).toLowerCase().replace(/[^a-z]+/g,'_').replace(/^_|_$/g,'');
          const prefix=slot+'_'+slug+'_';
          const specific={};
          for(const [k,v] of Object.entries(f)){
            if(k.startsWith(prefix)&&v!==''&&v!=null)specific[k.slice(prefix.length)]=v;
          }
          const skillNames=(r.skills||[])
            .filter(s=>s.purpose==='Want to learn'||s.purpose==='Already have'||!s.purpose)
            .map(s=>s.name)
            .filter(Boolean);
          const focus=specific.focus||specific.programme||specific.class||specific.grade||skillNames.join(', ')||type;
          const location=specific.location||f.city||null;
          const mode=specific.mode||f.mode||'Flexible';
          const budgetText=specific.budget||f.budgetBand||null;
          return {
            user_id:uid,
            slot,
            title:focus&&focus!==type?type+' — '+String(focus).slice(0,120):type,
            requirement_type:type,
            subject_skill:String(focus||type).slice(0,300),
            location,
            mode,
            budget_min:null,
            budget_max:null,
            budget_unit:specific.budgetUnit||f.budgetUnit||null,
            timing:specific.timing||f.timing||null,
            start_preference:specific.start||f.start||null,
            details:{
              ...specific,
              budget_text:budgetText,
              learner_stage:f.stage||null,
              grade:f.grade||null,
              curriculum:f.curriculum||null
            },
            status:r.complete?'active':'draft'
          };
        };
        const mainReq=makeReq('main',f.needs);
        const secondReq=makeReq('second',f.secondNeed);
        for(const req of [mainReq,secondReq].filter(Boolean)){
          const {error:reqError}=await talindSupabase.from('learner_requirements').upsert(
            req,
            {onConflict:'user_id,slot'}
          );
          if(reqError)throw reqError;
        }
        if(!secondReq){
          const {error:delSecondError}=await talindSupabase
            .from('learner_requirements')
            .delete()
            .eq('user_id',uid)
            .eq('slot','second');
          if(delSecondError)throw delSecondError;
        }
      }
    }catch(publishError){
      // Profile ownership data is already saved; discovery sync can be retried after schema/policy setup.
      console.warn('Talind discovery sync pending',publishError);
    }

    cloudUpdateVisibleProfile(role);
    if(typeof liveLoadDiscovery==='function'){
      try{await liveLoadDiscovery();}catch(e){console.warn('Talind match refresh pending',e);}
    }
    return true;
  }catch(error){
    console.error('Talind cloud save failed',error);
    toast('Could not save your profile. Please check your connection and try again.');
    return false;
  }finally{
    talindCloudBusy=false;
  }
}

async function cloudHandleSession(session){
  talindCurrentUser=session?.user||null;
  registration.active=talindCurrentUser?{
    email:talindCurrentUser.email,
    role:talindCurrentUser.user_metadata?.role||state.role
  }:null;

  if(talindCurrentUser){
    try{
      await cloudLoadUser();
      if(state.role==='teacher'){
        try{await cloudSaveCurrentRole({complete:!!record().complete});}
        catch(syncError){console.warn('Teacher public-access sync pending',syncError);}
      }
    }catch(error){
      console.error('Talind profile load failed',error);
      toast('Signed in, but your profile could not be loaded yet.');
    }
  }else{
    registration.active=null;
    registration.records={};
    window.talindAccountRoles=[];
  }

  if(talindCurrentUser&&location.search.includes('code=')){
    history.replaceState({},document.title,location.pathname+(location.hash||''));
  }

  updateAuthHeader();
  render();
}

function authScreen(kind='signup'){
  const isSignup=kind==='signup';
  modal(`
    <span class="eyebrow">${isSignup?'SIGN UP':'LOG IN'}</span>
    <h2>${isSignup?'Create your Talind account.':'Welcome back to Talind.'}</h2>
    <p class="muted">${isSignup?'Create one account and build the profile that matches your goal.':'Use the email and password you registered with.'}</p>
    <form id="auth-form">
      <div class="fields">
        <label class="full">Email
          <input name="email" type="email" autocomplete="email" required placeholder="you@example.com">
        </label>
        ${isSignup?`<label class="full">Starting profile
          <select name="role">${Object.entries(roleNames).map(([k,v])=>`<option value="${k}" ${k===state.role?'selected':''}>${v}</option>`).join('')}</select>
        </label>`:''}
        <label class="full">Password
          <input name="password" type="password" autocomplete="${isSignup?'new-password':'current-password'}" minlength="8" required placeholder="Minimum 8 characters">
        </label>
      </div>
      <button class="btn" type="submit">${isSignup?'Create account':'Log in'}</button>
      <p class="muted">${isSignup?'Already have an account?':'New to Talind?'}
        <button class="text-button" type="button" onclick="authScreen('${isSignup?'login':'signup'}')">${isSignup?'Log in':'Sign up'}</button>
      </p>
      <p id="auth-error" class="form-error" role="alert"></p>
    </form>
  `);

  $('#auth-form').onsubmit=async e=>{
    e.preventDefault();
    const form=e.target;
    const button=form.querySelector('button[type="submit"]');
    const d=new FormData(form);
    const email=String(d.get('email')||'').trim().toLowerCase();
    const password=String(d.get('password')||'');
    button.disabled=true;
    button.textContent=isSignup?'Creating account…':'Logging in…';
    $('#auth-error').textContent='';
    try{
      if(isSignup){
        const role=String(d.get('role')||'learner');
        const {data,error}=await talindSupabase.auth.signUp({
          email,
          password,
          options:{
            emailRedirectTo:TALIND_AUTH_REDIRECT,
            data:{role,display_name:''}
          }
        });
        if(error)throw error;
        state.role=role;
        $('#role').value=role;
        if(data.session){
          $('#modal').close();
          await cloudHandleSession(data.session);
          registration.step=0;
          navigate('profile');
          toast('Account created. Complete your Talind profile.');
        }else{
          $('#modal-body').innerHTML=`
            <span class="eyebrow">CHECK YOUR EMAIL</span>
            <h2>Confirm your Talind account.</h2>
            <p class="muted">We sent a confirmation link to <strong>${esc(email)}</strong>. Open that email, confirm your account, then return to Talind and log in.</p>
            <div class="dialog-actions"><button class="btn" onclick="authScreen('login')">Go to login</button></div>
          `;
        }
      }else{
        const {data,error}=await talindSupabase.auth.signInWithPassword({email,password});
        if(error)throw error;
        $('#modal').close();
        await cloudHandleSession(data.session);
        navigate('workspace');
        toast('Welcome back to Talind.');
      }
    }catch(error){
      $('#auth-error').textContent=error?.message||'Unable to continue. Please try again.';
      button.disabled=false;
      button.textContent=isSignup?'Create account':'Log in';
    }
  };
}

function updateAuthHeader(){
  const h=$('#auth-actions');
  if(!h)return;
  if(talindCurrentUser){
    h.innerHTML=`
      <button class="btn light" onclick="navigate('profile')">My profile</button>
      <button class="text-button" onclick="demoLogout()">Log out</button>
    `;
  }else{
    h.innerHTML=`
      <button class="text-button" onclick="authScreen('login')">Log in</button>
      <button class="btn" onclick="authScreen('signup')">Sign up</button>
    `;
  }
}

async function demoLogout(){
  await talindSupabase.auth.signOut();
  talindCurrentUser=null;
  registration.active=null;
  registration.records={};
  state.profiles={
    learner:{name:'',title:'',location:'',skills:'',bio:''},
    teacher:{name:'',title:'',location:'',skills:'',bio:''},
    institution:{name:'',title:'',location:'',skills:'',bio:''},
    training:{name:'',title:'',location:'',skills:'',bio:''}
  };
  updateAuthHeader();
  navigate('explore');
  toast('You have been logged out.');
}

// Require authentication before opening the editable profile.
const cloudBaseProfile=profile;
profile=function(){
  if(!talindCurrentUser){
    $('#main').innerHTML=intro(
      'YOUR TALIND ACCOUNT',
      'Sign in to build your profile.',
      'Your profile, skills and preferences will be stored securely in your Talind account.'
    )+`<section class="panel"><h2>Ready to continue?</h2><p class="muted">Create an account or log in to save your information permanently.</p><div class="workspace-links"><button class="btn" onclick="authScreen('signup')">Sign up</button><button class="btn outline" onclick="authScreen('login')">Log in</button></div></section>`;
    return;
  }
  cloudBaseProfile();
  const notice=$('#main .notice');
  if(notice&&/session-based|reset on refresh/i.test(notice.textContent)){
    notice.textContent='Your profile is connected to your Talind account. Draft changes are saved as you move through the registration steps.';
  }
};

// Save each completed registration step to Supabase.
const cloudBaseAdvance=advance;
advance=async function(){
  const before=registration.step;
  cloudBaseAdvance();
  if(registration.step!==before&&talindCurrentUser){
    const ok=await cloudSaveCurrentRole();
    if(ok)toast('Progress saved.');
  }
};

const cloudBaseJumpStep=jumpStep;
jumpStep=async function(n){
  cloudBaseJumpStep(n);
  if(talindCurrentUser)await cloudSaveCurrentRole();
};

completeProfile=async function(){
  if(!talindCurrentUser){
    authScreen('signup');
    return;
  }
  const missing=missingFields();
  if(missing.length){
    toast('Complete the required items listed in the review.');
    return;
  }
  record().complete=true;
  const f=record().fields;
  state.profiles[state.role]={
    name:f.name||f.authorisedPerson||'',
    title:f.headline||roleNames[state.role],
    location:f.city||'',
    skills:record().skills.map(s=>s.name).join(', '),
    bio:f.bio||f.goals||''
  };
  const ok=await cloudSaveCurrentRole({complete:true});
  if(ok){
    toast('Profile saved successfully.');
    profile();
  }
};

// Persist when the user switches between stakeholder profiles.
const cloudPreviousChangeRole=changeRole;
changeRole=async function(r){
  if(talindCurrentUser&&window.talindAccountRoles.length&&!window.talindAccountRoles.includes(r)){
    toast('This account is registered as '+roleNames[state.role]+'.');
    return;
  }
  if(talindCurrentUser)await cloudSaveCurrentRole();
  cloudPreviousChangeRole(r);
  if(talindCurrentUser&&!registration.records[r])registration.records[r]=cloudEmptyRecord();
  cloudUpdateVisibleProfile(r);
  render();
};

// Replace session-only language in the workspace registration prompt.
const cloudPreviousWorkspace=workspace;
workspace=function(){
  cloudPreviousWorkspace();
  if(!talindCurrentUser){
    $('#main').insertAdjacentHTML('afterbegin',`<div class="notice"><strong>Sign in to save your Talind activity permanently.</strong> <button class="text-button" onclick="authScreen('login')">Log in</button> or <button class="text-button" onclick="authScreen('signup')">create an account</button>.</div>`);
  }else{
    document.querySelectorAll('.profile-prompt').forEach(el=>{
      el.innerHTML=el.innerHTML.replace(/sample registration/gi,'profile').replace(/Session draft/gi,'Saved draft');
    });
  }
};

async function talindInitAuth(){
  const {data,error}=await talindSupabase.auth.getSession();
  if(error)console.error('Talind auth init failed',error);
  await cloudHandleSession(data?.session||null);
  talindSupabase.auth.onAuthStateChange((_event,session)=>{
    setTimeout(()=>cloudHandleSession(session),0);
  });
}

talindInitAuth();
