// Talind persistent relationship status, chat and contact-access controls.
const matchState={connections:[],memberships:[]};

function matchTarget(item){
  if(item.kind==='teacher')return {userId:item.publicRow.user_id,role:'teacher',contextType:'teacher_profile',contextId:null};
  if(item.kind==='institution')return {userId:item.publicRow.user_id,role:'institution',contextType:'institution_profile',contextId:null};
  if(item.kind==='training')return {userId:item.publicRow.user_id,role:'training',contextType:'training_profile',contextId:null};
  if(item.kind==='requirement')return {userId:item.requirementRow.user_id,role:'learner',contextType:'learner_requirement',contextId:item.requirementRow.id};
  return null;
}
function matchConnection(item){
  const t=matchTarget(item),me=talindCurrentUser?.id;if(!t||!me)return null;
  const exact=matchState.connections.find(function(c){
    const pair=(c.initiator_user_id===me&&c.target_user_id===t.userId)||(c.target_user_id===me&&c.initiator_user_id===t.userId);
    if(!pair)return false;
    if(item.kind==='requirement')return c.context_type==='learner_requirement'&&c.context_id===t.contextId;
    return true;
  });
  if(exact)return exact;
  // Learners should see the existing provider relationship even if it began from a learner requirement.
  return matchState.connections.find(function(c){
    return (c.initiator_user_id===me&&c.target_user_id===t.userId)||(c.target_user_id===me&&c.initiator_user_id===t.userId);
  })||null;
}
function matchStatusLabel(c){
  if(!c)return 'Not contacted';
  const labels={shortlisted:'Shortlisted',interest_expressed:'Interest expressed',quote_submitted:'Quote submitted',accepted:'Accepted',declined:'Declined',closed:'Closed'};
  const base=labels[c.status]||'In progress';
  return c.last_message_at?'Contacted · '+base:base;
}
async function matchLoadState(){
  if(!talindCurrentUser){matchState.connections=[];matchState.memberships=[];return}
  const uid=talindCurrentUser.id;
  const out=await Promise.all([
    talindSupabase.from('match_connections').select('*').or('initiator_user_id.eq.'+uid+',target_user_id.eq.'+uid).order('updated_at',{ascending:false}),
    talindSupabase.from('memberships').select('plan_code,status,starts_at,ends_at').eq('user_id',uid)
  ]);
  if(out[0].error)throw out[0].error;
  if(out[1].error)throw out[1].error;
  matchState.connections=out[0].data||[];
  matchState.memberships=out[1].data||[];
}
function matchMembershipActive(plan){
  const now=Date.now();
  return matchState.memberships.some(function(m){
    const start=!m.starts_at||new Date(m.starts_at).getTime()<=now;
    const end=!m.ends_at||new Date(m.ends_at).getTime()>now;
    return m.plan_code===plan&&m.status==='active'&&start&&end;
  });
}
async function matchEnsureConnection(item,status){
  let c=matchConnection(item);if(c)return c;
  const t=matchTarget(item);if(!t||!talindCurrentUser)throw new Error('Unable to identify this match.');
  const payload={
    initiator_user_id:talindCurrentUser.id,
    target_user_id:t.userId,
    initiator_role:state.role,
    target_role:t.role,
    context_type:t.contextType,
    context_id:t.contextId,
    status:status||'interest_expressed',
    updated_by:talindCurrentUser.id
  };
  const res=await talindSupabase.from('match_connections').insert(payload).select('*').single();
  if(res.error)throw res.error;
  matchState.connections.unshift(res.data);return res.data;
}
async function matchSetStatus(key,status){
  const item=liveFind(key);if(!item)return;
  try{
    let c=matchConnection(item);
    if(!c){c=await matchEnsureConnection(item,status)}
    else{
      const res=await talindSupabase.from('match_connections').update({status:status,updated_by:talindCurrentUser.id}).eq('id',c.id).select('*').single();
      if(res.error)throw res.error;c=res.data;
      const i=matchState.connections.findIndex(function(x){return x.id===c.id});if(i>=0)matchState.connections[i]=c;
    }
    toast(matchStatusLabel(c));
    render();
  }catch(e){console.error(e);toast('Could not update this match status.')}
}
async function matchSubmitQuote(key){
  const item=liveFind(key);if(!item)return;
  if(state.role!=='teacher'||item.kind!=='requirement'){toast('Quotes are used for teacher/expert service opportunities.');return}
  modal('<span class="eyebrow">SUBMIT QUOTE</span><h2>'+esc(item.title)+'</h2><p class="muted">Send a clear fee and short proposal. The learner or parent can accept it from their Talind account.</p><form id="quote-form"><div class="fields"><label>Quote amount (INR)<input name="amount" type="number" min="0" step="1" required></label><label class="full">Proposal / inclusions<textarea name="note" required maxlength="1500" placeholder="What you will provide, frequency, duration and any conditions."></textarea></label></div><button class="btn" type="submit">Submit quote</button></form><p id="quote-error" class="form-error"></p>');
  $('#quote-form').onsubmit=async function(e){
    e.preventDefault();const d=new FormData(e.target);
    try{
      let c=await matchEnsureConnection(item,'interest_expressed');
      const res=await talindSupabase.from('match_connections').update({
        status:'quote_submitted',
        quote_amount:Number(d.get('amount')),
        quote_currency:'INR',
        quote_note:String(d.get('note')||''),
        updated_by:talindCurrentUser.id
      }).eq('id',c.id).select('*').single();
      if(res.error)throw res.error;
      await matchLoadState();$('#modal').close();render();toast('Quote submitted.');
    }catch(err){console.error(err);$('#quote-error').textContent=err.message||'Could not submit quote.'}
  };
}
async function matchAcceptQuote(key){
  const item=liveFind(key);if(!item)return;
  const c=matchConnection(item);if(!c||c.status!=='quote_submitted')return;
  try{
    const res=await talindSupabase.from('match_connections').update({status:'accepted',updated_by:talindCurrentUser.id}).eq('id',c.id).select('*').single();
    if(res.error)throw res.error;await matchLoadState();render();toast('Quote accepted.');
  }catch(e){console.error(e);toast('Could not accept the quote.')}
}
async function matchViewContact(key){
  const item=liveFind(key);if(!item)return;
  const t=matchTarget(item);if(!t)return;
  try{
    const res=await talindSupabase.rpc('get_match_contact',{
      p_target_user:t.userId,
      p_requester_role:state.role,
      p_target_role:t.role
    });
    if(res.error)throw res.error;
    const row=(res.data||[])[0];
    if(!row||!row.allowed){
      const reason=row?.reason||'Membership required to view these contact details.';
      modal('<span class="eyebrow">CONTACT ACCESS</span><h2>Unlock direct contact</h2><p class="muted">'+esc(reason)+'</p><div class="notice">You can continue to shortlist and track this match. Direct contact access follows Talind membership rules.</div><div class="dialog-actions"><button class="btn" onclick="$(\'#modal\').close();navigate(\'plans\')">View membership</button><button class="btn outline" onclick="$(\'#modal\').close()">Close</button></div>');
      return;
    }
    modal('<span class="eyebrow">CONTACT DETAILS</span><h2>'+esc(row.display_name||item.name)+'</h2><section class="panel"><p><strong>Email:</strong> '+esc(row.email||'Not provided')+'</p><p><strong>Phone:</strong> '+esc(row.phone||'Not provided')+'</p><p><strong>WhatsApp:</strong> '+esc(row.whatsapp||'Not provided')+'</p></section><p class="bottom-note">Use contact information only for this Talind match and respect the recipient’s communication preferences.</p>');
  }catch(e){console.error(e);toast('Could not check contact access.')}
}
async function matchOpenChat(key){
  const item=liveFind(key);if(!item)return;
  try{
    const c=await matchEnsureConnection(item,'interest_expressed');
    const res=await talindSupabase.from('match_messages').select('*').eq('connection_id',c.id).order('created_at',{ascending:true});
    if(res.error)throw res.error;
    const rows=res.data||[];
    const history=rows.length?rows.map(function(m){
      const mine=m.sender_user_id===talindCurrentUser.id;
      return '<div class="row"><div><strong>'+(mine?'You':'Match')+'</strong><p>'+esc(m.body)+'</p><small>'+new Date(m.created_at).toLocaleString()+'</small></div></div>';
    }).join(''):'<p class="muted">No messages yet. Start the conversation about this match.</p>';
    modal('<span class="eyebrow">TALIND CHAT</span><h2>'+esc(item.name)+'</h2><div style="max-height:300px;overflow:auto;margin-bottom:18px">'+history+'</div><form id="match-chat-form"><label class="full">Message<textarea name="body" required maxlength="2000" placeholder="Write a clear message about this match."></textarea></label><div class="dialog-actions"><button class="btn" type="submit">Send message</button><button class="btn outline" type="button" onclick="matchViewContact(\''+key+'\')">View contact</button></div></form><p id="chat-error" class="form-error"></p>');
    $('#match-chat-form').onsubmit=async function(e){
      e.preventDefault();const body=String(new FormData(e.target).get('body')||'').trim();if(!body)return;
      try{
        const m=await talindSupabase.from('match_messages').insert({connection_id:c.id,sender_user_id:talindCurrentUser.id,body:body});
        if(m.error)throw m.error;
        const u=await talindSupabase.from('match_connections').update({last_message_at:new Date().toISOString(),status:c.status==='shortlisted'?'interest_expressed':c.status,updated_by:talindCurrentUser.id}).eq('id',c.id);
        if(u.error)throw u.error;
        await matchLoadState();matchOpenChat(key);render();
      }catch(err){console.error(err);$('#chat-error').textContent=err.message||'Could not send message.'}
    };
  }catch(e){console.error(e);toast('Could not open chat.')}
}
function matchActions(item){
  const c=matchConnection(item),status=matchStatusLabel(c),parts=[];
  if(!c)parts.push('<button class="btn outline" onclick="matchSetStatus(\''+item.key+'\',\'shortlisted\')">Shortlist</button>');
  if(!c||c.status==='shortlisted')parts.push('<button class="btn" onclick="matchSetStatus(\''+item.key+'\',\'interest_expressed\')">Express interest</button>');
  parts.push('<button class="btn light" onclick="matchOpenChat(\''+item.key+'\')">Chat</button>');
  parts.push('<button class="btn light" onclick="matchViewContact(\''+item.key+'\')">View contact</button>');
  if(state.role==='teacher'&&item.kind==='requirement')parts.push('<button class="btn outline" onclick="matchSubmitQuote(\''+item.key+'\')">Submit quote</button>');
  if(state.role==='learner'&&c&&c.status==='quote_submitted')parts.push('<button class="btn" onclick="matchAcceptQuote(\''+item.key+'\')">Accept quote</button>');
  return '<div style="margin-top:12px"><span class="badge">'+esc(status)+'</span></div><div class="dialog-actions" style="margin-top:12px">'+parts.join('')+'</div>';
}

const connectionBaseCard=liveMatchCard;
liveMatchCard=function(i){
  const c=matchConnection(i),status=matchStatusLabel(c);
  return '<article class="card"><div class="card-top"><span class="badge">'+esc(i.type)+'</span><span class="badge">'+esc(status)+'</span></div><div class="card-body"><div class="identity"><div class="initials">'+esc(i.initials)+'</div><div><h3>'+esc(i.name)+'</h3><small>'+esc(i.subtitle)+'</small></div></div><h3>'+esc(i.title)+'</h3><p class="desc">'+esc(i.desc||'')+'</p><div class="tags">'+(i.tags||[]).slice(0,6).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div><div class="meta"><span>Location: '+esc(i.location)+'</span><span>Mode: '+esc(i.mode)+'</span></div></div><div class="card-foot"><div class="price">'+esc(i.price)+'<small>'+esc(i.note)+'</small></div><button class="btn light" onclick="liveMatchDetail(\''+i.key+'\')">View match</button></div></article>';
};

liveMatchDetail=function(key){
  const i=liveFind(key);if(!i)return;
  const c=matchConnection(i),quote=c&&c.quote_amount!=null?'<div class="panel"><strong>Quote: '+esc(c.quote_currency||'INR')+' '+Number(c.quote_amount).toLocaleString('en-IN')+'</strong><p class="muted">'+esc(c.quote_note||'')+'</p></div>':'';
  modal('<span class="eyebrow">TALIND MATCH</span><h2>'+esc(i.name)+'</h2><p class="muted">'+esc(i.title)+' - '+esc(i.location)+' - '+esc(i.mode)+'</p><div class="tags">'+(i.tags||[]).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div><p class="muted">'+esc(i.desc||'')+'</p><div class="notice"><strong>'+esc(i.matchReason)+'</strong><br>Contact details are controlled by Talind access rules.</div>'+quote+matchActions(i));
};

const connectionBaseLoad=liveLoadDiscovery;
liveLoadDiscovery=async function(){
  await connectionBaseLoad();
  if(talindCurrentUser){
    try{await matchLoadState()}catch(e){console.warn('Talind relationship state unavailable',e)}
  }
};

const connectionBaseHandleSession=cloudHandleSession;
cloudHandleSession=async function(session){
  await connectionBaseHandleSession(session);
  if(session?.user){
    try{await matchLoadState();render()}catch(e){console.warn('Talind connection state pending',e)}
  }else{matchState.connections=[];matchState.memberships=[]}
};

(async function(){
  try{
    const x=await talindSupabase.auth.getSession();
    if(x.data&&x.data.session&&x.data.session.user){await matchLoadState();render()}
  }catch(e){console.warn('Talind match relationship init pending',e)}
})();
