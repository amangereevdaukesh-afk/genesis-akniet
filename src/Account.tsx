import { lazy,Suspense,useEffect,useState } from 'react';
import {client,googleEnabled} from './cloud';
import {Eye,EyeOff,MailCheck} from 'lucide-react';
const App=lazy(()=>import('./App'));

export function AccountRoot(){
 const [owner,setOwner]=useState<string|null|undefined>(client?undefined:null);
 const [demo,setDemo]=useState(()=>sessionStorage.getItem("museum-demo")==="yes");
 const [recover,setRecover]=useState(false); const [welcome,setWelcome]=useState(false);
 useEffect(()=>{if(!client)return;const {data}=client.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT')setWelcome(false); if(session){if(sessionStorage.getItem('museum-email-flow'))setWelcome(true);sessionStorage.removeItem('museum-email-flow');sessionStorage.removeItem('museum-confirm');} if(event==='SIGNED_OUT'||session){sessionStorage.removeItem('museum-demo');setDemo(false)}
 if(event==='SIGNED_IN'&&sessionStorage.getItem('museum-login')==='yes'){
   sessionStorage.removeItem('museum-login');sessionStorage.removeItem('museum-create');history.replaceState(null,'',location.pathname);
 }
 setOwner(session?.user.id??null);
 if(event==='PASSWORD_RECOVERY')setRecover(true);
 });return ()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(owner)void client!.from('profiles').upsert({user_id:owner},{onConflict:'user_id',ignoreDuplicates:true}).then(({error})=>{if(error)console.error('Profile initialization failed',error.code)})},[owner]);
 if(owner===undefined)return <p>Opening your museum…</p>;
 if(recover||(!owner&&!demo))return <main className="admission"><div className="admission-cover"><img width="52" height="52" src="/favicon.svg" alt=""/><h1>Museum <br/>of Days</h1><p>Every day deserves to be remembered.</p></div><div className="admission-form"><Account recovery={recover} done={()=>setRecover(false)}/>{!recover&&<button className="demo-entry" onClick={()=>{sessionStorage.setItem('museum-demo','yes');setDemo(true)}}>Explore Demo</button>}</div></main>;
 return <Suspense fallback={<p>Opening the museum�</p>}><>{owner&&welcome&&<div className="auth-welcome" role="status">Your account is ready. You are signed in. <button onClick={()=>setWelcome(false)} aria-label="Dismiss">×</button></div>}<App key={owner??'guest'} owner={owner}/></></Suspense>;
}

export function Account({recovery=false,done}:{recovery?:boolean;done?:()=>void}){
 const [pending,setPending]=useState(()=>sessionStorage.getItem('museum-confirm')||'');
 const [email,setEmail]=useState(pending);
 const [mode,setMode]=useState<'login'|'signup'|'reset'>(pending?'signup':'login');
 const [message,setMessage]=useState(pending?'Open the confirmation link in your inbox to enter the museum.':'');
 const [busy,setBusy]=useState(false);
 const [showPassword,setShowPassword]=useState(false);
 const [verificationCode,setVerificationCode]=useState('');
 const [until,setUntil]=useState(()=>Number(sessionStorage.getItem('museum-email-retry'))||0);
 const [now,setNow]=useState(Date.now);
 const remaining=Math.max(0,Math.ceil((until-now)/1000));
 useEffect(()=>{if(until<=Date.now())return;const id=setInterval(()=>{setNow(Date.now());if(Date.now()>=until)clearInterval(id)},1000);return()=>clearInterval(id)},[until]);
 if(!client)return <p>Cloud accounts are unavailable in this build.</p>;
 const auth=client.auth,redirect=location.origin+location.pathname;
 const address=email.trim(),waiting=!!pending&&pending===address;
 function remember(){sessionStorage.setItem('museum-confirm',address);setPending(address)}
 function cooldown(seconds=60){const end=Date.now()+seconds*1000;sessionStorage.setItem('museum-email-retry',String(end));setUntil(end);setNow(Date.now())}
 async function submit(form:HTMLFormElement,resend=false){
 if(busy)return;
 if(!recovery&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)){setMessage('Enter a valid email address.');return}
 const password=String(new FormData(form).get('password')??'');
 if(!resend&&(recovery||mode!=='reset')&&password.length<(recovery||mode==='signup'?8:1)){setMessage(recovery||mode==='signup'?'Choose a password with at least eight characters.':'Enter your password.');return}
 setBusy(true);setMessage('');
 try{
 if(resend){const {error}=await auth.resend({type:'signup',email:address,options:{emailRedirectTo:redirect}});if(error)throw error;cooldown();setMode('signup');setMessage('Enter the latest code from your inbox or spam folder.')}
 else if(recovery){const {error}=await auth.updateUser({password});if(error)throw error;done?.()}
 else if(mode==='reset'){const {error}=await auth.resetPasswordForEmail(address,{redirectTo:redirect});if(error)throw error;setMessage('If this email has an account, check your inbox for the reset link.')}
 else{
 sessionStorage.setItem('museum-email-flow','yes');sessionStorage.setItem('museum-login','yes');
 if(mode==='signup'){const {data,error}=await auth.signUp({email:address,password,options:{emailRedirectTo:redirect}});if(error)throw error;
 if(data.session)setMessage('Your account is ready. You are signed in.');
 else{remember();cooldown();setVerificationCode('');setMessage('Check your inbox and spam folder for your confirmation email.')}}
 else{const {error}=await auth.signInWithPassword({email:address,password});if(error)throw error;setMessage('You are signed in.')}
 }
 }catch(error){sessionStorage.removeItem('museum-email-flow');
 const e=error as {code?:string;message?:string;status?:number;name?:string};
 if(e.code==='email_not_confirmed'){remember();setMode('signup')}
 const messages:Record<string,string>={
 user_already_exists:'This email is already registered. Sign in or reset your password.',
 email_exists:'This email is already registered. Sign in or reset your password.',
 email_not_confirmed:'Confirm your email before signing in. Check your inbox and spam folder or request a new code.',
 invalid_credentials:'Incorrect email or password. Try again or reset your password.',
 email_address_not_authorized:'The museum mail service cannot send confirmation to this address. Contact the museum team.',
 email_provider_disabled:'Email accounts are currently unavailable.',signup_disabled:'Registration is currently unavailable.',
 weak_password:'Choose a stronger password.',email_address_invalid:'Enter a valid email address.'};
 if(e.status===429){cooldown(Math.max(60,Number(e.message?.match(/(\d+) seconds/i)?.[1])||0));if(mode==='signup')remember();setMessage('Too many requests. Check your inbox for the previous email and wait before requesting another.')}
 else setMessage(messages[e.code??'']||(/sending.*email|smtp/i.test(e.message??'')?'The confirmation email could not be sent. Contact the museum team about email delivery.':/fetch|network|timeout/i.test((e.name??'')+' '+e.message)?'Could not reach the museum. Check your connection and try again.':e.message||'Please try again.'));
 }finally{setBusy(false)}
 }
 const confirming=waiting&&mode==='signup'&&!recovery;
 async function verifyCode(){
  if(busy)return;
  const token=verificationCode.replace(/\D/g,'');
  if(!/^\d{6,8}$/.test(token)){setMessage('Enter the 6–8 digit code from your email.');return}
  setBusy(true);setMessage('');
  try{
   const {data,error}=await auth.verifyOtp({email:pending,token,type:'email'});
   if(error)throw error;
   sessionStorage.removeItem('museum-confirm');setPending('');setVerificationCode('');
   if(data.session)setMessage('Email confirmed. Entering your museum…');
   else{setMode('login');setMessage('Email confirmed. Sign in to continue.')}
  }catch(error){
   const e=error as {code?:string;message?:string;status?:number};
   setMessage(e.status===429?'Too many attempts. Wait before trying again.':e.code==='otp_expired'?'This code has expired. Request a new one.':e.code==='otp_disabled'?'Email verification is unavailable right now.': 'That code is incorrect or expired. Check your latest email and try again.');
  }finally{setBusy(false)}
 }
 async function resendCode(){
  if(busy||remaining)return;
  setBusy(true);setMessage('');
  try{
   const {error}=await auth.resend({type:'signup',email:pending,options:{emailRedirectTo:redirect}});
   if(error)throw error;
   setVerificationCode('');cooldown(60);setMessage('A new code has been requested. Check your inbox and spam folder.');
  }catch(error){
   const e=error as {code?:string;status?:number};
   if(e.status===429)cooldown(60);
   setMessage(e.code==='email_address_not_authorized'?'Our email service cannot send to this address yet. Please contact the museum team.':'The confirmation email could not be sent. Please try again later.');
  }finally{setBusy(false)}
 }
 if(confirming)return <section className="account-card verification-card">
  <div className="verification-icon" aria-hidden="true"><MailCheck size={26}/></div>
  <p className="verification-kicker">ONE MOMENT MORE</p>
  <h2>Unlock your museum.</h2>
  <p className="verification-description">We’ve requested a one-time code for <strong>{pending}</strong>. Enter it below to make your memories yours alone.</p>
  <form onSubmit={e=>{e.preventDefault();void verifyCode()}}>
   <label htmlFor="museum-verification-code">Your verification code</label>
   <input id="museum-verification-code" className="verification-code" name="verification-code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={8} autoComplete="one-time-code" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={verificationCode} onChange={e=>{setVerificationCode(e.target.value.replace(/\D/g,'').slice(0,8));setMessage('')}} disabled={busy} aria-describedby="museum-code-help" placeholder="000000" autoFocus/>
   <p id="museum-code-help" className="verification-help">Use the code shown in your email · never share it.</p>
   <button className="solid-button" type="submit" disabled={busy||verificationCode.length<6}>{busy?'Checking code…':'Verify & enter museum'}</button>
   <p role="status" aria-live="polite">{message}</p>
  </form>
  <div className="verification-actions"><button type="button" disabled={busy||remaining>0} onClick={()=>void resendCode()}>{remaining?'Send another in '+remaining+'s':'Send another code'}</button><button type="button" disabled={busy} onClick={()=>{sessionStorage.removeItem('museum-confirm');setPending('');setEmail('');setMode('signup');setVerificationCode('');setMessage('')}}>Change email</button><button type="button" disabled={busy} onClick={()=>{setMode('login');setMessage('')}}>Already registered? Sign in</button></div>
 </section>;
 return <section className="account-card"><h2>{recovery?'Choose a new password':mode==='reset'?'Reset your password':mode==='signup'?'Create your museum account':'Welcome to the museum'}</h2>
 {!recovery&&<div className="account-tabs">{(['login','signup'] as const).map((m,i)=><button key={m} disabled={busy} aria-pressed={mode===m} onClick={()=>{setMode(m);setMessage('')}}>{['Sign In','Sign Up'][i]}</button>)}</div>}
 <form noValidate onSubmit={e=>{e.preventDefault();void submit(e.currentTarget)}}>
 {!recovery&&<label>Email<input type="email" required name="email" autoComplete="email" maxLength={254} disabled={busy} value={email} onChange={e=>{setEmail(e.target.value);setMessage('')}}/></label>}
 {(recovery||mode!=='reset'&&!confirming)&&<label>Password<span className="password-entry"><input type={showPassword?'text':'password'} required name="password" autoComplete={mode==='login'&&!recovery?'current-password':'new-password'}/><button type="button" className="password-reveal" disabled={busy} aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>}
 <button className="solid-button" disabled={busy||(!recovery&&mode==='signup'&&remaining>0)}>{busy?'Please wait…':recovery?'Save password':mode==='reset'?'Send recovery email':mode==='signup'&&remaining?'Try again in '+remaining+'s':confirming?'Resend confirmation email':mode==='signup'?'Create account':'Continue with Email'}</button>
 <p role="status">{message}</p>
 {waiting&&mode==='login'&&!recovery&&<button type="button" disabled={busy||remaining>0} onClick={e=>void submit(e.currentTarget.form!,true)}>{remaining?'Resend in '+remaining+'s':'Resend confirmation email'}</button>}</form>
 {!recovery&&<><button className="demo-entry" disabled={busy} onClick={()=>{setMode('reset');setMessage('')}}>Forgot Password?</button><div className="account-rule">OR</div><button className="google-entry" onClick={async()=>{sessionStorage.setItem('museum-login','yes');try{if(!await googleEnabled()){setMessage('Google sign-in is currently unavailable. Continue with email or explore the demo.');return}const {error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect}});if(error)throw error}catch(e){setMessage(e instanceof Error?e.message:'Google sign-in could not start.')}}}><GoogleMark/>Continue with Google</button></>}
 </section>}
function GoogleMark(){return <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.9-3.6-11.5-8.4H5.7v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.5 27.5a12 12 0 0 1 0-7V15H5.7a20 20 0 0 0 0 18z"/><path fill="#EA4335" d="M24 12.1c3 0 5.6 1 7.7 3l5.8-5.7A19.5 19.5 0 0 0 24 4 20 20 0 0 0 5.7 15l6.8 5.5c1.6-4.9 6.2-8.4 11.5-8.4z"/></svg>}