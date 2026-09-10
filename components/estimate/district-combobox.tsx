'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { LocalizedDistrictOption } from '@/config/districts';
import type { Locale } from '@/config/i18n';

type DistrictComboboxProps = {
  locale: Locale;
  options: LocalizedDistrictOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
};

function normalized(value: string) {
  return value.trim().toLocaleLowerCase().normalize('NFKC');
}

export function DistrictCombobox({ locale, options, value, onChange }: DistrictComboboxProps) {
  const english = locale === 'en';
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((option) => option.value === value);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = searchQuery ?? selected?.label ?? '';
  const searchTerm = open && selected && searchQuery === null ? '' : query;
  const filteredOptions = useMemo(() => {
    const term = normalized(searchTerm);
    if (!term) return options;
    return options.filter((option) => normalized(option.searchText).includes(term));
  }, [options, searchTerm]);

  const safeActiveIndex = activeIndex < filteredOptions.length ? activeIndex : filteredOptions.length - 1;

  useEffect(() => {
    function closeWhenOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeWhenOutside);
    return () => document.removeEventListener('pointerdown', closeWhenOutside);
  }, []);

  function choose(option: LocalizedDistrictOption) {
    onChange(option.value);
    setSearchQuery(null);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(filteredOptions.length - 1, current + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current <= 0 ? Math.max(0, filteredOptions.length - 1) : current - 1);
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length ? 0 : -1);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (event.key === 'Enter') {
      if (!open) {
        event.preventDefault();
        setOpen(true);
      } else if (safeActiveIndex >= 0 && filteredOptions[safeActiveIndex]) {
        event.preventDefault();
        choose(filteredOptions[safeActiveIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSearchQuery(null);
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="district-field" ref={rootRef} onBlur={() => window.setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
    }, 0)}>
      <label htmlFor="estimate-district">{english ? 'District (Khet / Amphoe)' : 'เขต / อำเภอ'}</label>
      <div className={`district-combobox ${open ? 'open' : ''}`}>
        <Search className="district-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id="estimate-district"
          role="combobox"
          type="search"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={safeActiveIndex >= 0 ? `${listId}-${filteredOptions[safeActiveIndex]?.value}` : undefined}
          value={query}
          placeholder={english ? 'Search districts' : 'ค้นหาเขตหรืออำเภอ'}
          onFocus={(event) => {
            setOpen(true);
            setActiveIndex(selected ? options.findIndex((option) => option.value === selected.value) : -1);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            onChange(undefined);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown className="district-chevron" aria-hidden="true" />
        {open && <div id={listId} className="district-options" role="listbox" aria-label={english ? 'Districts' : 'เขตและอำเภอ'}>
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <button
              id={`${listId}-${option.value}`}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={index === safeActiveIndex ? 'active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          )) : <p className="district-no-results" role="status">{english ? 'No matching district' : 'ไม่พบเขตหรืออำเภอที่ตรงกัน'}</p>}
        </div>}
      </div>
    </div>
  );
}
