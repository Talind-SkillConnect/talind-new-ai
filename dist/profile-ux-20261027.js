/* Talind usability updates, 27 October 2026.
   Applied after all existing Talind modules. Works with real accounts and
   isolated /testing.html QA accounts; does not rewrite historic profile data. */
(function(){
  'use strict';

  // Teacher preferences no longer ask for a duplicated job/service location.
  questions.teacher.preferences = questions.teacher.preferences.filter(function(q){
    return q.key !== 'preferredLocations';
  });

  // Keep the student skills step exclusively about skills the learner wants.
  const originalSkillsHTML = skillsHTML;
  function wantedSkills(){
    return (record().skills || []).filter(function(s){return s.purpose === 'Want to learn';});
  }
  skillsHTML = function(){
    if(state.role !== 'learner')return originalSkillsHTML();
    const wanted = wantedSkills();
    const historical = (record().skills || []).length - wanted.length;
    return '<p class="muted">Select only the skills the learner wants to obtain. Existing skills or professional experience are not required for Student / Parent accounts.</p>'+
      '<div class="skill-builder">'+
        '<label>Skill to learn<select id="skill-pick"><option value="">Choose a skill</option>'+
          catalog.map(function(s){return '<option>'+esc(s)+'</option>';}).join('')+
        '</select></label>'+
        '<label>Other skill you want to learn<input id="custom-skill" maxlength="100" placeholder="e.g. Abacus, robotics, pottery"></label>'+
        '<label>Desired level (optional)<select id="skill-level">'+
          ['Not assessed','Beginner','Intermediate','Advanced'].map(function(v){return '<option>'+esc(v)+'</option>';}).join('')+
        '</select></label>'+
        '<label>Learning priority<select id="skill-priority"><option>Primary</option><option>Additional</option></select></label>'+
      '</div>'+
      '<button class="btn light" type="button" onclick="addSkill()">+ Add skill to learn</button>'+
      '<div class="skill-list">'+(wanted.map(function(s){
        const index = record().skills.indexOf(s);
        return '<div class="skill-row"><div><strong>'+esc(s.name)+'</strong>'+
          '<p>Want to learn · '+esc(s.level || 'Not assessed')+' · '+esc(s.priority || 'Primary')+'</p></div>'+
          '<button class="btn outline" type="button" onclick="removeSkill('+index+')">Remove</button></div>';
      }).join('') || '<p class="muted">Add at least one skill you want to learn to continue.</p>')+'</div>'+
      (historical ? '<p class="muted">Previous entries marked “Already have” are hidden from this learning list; your earlier records have not been deleted.</p>' : '');
  };

  const originalAddSkill = addSkill;
  addSkill = function(){
    if(state.role !== 'learner')return originalAddSkill();
    const custom = document.querySelector('#custom-skill')?.value.trim() || '';
    const name = custom || document.querySelector('#skill-pick')?.value || '';
    if(!name){toast('Choose or enter a skill to learn.');return;}
    if(wantedSkills().some(function(s){return s.name.toLowerCase()===name.toLowerCase();})){
      toast('This learning skill is already added.');return;
    }
    record().skills.push({
      name:name, custom:!!custom, purpose:'Want to learn',
      level:document.querySelector('#skill-level')?.value || 'Not assessed',
      years:'', priority:document.querySelector('#skill-priority')?.value || 'Primary'
    });
    record().complete=false;
    profile();
  };

  const originalCurrentValid = currentValid;
  currentValid = function(){
    if(state.role === 'learner' && steps()[registration.step]?.id === 'skills' && !wantedSkills().length){
      toast('Add at least one skill you want to learn.');return false;
    }
    return originalCurrentValid();
  };
  const originalMissingFields = missingFields;
  missingFields = function(){
    const missing = originalMissingFields();
    if(state.role === 'learner' && !wantedSkills().length &&
       !missing.includes('At least one skill') &&
       !missing.includes('At least one skill to learn')){
      missing.push('At least one skill to learn');
    }
    return missing;
  };

  // Learning goals and board/class are captured under Background & goals.
  // Keep admission-specific grade/qualification questions in those workflows.
  const originalRequirementQuestions = requirementQuestions;
  const dayOptions = ['Weekdays (Monday–Friday)','Weekends (Saturday–Sunday)',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'Any day','Flexible / to be discussed'];
  const timeOptions = ['Early morning (6–9 AM)','Morning (9 AM–12 PM)',
    'Afternoon (12–3 PM)','After school (3–5 PM)','Evening (5–7 PM)',
    'Late evening (7–9 PM)','Flexible / to be discussed'];
  const frequencyOptions = ['1 session per week','2 sessions per week',
    '3 sessions per week','4 sessions per week','5 sessions per week',
    '6 sessions per week','Daily (7 sessions per week)',
    'Flexible / to be discussed'];
  function keepSavedChoice(q,choices){
    const saved = String(record().fields[q.key] || '').trim();
    return (saved && !choices.includes(saved)) ? [saved].concat(choices) : choices;
  }
  requirementQuestions = function(type,slot){
    const original = originalRequirementQuestions(type,slot);
    if(type === 'School admission' || type === 'College admission')return original;
    return original.filter(function(q){
      return !q.key.endsWith('_grade') && !q.key.endsWith('_goals');
    }).flatMap(function(q){
      if(q.key.endsWith('_timing')){
        const daysKey = q.key.replace(/_timing$/,'_days');
        const dayField = field(daysKey,'Preferred learning days','select',dayOptions,true);
        return [dayField,Object.assign({},q,{
          label:'Preferred session timing',
          type:'select',
          options:keepSavedChoice(q,timeOptions)
        })];
      }
      if(q.key.endsWith('_frequency')){
        return [Object.assign({},q,{
          label:'Preferred sessions per week',
          type:'select',
          options:keepSavedChoice(q,frequencyOptions)
        })];
      }
      return [q];
    });
  };

  // All profiles: actual completed required inputs / total required inputs.
  // Skills, selected purposes, consent confirmations and necessary entries count.
  function completionMetrics(){
    const r=record(), f=r.fields || {}, checks=[];
    steps().forEach(function(step){
      adaptiveFields(step.id).forEach(function(q){
        if(!q.required)return;
        checks.push({label:q.label,done:(function(){
          const v=f[q.key];
          return Array.isArray(v)?v.length>0:(v!==null && v!==undefined && String(v).trim().length>0);
        })()});
      });
    });
    if(state.role!=='institution')checks.push({
      label:'Skills',done:state.role==='learner'?wantedSkills().length>0:(r.skills||[]).length>0
    });
    if(state.role!=='learner')checks.push({label:'Purpose',done:selectedPurposes().length>0});
    if(state.role==='institution' && hasPurpose('Hire teachers / professors')){
      checks.push({label:'Job openings',done:(r.openings||[]).length>0});
    }
    if(state.role==='training' && hasPurpose('Individual learner enrolment')){
      checks.push({label:'Courses',done:(r.courses||[]).length>0});
    }
    checks.push({label:'Accuracy confirmation',done:!!f.accuracy});
    checks.push({label:'Authorised representative confirmation',done:!!f.authority});
    const done = checks.filter(function(c){return c.done;}).length;
    const full = missingFields().length===0;
    return {done:done,total:checks.length,percent:full?100:Math.min(99,Math.round(done/checks.length*100))};
  }
  const originalReviewAdaptive = reviewAdaptive;
  reviewAdaptive = function(){
    const m=completionMetrics();
    return '<section class="talind-completion-card" aria-label="Profile completion progress">'+
        '<div class="talind-completion-top"><strong>Profile completion</strong><strong>'+m.percent+'%</strong></div>'+
        '<div class="talind-completion-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+m.percent+'" aria-label="Profile completion">'+
          '<div style="width:'+m.percent+'%"></div>'+
        '</div>'+
        '<p>'+m.done+' of '+m.total+' required profile items completed. '+(m.percent===100?'Ready for final review.':'Finish the remaining required details before completing your profile.')+'</p>'+
      '</section>'+originalReviewAdaptive();
  };

  // Hide the teacher-only explanatory footer, not the opportunity action.
  const originalLiveMatchCard = liveMatchCard;
  liveMatchCard = function(item){
    const html=originalLiveMatchCard(item);
    if(state.role!=='teacher')return html;
    return html.replace(/<div class="price"><span>Why this match<\/span><small>[\s\S]*?<\/small><\/div>/g,'');
  };

  const style=document.createElement('style');
  style.textContent='.talind-completion-card{border:1px solid #cfe3d7;border-radius:12px;padding:20px;background:#f3faf6;margin:16px 0 25px}.talind-completion-top{display:flex;justify-content:space-between;gap:16px;color:#0b4f42;font-size:17px}.talind-completion-track{height:12px;border-radius:99px;overflow:hidden;background:#dce9df;margin-top:11px}.talind-completion-track>div{height:100%;border-radius:99px;background:#08775d;transition:width .2s ease}.talind-completion-card p{margin:10px 0 0;font-size:13px;color:#416358}.teacher-match-card .card-foot:has(>button:only-child){justify-content:flex-end}';
  document.head.appendChild(style);
  if(location.hash==='#profile' && typeof render==='function')render();
})();