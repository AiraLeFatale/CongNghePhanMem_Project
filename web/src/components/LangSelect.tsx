import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { LANGS, useLang } from '../lib/i18n';
import { Flag } from './Flag';

/** Nút chọn ngôn ngữ: viên trắng có cờ, bấm mở danh sách 6 ngôn ngữ kèm cờ. Dùng được bằng bàn phím. */
export function LangSelect() {
  const { lang, setLang, ui } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const cur = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    list.current?.focus();
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  function openList() {
    setActive(Math.max(0, LANGS.findIndex((l) => l.code === lang)));
    setOpen(true);
  }
  function choose(i: number) {
    setLang(LANGS[i].code);
    setOpen(false);
    btn.current?.focus();
  }
  function onListKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') setActive((a) => (a + 1) % LANGS.length);
    else if (e.key === 'ArrowUp') setActive((a) => (a - 1 + LANGS.length) % LANGS.length);
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(LANGS.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') btn.current?.focus();
      return;
    } else return;
    e.preventDefault();
  }

  return (
    <div className={`lang-pick${open ? ' open' : ''}`} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${ui === 'vi' ? 'Ngôn ngữ' : 'Language'}: ${cur.label}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openList();
          }
        }}
      >
        <Flag code={cur.code} />
        <span className="lang-name">{cur.label}</span>
        <span className="lang-short" aria-hidden="true">
          {cur.code.toUpperCase()}
        </span>
        <CaretDown size={14} weight="bold" className="lang-caret" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          className="lang-menu"
          aria-label={ui === 'vi' ? 'Chọn ngôn ngữ nghe' : 'Choose a language'}
          aria-activedescendant={`${id}-${LANGS[active].code}`}
          onKeyDown={onListKey}
        >
          {LANGS.map((l, i) => (
            <li
              key={l.code}
              id={`${id}-${l.code}`}
              role="option"
              aria-selected={l.code === lang}
              className={`${i === active ? 'active' : ''}${l.code === lang ? ' current' : ''}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <Flag code={l.code} />
              <span>{l.label}</span>
              {l.code === lang && <Check size={15} weight="bold" className="lang-check" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
