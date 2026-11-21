/** Manual beat clock shared by every rhythmic scene. Seeking/export never depends on wall-clock time. */
export function rhythmState(frame: number, fps: number, bpm = 110, beatOffsetMs = 0, motion = true) {
  const seconds = motion ? frame / fps : 0;
  const beats = motion ? (seconds - beatOffsetMs / 1000) * bpm / 60 : 0;
  const phase = ((beats % 1) + 1) % 1;
  // Continuous, low-contrast envelope; no full-screen on/off flashes.
  const pulse = ((1 + Math.cos(phase * Math.PI * 2)) / 2) ** 2;
  return { seconds, beats, phase, pulse };
}
