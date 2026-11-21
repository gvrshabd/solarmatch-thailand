import { describe, expect, it } from 'vitest';
import { calendarFile, textTemplate, visitDays } from '@/components/installers/next-step-helpers';

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
});
