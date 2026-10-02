// Talind Product Upgrade V2
// Replaces remaining prototype/session UX with persistent activity, discovery controls
// and clearer post-match workflow using the existing Supabase data model.

function v2RoleConnections(){
  if(!talindCurrentUser)return [];
  const me=talindCurrentUser.id;
  return (matchState.connections||[]).filter(function(c){
    return (c.initiator_user_id===me&&c.initiator_role===state.role)||
           (c.target_user_id===me&&c.target_role===state.role);
  }).sort(function(a,b){
    return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);
  });
}

function v2ConnectionItem(c){
  if(!c||!talindCurrentUser)return null;
  const me=talindCurrentUser.id;
  const other=c.initiator_user_id===me?c.target_user_id:c.initiator_user_id;
  const publicByUser=function(items){return items.find(function(i){return i.publicRow&&i.publicRow.user_id===other})||null};
  const reqByUser=function(){return liveRequirementItems().find(function(i){return i.requirementRow&&i.requirementRow.user_id===other})||null};

  if(c.context_type==='learner_requirement'&&c.context_id){
    const exact=liveRequirementItems().find(function(i){return i.requirementRow&&i.requirementRow.id===c.context_id});
    if(exact)return exact;
  }
  if(c.context_type==='teacher_profile')return publicByUser(liveTeacherItems());
  if(c.context_type==='institution_profile')return publicByUser(liveInstitutionItems());
  if(c.context_type==='training_profile')return publicByUser(liveTrainingItems());

  if(state.role==='learner')return publicByUser(liveTeacherItems())||publicByUser(liveTrainingItems())||publicByUser(liveInstitutionItems());
  if(state.role==='teacher')return reqByUser()||publicByUser(liveInstitutionItems());
  if(state.role==='institution')return publicByUser(liveTeacherItems())||publicByUser(liveTrainingItems());
  if(state.role==='training')return reqByUser()||publicByUser(liveInstitutionItems());
  return null;
}

function v2AgreementStatus(c){
  if(!c||c.status!=='accepted')return '';
  if(state.role==='teacher'){
    const provider=engagementOwnAgreement(c.id,'provider_professional');
    if(!provider)return 'Professional agreement pending';
    if(!matchMembershipActive('teacher-services'))return 'Membership required for direct contact';
    return 'Provider agreement completed';
  }
  if(state.role==='learner'){
    const guardian=engagementOwnAgreement(c.id,'guardian_contact_consent');
    return guardian?'Direct contact approved':'Direct contact approval pending';
  }
  return '';
}

function v2ConnectionStage(c){
  if(!c)return {label:'No activity',detail:''};
  const label=matchStatusLabel(c);
  return {label:label,detail:v2AgreementStatus(c)};
}

function v2Date(v){
  if(!v)return 'No message yet';
  try{return new Date(v).toLocaleString()}catch(e){return ''}
}

async function v2CloseConnection(id){
  if(!talindCurrentUser)return;
  try{
    const res=await talindSupabase.from('match_connections')
      .update({status:'closed',updated_by:talindCurrentUser.id})
      .eq('id',id);
    if(res.error)throw res.error;
    await matchLoadState();
    render();
    toast('Moved out of your active shortlist.');
  }catch(e){
    console.error(e);
    toast('Could not update this activity.');
  }
}

async function v2ReopenConnection(id){
  if(!talindCurrentUser)return;
  try{
    const res=await talindSupabase.from('match_connections')
      .update({status:'shortlisted',updated_by:talindCurrentUser.id})
      .eq('id',id);
    if(res.error)throw res.error;
    await matchLoadState();
    render();
    toast('Match reopened and added to your shortlist.');
  }catch(e){
    console.error(e);
    toast('Could not reopen this match.');
  }
}

function v2ActivityActions(c,item){
  const out=[];
  if(item){
    out.push('<button class="btn light" onclick="liveMatchDetail(\''+item.key+'\')">Open match</button>');
    if(teacherServiceLocked(item)){
      out.push('<button class="btn" onclick="openTeacherServicesMembership()">Activate Teacher Services</button>');
      if(c.status==='closed')out.push('<button class="btn outline" onclick="v2ReopenConnection(\''+c.id+'\')">Reopen</button>');
      return out.join('');
    }
    if(c.status!=='closed'){
      out.push('<button class="btn light" onclick="matchOpenChat(\''+item.key+'\')">Chat</button>');
      out.push('<button class="btn outline" onclick="matchViewContact(\''+item.key+'\')">View contact</button>');
    }

    if(state.role==='learner'&&c.status==='quote_submitted'){
      out.push('<button class="btn" onclick="matchAcceptQuote(\''+item.key+'\')">Accept quote</button>');
    }

    if(state.role==='learner'&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'guardian_contact_consent')){
      out.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'guardian_contact_consent\')">Approve direct contact</button>');
    }

    if(state.role==='teacher'&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'provider_professional')){
      out.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'provider_professional\')">Accept professional agreement</button>');
    }

    if(state.role==='teacher'&&c.status==='accepted'&&engagementOwnAgreement(c.id,'provider_professional')&&!matchMembershipActive('teacher-services')){
      out.push('<button class="btn" onclick="navigate(\'plans\')">Activate service membership</button>');
    }
  }

  if(c.status==='closed'){
    out.push('<button class="btn outline" onclick="v2ReopenConnection(\''+c.id+'\')">Reopen</button>');
  }else{
    out.push('<button class="text-button" onclick="v2CloseConnection(\''+c.id+'\')">Remove from active list</button>');
  }

  return out.join('');
}

function v2ActivityCard(c){
  const item=v2ConnectionItem(c);
  const stage=v2ConnectionStage(c);
  const name=item?item.name:'Talind match';
  const title=item?item.title:(c.context_type||'Match activity');
  const quote=c.quote_amount!=null
    ?(c.quote_currency||'INR')+' '+Number(c.quote_amount).toLocaleString('en-IN')
    :'No quote submitted';

  return '<section class="panel activity-card">'+
    '<div class="section-top"><div>'+
      '<span class="eyebrow">'+esc(stage.label.toUpperCase())+'</span>'+
      '<h2 style="margin-top:8px">'+esc(name)+'</h2>'+
      '<p class="muted">'+esc(title)+'</p>'+
    '</div><span class="badge">'+esc(c.status.replaceAll('_',' '))+'</span></div>'+
    '<div class="activity-grid">'+
      '<div><span class="tiny">CURRENT STATUS</span><strong>'+esc(stage.label)+'</strong><small>'+esc(stage.detail||'Track this relationship from one place.')+'</small></div>'+
      '<div><span class="tiny">QUOTE / COMMERCIAL</span><strong>'+esc(quote)+'</strong><small>'+esc(c.quote_note||'No additional quote note.')+'</small></div>'+
      '<div><span class="tiny">LAST MESSAGE</span><strong>'+esc(c.last_message_at?'Contacted':'Not contacted')+'</strong><small>'+esc(v2Date(c.last_message_at))+'</small></div>'+
    '</div>'+
    '<div class="dialog-actions">'+v2ActivityActions(c,item)+'</div>'+
  '</section>';
}

activity=function(){
  if(!talindCurrentUser){
    $('#main').innerHTML=
      intro('MESSAGES & ACTIVITY','Sign in to continue your Talind conversations.','Shortlists, messages, quotes, agreements and accepted matches are stored in your account.')+
      '<div class="empty"><h3>Your activity stays with your account</h3><button class="btn" onclick="authScreen(\'login\')">Log in</button></div>';
    side('enquiries');
    return;
  }

  const connections=v2RoleConnections();
  const active=connections.filter(function(c){return c.status!=='closed'});
  const contacted=connections.filter(function(c){return !!c.last_message_at}).length;
  const accepted=connections.filter(function(c){return c.status==='accepted'}).length;

  $('#main').innerHTML=
    intro('MESSAGES & ACTIVITY','Your conversations and decisions, together.','Track every matched relationship from first shortlist through agreement and direct contact.')+
    '<div class="stats">'+
      '<div class="stat"><b>'+active.length+'</b><span>Active matches</span></div>'+
      '<div class="stat"><b>'+contacted+'</b><span>Conversations started</span></div>'+
      '<div class="stat"><b>'+accepted+'</b><span>Accepted engagements</span></div>'+
    '</div>'+
    (connections.length
      ?connections.map(v2ActivityCard).join('')
      :'<div class="empty"><h3>No activity yet</h3><p class="muted">Shortlist a match, express interest or start a chat. Your activity will appear here automatically.</p><a class="btn" href="#explore">Explore matches</a></div>')+
    '<p class="bottom-note">For learners under 18, direct communication should remain with the parent or authorised guardian. Use Talind chat and contact details only for the relevant opportunity.</p>';

  side('enquiries');
};

function v2PendingActions(){
  const actions=[];
  for(const c of v2RoleConnections()){
    const item=v2ConnectionItem(c);
    if(!item)continue;

    if(state.role==='learner'&&c.status==='quote_submitted'){
      actions.push({label:'Review and accept quote from '+item.name,action:"liveMatchDetail('"+item.key+"')"});
    }else if(state.role==='learner'&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'guardian_contact_consent')){
      actions.push({label:'Approve direct contact for '+item.name,action:"acceptEngagementAgreement('"+item.key+"','guardian_contact_consent')"});
    }else if(state.role==='teacher'&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'provider_professional')){
      actions.push({label:'Accept professional agreement for '+item.name,action:"acceptEngagementAgreement('"+item.key+"','provider_professional')"});
    }else if(state.role==='teacher'&&c.status==='accepted'&&engagementOwnAgreement(c.id,'provider_professional')&&!matchMembershipActive('teacher-services')){
      actions.push({label:'Activate Teacher Services membership',action:"navigate('plans')"});
    }else if(!c.last_message_at&&c.status!=='closed'){
      actions.push({label:'Start conversation with '+item.name,action:"matchOpenChat('"+item.key+"')"});
    }

    if(actions.length>=3)break;
  }
  return actions;
}

const v2BaseWorkspace=workspace;
workspace=function(){
  v2BaseWorkspace();

  if(!talindCurrentUser)return;

  const conns=v2RoleConnections();
  const shortlisted=conns.filter(function(c){return c.status==='shortlisted'}).length;
  const conversations=conns.filter(function(c){return !!c.last_message_at||['interest_expressed','quote_submitted'].includes(c.status)}).length;
  const accepted=conns.filter(function(c){return c.status==='accepted'}).length;

  const stats=$('#main .stats');
  if(stats){
    stats.innerHTML=
      '<div class="stat"><b>'+shortlisted+'</b><span>Shortlisted</span></div>'+
      '<div class="stat"><b>'+conversations+'</b><span>Active conversations</span></div>'+
      '<div class="stat"><b>'+accepted+'</b><span>Accepted / confirmed</span></div>';
  }

  document.querySelectorAll('#main .count').forEach(function(el){
    if(/session only/i.test(el.textContent))el.textContent='Saved to Talind';
  });
  document.querySelectorAll('#main .badge').forEach(function(el){
    if(/session draft/i.test(el.textContent))el.textContent='Saved draft';
  });

  const actions=v2PendingActions();
  const r=record();
  const f=r.fields||{};
  const publicNow=!!r.complete&&f.profilePublic!==false;
  const panel=
    '<section class="panel v2-status-panel">'+
      '<div class="section-top"><div><span class="eyebrow">ACCOUNT STATUS</span><h2 style="margin-top:8px">Your Talind readiness</h2></div>'+
      '<span class="badge">'+(publicNow?'Discoverable':'Not discoverable')+'</span></div>'+
      '<div class="activity-grid">'+
        '<div><span class="tiny">PROFILE</span><strong>'+(r.complete?'Complete':'Needs attention')+'</strong><small>'+(r.complete?'Your saved profile is ready.':'Complete required profile fields to improve matching.')+'</small></div>'+
        '<div><span class="tiny">DISCOVERY</span><strong>'+(publicNow?'Published':'Private / draft')+'</strong><small>Control visibility from My profile.</small></div>'+
        '<div><span class="tiny">RELATIONSHIPS</span><strong>'+conns.filter(function(c){return c.status!=='closed'}).length+' active</strong><small>Open Messages & activity for the full history.</small></div>'+
      '</div>'+
      (actions.length
        ?'<div class="next-actions"><h3>Next actions</h3>'+actions.map(function(a){return '<button class="btn light" onclick="'+a.action+'">'+esc(a.label)+'</button>'}).join('')+'</div>'
        :'<p class="muted">No urgent action is waiting. Continue exploring relevant opportunities.</p>')+
    '</section>';

  const introEl=$('#main .intro');
  if(introEl)introEl.insertAdjacentHTML('afterend',panel);
};

async function toggleProfileDiscovery(){
  if(!talindCurrentUser)return;
  const r=record(),f=r.fields||{};
  if(!r.complete){
    toast('Complete your profile before publishing it for matching.');
    return;
  }
  f.profilePublic=f.profilePublic===false;
  const ok=await cloudSaveCurrentRole({complete:true});
  if(ok){
    toast(f.profilePublic===false?'Profile removed from discovery.':'Profile published for matching.');
    profile();
  }
}

const v2BaseProfile=profile;
profile=function(){
  v2BaseProfile();
  if(!talindCurrentUser)return;

  const r=record(),f=r.fields||{};
  const publicNow=!!r.complete&&f.profilePublic!==false;
  const introEl=$('#main .intro');
  if(introEl){
    introEl.insertAdjacentHTML('afterend',
      '<section class="panel profile-visibility">'+
        '<div class="section-top"><div><span class="eyebrow">PROFILE VISIBILITY</span><h2 style="margin-top:8px">'+(publicNow?'Discoverable in Talind matching':'Not currently discoverable')+'</h2>'+
        '<p class="muted">'+(r.complete?'You control whether your completed profile / requirements can appear in relevant matching.':'Finish the required profile steps before publishing.')+'</p></div>'+
        '<button class="btn '+(publicNow?'outline':'')+'" '+(!r.complete?'disabled':'')+' onclick="toggleProfileDiscovery()">'+(publicNow?'Make private':'Publish for matching')+'</button></div>'+
      '</section>'
    );
  }

  const notice=$('#main .notice');
  if(notice&&/session-based|reset on refresh|session draft/i.test(notice.textContent)){
    notice.textContent='Your profile is connected to your Talind account. Profile fields, skills and preferences are saved as you continue. Selected local files are not uploaded yet.';
  }

  document.querySelectorAll('#main button').forEach(function(btn){
    if(/keep session draft/i.test(btn.textContent)){
      btn.textContent='Save draft';
      btn.onclick=async function(){
        saveFields();
        const ok=await cloudSaveCurrentRole();
        if(ok)toast('Draft saved to Talind.');
      };
    }
  });
};

const v2BaseSide=side;
side=function(page){
  v2BaseSide(page);
  const activityLink=document.querySelector('#side-nav a[href="#enquiries"]');
  if(activityLink){
    activityLink.innerHTML='<span class="symbol">↗</span>Messages & activity';
  }
};

function talindSafetyGuide(){
  modal(
    '<span class="eyebrow">TALIND SAFETY & PROFESSIONAL CONDUCT</span>'+
    '<h2>Connect professionally and protect learner privacy.</h2>'+
    '<section class="panel"><ul>'+
      '<li>Communication involving a learner under 18 should be managed by a parent or authorised guardian.</li>'+
      '<li>Use contact details only for the relevant Talind opportunity and do not share them with third parties.</li>'+
      '<li>Agree service scope, fees, timing and expectations before starting.</li>'+
      '<li>Do not request unnecessary financial, identity or sensitive information.</li>'+
      '<li>Use Talind chat to maintain a clear record until both parties are comfortable with direct contact.</li>'+
      '<li>Report inappropriate, misleading or unsafe behaviour.</li>'+
    '</ul></section>'+
    '<p class="bottom-note">These platform rules support safer use of Talind. Formal legal terms, privacy policy, refunds and service-provider obligations should be reviewed before commercial launch.</p>'
  );
}

const v2BaseRender=render;
render=function(){
  v2BaseRender();
  const footer=$('#main footer');
  if(footer){
    footer.innerHTML='talind · Skills. Opportunities. Growth. <button class="text-button" onclick="talindSafetyGuide()">Safety & professional conduct</button>';
  }
};

if(location.hash)render();
