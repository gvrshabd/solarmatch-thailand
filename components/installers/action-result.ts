import type {InstallerPortalAction} from '@/lib/installer/portal-contract';

/** Client acknowledgement only; existing authenticated HTTP contracts are unchanged. */
export type InstallerActionResult = {ok:true} | {ok:false;message:string;status?:number;code?:string};
export type InstallerAction = (body:InstallerPortalAction)=>Promise<InstallerActionResult>;
export type NotesNavigationGuard = () => Promise<boolean>;
