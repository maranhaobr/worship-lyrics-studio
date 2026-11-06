import type { TemplatePreset, VisualStyle } from './project';
const base: VisualStyle = {
  background: { type: 'gradient', from: '#0c1a35', to: '#183e62', angle: 135 }, overlay: 0.25,
  text: { color: '#ffffff', fontFamily: 'Arial', fontSize: 80, align: 'center', position: 'center' },
  animation: { type: 'fade', durationMs: 600 },
};
export const templatePresets: TemplatePreset[] = [
  { id: 'builtin-atmospheric', name: 'Atmosférico', style: base },
  { id: 'builtin-minimal', name: 'Minimalista', style: { ...base, background: { type: 'gradient', from: '#050609', to: '#050609', angle: 0 }, animation: { type: 'words', durationMs: 350 } } },
  { id: 'builtin-modern', name: 'Modern Worship', style: { ...base, background: { type: 'gradient', from: '#21123d', to: '#48316b', angle: 135 }, animation: { type: 'slide', durationMs: 500 } } },
];
