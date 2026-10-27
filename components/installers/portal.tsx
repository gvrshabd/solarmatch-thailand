'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Inbox,Mail,X} from 'lucide-react';
import type {InstallerPortalData} from '@/lib/installer/portal-contract';
import type {InstallerPublicConfig} from '@/lib/installer/public-config';
import {sharedResidentialLabel} from '@/lib/installer/assessment-display';
import {deliveryLocation} from '@/lib/installer/presentation';
import {InstallerCompanySettings} from './company';
import {InstallerCredits} from './credits';
import {EnquiryDetail} from './enquiry-detail';
import {InstallerLanding,SignalLogo} from './landing';
import {clearInstallerNotesDrafts} from './team-notes';
import {emptyEnquiries,enquiryGroup,enquiryHref,PortalInbox,PortalNavigation,SignalListHead,SignalNotice,SignalSetup} from './workspace';
import {signalTab,signalView,sortedEnquiries,type SignalTab,type SignalView} from './signal-state';
import type {InstallerAction,NotesNavigationGuard} from './action-result';

export function InstallerPortal({deliveryId,publicConfig={accountsAvailable:false,commercial:null}}:{deliveryId?:string;publicConfig?:InstallerPublicConfig}){
 const router=useRouter();
 const [en,setEn]=useState(false),[data,setData]=useState<InstallerPortalData|null>(null);
 const [view,setView]=useState<SignalView>('inbox'),[tab,setTab]=useState<SignalTab>('waiting'),[query,setQuery]=useState('');
 const [loaded,setLoaded]=useState(false),[routeReady,setRouteReady]=useState(false),[unavailable,setUnavailable]=useState(false);
 const [authMode,setAuthMode]=useState<'login'|'register'|'recovery'|'reset'>('login'),[showAuth,setShowAuth]=useState(!!deliveryId),[authSent,setAuthSent]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [share,setShare]=useState(''),[qr,setQr]=useState<{image:string;orderId:string}|null>(null),[lineRequest,setLineRequest]=useState<string|undefined>(),[viewTime,setViewTime]=useState(0);
 const loadSequence=useRef(0),identity=useRef(''),busyRef=useRef(false),notesGuard=useRef<NotesNavigationGuard|null>(null),activeRoute=useRef(deliveryId);
 useEffect(()=>{activeRoute.current=deliveryId;},[deliveryId]);
 const registerNotesGuard=useCallback((guard:NotesNavigationGuard)=>{notesGuard.current=guard;return()=>{if(notesGuard.current===guard)notesGuard.current=null;};},[]);
 const t=(th:string,english:string)=>en?english:th;
 const displayMessage=message==='Saved.'||message==='บันทึกแล้ว'?t('บันทึกแล้ว','Saved.'):['Check your email to continue if this account exists.','ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ'].includes(message)?t('ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ','Check your email to continue if this account exists.'):message;
 useEffect(()=>{document.documentElement.lang=en?'en':'th';},[en]);
 useEffect(()=>{queueMicrotask(()=>setViewTime(Date.now()));const id=window.setInterval(()=>setViewTime(Date.now()),30000);return()=>clearInterval(id);},[]);
 useEffect(()=>{if(!message||!data)return;const id=window.setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(id);},[message,data]);
 async function load(){
   const sequence=++loadSequence.current,english=new URLSearchParams(window.location.search).get('lang')==='en';
   // A detail GET is scoped to one delivery. Fetch the ordinary list too so the split view retains all accessible records.
   const response=await fetch('/api/installer/portal',{cache:'no-store',credentials:'same-origin'});
   if(sequence!==loadSequence.current)return null;
   if(response.status===401||response.status===503){if(response.status===401){clearInstallerNotesDrafts();identity.current='';}setData(null);setLoaded(true);setUnavailable(response.status===503);if(response.status===503&&publicConfig.accountsAvailable)setError(english?'The portal is temporarily unavailable. Please try again.':'พอร์ทัลไม่พร้อมใช้งานชั่วคราว กรุณาลองอีกครั้ง');return null;}
   if(!response.ok)throw new Error(english?'The portal is unavailable. Please try again later.':'ระบบพอร์ทัลยังไม่พร้อม กรุณาลองใหม่ภายหลัง');
   const next=await response.json() as InstallerPortalData;
   if(deliveryId&&!next.deliveries.some(d=>d.id===deliveryId)){
    const detail=await fetch('/api/installer/portal?deliveryId='+encodeURIComponent(deliveryId),{cache:'no-store',credentials:'same-origin'});
    if(detail.ok){const scoped=await detail.json() as InstallerPortalData;if(scoped.company?.id===next.company?.id&&scoped.session.user.id===next.session.user.id)next.deliveries.push(...scoped.deliveries.filter(d=>!next.deliveries.some(existing=>existing.id===d.id)));}
   }
   if(sequence!==loadSequence.current)return null;
   const key=next.session.user.id+':'+(next.company?.id??'');
   if(identity.current&&identity.current!==key){clearInstallerNotesDrafts();setShare('');setQr(null);}
   identity.current=key;setData(next);setUnavailable(false);setLoaded(true);return next;
 }
 useEffect(()=>{
  let alive=true;
  async function initialize(){
   const p=new URLSearchParams(window.location.search);setEn(p.get('lang')==='en');setView(deliveryId?'inbox':signalView(p.get('view')));setShare('');setRouteReady(false);
   const invitation=p.get('linkRequest');if(invitation){setLineRequest(invitation);p.delete('linkRequest');window.history.replaceState({},'',window.location.pathname+(p.size?'?'+p:''));}
   if(p.has('token')){setAuthMode('reset');setShowAuth(true);}else if(invitation||p.has('auth'))setShowAuth(true);
   if(p.get('view')==='overview'){p.set('view','inbox');window.history.replaceState({},'',window.location.pathname+'?'+p);}
   try{const next=await load();if(alive){setTab(signalTab(p.get('tab'),next?.deliveries.find(d=>d.id===deliveryId)));setRouteReady(true);}}
   catch(e){if(alive){setLoaded(true);setUnavailable(true);setError(e instanceof Error?e.message:'Portal unavailable');}}
  }
  void initialize();
  const pop=()=>{const p=new URLSearchParams(window.location.search);setEn(p.get('lang')==='en');setView(deliveryId?'inbox':signalView(p.get('view')));setTab(signalTab(p.get('tab'),data?.deliveries.find(d=>d.id===deliveryId)));};
  window.addEventListener('popstate',pop);return()=>{alive=false;window.removeEventListener('popstate',pop);};
  // Each scoped route obtains a fresh authenticated projection; language changes are local.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[deliveryId]);
 async function flush(){return !busyRef.current&&(!notesGuard.current||await notesGuard.current());}
 async function go(url:string,replace=false){
  if(!await flush())return;
  setShare('');
  if(url.startsWith('/installers/enquiry/')||deliveryId){if(replace)router.replace(url);else router.push(url);return;}
  const target=new URL(url,window.location.origin);
  if(target.pathname!=='/installers'){window.location.assign(target.href);return;}
  setView(signalView(target.searchParams.get('view')));setTab(signalTab(target.searchParams.get('tab')));
  window.history[replace?'replaceState':'pushState']({},'',url);
  requestAnimationFrame(()=>document.getElementById('installer-page-title')?.focus());
 }
 const navigate=(next:SignalView)=>{void go('/installers?view='+next+'&lang='+(en?'en':'th'));};
 const changeLanguage=(english:boolean)=>{setEn(english);const url=new URL(window.location.href);url.searchParams.set('lang',english?'en':'th');window.history.replaceState({},'',url);};
 const selected=data?.deliveries.find(item=>item.id===deliveryId);
 useEffect(()=>{
  if(!routeReady||!data||data.company?.approvalStatus!=='approved'||view!=='inbox'||!window.matchMedia('(min-width:1000px)').matches)return;
  const first=sortedEnquiries(data.deliveries,tab,query,item=>deliveryLocation(item,en))[0];
  if(first&&(!deliveryId||selected&&signalTab(null,selected)!==tab)){const frame=requestAnimationFrame(()=>void go(enquiryHref(first,en,tab),true));return()=>cancelAnimationFrame(frame);}
  // A query filters the list without stealing focus or replacing the selected record on every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[routeReady,data,view,tab,deliveryId]);
 useEffect(()=>{requestAnimationFrame(()=>document.getElementById('installer-page-title')?.focus());},[view,deliveryId,loaded]);
 useEffect(()=>{
  const close=(e:Event)=>{for(const menu of document.querySelectorAll<HTMLDetailsElement>('.signal details.acct[open]'))if(e instanceof KeyboardEvent?e.key==='Escape':!menu.contains(e.target as Node)){menu.open=false;if(e instanceof KeyboardEvent)menu.querySelector<HTMLElement>('summary')?.focus();}};
  document.addEventListener('click',close,true);document.addEventListener('keydown',close);return()=>{document.removeEventListener('click',close,true);document.removeEventListener('keydown',close);};
 },[]);
 const action:InstallerAction=async(body)=>{
  const notes=body.action==='save-team-notes',key=identity.current,route=activeRoute.current;
  if(!notes&&busyRef.current)return {ok:false,message:t('กำลังดำเนินการ…','Working…')};
  if(body.action==='link-line')body={...body,linkRequest:lineRequest};
  if(body.action==='create-company'||body.action==='update-company')body={...body,supportedProducts:body.supportedProducts.map(v=>v.replaceAll('-','_'))};
  if(!notes){busyRef.current=true;setBusy(true);setMessage('');setError('');}
  try{
   const response=await fetch('/api/installer/portal?lang='+(en?'en':'th'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'same-origin'});
   const result=await response.json() as {error?:string;instructions?:string;shareUrl?:string;checkout?:Record<string,unknown>;orderId?:string;order?:{id:string};qrImageUrl?:string;checkoutUrl?:string;authorizationUrl?:string;url?:string};
   if(!response.ok){
    const message=portalErrorMessage(response.status,result.error,en);
    if(response.status===401){clearInstallerNotesDrafts();identity.current='';setData(null);setShare('');setQr(null);}
    if(!notes)setError(message);
    return {ok:false,message,status:response.status,code:result.error};
   }
   if(identity.current!==key||activeRoute.current!==route)return notes?{ok:true}:{ok:false,message:t('หน้าจอเปลี่ยนแล้ว โปรดตรวจสอบสถานะอีกครั้ง','The view changed. Check the current status again.')};
   if(notes){
    const savedBody=body;
    if(savedBody.action==='save-team-notes')setData(current=>current?{...current,deliveries:current.deliveries.map(d=>d.id===savedBody.deliveryId&&!d.withdrawn&&(d.notesRevision??0)<=savedBody.revision?{...d,teamNotes:savedBody.notes.trim(),notesRevision:savedBody.revision+1,notesUpdatedAt:new Date().toISOString()}:d)}:current);
    return {ok:true};
   }
   if(result.shareUrl||body.action==='rotate-share-link'&&result.url){setShare(result.shareUrl||result.url||'');setMessage(t('สร้างลิงก์แล้ว','Link created'));await load();return {ok:true};}
   if(body.action==='revoke-share-link'){setShare('');setMessage(t('เพิกถอนลิงก์แล้ว','Link revoked'));}
   if(result.checkout){await openHostedPayment(result.orderId||result.order?.id||'',result.checkout);return {ok:true};}
   const orderId=result.orderId||result.order?.id||('orderId' in body?body.orderId:'');
   if(result.qrImageUrl&&orderId){setQr({image:result.qrImageUrl,orderId});setView('credits');if(deliveryId)router.push('/installers?view=credits&lang='+(en?'en':'th'));else{const u=new URL(window.location.href);u.searchParams.set('view','credits');window.history.pushState({},'',u);}}
   const redirect=result.checkoutUrl||result.authorizationUrl||result.url;
   if(redirect){window.location.assign(redirect);return {ok:true};}
   if(body.action==='unlink-line'){setLineRequest(undefined);setMessage(t('ยกเลิกการเชื่อมต่อ LINE แล้ว ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้ ข้อความที่ส่งไปแล้วไม่สามารถเรียกคืนได้','LINE disconnected. Unsent notifications are retained for operator review. You can reconnect later. Messages already sent cannot be recalled.'));}
   else if(body.action==='set-accepting')setMessage(body.accepting?t('เปิดรับคำขอแล้ว','Accepting preference switched on.'):t('พักรับคำขอแล้ว','Enquiries paused.'));
   else if(body.action!=='revoke-share-link')setMessage(result.instructions||t('บันทึกแล้ว','Saved.'));
   if(body.action==='report-outcome'){const nextTab=signalTab(null,{...selected!,outcome:body.outcome,withdrawn:false});setTab(nextTab);const url=new URL(window.location.href);url.searchParams.set('tab',nextTab);window.history.replaceState({},'',url);}
   await load();return {ok:true};
  }catch(e){const message=e instanceof Error?e.message:t('เกิดข้อผิดพลาด','Something went wrong.');if(!notes)setError(message);return {ok:false,message};}
  finally{if(!notes){busyRef.current=false;setBusy(false);}}
 };
 async function openHostedPayment(orderId:string,checkout:Record<string,unknown>){
  if(!orderId||!checkout.publicKey)throw new Error(t('ข้อมูลชำระเงินไม่ครบ','Payment configuration is incomplete.'));
  const browser=window as unknown as {OmiseCard?:{configure:(o:Record<string,unknown>)=>void;open:(o:Record<string,unknown>)=>void}};
  if(!browser.OmiseCard)await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.omise.co/omise.js';script.async=true;script.onload=()=>resolve();script.onerror=()=>reject(new Error(t('โหลดหน้าชำระเงินไม่สำเร็จ','Unable to load the payment form.')));document.head.appendChild(script);});
  if(!browser.OmiseCard)throw new Error(t('หน้าชำระเงินยังไม่พร้อม','The payment form is unavailable.'));
  browser.OmiseCard.configure({publicKey:checkout.publicKey});
  browser.OmiseCard.open({...checkout,locale:en?'en':'th',onCreateTokenSuccess:(nonce:string)=>{void action({action:'authorize-payment',orderId,tokenOrSourceId:nonce});}});
 }
 async function authSubmit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busyRef.current||!publicConfig.accountsAvailable)return;busyRef.current=true;setBusy(true);setError('');setMessage('');
  const f=new FormData(event.currentTarget),email=String(f.get('email')||''),password=String(f.get('password')||'');
  const base=window.location.origin+(deliveryId?'/installers/enquiry/'+encodeURIComponent(deliveryId):'/installers')+'?lang='+(en?'en':'th')+'&view='+view+'&tab='+tab;
  const endpoint=authMode==='register'?'sign-up/email':authMode==='recovery'?'request-password-reset':authMode==='reset'?'reset-password':'sign-in/email';
  const body=authMode==='register'?{email,password,name:f.get('name'),callbackURL:base}:authMode==='recovery'?{email,redirectTo:base}:authMode==='reset'?{newPassword:password,token:new URLSearchParams(window.location.search).get('token')}:{email,password,rememberMe:true,callbackURL:base};
  try{const r=await fetch('/api/installer-auth/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(t('ไม่สามารถดำเนินการได้ ตรวจสอบข้อมูลและยืนยันอีเมลก่อนเข้าสู่ระบบ','Unable to continue. Check your details and verify your email before signing in.'));if(authMode==='login')await load();else{setMessage(t('ตรวจสอบอีเมลเพื่อดำเนินการต่อ หากบัญชีนี้มีอยู่ในระบบ','Check your email to continue if this account exists.'));setAuthSent(true);if(authMode==='reset'){setAuthMode('login');setAuthSent(false);window.history.replaceState({},'',base);}}}catch(e){setError(e instanceof Error?e.message:'Error');}finally{busyRef.current=false;setBusy(false);}
 }
 async function signOut(){
  if(!await flush())return;busyRef.current=true;setBusy(true);
  try{const r=await fetch('/api/installer-auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw new Error('sign_out_failed');loadSequence.current++;identity.current='';clearInstallerNotesDrafts();setData(null);setShare('');setQr(null);setLineRequest(undefined);setShowAuth(false);setMessage('');setError('');}
  catch{setError(t('ยังออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง','You are still signed in. Please try signing out again.'));}finally{busyRef.current=false;setBusy(false);}
 }
 const account=(cls='')=><details className={'acct '+cls}><summary aria-label={t('เมนูบัญชี','Account menu')}><span className="av" aria-hidden="true">{Array.from(data?.company?.name||data?.session.user.name||'—')[0]}</span></summary><div className="pop"><div className="who2"><b>{data?.company?.name||data?.session.user.name}</b><small>{data?.session.user.email}</small></div><div className="prow"><span>{t('ภาษา','Language')}</span><div className="lang" role="group" aria-label={t('ภาษา','Language')}><button type="button" aria-label="Switch to Thai" aria-pressed={!en} onClick={()=>changeLanguage(false)}>ไทย</button><button type="button" aria-label="Switch to English" aria-pressed={en} onClick={()=>changeLanguage(true)}>EN</button></div></div><a href={en?'/en':'/'} onClick={e=>{e.preventDefault();void go(en?'/en':'/');}}>{t('เว็บไซต์เจ้าของบ้าน','Homeowner site')}</a><button className="lnk2" disabled={busy} onClick={()=>void signOut()}>{t('ออกจากระบบ','Sign out')}</button></div></details>;
 const showAuthentication=(mode:typeof authMode)=>{setAuthMode(mode);setAuthSent(false);setShowAuth(true);requestAnimationFrame(()=>document.getElementById('installer-auth')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));};
 if(!loaded)return <div className="signal" lang={en?'en':'th'}><main className="signal-unavailable"><div className="card" role="status">{t('กำลังโหลดพอร์ทัล','Loading your workspace')}</div></main></div>;
 if(!data){
  if(unavailable&&publicConfig.accountsAvailable)return <div className="signal" lang={en?'en':'th'}><main className="signal-unavailable"><section className="card"><h1>{t('พอร์ทัลไม่พร้อมใช้งาน','The portal is temporarily unavailable')}</h1><p role="alert">{error}</p><button className="btn primary" disabled={busy} onClick={()=>void load().catch(e=>setError(String(e)))}>{t('ลองอีกครั้ง','Retry')}</button></section></main></div>;
  const auth=showAuth&&!unavailable?<section id="installer-auth" className="auth" aria-labelledby="auth-heading"><button type="button" className="x" aria-label={t('ปิด','Close')} onClick={()=>{setShowAuth(false);setAuthSent(false);}}><X className="i" aria-hidden="true"/></button>{authSent?<div className="sent"><Mail className="i" aria-hidden="true"/><h2 id="auth-heading">{t('ตรวจสอบอีเมลของคุณ','Check your email')}</h2><p className="muted" role="status">{displayMessage}</p><button type="button" className="btn ghost sm" onClick={()=>{setAuthMode('login');setAuthSent(false);}}>{t('กลับไปเข้าสู่ระบบ','Back to sign in')}</button></div>:<><h2 id="auth-heading">{authMode==='register'?t('สร้างบัญชี','Create account'):authMode==='recovery'?t('กู้คืนบัญชี','Recover account'):authMode==='reset'?t('ตั้งรหัสผ่านใหม่','Set a new password'):t('เข้าสู่ระบบ','Sign in')}</h2><form className="form" onSubmit={authSubmit}>{authMode==='register'&&<div className="field"><label htmlFor="auth-name">{t('ชื่อผู้ติดต่อ','Your name')}</label><input className="tx" id="auth-name" name="name" autoComplete="name" required maxLength={120}/></div>}{authMode!=='reset'&&<div className="field"><label htmlFor="auth-email">{t('อีเมล','Email')}</label><input className="tx" id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254}/></div>}{authMode!=='recovery'&&<div className="field"><label htmlFor="auth-password">{t('รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)','Password (at least 12 characters)')}</label><input className="tx" id="auth-password" name="password" type="password" minLength={12} maxLength={128} autoComplete={authMode==='login'?'current-password':'new-password'} required/></div>}<button className="btn primary lg" disabled={busy||!publicConfig.accountsAvailable}>{busy?t('กำลังดำเนินการ…','Working…'):t('ดำเนินการต่อ','Continue')}</button></form><div className="alt">{authMode==='recovery'||authMode==='reset'?<button disabled={busy} onClick={()=>{setAuthMode('login');setAuthSent(false);}}>{t('กลับไปเข้าสู่ระบบ','Back to sign in')}</button>:<><button disabled={busy} onClick={()=>{setAuthMode(authMode==='register'?'login':'register');setAuthSent(false);}}>{authMode==='register'?t('มีบัญชีแล้ว','Already have an account'):t('สร้างบัญชีบริษัท','Create a company account')}</button>{authMode==='login'&&<button disabled={busy} onClick={()=>{setAuthMode('recovery');setAuthSent(false);}}>{t('ลืมรหัสผ่าน','Forgot password')}</button>}</>}</div><p className="note">{t('ต้องยืนยันอีเมลก่อนใช้บัญชี บริษัทแต่ละแห่งจะได้รับการตรวจสอบก่อนเริ่มรับคำขอ ไม่มีการเรียกเก็บเงินอัตโนมัติหลังทดลอง','Verify your email before using your account. Companies are reviewed before receiving enquiries. The trial does not start automatic billing.')}</p>{error&&<p className="notice" role="alert">{error}</p>}</>}</section>:undefined;
  return <InstallerLanding en={en} setLanguage={changeLanguage} config={{...publicConfig,accountsAvailable:publicConfig.accountsAvailable&&!unavailable}} auth={auth} apply={()=>showAuthentication('register')} signIn={()=>showAuthentication('login')}/>;
 }
 const title={inbox:t('คำขอ','Enquiries'),credits:t('เครดิต','Credits'),profile:data.company?t('บริษัท','Company'):t('ตั้งค่าบริษัท','Set up your company'),claims:t('คำร้องคืนเครดิต','Credit claims'),terms:t('ข้อตกลงผู้ติดตั้ง','Installer terms')}[view];
 const notice=<SignalNotice data={data} en={en} view={view} navigate={navigate}/>;
 const listHead=<SignalListHead data={data} en={en} account={account()} busy={busy} onAccept={()=>void action({action:'set-accepting',accepting:!!data.company?.paused})}/>;
 const visible=sortedEnquiries(data.deliveries,tab,query,item=>deliveryLocation(item,en));
 const changeTab=(value:SignalTab)=>{void flush().then(ok=>{if(!ok)return;setTab(value);const url=new URL(window.location.href);url.searchParams.set('tab',value);window.history.pushState({},'',url);});};
 const inbox=view==='inbox',approved=data.company?.approvalStatus==='approved';
 return <div className="signal portal" lang={en?'en':'th'}><a className="sr skip" href="#installer-content">{t('ข้ามไปเนื้อหา','Skip to content')}</a><div className={'a-app'+(deliveryId?' detail-open':'')}><header className="a-rail"><a className="rail-logo" href={'/installers?lang='+(en?'en':'th')} aria-label="SolarMatch" onClick={e=>{e.preventDefault();navigate('inbox');}}><SignalLogo/></a><PortalNavigation view={view} en={en} count={approved?data.deliveries.filter(d=>enquiryGroup(d)==='new').length:0} navigate={navigate}/>{account('rail-acct')}</header><main className="a-main" id="installer-content">
  {error&&<div className="signal-error notice" role="alert">{error}</div>}
  {inbox?(approved?<div className="a-split"><PortalInbox data={data} en={en} tab={tab} query={query} setQuery={setQuery} setTab={changeTab} selectedId={deliveryId} now={viewTime} head={listHead} notice={notice} onOpen={url=>void go(url)}/>{deliveryId?(selected?<EnquiryDetail key={data.company!.id+':'+selected.id} item={selected} en={en} busy={busy} action={action} share={share} clearShare={()=>setShare('')} now={viewTime} companyId={data.company!.id} tab={tab} recipientLimit={data.commercial?.recipientLimit} claimSubmitted={data.claims.some(c=>c.deliveryId===selected.id)} emailVerified={data.session.user.emailVerified} canManage={data.availability?.canManage!==false} registerNotesGuard={registerNotesGuard}/>:<section className="a-detail"><div className="card"><h1 id="installer-page-title" tabIndex={-1}>{t('ไม่พบคำขอในบัญชีบริษัทนี้','This enquiry is not available to your company.')}</h1></div></section>):<div className="dempty"><Inbox className="i" aria-hidden="true"/><p>{visible.length?t('เลือกคำขอเพื่อดูรายละเอียด','Choose an enquiry to see the details.'):emptyEnquiries(data,en,tab,query)}</p></div>}</div>:<div className="a-page">{listHead}{notice}<SignalSetup data={data} en={en} navigate={navigate}/></div>):<div className="a-page">{['claims','terms'].includes(view)&&<a className="crumb" href={'/installers?view=profile&lang='+(en?'en':'th')} onClick={e=>{e.preventDefault();navigate('profile');}}>← {t('บริษัท','Company')}</a>}<div className="phead"><h1 id="installer-page-title" tabIndex={-1}>{title}</h1>{account('end')}</div>{notice}
   {view==='profile'&&<InstallerCompanySettings key={data.company?.id||'new'} data={data} en={en} busy={busy||!data.session.user.emailVerified||!!data.company&&data.availability?.canManage===false} action={action} navigate={navigate}/>}
   {view==='credits'&&<InstallerCredits data={data} en={en} busy={busy} action={action} qrImage={qr?.image} qrOrderId={qr?.orderId}/>}
   {view==='claims'&&<section className="card"><p className="muted">{data.commercial?(en?'Submit from an enquiry page within '+data.commercial.claimDays+' days of portal availability. Credit restoration is separate from a cash refund.':'ยื่นคำร้องจากหน้าคำขอภายใน '+data.commercial.claimDays+' วันนับจากพร้อมใช้ในพอร์ทัล การคืนเครดิตแยกจากการคืนเงินสด'):t('ยื่นคำร้องจากหน้าคำขอภายใน 7 วันนับจากพร้อมใช้ในพอร์ทัล การคืนเครดิตแยกจากการคืนเงินสด','Submit from an enquiry page within seven days of portal availability. Credit restoration is separate from a cash refund.')}</p><div className="clist">{!data.claims.length&&<p>{t('ยังไม่มีคำร้อง','No claims yet.')}</p>}{data.claims.map(c=><div key={c.id}><span><b>{statusLabel(c.reason,en)}</b><small>{data.deliveries.find(d=>d.id===c.deliveryId)?.reference||'—'} · {statusLabel(c.status,en)} · {date(c.submittedAt,en)}</small>{c.decision&&<p>{c.decision}</p>}</span>{data.deliveries.some(d=>d.id===c.deliveryId)&&<a className="lnk" href={'/installers/enquiry/'+c.deliveryId+'?lang='+(en?'en':'th')+'&tab=closed'}>{t('เปิดคำขอ','Open enquiry')}</a>}</div>)}</div></section>}
   {view==='terms'&&<section className="card"><p className="muted sm">{data.terms.version}</p><div className="terms-text" style={{whiteSpace:'pre-wrap'}}>{en?data.terms.textEn:data.terms.textTh}</div>{data.terms.acceptedAt?<p className="pill ok">{t('ยอมรับเมื่อ','Accepted')}: {date(data.terms.acceptedAt,en)}</p>:<button disabled={busy||!data.company||!data.session.user.emailVerified||data.availability?.canManage===false} className="btn primary" onClick={()=>void action({action:'accept-terms',version:data.terms.version})}>{t('ยอมรับข้อตกลงฉบับนี้','Accept these terms')}</button>}<div className="fine2"><p>{t('SolarMatch ให้ข้อมูลประเมินเบื้องต้น ผู้ติดตั้งเป็นผู้เสนอราคา ทำสัญญา และรับประกันงาน','SolarMatch provides a preliminary assessment. The installer provides the quotation, contract and warranties.')}</p><p>{t('เวลาที่แสดงเป็นเวลาประเทศไทย','All times are Bangkok time')}</p></div></section>}
  </div>}
 </main><PortalNavigation mobile view={view} en={en} count={approved?data.deliveries.filter(d=>enquiryGroup(d)==='new').length:0} navigate={navigate}/></div>{message&&<div className="toast show" role="status">{displayMessage}</div>}</div>;
}
function date(value: string, en: boolean) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString(en ? 'en-GB' : 'th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }); }
function statusLabel(value: string, en: boolean) {
  if (value === 'withdrawn-claim') return en ? 'Claim for withdrawn enquiry — personal details hidden' : 'คำร้องสำหรับคำขอที่ถอนแล้ว — ไม่แสดงข้อมูลส่วนบุคคล';
  if (['shared-residential', 'shared_residential'].includes(value)) return sharedResidentialLabel(en);
  value = value.replaceAll('_', '-');
  if (value === 'action-required') return en ? 'Operator action required' : 'ต้องให้ผู้ดูแลดำเนินการ';
  const extra: Record<string, [string, string]> = { submitted: ['ส่งคำร้องแล้ว', 'Submitted'], 'needs-information': ['ต้องการข้อมูลเพิ่มเติม', 'More information needed'], authorizing: ['กำลังอนุมัติการชำระเงิน', 'Authorizing payment'], reversed: ['ยกเลิกยอดชำระแล้ว', 'Payment reversed'], 'trial-grant': ['ได้รับสิทธิ์ทดลอง', 'Trial allowance granted'], 'claim-restoration': ['คืนเครดิตตามคำร้อง', 'Claim credit restoration'], 'payment-reversal': ['หักเครดิตจากการคืนเงิน', 'Payment credit reversal'], reservation: ['สำรองเครดิต', 'Credit reservation'], release: ['คืนเครดิตที่สำรอง', 'Reserved credits released'] };
  if (extra[value]) return extra[value][en ? 1 : 0];
  const outcomes: Record<string, [string, string]> = { open: ['อยู่ระหว่างดำเนินการ', 'In progress'], won: ['ตกลงซื้อ', 'Sale agreed'], lost: ['ไม่ได้งาน', 'Not won'], 'not-suitable': ['ไม่เหมาะสม', 'Not suitable'] };
  if (outcomes[value]) return outcomes[value][en ? 1 : 0];
  const labels: Record<string, [string, string]> = { approved: ['อนุมัติแล้ว', 'Approved'], pending: ['รอตรวจสอบ', 'Pending'], rejected: ['ไม่อนุมัติ', 'Rejected'], paid: ['ชำระแล้ว', 'Paid'], failed: ['ไม่สำเร็จ', 'Failed'], cancelled: ['ยกเลิก', 'Cancelled'], refunded: ['คืนเงินแล้ว', 'Refunded'], 'shared-residential': ['คำขอที่อยู่อาศัยแบบแชร์', 'Shared residential'], 'incorrect-contact': ['ข้อมูลติดต่อไม่ถูกต้อง', 'Incorrect contact details'], duplicate: ['คำขอซ้ำ', 'Duplicate'], 'outside-criteria': ['นอกเกณฑ์ที่ตกลง', 'Outside agreed criteria'], 'no-request': ['ไม่ได้ขอให้ติดต่อ', 'No contact request'], withdrawn: ['ไม่ต้องการใบเสนอราคาแล้ว', 'No longer wants quotes'], contacted: ['ติดต่อแล้ว', 'Contacted'], quoted: ['เสนอราคาแล้ว', 'Quoted'], won: ['ตกลงซื้อ', 'Sale agreed'], 'not-interested': ['ไม่สนใจ', 'Not interested'], unreachable: ['ยังติดต่อไม่ได้', 'Unreachable'], restored: ['คืนเครดิตแล้ว', 'Credits restored'], purchase: ['ซื้อเครดิต', 'Credit purchase'], delivery: ['รับคำขอ', 'Enquiry delivery'], restoration: ['คืนเครดิต', 'Credit restoration'] };
  return labels[value]?.[en ? 1 : 0] || (en ? value.replaceAll('-', ' ').replaceAll('_', ' ') : value);
}
function portalErrorMessage(status:number,code:string|undefined,en:boolean) {
  if(status===409&&code==='notes_changed_or_unavailable')return en?'The note changed elsewhere or the enquiry is unavailable. Your edit is still here; reload before replacing a newer note.':'โน้ตถูกแก้ไขจากที่อื่นหรือคำขอไม่พร้อมใช้งาน ข้อความที่คุณแก้ยังอยู่ โปรดโหลดใหม่ก่อนแทนที่โน้ตฉบับใหม่';
  if(status===429)return en?'Too many attempts. Please wait a moment and try again.':'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if(status===401)return en?'Please sign in with a verified email account to continue.':'กรุณาเข้าสู่ระบบด้วยบัญชีที่ยืนยันอีเมลแล้ว';
  if(status===403)return en?'Only the company account owner can make this change.':'เฉพาะเจ้าของบัญชีบริษัทเท่านั้นที่ทำรายการนี้ได้';
  if(code==='claim_window_closed')return en?'The claim submission window has closed for this enquiry.':'พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว';
  if(status>=500)return en?'The service is temporarily unavailable. Please try again later.':'ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
  return en?'Unable to complete this request. Check the company status, details and accepted terms, then try again.':'ทำรายการไม่สำเร็จ กรุณาตรวจสอบสถานะบริษัท ข้อมูล และการยอมรับข้อตกลง แล้วลองใหม่';
}
