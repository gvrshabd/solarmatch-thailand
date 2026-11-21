'use client';

import { useState } from 'react';
import { closeReasons, visitDays } from './next-step-helpers';

type FormProps = { en: boolean; disabled: boolean; onCancel: () => void };
export type CloseReason = typeof closeReasons[number][0];

export function VisitForm({ en, disabled, onCancel, saved, now, onSave, onQuote, onClose }: FormProps & {
  saved?: string | null; now: number; onSave: (when: string) => void; onQuote: () => void; onClose: () => void;
}) {
  const [days] = useState(() => visitDays(now || Date.now(), saved));
  const savedLocal = saved && new Date(Date.parse(saved) + 7 * 3600000).toISOString();
  const [day, setDay] = useState(savedLocal ? savedLocal.slice(0, 10) : days[1]);
  const [time, setTime] = useState(savedLocal ? savedLocal.slice(11, 16) : '10:00');
  const times = Array.from({length: 21}, (_, i) => String(8 + Math.floor(i / 2)).padStart(2, '0') + (i % 2 ? ':30' : ':00'));
  if (!times.includes(time)) times.push(time);
  const fmt = new Intl.DateTimeFormat(en ? 'en-GB' : 'th-TH', {month: 'short', timeZone:'UTC'});
  const weekday = new Intl.DateTimeFormat(en ? 'en-GB' : 'th-TH', {weekday:'short', timeZone:'UTC'});
  return <form className="ns-form" onSubmit={e => { e.preventDefault(); onSave(new Date(day + 'T' + time + ':00+07:00').toISOString()); }}>
    <fieldset disabled={disabled}><legend>{en ? 'Visit day' : 'วันนัดสำรวจ'}</legend><div className="ns-days">
      {days.map((value, i) => { const date = new Date(value + 'T12:00:00Z'); return <label key={value}>
        <input type="radio" name="visit-day" value={value} checked={day === value} onChange={() => setDay(value)} />
        <span>{i === 0 ? (en ? 'Today' : 'วันนี้') : weekday.format(date)}<b>{date.getUTCDate()}</b>{fmt.format(date)}</span>
      </label>; })}
    </div></fieldset>
    <label className="ns-field">{en ? 'Time in Thailand' : 'เวลาประเทศไทย'}<select disabled={disabled} value={time} onChange={e => setTime(e.target.value)}>{times.sort().map(v => <option key={v}>{v}</option>)}</select></label>
    <button disabled={disabled} type="submit" className="ns-primary">{en ? 'Save visit' : 'บันทึกนัดหมาย'}</button>
    <div className="ns-links"><button type="button" onClick={saved ? onCancel : onQuote}>{saved ? (en ? 'Cancel' : 'ยกเลิก') : (en ? 'Already sent a quote?' : 'ส่งใบเสนอราคาแล้ว?')}</button><button type="button" onClick={onClose}>{en ? 'Close enquiry…' : 'ปิดคำขอ…'}</button></div>
  </form>;
}

export function QuoteForm({ en, disabled, onCancel, amount, estimate, onSave }: FormProps & {
  amount?: number | null; estimate?: number; onSave: (amount: number | null) => void;
}) {
  const [value, setValue] = useState(amount?.toString() ?? '');
  return <form className="ns-form" onSubmit={e => { e.preventDefault(); onSave(value === '' ? null : Number(value)); }}>
    <label className="ns-field">{en ? 'Quote amount (฿, optional)' : 'ยอดใบเสนอราคา (฿ ไม่บังคับ)'}
      <input type="text" inputMode="numeric" pattern="[0-9]{0,12}" maxLength={12} value={value} placeholder={estimate === undefined ? undefined : String(Math.round(estimate))} onChange={e => setValue(e.target.value)} disabled={disabled}/>
    </label><button type="submit" disabled={disabled} className="ns-primary">{en ? 'Save quote' : 'บันทึกใบเสนอราคา'}</button>
    <div className="ns-links"><button type="button" onClick={onCancel}>{en ? 'Cancel' : 'ยกเลิก'}</button></div>
  </form>;
}

export function CloseForm({ en, disabled, onCancel, onSave }: FormProps & { onSave: (reason: CloseReason) => void }) {
  const [selected, setSelected] = useState<CloseReason | null>(null);
  return <form className="ns-form" onSubmit={e => { e.preventDefault(); if (selected) onSave(selected); }}>
    <fieldset disabled={disabled} className="ns-reasons"><legend>{en ? 'Reason for closing' : 'เหตุผลที่ปิดคำขอ'}</legend>
      {closeReasons.map(([id, th, english]) => <label key={id}><input type="radio" name="close-reason" checked={id === selected} onChange={() => setSelected(id)} required/>{en ? english : th}</label>)}
    </fieldset><button type="submit" disabled={disabled || !selected} className="ns-primary">{en ? 'Close enquiry' : 'ปิดคำขอ'}</button>
    <div className="ns-links"><button type="button" onClick={onCancel}>{en ? 'Cancel' : 'ยกเลิก'}</button></div>
  </form>;
}
