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
  { id: 'builtin-christmas', name: 'Natal · Noite de luz', style: { ...base, background: { type: 'gradient', from: '#061e1b', to: '#132d2b', angle: 125 }, overlay: .12, text: { ...base.text, fontFamily: 'Playfair Display', fontSize: 88, fontWeight: '400', color: '#fff3d6', letterSpacing: 1, widthPercent: 76, shadow: 'soft' }, decoration: { theme: 'christmas', accent: '#e8bb65', intensity: .7, motion: true } } },
  { id: 'builtin-easter', name: 'Páscoa · Amanhecer', style: { ...base, background: { type: 'gradient', from: '#efe4cc', to: '#b9c7bc', angle: 145 }, overlay: 0, text: { ...base.text, fontFamily: 'Playfair Display', fontWeight: '400', fontSize: 86, color: '#4d3925', widthPercent: 76, shadow: 'none' }, decoration: { theme: 'easter', accent: '#9e713c', intensity: .6, motion: true } } },
  { id: 'builtin-paper', name: 'Papel · Adoração acústica', style: { ...base, background: { type: 'gradient', from: '#e8e0cc', to: '#c9ad83', angle: 150 }, overlay: 0, text: { ...base.text, fontFamily: 'Dancing Script', fontWeight: '600', fontSize: 105, color: '#61452e', shadow: 'none', widthPercent: 80 }, decoration: { theme: 'paper', accent: '#805536', intensity: .5, motion: false } } },
  { id: 'builtin-cinematic', name: 'Cinemático · Luz e presença', style: { ...base, background: { type: 'gradient', from: '#020409', to: '#121f2b', angle: 100 }, overlay: .1, text: { ...base.text, fontFamily: 'Playfair Display', fontWeight: '400', fontSize: 78, color: '#d8e9ed', letterSpacing: 2, shadow: 'glow', widthPercent: 80 }, decoration: { theme: 'cinematic', accent: '#c3e4f3', intensity: .65, motion: true } } },
  { id: 'builtin-bold', name: 'Impacto · Fé em destaque', style: { ...base, background: { type: 'gradient', from: '#11110e', to: '#30241b', angle: 135 }, overlay: .2, text: { ...base.text, fontFamily: 'Oswald', fontWeight: '700', fontSize: 164, uppercase: true, color: '#ffdc62', lineHeight: 1.02, letterSpacing: -1, widthPercent: 78, shadow: 'strong' }, decoration: { theme: 'bold', accent: '#ffb44a', intensity: .65, motion: true }, animation: { type: 'zoom', durationMs: 500 } } },
  { id: 'builtin-modern-type', name: 'Tipografia · Worship moderno', style: { ...base, background: { type: 'gradient', from: '#33383d', to: '#87908b', angle: 130 }, overlay: .18, text: { ...base.text, fontFamily: 'Montserrat', fontWeight: '900', fontSize: 94, uppercase: true, letterSpacing: 3, widthPercent: 88, shadow: 'soft' }, decoration: { theme: 'paper', accent: '#ffffff', intensity: .25, motion: false } } },
];
