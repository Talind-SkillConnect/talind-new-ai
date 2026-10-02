// Talind shortlist, comparison and post-acceptance agreement flow.
const engagementState={agreements:[]};
const shortlistCompareSelection=new Set();

function engagementOwnAgreement(connectionId,type){
  return engagementState.agreements.find(function(a){
    return a.connection_id===connectionId&&a.agreement_type===type;
  })||null;
}

async function engagementLoadOwn(){
  if(!talindCurrentUser){engagementState.agreements=[];return}
  const res=await talindSupabase
    .from('engagement_agreements')
    .select('*')
    .eq('user_id',talindCurrentUser.id);
  if(res.error)throw res.error;
  engagementState.agreements=res.data||[];
}

const postAcceptanceBaseLoad=matchLoadState;
matchLoadState=async function(){
  await postAcceptanceBaseLoad();
  try{await engagementLoadOwn()}catch(e){console.warn('Talind agreement state unavailable',e)}
};

async function acceptEngagementAgreement(key,type){
  const item=liveFind(key);if(!item)return;
  const c=matchConnection(item);
  if(!c||c.status!=='accepted'){toast('The quote must be accepted first.');return}

  const provider=type==='provider_professional';
  const title=provider?'Talind Professional Service Agreement':'Parent / Guardian Contact Consent';
  const introText=provider
    ?'Accept these professional conduct and safeguarding rules before direct Student / Parent contact can be unlocked.'
    :'Approve direct contact for this accepted requirement.';

  const rules=provider?[
    'Use the contact details only for the accepted Talind requirement and agreed service.',
    'Do not communicate privately with a minor. Communication involving a child must be with the parent or authorised guardian.',
    'Follow the agreed service scope, schedule, fee and expectations. Any material change must be confirmed with the parent or guardian.',
    'Keep personal information confidential and do not share contact details with third parties.',
    'Do not request unnecessary identity, financial or sensitive information.',
    'Maintain professional conduct. Harassment, discrimination, inappropriate content or pressure is prohibited.',
    'Talind may suspend access for safety concerns, fraud, misuse or serious complaints.'
  ]:[
    'I am the adult learner, parent or authorised guardian for this requirement.',
    'I approve direct contact for this accepted requirement only.',
    'I understand that I can stop communication and report inappropriate behaviour through Talind.',
    'I will supervise communication involving a minor and avoid sharing unnecessary child information.'
  ];

  const list=rules.map(function(x){return '<li style="margin:10px 0">'+esc(x)+'</li>'}).join('');
  modal(
    '<span class="eyebrow">AGREEMENT REQUIRED</span>'+
    '<h2>'+esc(title)+'</h2>'+
    '<p class="muted">'+esc(introText)+'</p>'+
    '<section class="panel"><ol>'+list+'</ol></section>'+
    '<form id="agreement-form">'+
      '<label class="check-row"><input type="checkbox" name="agree" required><span>I have read and agree to these terms.</span></label>'+
      '<div class="dialog-actions"><button class="btn" type="submit">Accept agreement</button><button class="btn outline" type="button" onclick="$(\'#modal\').close()">Cancel</button></div>'+
    '</form><p id="agreement-error" class="form-error"></p>'
  );

  $('#agreement-form').onsubmit=async function(e){
    e.preventDefault();
    try{
      const res=await talindSupabase
        .from('engagement_agreements')
        .upsert({
          connection_id:c.id,
          user_id:talindCurrentUser.id,
          agreement_type:type,
          terms_version:'2026-10-v1',
          accepted_at:new Date().toISOString()
        },{onConflict:'connection_id,user_id,agreement_type'})
        .select('*')
        .single();
      if(res.error)throw res.error;
      await engagementLoadOwn();
      $('#modal').close();
      render();
      toast('Agreement accepted.');
    }catch(err){
      console.error(err);
      $('#agreement-error').textContent=err.message||'Could not save agreement.';
    }
  };
}

matchViewContact=async function(key){
  const item=liveFind(key);if(!item)return;
  const t=matchTarget(item);if(!t)return;
  try{
    const c=matchConnection(item);
    const res=(state.role==='learner'&&t.role!=='teacher')
      ?await talindSupabase.rpc('get_match_contact',{
          p_target_user:t.userId,
          p_requester_role:state.role,
          p_target_role:t.role
        })
      :await talindSupabase.rpc('get_match_contact_v2',{
          p_connection_id:c?c.id:null,
          p_target_user:t.userId,
          p_requester_role:state.role,
          p_target_role:t.role
        });
    if(res.error)throw res.error;
    const row=(res.data||[])[0];

    if(!row||!row.allowed){
      const reason=row&&row.reason?row.reason:'Contact access is not available yet.';
      const membershipNeeded=/membership/i.test(reason);
      modal(
        '<span class="eyebrow">CONTACT ACCESS</span>'+
        '<h2>Direct contact is locked</h2>'+
        '<p class="muted">'+esc(reason)+'</p>'+
        '<div class="notice">Chat and relationship tracking remain available inside Talind.</div>'+
        '<div class="dialog-actions">'+
          (membershipNeeded?'<button class="btn" onclick="$(\'#modal\').close();navigate(\'plans\')">View membership</button>':'')+
          '<button class="btn outline" onclick="$(\'#modal\').close()">Close</button>'+
        '</div>'
      );
      return;
    }

    modal(
      '<span class="eyebrow">CONTACT DETAILS</span>'+
      '<h2>'+esc(row.display_name||item.name)+'</h2>'+
      '<section class="panel">'+
        '<p><strong>Email:</strong> '+esc(row.email||'Not provided')+'</p>'+
        '<p><strong>Phone:</strong> '+esc(row.phone||'Not provided')+'</p>'+
        '<p><strong>WhatsApp:</strong> '+esc(row.whatsapp||'Not provided')+'</p>'+
      '</section>'+
      '<p class="bottom-note">Use these details only for this accepted Talind match and respect the recipient’s communication preferences.</p>'
    );
  }catch(e){
    console.error(e);
    toast('Could not check contact access.');
  }
};

matchActions=function(item){
  const c=matchConnection(item),status=matchStatusLabel(c),parts=[];

  if(!c)parts.push('<button class="btn outline" onclick="matchSetStatus(\''+item.key+'\',\'shortlisted\')">Shortlist</button>');
  if(!c||c.status==='shortlisted')parts.push('<button class="btn" onclick="matchSetStatus(\''+item.key+'\',\'interest_expressed\')">Express interest</button>');

  parts.push('<button class="btn light" onclick="matchOpenChat(\''+item.key+'\')">Chat</button>');
  parts.push('<button class="btn light" onclick="matchViewContact(\''+item.key+'\')">View contact</button>');

  if(state.role==='teacher'&&item.kind==='requirement'&&(!c||c.status!=='accepted')){
    parts.push('<button class="btn outline" onclick="matchSubmitQuote(\''+item.key+'\')">Submit quote</button>');
  }

  if(state.role==='learner'&&c&&c.status==='quote_submitted'){
    parts.push('<button class="btn" onclick="matchAcceptQuote(\''+item.key+'\')">Accept quote</button>');
  }

  if(state.role==='teacher'&&item.kind==='requirement'&&c&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'provider_professional')){
    parts.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'provider_professional\')">Accept professional agreement</button>');
  }

  if(state.role==='learner'&&item.kind==='teacher'&&c&&c.status==='accepted'&&!engagementOwnAgreement(c.id,'guardian_contact_consent')){
    parts.push('<button class="btn" onclick="acceptEngagementAgreement(\''+item.key+'\',\'guardian_contact_consent\')">Approve direct contact</button>');
  }

  return '<div style="margin-top:12px"><span class="badge">'+esc(status)+'</span></div><div class="dialog-actions" style="margin-top:12px">'+parts.join('')+'</div>';
};

function shortlistRelationshipItems(){
  if(!talindCurrentUser)return [];
  const active=matchState.connections.filter(function(c){return !['declined','closed'].includes(c.status)});
  const pools=state.role==='learner'
    ?[liveTeacherItems(),liveTrainingItems(),liveInstitutionItems()]
    :state.role==='teacher'
      ?[liveRequirementItems(),liveInstitutionItems()]
      :state.role==='institution'
        ?[liveTeacherItems(),liveTrainingItems()]
        :state.role==='training'
          ?[liveRequirementItems(),liveInstitutionItems()]
          :[];
  const out=[];
  pools.flat().forEach(function(item){
    const row=matchConnection(item);
    if(row&&active.some(function(x){return x.id===row.id})&&!out.some(function(x){return x.key===item.key}))out.push(item);
  });
  return out;
}

function shortlistToggleCompare(key,checked){
  if(checked){
    if(shortlistCompareSelection.size>=4){
      toast('Compare up to 4 teachers at a time.');
      render();
      return;
    }
    shortlistCompareSelection.add(key);
  }else{
    shortlistCompareSelection.delete(key);
  }
  render();
}

function shortlistSummaryCard(item){
  const c=matchConnection(item);
  const selected=shortlistCompareSelection.has(item.key);
  const quote=c&&c.quote_amount!=null
    ?(c.quote_currency||'INR')+' '+Number(c.quote_amount).toLocaleString('en-IN')
    :'No quote yet';

  return '<article class="card">'+
    '<div class="card-top">'+
      '<span class="badge">'+esc(matchStatusLabel(c))+'</span>'+
      (state.role==='learner'&&item.kind==='teacher'
        ?'<label class="check-row" style="padding:0"><input type="checkbox" '+(selected?'checked':'')+' onchange="shortlistToggleCompare(\''+item.key+'\',this.checked)"><span>Compare</span></label>'
        :'')+
    '</div>'+
    '<div class="card-body">'+
      '<div class="identity"><div class="initials">'+esc(item.initials)+'</div><div><h3>'+esc(item.name)+'</h3><small>'+esc(item.title)+'</small></div></div>'+
      '<p class="desc">'+esc(item.desc||'')+'</p>'+
      '<div class="tags">'+(item.tags||[]).slice(0,6).map(function(t){return '<span>'+esc(t)+'</span>'}).join('')+'</div>'+
      '<div class="meta"><span>Location: '+esc(item.location)+'</span><span>Mode: '+esc(item.mode)+'</span></div>'+
      '<div class="notice" style="margin-bottom:0"><strong>'+esc(item.matchReason)+'</strong><br>Quote: '+esc(quote)+'</div>'+
    '</div>'+
    '<div class="card-foot"><button class="btn light" onclick="liveMatchDetail(\''+item.key+'\')">Open match</button></div>'+
  '</article>';
}

saved=function(){
  if(!talindCurrentUser){
    $('#main').innerHTML=
      intro('MY SHORTLIST','Sign in to see your saved Talind matches.','Your shortlist and relationship status are stored in your account.')+
      '<div class="empty"><h3>Sign in to continue</h3><button class="btn" onclick="authScreen(\'login\')">Log in</button></div>';
    side('saved');
    return;
  }

  const items=shortlistRelationshipItems();
  const compareCount=shortlistCompareSelection.size;

  $('#main').innerHTML=
    intro('MY SHORTLIST','Keep your possibilities close.','Review matched profiles, current status and quote details. Select teachers to compare side by side.')+
    '<div class="section-top"><span class="count">'+items.length+' saved / contacted</span>'+
      (state.role==='learner'&&items.length>1
        ?'<button class="btn outline" '+(compareCount<2?'disabled':'')+' onclick="shortlistCompare()">Compare selected ('+compareCount+')</button>'
        :'')+
    '</div>'+
    '<div class="cards">'+
      (items.length
        ?items.map(shortlistSummaryCard).join('')
        :'<div class="empty"><h3>Your shortlist is waiting</h3><p class="muted">Shortlist or contact a matched profile and it will appear here automatically.</p><a class="btn" href="#explore">Explore matches</a></div>')+
    '</div>';

  side('saved');
};

function shortlistCompare(){
  const items=shortlistRelationshipItems()
    .filter(function(i){return shortlistCompareSelection.has(i.key)})
    .slice(0,4);

  if(items.length<2){toast('Select at least 2 teachers to compare.');return}

  function row(label,getter){
    return '<tr><th>'+esc(label)+'</th>'+
      items.map(function(i){return '<td>'+esc(getter(i))+'</td>'}).join('')+
    '</tr>';
  }

  modal(
    '<span class="eyebrow">COMPARE TEACHERS</span>'+
    '<h2>Compare your shortlisted matches</h2>'+
    '<div class="comparison"><table>'+
      '<thead><tr><th>Detail</th>'+items.map(function(i){return '<th>'+esc(i.name)+'</th>'}).join('')+'</tr></thead>'+
      '<tbody>'+
        row('Headline',function(i){return i.title})+
        row('Match reason',function(i){return i.matchReason})+
        row('Skills',function(i){return (i.tags||[]).join(', ')||'Not listed'})+
        row('Location',function(i){return i.location})+
        row('Mode',function(i){return i.mode})+
        row('Current status',function(i){return matchStatusLabel(matchConnection(i))})+
        row('Quote',function(i){
          const c=matchConnection(i);
          return c&&c.quote_amount!=null
            ?(c.quote_currency||'INR')+' '+Number(c.quote_amount).toLocaleString('en-IN')
            :'No quote yet';
        })+
        row('Contacted',function(i){
          const c=matchConnection(i);
          return c&&c.last_message_at?'Yes':'No';
        })+
      '</tbody>'+
    '</table></div>'+
    '<p class="bottom-note">Use this comparison as a decision aid. Verify qualifications, experience and final service terms before confirming an engagement.</p>'
  );
}

(async function(){
  try{
    const x=await talindSupabase.auth.getSession();
    if(x.data&&x.data.session&&x.data.session.user){
      await engagementLoadOwn();
      render();
    }
  }catch(e){console.warn('Talind agreement/shortlist init pending',e)}
})();
