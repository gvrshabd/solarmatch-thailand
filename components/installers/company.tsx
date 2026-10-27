'use client';
import { useId, useState } from 'react';
import { Check, ChevronRight, MessageCircle } from 'lucide-react';
import { initialLaunchProvinces, localizedProvinceOptions } from '@/config/provinces';
import type { InstallerPortalData } from '@/lib/installer/portal-contract';
import type { InstallerAction } from './action-result';

export type CompanyDraft = { name:string; contactName:string; phone:string; areas:string[]; limit:number };
type EditorState = { base:CompanyDraft; draft:CompanyDraft; serverKey:string };
const same = (a:unknown,b:unknown) => JSON.stringify(a)===JSON.stringify(b);
export function companyDraft(data:InstallerPortalData):CompanyDraft {
  return { name:data.company?.name||'', contactName:data.company?.contactName||data.session.user.name, phone:data.company?.phone||'', areas:data.company?.serviceAreas||[], limit:data.company?.dailyLimit??2 };
}
/** Refresh untouched fields without replacing changes still being edited. */
export function mergeCompanyDraft(draft:CompanyDraft,base:CompanyDraft,server:CompanyDraft):CompanyDraft {
  return {name:draft.name===base.name?server.name:draft.name,contactName:draft.contactName===base.contactName?server.contactName:draft.contactName,phone:draft.phone===base.phone?server.phone:draft.phone,areas:same(draft.areas,base.areas)?server.areas:draft.areas,limit:draft.limit===base.limit?server.limit:draft.limit};
}

export function InstallerCompanySettings({data,en,busy,action,navigate}:{data:InstallerPortalData;en:boolean;busy:boolean;action:InstallerAction;navigate:(view:'claims'|'terms')=>void}) {
  // Signal Thai copy is a draft and needs native review.
  const c=data.company, t=(th:string,english:string)=>en?english:th, id=useId();
  const server=companyDraft(data), serverKey=JSON.stringify(server);
  const [editor,setEditor]=useState<EditorState>(()=>({base:server,draft:server,serverKey}));
  const [extra,setExtra]=useState('');
  const [lineAsk,setLineAsk]=useState(false);
  const [saving,setSaving]=useState(false);
  if(editor.serverKey!==serverKey) setEditor({base:server,draft:mergeCompanyDraft(editor.draft,editor.base,server),serverKey});
  const draft=editor.draft;
  const dirty=!same(draft,editor.base);
  const locked=busy||saving||!data.session.user.emailVerified||(!!c&&data.availability?.canManage===false);
  const labels=localizedProvinceOptions(en?'en':'th');
  const extras=draft.areas.filter(area=>!initialLaunchProvinces.some(p=>p.value===area));
  const edit=(patch:Partial<CompanyDraft>)=>setEditor(current=>({...current,draft:{...current.draft,...patch}}));
  const toggle=(area:string)=>edit({areas:draft.areas.includes(area)?draft.areas.filter(v=>v!==area):[...draft.areas,area]});
  const accepted=!!data.terms.acceptedAt&&c?.termsAcceptedVersion===data.terms.version;
  const acceptedDate=data.terms.acceptedAt?new Date(data.terms.acceptedAt).toLocaleDateString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short'}):'';
  const link=(view:'claims'|'terms')=>'/installers?view='+view+'&lang='+(en?'en':'th');
  return <form onSubmit={async event=>{
    event.preventDefault();
    if(locked||!draft.areas.length||(!dirty&&c)) return;
    const submitted={...draft,areas:[...draft.areas]};
    setSaving(true);
    try {
      const result=await action({action:c?'update-company':'create-company',name:submitted.name,contactName:submitted.contactName,phone:submitted.phone,serviceAreas:submitted.areas,supportedProducts:c?.supportedProducts.length?c.supportedProducts:['shared_residential'],dailyLimit:submitted.limit,paused:c?.paused??true});
      // An acknowledgement saves this snapshot only; edits made while awaiting it survive.
      if(result.ok) setEditor(current=>({...current,base:submitted}));
    } finally { setSaving(false); }
  }}>
    <div className="a-co">
      <section className="card">
        <div className="sethead"><h2 className="h3">{t('พื้นที่บริการ','Service areas')}</h2><span className="muted num">{t('เลือก '+draft.areas.length,draft.areas.length+' selected')}</span></div>
        <div className="agrid">{initialLaunchProvinces.map(p=><button type="button" className="atile" key={p.value} aria-pressed={draft.areas.includes(p.value)} disabled={locked||(!draft.areas.includes(p.value)&&draft.areas.length>=100)} onClick={()=>toggle(p.value)}>{draft.areas.includes(p.value)&&<Check className="i" aria-hidden="true"/>}<span>{en?p.en:p.th}</span></button>)}{extras.map(area=>{const label=labels.find(p=>p.value===area)?.label||area;return <button type="button" className="atile" key={area} aria-pressed="true" aria-label={t('ลบ '+label,'Remove '+label)} disabled={locked} onClick={()=>toggle(area)}><Check className="i" aria-hidden="true"/><span>{label}</span><span className="rm" aria-hidden="true">×</span></button>;})}</div>
        <details className="disc extra"><summary>{t('เพิ่มจังหวัดหรือพื้นที่อื่น','Add another province or area')}</summary><div className="row2"><label className="sr" htmlFor={id+'-area'}>{t('เพิ่มจังหวัดหรือพื้นที่อื่น','Add another province or area')}</label><input id={id+'-area'} className="tx" maxLength={100} value={extra} disabled={locked} onChange={event=>setExtra(event.target.value)} placeholder={t('ระบุจังหวัดหรือพื้นที่','Province or area')}/><button type="button" className="btn soft" disabled={locked||!extra.trim()||draft.areas.length>=100} onClick={()=>{edit({areas:[...new Set([...draft.areas,extra.trim()])]});setExtra('');}}>{t('เพิ่ม','Add')}</button></div></details>
        {!draft.areas.length&&<p className="note" role="status">{t('เลือกอย่างน้อยหนึ่งพื้นที่','Choose at least one area')}</p>}
      </section>
      <section className="card"><div className="setrow"><h2 className="h3">{t('จำนวนคำขอต่อวัน','Enquiries per day')}</h2><div className="stepper"><button type="button" aria-label={t('ลดจำนวนคำขอต่อวัน','Fewer enquiries per day')} disabled={locked||draft.limit<=0} onClick={()=>edit({limit:Math.max(0,draft.limit-1)})}>−</button><output aria-live="polite" aria-label={t('จำนวนคำขอต่อวัน','Enquiries per day')}>{draft.limit}</output><button type="button" aria-label={t('เพิ่มจำนวนคำขอต่อวัน','More enquiries per day')} disabled={locked||draft.limit>=100} onClick={()=>edit({limit:Math.min(100,draft.limit+1)})}>+</button></div></div>{draft.limit===0&&<p className="note">{t('0 หมายถึงไม่รับคำขอใหม่','0 pauses new deliveries.')}</p>}</section>
      <section className="card"><div className="setrow"><div><h2 className="h3">{t('การแจ้งเตือน LINE','LINE alerts')}</h2><p className="muted sm">{t('รับคำขอใหม่ใน LINE ทันที','New enquiries in LINE, straight away.')}</p></div>{c?.lineLinked?<span className="pill ok"><Check className="i" aria-hidden="true"/>{t('เชื่อมต่อแล้ว','Connected')}</span>:c?.approvalStatus==='approved'?<button type="button" className="btn primary sm" disabled={locked||!data.integrations.lineConfigured} onClick={()=>void action({action:'link-line'})}><MessageCircle className="i" aria-hidden="true"/>{t('เชื่อมต่อ','Connect')}</button>:<span className="note">{t('ใช้ได้หลังได้รับอนุมัติ','Available after approval.')}</span>}</div>
        {c?.lineLinked&&(lineAsk?<div className="in2"><p className="disc-note">{t('การยกเลิกจะหยุดการแจ้งเตือนใหม่ผ่าน LINE และยกเลิกลิงก์เชื่อมต่อที่รอดำเนินการ ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้','Disconnecting stops new LINE notifications and invalidates pending link invitations. Unsent notifications remain for operator review. You can reconnect later.')}</p><div className="btnrow"><button type="button" className="btn ghost sm" disabled={locked} onClick={async()=>{const result=await action({action:'unlink-line'});if(result.ok)setLineAsk(false);}}>{t('ยกเลิกการเชื่อมต่อ LINE','Disconnect LINE')}</button><button type="button" className="btn soft sm" disabled={locked} onClick={()=>setLineAsk(false)}>{t('ยกเลิก','Cancel')}</button></div></div>:<button type="button" className="tlink" disabled={locked} onClick={()=>setLineAsk(true)}>{t('ยกเลิกการเชื่อมต่อ','Disconnect')}</button>)}
      </section>
      <section className="card form"><h2 className="h3">{t('ข้อมูลบริษัท','Company details')}</h2>
        <div className="field"><label htmlFor={id+'-name'}>{t('ชื่อบริษัท','Company name')}</label><input id={id+'-name'} className="tx" name="name" value={draft.name} required minLength={2} maxLength={160} disabled={locked} onChange={event=>edit({name:event.target.value})}/></div>
        <div className="field"><label htmlFor={id+'-contact'}>{t('ชื่อผู้ติดต่อ','Contact name')}</label><input id={id+'-contact'} className="tx" name="contactName" value={draft.contactName} required maxLength={120} disabled={locked} onChange={event=>edit({contactName:event.target.value})}/></div>
        <div className="field"><label htmlFor={id+'-phone'}>{t('โทรศัพท์บริษัท','Company phone')}</label><input id={id+'-phone'} className="tx" name="phone" type="tel" value={draft.phone} required maxLength={40} disabled={locked} onChange={event=>edit({phone:event.target.value})}/></div>
        {!c&&<button className="btn primary" disabled={locked||!draft.areas.length}>{t('สร้างบริษัท','Create company')}</button>}
      </section>
      {c&&<div className="card lnks"><a href={link('claims')} onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate('claims');}}}><span>{t('คำร้องคืนเครดิต','Credit claims')}</span><span className="r2">{data.claims.length}<ChevronRight className="i" aria-hidden="true"/></span></a><a href={link('terms')} onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate('terms');}}}><span>{t('ข้อตกลงผู้ติดตั้ง','Installer terms')}</span><span className="r2">{accepted?t('ยอมรับเมื่อ '+acceptedDate,'Accepted '+acceptedDate):<span className="pill st-new">{t('ต้องดำเนินการ','Action needed')}</span>}<ChevronRight className="i" aria-hidden="true"/></span></a></div>}
    </div>
    {c&&dirty&&<div className="savebar" role="status"><span>{t('ยังไม่ได้บันทึก','Unsaved changes')}</span><button className="btn primary sm" disabled={locked||!draft.areas.length}>{t('บันทึกการเปลี่ยนแปลง','Save changes')}</button></div>}
  </form>;
}
