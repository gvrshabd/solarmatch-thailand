export type InstallerLanguage = 'th' | 'en';
export type InstallerCompany = {
  id: string; name: string; approvalStatus: string; contactName: string; phone: string;
  serviceAreas: string[]; supportedProducts: string[]; dailyLimit: number; paused: boolean;
  lineLinked: boolean; termsAcceptedVersion: string | null;
};
export type InstallerDelivery = {
  id: string; enquiryId: string; reference: string; product: string; fundingSource: string;
  creditCost: number; deliveredAt: string; notificationStatus: string; claimDeadline: string;
  withdrawn: boolean;
  homeownerName: string; phone: string; location: string; requestedAt: string;
  province?: string; district?: string; customArea?: string;
  teamNotes?: string; notesRevision?: number; notesUpdatedAt?: string | null;
  assessment: Record<string, unknown>; qualification: string; outcome: string | null;
};
export type InstallerPortalData = {
  session: { user: { id: string; name: string; email: string; emailVerified: boolean } };
  company: InstallerCompany | null;
  products: { id: string; nameTh: string; nameEn: string; creditCost: number; enabled: boolean }[];
  packages: { id: string; nameTh: string; nameEn: string; credits: number; amountMinor: number; currency: string; taxLabel: string }[];
  balance: { available: number; reserved: number; trialRemaining: number; debt: number };
  deliveries: InstallerDelivery[];
  orders: { id: string; status: string; amountMinor: number; currency: string; credits: number; createdAt: string; refundedMinor?:number; reversedCredits?:number; receiptReference: string | null }[];
  ledger: { id: string; kind: string; units: number; sourceId?:string|null; availableDelta?:number; reservedDelta?:number; trialDelta?:number; debtDelta?:number; reason: string; createdAt: string }[];
  claims: { id: string; deliveryId: string; reason: string; status: string; submittedAt: string; decision: string | null }[];
  terms: { version: string; textTh: string; textEn: string; acceptedAt: string | null };
  integrations: { paymentsEnabled: boolean; paymentMethods: string[]; lineConfigured: boolean; mode: string };
  availability?: { platformPaused: boolean; allocationPaused: boolean; notificationsEnabled: boolean; canManage: boolean };
  commercial?: { creditValueMinor:number; sharedCredits:number; claimDays:number; trialDeliveries:number; recipientLimit:number };
};
export type InstallerPortalAction =
  | { action: 'create-company' | 'update-company'; name: string; contactName: string; phone: string; serviceAreas: string[]; supportedProducts: string[]; dailyLimit: number; paused: boolean }
  | { action: 'set-accepting'; accepting: boolean }
  | { action: 'accept-terms'; version: string }
  | { action: 'checkout'; packageId: string; method: string; token?: string }
  | { action: 'reconcile-order'; orderId: string }
  | { action: 'authorize-payment'; orderId: string; tokenOrSourceId: string }
  | { action: 'create-claim'; deliveryId: string; reason: string; notes: string }
  | { action: 'rotate-share-link' | 'revoke-share-link'; deliveryId: string }
  | { action: 'report-outcome'; deliveryId: string; outcome: string }
  | { action: 'save-team-notes'; deliveryId: string; notes: string; revision: number }
  | { action: 'link-line'; linkRequest?: string }
  | { action: 'unlink-line' };
