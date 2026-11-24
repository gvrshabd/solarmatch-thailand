import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendarFile, callKey, clearPendingCall, khun, localizedDate, nameGap, pendingCall, savePendingCall, textTemplate, visitDays } from '@/components/installers/next-step-helpers';
import { isStoreApp } from '@/components/installers/store-app';

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return { get length() { return items.size; }, clear: () => items.clear(), key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null, setItem: (key, value) => { items.set(key, String(value)); }, removeItem: key => { items.delete(key); } };
}

describe('installer visit and contact handoffs', () => {
  it('offers five days from Bangkok midnight and preserves older booked dates when editing', () => {
    const now = Date.parse('2026-11-21T17:15:00Z');
    expect(visitDays(now)).toEqual(['2026-11-22','2026-11-23','2026-11-24','2026-11-25','2026-11-26']);
    expect(visitDays(now, '2026-11-20T03:00:00Z').at(-1)).toBe('2026-11-20');
    expect(visitDays(now, '2026-11-23T03:00:00Z')).toHaveLength(5);
  });
  it('exports a portable one-hour appointment without putting contact details in calendars', () => {
    const file = calendarFile('2026-11-22T10:00:00+07:00','synthetic-delivery',true,0);
    expect(file).toContain('DTSTART:20261122T030000Z\r\nDTEND:20261122T040000Z');
    expect(file).toContain('UID:synthetic-delivery@installers.solarmatch');
    expect(file).toContain('SUMMARY:SolarMatch site visit');
    expect(file).not.toMatch(/PHONE|ATTENDEE|ORGANIZER|URL:/);
    expect(file).toMatch(/END:VCALENDAR\r\n$/);
  });
  it('uses the missed-call message only after an attempt in both languages', () => {
    expect(textTemplate('ชื่อ','บริษัท',true,false)).toContain('สะดวกคุยช่วงไหน');
    expect(textTemplate('ชื่อ','บริษัท',false,false)).toContain('จะโทรหาคุณ');
    expect(textTemplate('Name','Company',false,true)).toContain('will call you shortly');
    expect(textTemplate('Name','Company',true,true)).toContain('tried to call you');
  });
  it('joins คุณ to Thai names and spaces it before other scripts', () => {
    expect(khun('กัญญา')).toBe('คุณกัญญา');
    expect(khun('Arun')).toBe('คุณ Arun');
    expect(nameGap('กัญญา')).toBe('');
    expect(nameGap('Arun')).toBe(' ');
  });
  it('keeps a Latin homeowner name apart from the company in the Thai text', () => {
    expect(textTemplate('Arun','Sun Co',true,false)).toMatch(/^สวัสดีคุณ Arun ทาง Sun Co ได้รับ/);
    expect(textTemplate('กัญญา','บริษัท ก',false,false)).toMatch(/^สวัสดีคุณกัญญา ทาง บริษัท ก ได้รับ/);
  });
  it('writes dates in Thailand time without the year', () => {
    expect(localizedDate('2026-11-24T17:30:00Z', true)).toBe('Wed 25 Nov');
    expect(localizedDate('2026-11-24T17:30:00Z', false)).toContain('25');
  });
  it('recognises only the store app shells', () => {
    expect(isStoreApp('Mozilla/5.0 (Linux; Android 15) Chrome/131 Mobile Safari/537.36 SolarMatchInstallers/Android')).toBe(true);
    expect(isStoreApp('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 SolarMatchInstallers/iOS')).toBe(true);
    expect(isStoreApp('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isStoreApp('')).toBe(false);
  });
});

describe('the pending call survives the app being closed by the phone', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('keeps only the opaque delivery and start time, in local storage, for thirty minutes', () => {
    const local = memoryStorage(), session = memoryStorage();
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });
    const start = Date.parse('2026-11-24T03:00:00Z');
    savePendingCall('delivery-1', start);
    expect(JSON.parse(local.getItem(callKey)!)).toEqual({ deliveryId: 'delivery-1', startedAt: start });
    expect(session.getItem(callKey)).toBeNull();
    expect(pendingCall('delivery-1', start + 29 * 60000)).toEqual({ remaining: 60000 });
    expect(pendingCall('delivery-2', start + 60000)).toBeNull();
    expect(pendingCall('delivery-1', start + 31 * 60000)).toBe('expired');
    expect(local.getItem(callKey)).toBeNull();
    expect(pendingCall('delivery-1', start + 32 * 60000)).toBeNull();
  });
  it('falls back to session storage, discards malformed entries and clears both stores', () => {
    const session = memoryStorage();
    vi.stubGlobal('window', { get localStorage(): Storage { throw new Error('blocked'); }, sessionStorage: session });
    savePendingCall('delivery-1', 1000);
    expect(pendingCall('delivery-1', 2000)).toEqual({ remaining: 30 * 60000 - 1000 });
    session.setItem(callKey, '{not json');
    expect(pendingCall('delivery-1', 2000)).toBeNull();
    expect(session.getItem(callKey)).toBeNull();
    savePendingCall('delivery-1', 1000);
    clearPendingCall();
    expect(session.getItem(callKey)).toBeNull();
  });
  it('keeps working with no storage at all', () => {
    vi.stubGlobal('window', {});
    expect(() => savePendingCall('delivery-1')).not.toThrow();
    expect(pendingCall('delivery-1')).toBeNull();
    expect(() => clearPendingCall()).not.toThrow();
  });
});
