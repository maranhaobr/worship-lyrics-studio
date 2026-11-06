import type { VisualProjectDocument } from '@wls/shared';
export type EditorHistory = { past: VisualProjectDocument[]; present: VisualProjectDocument; future: VisualProjectDocument[] };
export type EditorAction = { type: 'change'; document: VisualProjectDocument } | { type: 'undo' } | { type: 'redo' };
export function editorReducer(state: EditorHistory, action: EditorAction): EditorHistory {
  if (action.type === 'change') return { past: [...state.past.slice(-49), state.present], present: action.document, future: [] };
  if (action.type === 'undo' && state.past.length) return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: [state.present, ...state.future] };
  if (action.type === 'redo' && state.future.length) return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
  return state;
}
