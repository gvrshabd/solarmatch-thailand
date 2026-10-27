import type {InstallerDelivery,InstallerPortalData} from '@/lib/installer/portal-contract';
export type SignalView='inbox'|'credits'|'profile'|'claims'|'terms';
export type SignalTab='waiting'|'active'|'closed';
export const signalView=(value:string|null):SignalView=>['credits','profile','claims','terms'].includes(value??'')?value as SignalView:'inbox';
export function signalGroup(item:InstallerDelivery):SignalTab {
 if(item.withdrawn||['won','lost','not-suitable','not-interested'].includes(item.outcome??''))return 'closed';
 return !item.outcome||['open','not-recorded'].includes(item.outcome)?'waiting':'active';
}
export function signalTab(value:string|null,item?:InstallerDelivery):SignalTab {return ['waiting','active','closed'].includes(value??'')?value as SignalTab:item?signalGroup(item):'waiting';}
export function sortedEnquiries(items:InstallerDelivery[],tab:SignalTab,query='',area:(item:InstallerDelivery)=>string=()=> '') {
 const search=query.trim().toLocaleLowerCase();
 return items.filter(item=>signalGroup(item)===tab&&(item.withdrawn?item.reference:`${item.homeownerName} ${area(item)} ${item.reference}`).toLocaleLowerCase().includes(search)).sort((a,b)=>{const at=Date.parse(a.deliveredAt),bt=Date.parse(b.deliveredAt);const delta=(Number.isFinite(at)?at:0)-(Number.isFinite(bt)?bt:0);return (tab==='waiting'?delta:-delta)||a.id.localeCompare(b.id);});
}
export type SignalWarning={kind:'verify'|'terms'|'platform'|'debt'|'empty';target?:SignalView;info?:boolean};
export function signalWarning(data:InstallerPortalData):SignalWarning|null {
 if(!data.session.user.emailVerified)return {kind:'verify'};
 if(!data.company||data.company.approvalStatus!=='approved')return null;
 if(!data.terms.acceptedAt||data.company.termsAcceptedVersion!==data.terms.version)return {kind:'terms',target:'terms'};
 if(data.availability?.platformPaused||data.availability?.allocationPaused)return {kind:'platform',info:true};
 if(data.balance.debt>0)return {kind:'debt',target:'credits'};
 if(!data.commercial||data.balance.available<data.commercial.sharedCredits&&data.balance.trialRemaining<=0)return {kind:'empty',target:'credits'};
 return null;
}
/** A receiving preference does not establish effective eligibility. New Thai requires native review. */
export function signalCompanyStatus(data:InstallerPortalData,en:boolean) {
 const c=data.company;
 if(!c)return {dot:'off',text:en?'Set up company':'ตั้งค่าบริษัท'};
 if(c.approvalStatus!=='approved')return {dot:'amber',text:c.approvalStatus==='pending'?(en?'Under review':'รอตรวจสอบ'):c.approvalStatus==='rejected'?(en?'Not approved':'ไม่อนุมัติ'):c.approvalStatus==='suspended'?(en?'Suspended':'ระงับการใช้งาน'):c.approvalStatus};
 if(data.availability?.platformPaused||data.availability?.allocationPaused)return {dot:'off',text:en?'Paused by SolarMatch':'SolarMatch พักการส่งคำขอ'};
 if(c.paused)return {dot:'off',text:en?'Paused':'พักรับคำขอ'};
 if(!data.session.user.emailVerified||!data.terms.acceptedAt||c.termsAcceptedVersion!==data.terms.version||data.availability?.canManage===false||data.balance.debt>0||!data.commercial||data.balance.available<data.commercial.sharedCredits&&data.balance.trialRemaining<=0||c.dailyLimit<=0||!c.serviceAreas.length)return {dot:'off',text:en?'Accepting preference on · action needed':'ตั้งค่ารับคำขอแล้ว · มีรายการที่ต้องดำเนินการ'};
 return {dot:'',text:en?'Accepting enquiries':'กำลังรับคำขอ'};
}
