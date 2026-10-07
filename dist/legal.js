// Talind public legal, privacy, refund and grievance pages.
// Beta release: 7 October 2026.

const TALIND_LEGAL_EFFECTIVE='7 October 2026';
const TALIND_SUPPORT_EMAIL='talindeducation@gmail.com';

function talindLegalHeader(label,title,text){
  return '<div class="legal-page-head"><span class="eyebrow">'+label+'</span><h1>'+title+'</h1><p class="muted">'+text+'</p>'+
    '<div class="legal-effective"><span>Effective: '+TALIND_LEGAL_EFFECTIVE+'</span><span>Talind Beta</span></div></div>';
}
function talindLegalContact(){
  return '<section class="legal-contact-box"><h2>Contact Talind</h2><p>For privacy questions, account support, safety reports or grievances, email <a href="mailto:'+TALIND_SUPPORT_EMAIL+'"><strong>'+TALIND_SUPPORT_EMAIL+'</strong></a>. Never send your password, OTP, payment PIN or unnecessary identity documents by email.</p></section>';
}

function talindPrivacyHTML(){
  return talindLegalHeader('PRIVACY POLICY','Your information should create opportunity — not unnecessary exposure.','This policy explains how Talind handles account, profile, matching and communication information during the Beta.')+
  '<section><h2>1. Who operates Talind</h2><p>Talind is operated under Sri Subramanya Foundation for the purpose of providing a skills-first education, talent and opportunity platform. This policy applies to Talind web services and related account features.</p></section>'+
  '<section><h2>2. Information we collect</h2><p>Depending on your account type, Talind may collect account credentials, name or organisation name, contact information, location, education or professional information, skills, learning requirements, job openings, admission information, courses, preferences, messages, quotes, consent records and platform activity.</p><p>For Student / Parent accounts, Talind is designed so a parent, guardian or adult learner manages the account. We ask users not to provide unnecessary information about a child.</p></section>'+
  '<section><h2>3. Why we use information</h2><ul><li>Create and secure Talind accounts.</li><li>Build profiles and requirements selected by the user.</li><li>Match skills, needs, jobs, admissions, courses and partnership opportunities.</li><li>Enable shortlisting, Talind messaging, quotes, consent and approved contact sharing.</li><li>Operate, secure, troubleshoot and improve the platform.</li><li>Send service communications and, only where selected, relevant marketing communications.</li><li>Meet applicable legal, safety and dispute-resolution obligations.</li></ul></section>'+
  '<section><h2>4. What is public and what stays private</h2><p>Completed profiles or requirements are shown in discovery only when the relevant visibility setting permits it. Public discovery information is intended to exclude private email addresses, phone numbers and WhatsApp numbers. Direct contact information is released only through Talind access and consent rules.</p><p>Documents selected in the current Beta are not yet stored permanently in Talind cloud storage unless the interface expressly says otherwise.</p></section>'+
  '<section><h2>5. Children and guardian-managed use</h2><p>Talind does not intend children to independently create commercial relationships or privately communicate with service providers. Where a profile concerns a person under 18, the account should be controlled by a parent or authorised guardian. Communication involving a minor should remain parent/guardian-managed. Talind does not use child profiles for behavioural advertising.</p></section>'+
  '<section><h2>6. Service providers and processing</h2><p>Talind uses technology providers for functions such as hosting, authentication, database services, security and application delivery. Those providers may process data on Talind’s behalf subject to their service terms and applicable law. Talind does not sell personal contact information to advertisers.</p></section>'+
  '<section><h2>7. Retention and deletion</h2><p>We retain information while it is reasonably needed to provide the service, maintain account and transaction records, prevent abuse, resolve disputes or comply with law. Users may unpublish relevant profile information through available visibility controls. Account deletion and formal data-erasure tooling are being added for the Beta; until then, a user may send a request to the contact address below.</p></section>'+
  '<section><h2>8. Your choices and requests</h2><p>You may request correction, access-related information, withdrawal of optional marketing choices, account support, profile unpublishing or deletion/erasure where applicable. We may need to verify that a request comes from the account holder or authorised guardian before acting.</p></section>'+
  '<section><h2>9. Security</h2><p>Talind uses authenticated accounts and access controls intended to separate public discovery data from private account/contact data. No internet service can guarantee absolute security. Users should use a unique password and report suspected misuse promptly.</p></section>'+
  '<section><h2>10. Applicable data-protection framework</h2><p>Talind intends to operate in accordance with applicable Indian privacy and data-protection requirements as they come into force, including the Digital Personal Data Protection framework. This Beta policy may be updated as the product, legal requirements and operational controls evolve.</p></section>'+
  '<section><h2>11. Changes to this policy</h2><p>Material updates will be reflected by changing the effective date on this page. Where required, Talind may provide additional notice or seek updated consent.</p></section>'+
  talindLegalContact();
}

function talindTermsHTML(){
  return talindLegalHeader('TERMS OF USE','Clear rules for a skills-first community.','These Terms govern access to and use of the Talind Beta. By creating an account or using Talind, you agree to these Terms.')+
  '<section><h2>1. Beta service</h2><p>Talind is currently a Beta platform connecting Students/Parents, Teachers/Experts, Schools/Colleges and Training Providers through skills, requirements and opportunities. Features may change as the product is validated.</p></section>'+
  '<section><h2>2. Account eligibility and authority</h2><p>You must provide accurate registration information and keep your account secure. Student profiles concerning a person under 18 must be controlled by a parent or authorised guardian. Institution and Training Provider users confirm that they are authorised to represent the organisation they identify.</p></section>'+
  '<section><h2>3. Your content and responsibilities</h2><p>You remain responsible for information, vacancies, courses, admission details, qualifications, fees, claims, messages and documents you provide. Do not upload content you do not have the right or authority to use. Talind may remove misleading, unsafe, unlawful or inappropriate content.</p></section>'+
  '<section><h2>4. Marketplace role</h2><p>Talind helps users discover and communicate with potential matches. Unless Talind expressly states otherwise for a specific service, Talind is not the employer, educational institution, trainer, tutor, admissions authority or party delivering the underlying education/professional service. Users must independently verify qualifications, institutions, claims, fees and suitability before entering an arrangement.</p></section>'+
  '<section><h2>5. Jobs, admissions and outcomes</h2><p>Talind does not guarantee a job, candidate, admission, enrolment, examination result, business opportunity, income level or successful engagement. Match indicators are decision-support signals, not endorsements or guarantees.</p></section>'+
  '<section><h2>6. Communication and safeguarding</h2><ul><li>Use Talind professionally and respectfully.</li><li>Do not privately approach a child through Talind.</li><li>Communication involving a minor must be managed through the parent or authorised guardian.</li><li>Do not request unnecessary identity, financial or sensitive information.</li><li>Do not misuse contact details or share them with third parties.</li></ul></section>'+
  '<section><h2>7. Memberships and paid features</h2><p>Paid membership plans may be displayed during Beta, but online membership activation is not yet enabled unless the Membership page expressly shows an active checkout. When payment activation begins, the price, billing period, applicable taxes, renewal/cancellation terms and refund rules shown at checkout will form part of these Terms.</p></section>'+
  '<section><h2>8. Prohibited use</h2><p>You may not impersonate another person, scrape or harvest private data, bypass access controls, send spam, publish fraudulent jobs/courses/admissions, discriminate unlawfully, distribute malware, exploit minors, or use Talind for unlawful activity.</p></section>'+
  '<section><h2>9. Suspension and removal</h2><p>Talind may restrict, suspend or remove accounts or content where reasonably necessary for platform security, user safety, suspected fraud, repeated policy violations, legal requirements or misuse of access controls.</p></section>'+
  '<section><h2>10. Third-party services and links</h2><p>Talind may link to external websites or rely on third-party infrastructure. External services are governed by their own terms and privacy practices, and Talind is not responsible for content or transactions occurring entirely outside Talind.</p></section>'+
  '<section><h2>11. Availability and limitation</h2><p>The Beta is provided on an evolving basis. Talind may experience interruptions, incomplete features or data-display errors. Nothing in these Terms excludes rights or liabilities that cannot lawfully be excluded.</p></section>'+
  '<section><h2>12. Governing framework</h2><p>These Terms are governed by applicable laws of India. Any dispute should first be raised through Talind’s grievance channel so the parties can attempt resolution before other remedies available under law are pursued.</p></section>'+
  talindLegalContact();
}

function talindRefundHTML(){
  return talindLegalHeader('REFUND & CANCELLATION','No hidden payment promise during Beta.','Talind online membership payments are not yet active. This page explains the current position and how the policy will apply when payments launch.')+
  '<section><h2>Current Beta position</h2><p>As of '+TALIND_LEGAL_EFFECTIVE+', Talind does not accept online payment for Teacher Services, Institution Membership or Training Provider Membership through this website. Therefore there is currently no Talind subscription charge to cancel or refund.</p></section>'+
  '<section><h2>Provider fees are separate</h2><p>Fees quoted by teachers, trainers, institutions or other users for their underlying services are separate from a Talind membership fee. Unless Talind expressly processes a transaction and provides its own payment terms, payment, cancellation and refund arrangements for the underlying service must be agreed between the relevant parties.</p></section>'+
  '<section><h2>When paid memberships activate</h2><p>Before Talind enables commercial checkout, this policy will be updated to state the applicable cancellation window, refund eligibility, renewal rules, taxes, failed-payment handling and the method for requesting a refund. Those terms will also be shown before payment confirmation.</p></section>'+
  '<section><h2>Billing disputes</h2><p>If a Talind charge appears after paid checkout is activated and you believe it is incorrect, contact Talind promptly with your registered email and transaction reference. Never send full card details, UPI PIN, OTP or banking password.</p></section>'+
  talindLegalContact();
}

function talindGrievanceHTML(){
  return talindLegalHeader('CONTACT & GRIEVANCE','A clear route for support, privacy and safety concerns.','Use this channel for Talind account support, privacy requests, safety concerns, content complaints or future billing disputes.')+
  '<section class="legal-contact-box"><h2>Talind Support & Grievance Desk</h2><p><strong>Email:</strong> <a href="mailto:'+TALIND_SUPPORT_EMAIL+'">'+TALIND_SUPPORT_EMAIL+'</a></p><p>For an effective review, include your registered Talind email, account type, a short description of the issue, relevant date/time, and any Talind match or conversation reference that helps identify the issue. Do not send passwords, OTPs, payment PINs or unnecessary identity documents.</p></section>'+
  '<section><h2>Privacy and data requests</h2><p>You may use this address to raise questions about personal-data processing, request correction, ask for profile unpublishing, withdraw optional marketing choices, or request deletion/erasure where applicable. Talind may verify account ownership before making changes.</p></section>'+
  '<section><h2>Safety reports</h2><p>Report suspected fraud, impersonation, inappropriate contact, misleading qualifications, child-safety concerns or misuse of private contact information. Include enough context for Talind to identify the relevant profile or interaction.</p></section>'+
  '<section><h2>Response process</h2><p>Talind will review grievances in good faith and respond within the period required by applicable law. Complex matters may require additional information or investigation. A named statutory grievance/data contact and any additional mandatory business details will be published as the platform moves from controlled Beta to paid commercial operation.</p></section>'+
  '<section><h2>Emergency matters</h2><p>Talind is not an emergency service. If there is an immediate risk to a person’s safety, contact the appropriate local emergency or law-enforcement service first.</p></section>';
}

window.talindLegalPage=function(kind){
  const html={privacy:talindPrivacyHTML,terms:talindTermsHTML,refunds:talindRefundHTML,grievance:talindGrievanceHTML}[kind];
  if(!html)return navigate('explore');
  $('#main').innerHTML='<article class="legal-page">'+html()+'</article>';
  side('');
  window.scrollTo({top:0,behavior:'smooth'});
};

window.talindResetPasswordPage=function(){
  if(!talindCurrentUser){
    $('#main').innerHTML='<div class="reset-password-wrap">'+
      talindLegalHeader('ACCOUNT RECOVERY','Open the password-reset link from your email.','A valid Talind recovery link securely establishes the temporary session needed to choose a new password.')+
      '<section class="panel"><p class="muted">If you reached this page without a valid recovery link, request a new one.</p><button class="btn" onclick="forgotPasswordScreen()">Request password-reset link</button> <button class="btn outline" onclick="authScreen(\'login\')">Back to login</button></section></div>';
    side('');
    return;
  }
  $('#main').innerHTML='<div class="reset-password-wrap">'+
    talindLegalHeader('ACCOUNT RECOVERY','Choose a new password.','Use at least 8 characters and choose a password you do not reuse on another service.')+
    '<section class="panel"><form id="reset-password-form"><div class="fields">'+
      '<label class="full">New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label>'+
      '<label class="full">Confirm new password<input name="confirm" type="password" minlength="8" autocomplete="new-password" required></label>'+
    '</div><button class="btn" type="submit">Update password</button><p id="reset-password-error" class="form-error" role="alert"></p></form></section></div>';
  side('');
  $('#reset-password-form').onsubmit=talindResetPasswordSubmit;
};

function talindEnhanceLegalFooter(){
  const footer=$('#main footer');
  if(!footer)return;
  footer.innerHTML='<span>talind · Skills. Opportunities. Growth.</span><nav class="legal-links" aria-label="Legal and support"><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#refunds">Refunds</a><a href="#grievance">Contact & grievance</a><button class="text-button" onclick="talindSafetyGuide()">Safety</button></nav>';
}

window.addEventListener('hashchange',function(){setTimeout(talindEnhanceLegalFooter,0)});
talindEnhanceLegalFooter();
if(['privacy','terms','refunds','grievance','reset-password'].includes(location.hash.slice(1)))render();
