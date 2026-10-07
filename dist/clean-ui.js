// Talind Clean UI V3
// Keeps signed-in users inside their registered account category and removes
// redundant dashboard/profile chrome.

function cleanRoleContext(){
  const aside=document.querySelector('aside');
  const label=document.querySelector('aside label[for="role"]');
  const select=document.querySelector('#role');
  if(!aside||!label||!select)return;

  let box=document.querySelector('#role-context');
  if(!box){
    box=document.createElement('div');
    box.id='role-context';
    box.className='role-context';
    label.insertAdjacentElement('beforebegin',box);
  }

  if(talindCurrentUser){
    document.body.classList.add('signed-in');
    label.style.display='none';
    select.style.display='none';

    box.style.display='block';
    box.innerHTML=
      '<span class="role-caption">ACCOUNT TYPE</span>'+
      '<div class="role-current"><strong>'+esc(roleNames[state.role])+'</strong></div>';
  }else{
    document.body.classList.remove('signed-in');
    box.style.display='none';
    label.style.display='';
    label.textContent='EXPLORE TALIND AS';
    select.style.display='';
  }

  const note=document.querySelector('.aside-note');
  const bottom=document.querySelector('.aside-bottom');
  if(note)note.style.display=talindCurrentUser?'none':'';
  if(bottom)bottom.style.display=talindCurrentUser?'none':'';

  const membership=document.querySelector('header nav a[href="#plans"]');
  if(membership)membership.style.display=(talindCurrentUser&&state.role==='learner')?'none':'';
}

function cleanWorkspaceCopy(){
  return {
    learner:{
      title:'My workspace',
      subtitle:'Manage your learning requirements, matched teachers and conversations.',
      primary:'Explore matches'
    },
    teacher:{
      title:'My workspace',
      subtitle:'Manage job opportunities and, when subscribed, your tuition or coaching services.',
      primary:'Explore opportunities'
    },
    institution:{
      title:'My workspace',
      subtitle:'Manage hiring, teacher discovery, admissions and training partnerships.',
      primary:'Discover talent'
    },
    training:{
      title:'My workspace',
      subtitle:'Manage learner opportunities, courses and institutional partnerships.',
      primary:'Explore opportunities'
    }
  }[state.role];
}

function cleanWorkspaceActionButtons(){
  if(state.role==='learner'){
    return '<button class="btn" onclick="navigate(\'explore\')">Explore matches</button>'+
           '<button class="btn outline" onclick="registration.step=steps().findIndex(function(s){return s.id===\'preferences\'});navigate(\'profile\')">Edit learning need</button>';
  }
  if(state.role==='teacher'){
    const purposes=selectedPurposes();
    const out=['<button class="btn" onclick="navigate(\'explore\')">Explore opportunities</button>'];
    if(purposes.includes('Offer tuition / coaching / training')&&!matchMembershipActive('teacher-services')){
      out.push('<button class="btn outline" onclick="billing.audience=\'teacher\';navigate(\'plans\')">Activate Teacher Services</button>');
    }else{
      out.push('<button class="btn outline" onclick="navigate(\'profile\')">Edit profile</button>');
    }
    return out.join('');
  }
  if(state.role==='institution'){
    return '<button class="btn" onclick="navigate(\'explore\')">Discover teachers</button>'+
           '<button class="btn outline" onclick="startInstitutionPurpose(\'Hire teachers / professors\')">Post job opening</button>';
  }
  return '<button class="btn" onclick="navigate(\'explore\')">Explore opportunities</button>'+
         '<button class="btn outline" onclick="openProviderCourses()">Manage courses</button>';
}

function cleanWorkspace(){
  if(!talindCurrentUser){
    $('#main').innerHTML=
      '<div class="clean-workspace-head"><div><h1>My workspace</h1><p>Sign in to manage your Talind profile, matches and conversations.</p></div></div>'+
      '<div class="empty"><h3>Sign in to continue</h3><button class="btn" onclick="authScreen(\'login\')">Log in</button></div>';
    side('workspace');
    return;
  }

  const r=record();
  const f=r.fields||{};
  const copy=cleanWorkspaceCopy();
  const sections=typeof opportunitiesForRole==='function'?opportunitiesForRole():[];
  const conns=typeof v2RoleConnections==='function'?v2RoleConnections():[];
  const active=conns.filter(function(c){return c.status!=='closed'});
  const contacted=conns.filter(function(c){return !!c.last_message_at});
  const accepted=conns.filter(function(c){return c.status==='accepted'});
  const actions=typeof v2PendingActions==='function'?v2PendingActions():[];
  const discoverable=!!r.complete&&f.profilePublic!==false;

  const signalValues=(state.role==='learner'?learnerGoals():selectedPurposes())
    .concat((r.skills||[]).slice(0,4).map(function(s){return s.name}))
    .filter(Boolean)
    .slice(0,6);

  let serviceNotice='';
  if(state.role==='teacher'&&selectedPurposes().includes('Offer tuition / coaching / training')&&!matchMembershipActive('teacher-services')){
    serviceNotice=
      '<div class="notice clean-notice"><strong>Teacher job seeking remains free.</strong> Tuition, coaching, mentoring and other services require Teacher Services membership before learner contact, chat or quotes are enabled. <button class="text-button" onclick="billing.audience=\'teacher\';navigate(\'plans\')">View membership</button></div>';
  }

  $('#main').innerHTML=
    '<div class="clean-workspace-head">'+
      '<div><h1>'+esc(copy.title)+'</h1><p>'+esc(copy.subtitle)+'</p>'+
        (signalValues.length?'<div class="clean-signals">'+signalValues.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div>':'')+
      '</div>'+
      '<div class="workspace-links">'+cleanWorkspaceActionButtons()+'</div>'+
    '</div>'+
    '<div class="clean-status-row">'+
      '<div><strong>'+(r.complete?'Complete':'Incomplete')+'</strong><span>Profile</span></div>'+
      '<div><strong>'+(discoverable?'On':'Off')+'</strong><span>Matching visibility</span></div>'+
      '<div><strong>'+active.length+'</strong><span>Active matches</span></div>'+
      '<div><strong>'+contacted.length+'</strong><span>Conversations</span></div>'+
      '<div><strong>'+accepted.length+'</strong><span>Accepted</span></div>'+
    '</div>'+
    serviceNotice+
    (!r.complete?'<div class="notice clean-notice"><strong>Complete your profile to improve matching.</strong> <button class="text-button" onclick="navigate(\'profile\')">Continue profile</button></div>':'')+
    (actions.length?'<section class="clean-next"><h2>Next actions</h2><div class="workspace-links">'+actions.map(function(a){return '<button class="btn light" onclick="'+a.action+'">'+esc(a.label)+'</button>'}).join('')+'</div></section>':'')+
    '<div class="clean-opportunities">'+
      sections.map(function(section){return opportunitySection(section)}).join('')+
    '</div>'+
    '<section class="clean-manage"><a href="#saved">Shortlist</a><a href="#enquiries">Messages & activity</a><a href="#profile">Profile</a></section>';

  side('workspace');
}

function cleanPageChrome(){
  cleanRoleContext();

  if(location.hash==='#profile'){
    document.querySelectorAll('#main .panel').forEach(function(panel){
      const h=panel.querySelector('h2');
      if(h&&h.textContent.trim()==='Your profile shapes your opportunities.')panel.remove();
    });
  }

  document.querySelectorAll('#main .bottom-note').forEach(function(note){
    if(/AI recommendations will be added|Contact details are not sold|starting point, not a job|Real provider recommendations/i.test(note.textContent)){
      note.remove();
    }
  });
}

const cleanBaseSide=side;
side=function(page){
  cleanBaseSide(page);
  cleanRoleContext();
};

workspace=cleanWorkspace;

const cleanBaseRender=render;
render=function(){
  cleanBaseRender();
  cleanPageChrome();
};

cleanPageChrome();


// Talind Public Experience V4
// Makes the public Explore page explain Talind immediately while preserving
// signed-in matching, membership and relationship logic.

function talindSelectExploreRole(role){
  if(!Object.prototype.hasOwnProperty.call(roleNames,role))return;
  state.role=role;
  state.query='';
  state.category='All';
  state.mode='All modes';
  const select=document.querySelector('#role');
  if(select)select.value=role;
  if(location.hash!=='#explore')location.hash='explore';
  else explore();
  window.scrollTo({top:0,behavior:'smooth'});
}

function talindPublicHero(){
  const roles=[
    {
      key:'learner',
      label:'Students & Parents',
      title:'Find the right support.',
      text:'Discover tutors, coaching, skill programmes, schools and colleges based on what you actually need.',
      meta:'Free access'
    },
    {
      key:'teacher',
      label:'Teachers & Experts',
      title:'Turn skills into opportunity.',
      text:'Find teaching jobs for free, build your professional profile and offer independent services when you choose.',
      meta:'Job seeking is free'
    },
    {
      key:'institution',
      label:'Schools & Colleges',
      title:'Find people who fit.',
      text:'Discover skilled educators, publish hiring needs, strengthen admissions visibility and build partnerships.',
      meta:'Hiring · admissions · partnerships'
    },
    {
      key:'training',
      label:'Training Providers',
      title:'Grow your reach.',
      text:'Connect programmes with learners and discover training opportunities from schools, colleges and institutions.',
      meta:'Learners · institutions'
    }
  ];

  return '<section class="talind-hero">'+
    '<div class="talind-hero-copy">'+
      '<span class="eyebrow">SKILLS · PEOPLE · OPPORTUNITIES</span>'+
      '<h1>Skills open doors.<br>Talind helps you find what comes next.</h1>'+
      '<p>One skills-first platform connecting students, parents, teachers, institutions and training providers through real needs and relevant opportunities.</p>'+
      '<div class="talind-hero-actions">'+
        '<button class="btn" onclick="authScreen(\'signup\')">Create my Talind account →</button>'+
        '<button class="btn outline" onclick="authScreen(\'login\')">Log in</button>'+
      '</div>'+
      '<div class="talind-trust-row"><span>Students & parents: free</span><span>Teacher job seeking: free</span><span>Purpose-based matching</span></div>'+
    '</div>'+
    '<div class="talind-role-grid">'+
      roles.map(function(r){
        const active=state.role===r.key;
        return '<button class="talind-role-card '+(active?'active':'')+'" onclick="talindSelectExploreRole(\''+r.key+'\')">'+
          '<span class="talind-role-label">'+r.label+'</span>'+
          '<strong>'+r.title+'</strong>'+
          '<p>'+r.text+'</p>'+
          '<small>'+r.meta+'</small>'+
          '<span class="talind-role-arrow">'+(active?'Exploring now':'Explore')+' →</span>'+
        '</button>';
      }).join('')+
    '</div>'+
  '</section>'+
  '<section class="talind-how">'+
    '<div><span>01</span><strong>Tell Talind about you</strong><p>Build a profile around your skills, needs, location and goals.</p></div>'+
    '<div><span>02</span><strong>See relevant possibilities</strong><p>Talind surfaces people and opportunities that fit your selected purpose.</p></div>'+
    '<div><span>03</span><strong>Connect with control</strong><p>Shortlist, chat, agree and share contact details according to Talind access rules.</p></div>'+
  '</section>';
}

const talindPublicExploreBase=explore;
explore=function(){
  talindPublicExploreBase();
  if(talindCurrentUser)return;

  const oldIntro=document.querySelector('#main > .intro');
  if(oldIntro)oldIntro.remove();

  const main=document.querySelector('#main');
  if(main&&!main.querySelector('.talind-hero')){
    main.insertAdjacentHTML('afterbegin',talindPublicHero());
  }

  const search=document.querySelector('#main .searchbar');
  if(search&&!document.querySelector('#main .talind-explore-context')){
    const copy={
      learner:['Explore as Student / Parent','Search learning, teachers and institutions.'],
      teacher:['Explore as Teacher / Expert','Search jobs and professional opportunities.'],
      institution:['Explore as School / College','Discover teachers and expertise for your institution.'],
      training:['Explore as Training Provider','Discover learner and institutional opportunities.']
    }[state.role];
    search.insertAdjacentHTML('beforebegin',
      '<div class="talind-explore-context"><div><span class="tiny">YOUR CURRENT VIEW</span><h2>'+copy[0]+'</h2><p>'+copy[1]+'</p></div></div>'
    );
  }
};

const talindHumanWorkspaceBase=workspace;
workspace=function(){
  talindHumanWorkspaceBase();
  if(!talindCurrentUser)return;

  const labels={
    learner:['Profile','Requirement visibility','Matches','Conversations','Confirmed'],
    teacher:['Profile','Profile visibility','Opportunities','Conversations','Confirmed'],
    institution:['Profile','Organisation visibility','Active searches','Conversations','Confirmed'],
    training:['Profile','Provider visibility','Opportunities','Conversations','Confirmed']
  }[state.role];

  document.querySelectorAll('#main .clean-status-row span').forEach(function(el,i){
    if(labels[i])el.textContent=labels[i];
  });
};

const talindRoleContextBase=cleanRoleContext;
cleanRoleContext=function(){
  talindRoleContextBase();
  const avatar=document.querySelector('.avatar-btn');
  if(avatar)avatar.style.display=talindCurrentUser?'':'none';

  const note=document.querySelector('.aside-note');
  if(note&&!talindCurrentUser){
    note.innerHTML='<span class="tiny">ONE CONNECTED COMMUNITY</span><h3>Skills create<br>possibility.</h3><p>Choose your role and explore the opportunities Talind can connect.</p><a href="#plans">Understand Talind access ↗</a>';
  }
};

cleanRoleContext();


// Talind Learner Journey V5
// Makes the Student / Parent journey read like a guided service flow rather than
// a relationship-state machine. Existing database and access rules remain unchanged.

function learnerNeedSummary(){
  const f=record().fields||{};
  const needs=[f.needs,f.secondNeed].filter(function(x){return x&&x!=='No second requirement'});
  return needs.length?needs:['Tell us what support you need'];
}

function learnerJourneyData(){
  const conns=typeof v2RoleConnections==='function'?v2RoleConnections():[];
  const teachers=typeof liveTeacherItems==='function'?liveTeacherItems():[];
  const active=conns.filter(function(c){return c.status!=='closed'});
  const conversations=active.filter(function(c){return !!c.last_message_at||['interest_expressed','quote_submitted','accepted'].includes(c.status)});
  const quotes=active.filter(function(c){return c.status==='quote_submitted'});
  const accepted=active.filter(function(c){return c.status==='accepted'});
  const contactReady=accepted.filter(function(c){return !!engagementOwnAgreement(c.id,'guardian_contact_consent')});
  return {teachers:teachers,active:active,conversations:conversations,quotes:quotes,accepted:accepted,contactReady:contactReady};
}

function learnerJourneyHTML(compact){
  const r=record(),d=learnerJourneyData();
  const steps=[
    {title:'Tell us your need',done:!!r.complete,detail:r.complete?'Requirement ready':'Complete your Student / Parent profile'},
    {title:'Compare matches',done:d.teachers.length>0,detail:d.teachers.length?d.teachers.length+' teacher match'+(d.teachers.length===1?'':'es'):'Matches appear when relevant teachers publish'},
    {title:'Start a conversation',done:d.conversations.length>0,detail:d.conversations.length?d.conversations.length+' conversation'+(d.conversations.length===1?'':'s'):'Message a teacher from a match'},
    {title:'Review a quote',done:d.quotes.length>0||d.accepted.length>0,detail:d.quotes.length?d.quotes.length+' quote awaiting review':d.accepted.length?'Quote accepted':'A teacher can quote after you connect'},
    {title:'Confirm & connect',done:d.contactReady.length>0,detail:d.contactReady.length?'Direct contact approved':'Accept a quote and approve direct contact'}
  ];
  return '<section class="learner-journey '+(compact?'compact':'')+'">'+
    '<div class="learner-journey-head"><div><span class="eyebrow">YOUR TALIND JOURNEY</span><h2>From requirement to the right support.</h2></div>'+
      (!r.complete?'<button class="btn" onclick="registration.step=steps().findIndex(function(s){return s.id===\'preferences\'});navigate(\'profile\')">Complete my requirement</button>':'<button class="btn outline" onclick="navigate(\'explore\')">See my matches</button>')+
    '</div>'+
    '<div class="learner-journey-steps">'+steps.map(function(s,i){
      return '<div class="learner-step '+(s.done?'done':'')+'"><span class="learner-step-no">'+(s.done?'✓':i+1)+'</span><div><strong>'+s.title+'</strong><small>'+s.detail+'</small></div></div>';
    }).join('')+'</div>'+
  '</section>';
}

function learnerNeedsCard(){
  const f=record().fields||{},needs=learnerNeedSummary();
  return '<section class="learner-needs-card">'+
    '<div><span class="tiny">WHAT TALIND IS MATCHING FOR YOU</span><div class="learner-need-tags">'+needs.map(function(x){return '<span>'+esc(x)+'</span>'}).join('')+'</div></div>'+
    '<button class="text-button" onclick="registration.step=steps().findIndex(function(s){return s.id===\'preferences\'});navigate(\'profile\')">Edit requirement</button>'+
  '</section>';
}

function learnerMatchActions(item){
  const c=matchConnection(item),parts=[];
  const status=!c?'Ready to connect':c.status==='shortlisted'?'Saved for later':c.status==='interest_expressed'?'Conversation started':c.status==='quote_submitted'?'Quote received':c.status==='accepted'?'Quote accepted':matchStatusLabel(c);

  if(!c){
    parts.push('<button class="btn outline" onclick="matchSetStatus(\''+item.key+'\',\'shortlisted\')">Save teacher</button>');
    parts.push('<button class="btn" onclick="matchOpenChat(\''+item.key+'\')">Message teacher</button>');
  }else if(c.status!=='closed'){
    parts.push('<button class="btn light" onclick="matchOpenChat(\''+item.key+'\')">'+(c.last_message_at?'Open conversation':'Message teacher')+'</button>');
  }

  if(c&&c.status==='quote_submitted'){
    parts.push('<button class="btn" onclick="matchAcceptQuote(\''+item.key+'\')">Accept quote</button>');
  }

  if(c&&c.status==='accepted'){
    const consent=engagementOwnAgreement(c.id,'guardian_contact_consent');
    if(!consent){
      parts.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'guardian_contact_consent\')">Approve direct contact</button>');
    }else{
      parts.push('<button class="btn outline" onclick="matchViewContact(\''+item.key+'\')">View teacher contact</button>');
    }
  }

  return '<div class="learner-match-state"><span class="badge">'+esc(status)+'</span>'+
    (c&&c.status==='quote_submitted'?'<span class="learner-attention">Action needed: review this quote</span>':'')+
    '</div><div class="dialog-actions learner-match-actions">'+parts.join('')+'</div>';
}

const talindLearnerMatchActionsBase=matchActions;
matchActions=function(item){
  if(state.role==='learner'&&item&&item.kind==='teacher')return learnerMatchActions(item);
  return talindLearnerMatchActionsBase(item);
};

const talindLearnerCardBase=liveMatchCard;
liveMatchCard=function(i){
  if(!(state.role==='learner'&&i&&i.kind==='teacher'))return talindLearnerCardBase(i);
  const c=matchConnection(i);
  const status=!c?'New match':c.status==='shortlisted'?'Saved':c.status==='interest_expressed'?'Conversation started':c.status==='quote_submitted'?'Quote received':c.status==='accepted'?'Confirmed':matchStatusLabel(c);
  const quote=c&&c.quote_amount!=null
    ?'<div class="learner-card-quote"><span>Quote received</span><strong>'+(c.quote_currency||'INR')+' '+Number(c.quote_amount).toLocaleString('en-IN')+'</strong></div>'
    :'';
  return '<article class="card learner-match-card">'+
    '<div class="card-top"><span class="badge">'+esc(status)+'</span><span class="match-fit">'+esc(i.matchReason)+'</span></div>'+
    '<div class="card-body">'+
      '<div class="identity"><div class="initials">'+esc(i.initials)+'</div><div><h3>'+esc(i.name)+'</h3><small>'+esc(i.subtitle)+'</small></div></div>'+
      '<h3>'+esc(i.title)+'</h3>'+
      '<p class="desc">'+esc(i.desc||'')+'</p>'+
      '<div class="tags">'+(i.tags||[]).slice(0,5).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div>'+
      '<div class="meta"><span>'+esc(i.location)+'</span><span>'+esc(i.mode)+'</span></div>'+
      quote+
    '</div>'+
    '<div class="card-foot"><div class="price"><span>Why this match</span><small>'+esc(i.matchReason)+'</small></div><button class="btn light" onclick="liveMatchDetail(\''+i.key+'\')">View teacher →</button></div>'+
  '</article>';
};

const talindLearnerExploreBase=explore;
explore=function(){
  talindLearnerExploreBase();
  if(!(talindCurrentUser&&state.role==='learner'))return;
  const main=document.querySelector('#main');
  if(!main)return;

  const introEl=main.querySelector('.intro');
  if(introEl){
    const h=introEl.querySelector('h1');
    const p=introEl.querySelector('p');
    if(h)h.textContent='People and programmes matched to what you need.';
    if(p)p.textContent='Compare your matches, start a Talind conversation, review quotes and share direct contact only when you are ready.';
  }

  if(!main.querySelector('.learner-needs-card')){
    const anchor=main.querySelector('.intro');
    if(anchor)anchor.insertAdjacentHTML('afterend',learnerNeedsCard()+learnerJourneyHTML(true));
  }

  main.querySelectorAll('.opportunity-section').forEach(function(section){
    const h=section.querySelector('h2');
    if(!h)return;
    if(/Teacher & expert matches/i.test(h.textContent))h.textContent='Teachers matched to your requirement';
    if(/Training & coaching providers/i.test(h.textContent))h.textContent='Courses & coaching you may want to explore';
    if(/Schools & colleges/i.test(h.textContent))h.textContent='Schools & colleges matching your admission need';
  });
};

const talindLearnerWorkspaceBase=workspace;
workspace=function(){
  talindLearnerWorkspaceBase();
  if(!(talindCurrentUser&&state.role==='learner'))return;
  const main=document.querySelector('#main');
  if(!main||main.querySelector('.learner-journey'))return;
  const head=main.querySelector('.clean-workspace-head');
  if(head)head.insertAdjacentHTML('afterend',learnerJourneyHTML(false));
};

const talindLearnerActivityBase=activity;
activity=function(){
  talindLearnerActivityBase();
  if(!(talindCurrentUser&&state.role==='learner'))return;
  const introEl=document.querySelector('#main .intro');
  if(introEl){
    const h=introEl.querySelector('h1');
    const p=introEl.querySelector('p');
    if(h)h.textContent='Your conversations, quotes and confirmations.';
    if(p)p.textContent='Continue from where you left off with each teacher or provider.';
  }
  const stats=document.querySelectorAll('#main .stats .stat span');
  const labels=['Current conversations','Conversations started','Confirmed matches'];
  stats.forEach(function(el,i){if(labels[i])el.textContent=labels[i]});
};

const talindLearnerProfileChromeBase=cleanPageChrome;
cleanPageChrome=function(){
  talindLearnerProfileChromeBase();
  if(!(talindCurrentUser&&state.role==='learner'&&location.hash==='#profile'))return;
  const current=typeof steps==='function'?steps()[registration.step]:null;
  if(current&&current.id==='preferences'){
    const panel=document.querySelector('#main .onboarding-panel');
    if(panel&&!panel.querySelector('.learner-requirement-help')){
      const h=panel.querySelector('h2');
      if(h)h.insertAdjacentHTML('afterend',
        '<div class="learner-requirement-help"><strong>Tell Talind what you actually need.</strong><p>These details directly influence your teacher, coaching and admission matches. You can add a second requirement too—for example, tuition plus school admission.</p></div>'
      );
    }
  }
};


// Talind Teacher Journey V6
// Clarifies the two Teacher / Expert tracks: free employment discovery and
// paid independent services, while preserving existing contact and membership rules.

function teacherJourneyData(){
  const r=record();
  const purposes=typeof selectedPurposes==='function'?selectedPurposes():[];
  const conns=typeof v2RoleConnections==='function'?v2RoleConnections():[];
  const hiring=typeof liveInstitutionItems==='function'?liveInstitutionItems():[];
  const learners=typeof liveRequirementItems==='function'?liveRequirementItems():[];
  const jobConns=conns.filter(function(c){return c.context_type==='institution_profile'&&c.status!=='closed'});
  const learnerConns=conns.filter(function(c){return c.context_type==='learner_requirement'&&c.status!=='closed'});
  const inboundLearners=learnerConns.filter(function(c){return matchState.inboundConnectionIds&&matchState.inboundConnectionIds.has(c.id)});
  const quotes=learnerConns.filter(function(c){return c.status==='quote_submitted'});
  const accepted=learnerConns.filter(function(c){return c.status==='accepted'});
  const serviceActive=typeof matchMembershipActive==='function'&&matchMembershipActive('teacher-services');
  return {
    complete:!!r.complete,
    purposes:purposes,
    hiring:hiring,
    learners:learners,
    jobConns:jobConns,
    learnerConns:learnerConns,
    inboundLearners:inboundLearners,
    quotes:quotes,
    accepted:accepted,
    serviceActive:serviceActive
  };
}

function teacherTrackHTML(){
  const d=teacherJourneyData();
  const wantsJobs=d.purposes.includes('Find a job');
  const wantsServices=d.purposes.includes('Offer tuition / coaching / training');
  return '<section class="teacher-tracks">'+
    '<div class="teacher-track free">'+
      '<div class="teacher-track-head"><span class="teacher-track-icon">01</span><div><span class="eyebrow">EMPLOYMENT</span><h2>Find teaching & faculty jobs</h2></div><span class="teacher-plan-pill">FREE</span></div>'+
      '<p>Build your professional profile, discover hiring institutions and communicate about employment without a Teacher Services membership.</p>'+
      '<div class="teacher-track-progress">'+
        '<span class="'+(d.complete?'done':'')+'">Profile '+(d.complete?'✓':'')+'</span>'+
        '<span class="'+(d.hiring.length?'done':'')+'">Hiring matches '+(d.hiring.length?'✓':'')+'</span>'+
        '<span class="'+(d.jobConns.length?'done':'')+'">Applications / conversations '+(d.jobConns.length?'✓':'')+'</span>'+
      '</div>'+
      '<div class="workspace-links">'+
        (!wantsJobs?'<button class="btn outline" onclick="registration.step=steps().findIndex(function(s){return s.id===\'purpose\'});navigate(\'profile\')">Add job seeking</button>':'<button class="btn" onclick="navigate(\'explore\')">Explore hiring institutions</button>')+
      '</div>'+
    '</div>'+
    '<div class="teacher-track service">'+
      '<div class="teacher-track-head"><span class="teacher-track-icon">02</span><div><span class="eyebrow">INDEPENDENT SERVICES</span><h2>Offer tuition, coaching & expertise</h2></div><span class="teacher-plan-pill '+(d.serviceActive?'active':'')+'">'+(d.serviceActive?'ACTIVE':'MEMBERSHIP')+'</span></div>'+
      '<p>Learners can contact you first. To proactively contact learner requirements, submit quotes or provide paid services, activate Teacher Services.</p>'+
      '<div class="teacher-track-progress">'+
        '<span class="'+(wantsServices?'done':'')+'">Service profile '+(wantsServices?'✓':'')+'</span>'+
        '<span class="'+(d.serviceActive?'done':'')+'">Membership '+(d.serviceActive?'✓':'')+'</span>'+
        '<span class="'+(d.learnerConns.length?'done':'')+'">Learner conversations '+(d.learnerConns.length?'✓':'')+'</span>'+
        '<span class="'+(d.accepted.length?'done':'')+'">Confirmed services '+(d.accepted.length?'✓':'')+'</span>'+
      '</div>'+
      '<div class="workspace-links">'+
        (!wantsServices?'<button class="btn outline" onclick="registration.step=steps().findIndex(function(s){return s.id===\'purpose\'});navigate(\'profile\')">Add teaching services</button>':!d.serviceActive?'<button class="btn" onclick="billing.audience=\'teacher\';navigate(\'plans\')">View Teacher Services</button>':'<button class="btn" onclick="navigate(\'explore\')">Find learner opportunities</button>')+
      '</div>'+
    '</div>'+
  '</section>'+
  (d.inboundLearners.length&&!d.serviceActive
    ?'<div class="notice teacher-inbound"><strong>'+d.inboundLearners.length+' learner conversation'+(d.inboundLearners.length===1?' is':'s are')+' waiting for you.</strong> You may reply inside Talind because the learner contacted you first. Membership is still required to initiate new learner conversations or submit service quotes.</div>'
    :'');
}

function teacherJobActions(item){
  const c=matchConnection(item),parts=[];
  const status=!c?'Hiring opportunity':c.status==='shortlisted'?'Saved institution':c.status==='interest_expressed'?'Application conversation started':c.status==='accepted'?'Confirmed':matchStatusLabel(c);
  if(!c){
    parts.push('<button class="btn outline" onclick="matchSetStatus(\''+item.key+'\',\'shortlisted\')">Save institution</button>');
    parts.push('<button class="btn" onclick="matchOpenChat(\''+item.key+'\')">Contact about jobs</button>');
  }else if(c.status!=='closed'){
    parts.push('<button class="btn" onclick="matchOpenChat(\''+item.key+'\')">'+(c.last_message_at?'Open conversation':'Contact institution')+'</button>');
    parts.push('<button class="btn outline" onclick="matchViewContact(\''+item.key+'\')">View contact</button>');
  }
  return '<div class="teacher-match-state"><span class="badge">'+esc(status)+'</span><span class="teacher-free-note">Job seeking on Talind is free</span></div>'+
    '<div class="dialog-actions teacher-match-actions">'+parts.join('')+'</div>';
}

function teacherLearnerActions(item){
  const c=matchConnection(item),locked=teacherServiceLocked(item),canReply=teacherCanReplyToStudent(item),parts=[];
  let status=!c?'Learner opportunity':c.status==='shortlisted'?'Saved opportunity':c.status==='interest_expressed'?'Conversation started':c.status==='quote_submitted'?'Quote sent':c.status==='accepted'?'Service confirmed':matchStatusLabel(c);

  if(locked){
    if(canReply){
      status='Learner contacted you';
      parts.push('<button class="btn" onclick="matchOpenChat(\''+item.key+'\')">Reply to learner</button>');
    }
    parts.push('<button class="btn outline" onclick="openTeacherServicesMembership()">Activate Teacher Services</button>');
  }else{
    if(!c){
      parts.push('<button class="btn outline" onclick="matchSetStatus(\''+item.key+'\',\'shortlisted\')">Save opportunity</button>');
      parts.push('<button class="btn" onclick="matchOpenChat(\''+item.key+'\')">Contact learner</button>');
    }else if(c.status!=='closed'){
      parts.push('<button class="btn light" onclick="matchOpenChat(\''+item.key+'\')">'+(c.last_message_at?'Open conversation':'Message learner')+'</button>');
    }
    if(!c||c.status!=='accepted'){
      parts.push('<button class="btn outline" onclick="matchSubmitQuote(\''+item.key+'\')">Send quote</button>');
    }
  }

  if(c&&c.status==='accepted'){
    const agreement=engagementOwnAgreement(c.id,'provider_professional');
    if(!agreement){
      parts.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'provider_professional\')">Accept professional agreement</button>');
    }else if(matchMembershipActive('teacher-services')){
      parts.push('<button class="btn outline" onclick="matchViewContact(\''+item.key+'\')">View learner contact</button>');
    }
  }

  return '<div class="teacher-match-state"><span class="badge">'+esc(status)+'</span>'+
    (locked?'<span class="teacher-lock-note">'+(canReply?'Reply allowed · new outreach locked':'Membership required for new outreach')+'</span>':'<span class="teacher-free-note">Teacher Services active</span>')+
    '</div><div class="dialog-actions teacher-match-actions">'+parts.join('')+'</div>';
}

const talindTeacherMatchActionsBase=matchActions;
matchActions=function(item){
  if(state.role==='teacher'&&item){
    if(item.kind==='institution')return teacherJobActions(item);
    if(item.kind==='requirement')return teacherLearnerActions(item);
  }
  return talindTeacherMatchActionsBase(item);
};

const talindTeacherCardBase=liveMatchCard;
liveMatchCard=function(i){
  if(!(state.role==='teacher'&&i))return talindTeacherCardBase(i);
  const c=matchConnection(i);
  const isLearner=i.kind==='requirement';
  const locked=isLearner&&teacherServiceLocked(i);
  const canReply=isLearner&&teacherCanReplyToStudent(i);
  const status=!c
    ?(isLearner?'New learner opportunity':'Hiring institution')
    :c.status==='shortlisted'?'Saved'
    :c.status==='interest_expressed'?'Conversation started'
    :c.status==='quote_submitted'?'Quote sent'
    :c.status==='accepted'?'Confirmed'
    :matchStatusLabel(c);
  const access=isLearner
    ?(locked?(canReply?'Learner contacted you · reply allowed':'Teacher Services required to initiate contact'):'Teacher Services active')
    :'Job seeking is free';

  return '<article class="card teacher-match-card '+(locked?'locked':'')+'">'+
    '<div class="card-top"><span class="badge">'+esc(status)+'</span><span class="'+(locked?'teacher-access locked':'teacher-access')+'">'+esc(access)+'</span></div>'+
    '<div class="card-body">'+
      '<div class="identity"><div class="initials">'+esc(i.initials)+'</div><div><h3>'+esc(i.name)+'</h3><small>'+esc(i.subtitle)+'</small></div></div>'+
      '<h3>'+esc(i.title)+'</h3><p class="desc">'+esc(i.desc||'')+'</p>'+
      '<div class="tags">'+(i.tags||[]).slice(0,6).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div>'+
      '<div class="meta"><span>'+esc(i.location)+'</span><span>'+esc(i.mode)+'</span></div>'+
    '</div>'+
    '<div class="card-foot"><div class="price"><span>Why this match</span><small>'+esc(i.matchReason)+'</small></div><button class="btn light" onclick="liveMatchDetail(\''+i.key+'\')">View opportunity →</button></div>'+
  '</article>';
};

const talindTeacherExploreBase=explore;
explore=function(){
  talindTeacherExploreBase();
  if(!(talindCurrentUser&&state.role==='teacher'))return;
  const main=document.querySelector('#main');
  if(!main)return;
  const introEl=main.querySelector('.intro');
  if(introEl){
    const h=introEl.querySelector('h1');
    const p=introEl.querySelector('p');
    if(h)h.textContent='Turn your skills into the right opportunities.';
    if(p)p.textContent='Job seeking stays free. Independent teaching services use Teacher Services membership, while you can always reply when a learner contacts you first.';
  }
  if(!main.querySelector('.teacher-tracks')&&introEl)introEl.insertAdjacentHTML('afterend',teacherTrackHTML());
  main.querySelectorAll('.opportunity-section').forEach(function(section){
    const h=section.querySelector('h2');
    if(!h)return;
    if(/Hiring institutions/i.test(h.textContent))h.textContent='Schools & colleges hiring teachers';
    if(/Student \/ parent requirements/i.test(h.textContent))h.textContent='Learners looking for your skills';
  });
};

const talindTeacherWorkspaceBase=workspace;
workspace=function(){
  talindTeacherWorkspaceBase();
  if(!(talindCurrentUser&&state.role==='teacher'))return;
  const main=document.querySelector('#main');
  if(!main||main.querySelector('.teacher-tracks'))return;
  const head=main.querySelector('.clean-workspace-head');
  if(head)head.insertAdjacentHTML('afterend',teacherTrackHTML());
};

const talindTeacherActivityBase=activity;
activity=function(){
  talindTeacherActivityBase();
  if(!(talindCurrentUser&&state.role==='teacher'))return;
  const introEl=document.querySelector('#main .intro');
  if(introEl){
    const h=introEl.querySelector('h1');
    const p=introEl.querySelector('p');
    if(h)h.textContent='Your applications, learner conversations and service engagements.';
    if(p)p.textContent='Employment conversations and independent teaching services stay clearly separated here.';
  }
  const stats=document.querySelectorAll('#main .stats .stat span');
  const labels=['Active opportunities','Conversations','Confirmed'];
  stats.forEach(function(el,i){if(labels[i])el.textContent=labels[i]});
};

const talindTeacherProfileChromeBase=cleanPageChrome;
cleanPageChrome=function(){
  talindTeacherProfileChromeBase();
  if(!(talindCurrentUser&&state.role==='teacher'&&location.hash==='#profile'))return;
  const current=typeof steps==='function'?steps()[registration.step]:null;
  if(current&&current.id==='purpose'){
    const panel=document.querySelector('#main .onboarding-panel');
    if(panel&&!panel.querySelector('.teacher-purpose-help')){
      const h=panel.querySelector('h2');
      if(h)h.insertAdjacentHTML('afterend',
        '<div class="teacher-purpose-help"><strong>Choose one or both paths.</strong>'+
        '<div class="teacher-purpose-columns"><div><b>Find a job — Free</b><p>Use Talind to find schools and colleges, apply and communicate about employment.</p></div>'+
        '<div><b>Offer tuition / coaching / training — Membership</b><p>Publish your services and proactively contact learner requirements. If a learner contacts you first, you can reply inside Talind even before membership.</p></div></div></div>'
      );
    }
  }
};
