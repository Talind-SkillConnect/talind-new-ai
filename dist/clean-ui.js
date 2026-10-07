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
