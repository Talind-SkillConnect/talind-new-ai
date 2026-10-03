const billing={audience:'learner',orders:[]};
const paidPlans=[
{id:'teacher-services',role:'teacher',name:'Teacher Services',purpose:'PAID — tuition, coaching & expert services',price:499,features:['Up to 3 active service listings','Match with learner requirements','Chat, quote and track engagement status','Direct learner contact after accepted quote, consent and professional agreement']},
{id:'institution',role:'institution',name:'Institution Membership',purpose:'Hiring, admissions & partnerships',price:1999,features:['Post staffing requirements','Discover and shortlist teacher profiles','Manage hiring conversations and direct contact','Promote admissions and explore training partners']},
{id:'training',role:'training',name:'Training Provider',purpose:'Learners & institutions',price:999,features:['Publish detailed courses and programmes','Match with learner requirements','Explore institutional partnerships','Use Talind chat and approved direct-contact workflows']}
];
function money(n){return '₹'+Number(n).toLocaleString('en-IN')}
function chooseAudience(a){billing.audience=a;plans()}
plans=function(){
  const signedIn=!!talindCurrentUser;
  const audience=signedIn?state.role:(billing.audience||state.role);
  const plan=paidPlans.find(p=>p.role===audience);

  const copy={
    learner:{
      eyebrow:'STUDENT / PARENT ACCESS',
      title:'Talind is free for students and parents.',
      text:'Find teachers, coaching, training and institutions without a Talind membership fee.',
      badge:'Free access'
    },
    teacher:{
      eyebrow:'TEACHER / EXPERT ACCESS',
      title:'Jobs are free. Services require membership.',
      text:'Use Talind free for teaching and faculty job seeking. A Teacher Services membership is required to offer tuition, coaching, mentoring, workshops or other paid services.',
      badge:'Jobs free · Services paid'
    },
    institution:{
      eyebrow:'SCHOOL / COLLEGE ACCESS',
      title:'One membership for hiring and institutional growth.',
      text:'Use Talind for teacher discovery, hiring, admission visibility and training partnerships.',
      badge:'Paid membership'
    },
    training:{
      eyebrow:'TRAINING PROVIDER ACCESS',
      title:'Reach learners and institutions.',
      text:'Publish programmes, match with learner requirements and explore institutional partnerships through a Training Provider membership.',
      badge:'Paid membership'
    }
  }[audience];

  let cards='';
  if(audience==='learner'){
    cards='<article class="card plan recommended"><span class="eyebrow">FREE ACCESS</span><h3>Student / Parent</h3><div class="plan-price">Free</div><ul><li>Find tuition, coaching and skill development</li><li>Explore schools and colleges</li><li>Shortlist and compare relevant matches</li><li>Chat and view provider contact details according to Talind rules</li></ul></article>';
  }else if(audience==='teacher'){
    cards='<article class="card plan"><span class="eyebrow">JOB SEEKING</span><h3>Teacher Job Seeker</h3><div class="plan-price">Free</div><ul><li>Create your employment profile</li><li>Explore teaching and faculty jobs</li><li>Shortlist, apply and communicate about jobs</li><li>No Teacher Services membership required for job seeking</li></ul></article>'+
      '<article class="card plan recommended"><span class="eyebrow">'+esc(plan.purpose)+'</span><h3>'+esc(plan.name)+'</h3><div class="plan-price">'+money(plan.price)+'<small> / month</small></div><ul>'+plan.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><button class="btn light" onclick="toast(\'Online membership activation is coming soon.\')">Coming soon</button></article>';
  }else if(plan){
    cards='<article class="card plan recommended"><span class="eyebrow">'+esc(plan.purpose)+'</span><h3>'+esc(plan.name)+'</h3><div class="plan-price">'+money(plan.price)+'<small> / month</small></div><ul>'+plan.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><button class="btn light" onclick="toast(\'Online membership activation is coming soon.\')">Coming soon</button></article>';
  }

  const audienceTabs=!signedIn
    ?'<div class="tabs">'+[['learner','Students & parents'],['teacher','Teachers & experts'],['institution','Schools & colleges'],['training','Training providers']].map(([k,v])=>'<button class="chip '+(k===audience?'active':'')+'" onclick="chooseAudience(\''+k+'\')">'+v+'</button>').join('')+'</div>'
    :'';

  $('#main').innerHTML=
    intro(copy.eyebrow,copy.title,copy.text,copy.badge)+
    audienceTabs+
    '<div class="cards pricing-cards">'+cards+'</div>'+
    (audience==='learner'?'':'<section class="panel"><h2>Payment activation</h2><p class="muted">Online payment is not enabled yet. No card, UPI or banking information is collected on this page.</p></section>');
  side('plans');
};
