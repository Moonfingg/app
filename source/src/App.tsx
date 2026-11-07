/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  getAstanaDayInfo,
  playScheduleOpenSound,
  playScheduleCloseSound,
  type AstanaDayInfo,
} from './utils/fernhollow';
import ScheduleModal from './ScheduleModal';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [astanaDay, setAstanaDay] = useState<AstanaDayInfo>(() => getAstanaDayInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setAstanaDay(getAstanaDayInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [schedule, setSchedule] = useState<'closed' | 'open' | 'closing'>('closed');
  const closeTimerRef = useRef<any>(null);

  const openSchedule = () => {
    clearTimeout(closeTimerRef.current);
    playScheduleOpenSound();
    setSchedule('open');
  };

  const closeSchedule = React.useCallback(() => {
    setSchedule((s) => {
      if (s !== 'open') return s;
      playScheduleCloseSound();
      closeTimerRef.current = setTimeout(() => setSchedule('closed'), 420);
      return 'closing';
    });
  }, []);

  const valleyRef = useRef<any>(null);
  const audioStoreRef = useRef<any>(null);

  useEffect(() => {
    let unmounted = false;
    let timer: any = null;

    const bootEngine = () => {
      if (typeof window === 'undefined') return;
      const w = window as any;

      if (!w.webpackChunk_N_E) {
        timer = setTimeout(bootEngine, 60);
        return;
      }

      try {
        if (!w.__req) {
          w.webpackChunk_N_E.push([[90001], {}, function (r: any) { w.__req = r; }]);
        }
        if (typeof w.__req === 'function') {
          w.__req(889);
        }

        if (w.__GE && typeof w.__GE.et === 'function') {
          const Valley = w.__GE.et();
          const audioStoreGetter = w.__GE.Y();
          const valleyEl = document.getElementById('valley');

          if (valleyEl && !valleyRef.current) {
            const valley = new Valley(
              valleyEl,
              () => {
                if (!unmounted) setIsLoaded(true);
              },
              () => {
                if (!unmounted) setIntroShown(true);
              }
            );
            valleyRef.current = valley;

            try {
              const aStore = audioStoreGetter();
              audioStoreRef.current = audioStoreGetter;
              aStore.initAudio?.();
            } catch (aErr) {
              console.warn('Audio store init notice:', aErr);
            }
          }
        }
      } catch (err) {
        console.error('Error booting flower valley engine:', err);
        if (!unmounted) {
          setIsLoaded(true);
          setIntroShown(true);
        }
      }
    };

    bootEngine();

    const fallbackTimer = setTimeout(() => {
      if (!unmounted) {
        setIsLoaded(true);
        setIntroShown(true);
      }
    }, 2800);

    return () => {
      unmounted = true;
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      if (valleyRef.current && typeof valleyRef.current.destroy === 'function') {
        try {
          valleyRef.current.destroy();
        } catch {
          // ignore cleanup errors on unmount
        }
      }
    };
  }, []);

  const handleToggleSound = () => {
    if (audioStoreRef.current) {
      try {
        const s = audioStoreRef.current();
        if (s && typeof s.toggleMute === 'function') {
          const muted = s.toggleMute();
          setIsAudioPlaying(!muted);
          return;
        }
      } catch (err) {
        console.warn('Audio toggle notice:', err);
      }
    }
    setIsAudioPlaying((prev) => !prev);
  };

  const handleGoEnter = () => {
    if (valleyRef.current && typeof valleyRef.current.startHoverTransition === 'function') {
      try {
        valleyRef.current.startHoverTransition();
      } catch (e) {
        console.warn('Hover start notice:', e);
      }
    }
  };

  const handleGoLeave = () => {
    if (valleyRef.current && typeof valleyRef.current.stopHoverTransition === 'function') {
      try {
        valleyRef.current.stopHoverTransition();
      } catch (e) {
        console.warn('Hover stop notice:', e);
      }
    }
  };

  return (
    <>
      {/* 3D Valley canvas container required by Gladeye engine */}
      <div id="valley" aria-hidden="true">
        <div className="js-canvas-container"></div>
      </div>

      {/* Main Interface layer */}
      <div className={`ui ${introShown ? 'on' : ''}`} id="ui">
        <header>
          <a
            className="logo"
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="APE2601"
          >
            APE2601
          </a>
        </header>

        <section className="hero">
          <h1>{astanaDay.weekday}.</h1>
          <p className="cap">
            {astanaDay.formattedDate}
            <br />
            Время в Астане: {astanaDay.time} (UTC+5)
          </p>
          <a
            className="go"
            href="#"
            id="go"
            aria-label="Расписание"
            onPointerEnter={handleGoEnter}
            onPointerLeave={handleGoLeave}
            onClick={(e) => {
              e.preventDefault();
              openSchedule();
            }}
          >
            Расписание
          </a>
        </section>

        <div className="corner">
          <button
            className="sound"
            id="sound"
            aria-pressed={isAudioPlaying ? 'true' : 'false'}
            aria-label="Ambient sound"
            onClick={handleToggleSound}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5Z" />
              <path className="w" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
              <path className="x" d="m16 10 4 4m0-4-4 4" />
            </svg>
          </button>
        </div>
      </div>

      {schedule !== 'closed' && (
        <ScheduleModal
          astanaDay={astanaDay}
          closing={schedule === 'closing'}
          onClose={closeSchedule}
        />
      )}

      {/* Initial loading screen */}
      <div className={`loader ${isLoaded ? 'gone' : ''}`} id="loader">
        <span></span>
      </div>
    </>
  );
}
