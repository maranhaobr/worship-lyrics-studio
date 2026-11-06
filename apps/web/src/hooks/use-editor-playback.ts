'use client';
import { useMemo } from 'react';
import { frameToMs } from '@wls/shared';

export type PlaybackClock = { getTimeMs: () => number; subscribe: (listener: () => void) => () => void; reportFrame: (frame: number) => void };

// Only the clock, seek slider and playhead subscribe. Playback does not rerender
// the editor panels or thousands of timeline clips on every frame.
export function useEditorPlayback(fps: number): PlaybackClock {
  return useMemo(() => {
    let timeMs = 0;
    const listeners = new Set<() => void>();
    return {
      getTimeMs: () => timeMs,
      subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
      reportFrame: (frame: number) => {
        const next = frameToMs(frame, fps);
        if (next === timeMs) return;
        timeMs = next; listeners.forEach(listener => listener());
      },
    };
  }, [fps]);
}
