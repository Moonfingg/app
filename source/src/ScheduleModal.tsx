import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  WEEKLY_SCHEDULE,
  getAstanaDayKey,
  type AstanaDayInfo,
  type ScheduleItem,
} from './utils/fernhollow';

interface ScheduleModalProps {
  astanaDay: AstanaDayInfo;
  closing: boolean;
  onClose: () => void;
}

const toSeconds = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 3600 + m * 60;
};

const astanaSeconds = (time: string): number => {
  const [h, m, s] = time.split(':').map(Number);
  return (h % 24) * 3600 + m * 60 + (s || 0);
};

const TYPE_CLASS: Record<ScheduleItem['type'], string> = {
  Лекция: 'lecture',
  Практика: 'practice',
  Спорт: 'sport',
  Онлайн: 'online',
};

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

export default function ScheduleModal({ astanaDay, closing, onClose }: ScheduleModalProps) {
  const todayKey = getAstanaDayKey();
  const [index, setIndex] = useState<number>(() => {
    const i = WEEKLY_SCHEDULE.findIndex((d) => d.dayKey === todayKey);
    return i >= 0 ? i : 0; // выходной → показываем понедельник
  });
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const panelRef = useRef<HTMLDivElement>(null);

  const count = WEEKLY_SCHEDULE.length;
  const go = useCallback(
    (step: 1 | -1) => {
      setDir(step === 1 ? 'next' : 'prev');
      setIndex((i) => (i + step + count) % count);
    },
    [count]
  );
  const jump = (target: number) => {
    if (target === index) return;
    setDir(target > index ? 'next' : 'prev');
    setIndex(target);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // свайп на телефоне
  const touchX = useRef<number | null>(null);

  const day = WEEKLY_SCHEDULE[index];
  const isToday = day.dayKey === todayKey;
  const isWeekend = todayKey === 'weekend';
  const nowSec = astanaSeconds(astanaDay.time);

  return (
    <div
      className={`sched-overlay ${closing ? 'closing' : ''}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sched-panel"
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Расписание"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 55) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="sched-sheen" aria-hidden="true" />

        <div className="sched-top">
          <div className="sched-title">
            <span className="sched-live" aria-hidden="true" />
            Расписание
          </div>
          <div className="sched-clock">
            Астана · {astanaDay.time.slice(0, 5)}
          </div>
          <button className="sched-close" onClick={onClose} aria-label="Закрыть">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="sched-nav">
          <button className="sched-arrow" onClick={() => go(-1)} aria-label="Предыдущий день">
            <Chevron dir="left" />
          </button>
          <div className="sched-dayhead" aria-live="polite">
            <div key={day.dayKey} className={`sched-dayname slide-${dir}`}>
              {day.dayName}
            </div>
            <div className="sched-daysub">
              {isToday
                ? 'Сегодня'
                : isWeekend && index === 0
                ? 'Сегодня выходной · ближайший день'
                : `${day.items.length} пары`}
            </div>
          </div>
          <button className="sched-arrow" onClick={() => go(1)} aria-label="Следующий день">
            <Chevron dir="right" />
          </button>
        </div>

        <div className="sched-tabs" role="tablist">
          {WEEKLY_SCHEDULE.map((d, i) => (
            <button
              key={d.dayKey}
              role="tab"
              aria-selected={i === index}
              className={`sched-tab ${i === index ? 'active' : ''} ${
                d.dayKey === todayKey ? 'today' : ''
              }`}
              onClick={() => jump(i)}
            >
              {d.dayShort}
            </button>
          ))}
        </div>

        <div className="sched-body">
          <div key={day.dayKey} className={`sched-list slide-${dir}`}>
            {day.items.map((it, n) => {
              const start = toSeconds(it.startTime);
              const end = toSeconds(it.endTime) + 0; // конец пары
              const live = isToday && nowSec >= start && nowSec < end;
              const past = isToday && nowSec >= end;
              const progress = live ? Math.min(1, (nowSec - start) / (end - start)) : 0;
              return (
                <article
                  key={it.id}
                  className={`lesson ${TYPE_CLASS[it.type]} ${live ? 'live' : ''} ${
                    past ? 'past' : ''
                  }`}
                  style={{ animationDelay: `${90 + n * 70}ms` }}
                >
                  <div className="lesson-num">{it.order}</div>
                  <div className="lesson-main">
                    <div className="lesson-time">
                      {it.timeRange}
                      {live && <span className="lesson-now">Идёт сейчас</span>}
                    </div>
                    <div className="lesson-subject">{it.subject}</div>
                    <div className="lesson-room">
                      {it.room}
                      {it.block ? ` · ${it.block}` : ''}
                    </div>
                    {live && (
                      <div className="lesson-bar">
                        <i style={{ transform: `scaleX(${progress})` }} />
                      </div>
                    )}
                  </div>
                  <span className="lesson-type">{it.type}</span>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
