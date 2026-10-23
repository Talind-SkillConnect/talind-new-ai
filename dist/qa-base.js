// QA-only dependency shims for the exact production live-matching.js source.
// No real session, Supabase connection, email delivery or application mutations.
const state = {role:'learner'};
let talindCurrentUser = {id:'qa-learner-001'};
let qaRecord = {fields:{},skills:[]};
function record(){return qaRecord;}
function workspace(){}
function explore(){}
function render(){}
function card(){return '';}
function modal(){}
function toast(){}
function opportunitySection(){return '';}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
const talindSupabase = Object.freeze({
  auth:Object.freeze({getSession:async function(){return {data:{session:null}};}}),
  from:function(){throw new Error('QA mode must not query the production database');}
});
