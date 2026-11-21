'use client';
export const editorExitEvent = 'wls:editor-exit';
export type EditorExitAction = () => void | Promise<boolean>;
/** Account changes must ask before mutating the session, not after navigation. */
export function requestEditorExit(proceed: EditorExitAction) {
  const event = new CustomEvent<{ proceed: EditorExitAction }>(editorExitEvent, { cancelable: true, detail: { proceed } });
  if (window.dispatchEvent(event)) void proceed();
}
