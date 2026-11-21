'use client';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { visualProjectSchema, type ProjectView, type VisualProjectDocument } from '@wls/shared';
import { editorReducer } from '@/lib/editor/reducer';
import { useToastFeedback } from '@/components/toast-provider';

export async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(typeof body === 'object' && body && 'error' in body && typeof body.error === 'string' ? body.error : 'Não foi possível concluir a operação');
  return body as T;
}
type EditorOptions = { canEdit?: boolean; paused?: boolean; autoSavePaused?: boolean; draftVersion?: number; draftDirty?: boolean; prepareSave?: () => boolean };
export function useVisualEditor(project: ProjectView, { canEdit = true, paused = false, autoSavePaused = false, draftVersion = 0, draftDirty = false, prepareSave }: EditorOptions = {}) {
  const [history, dispatch] = useReducer(editorReducer, { past: [], present: project.document, future: [] });
  const [name, setName] = useState(project.name);
  const [revision, setRevision] = useState(project.revision);
  const [saved, setSaved] = useState({ name: project.name, document: project.document });
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveReady, setAutoSaveReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const flight = useRef<Promise<boolean> | null>(null);
  const mounted = useRef(true);
  const latest = useRef({ name, document: history.present, revision, saved, canEdit, paused, prepareSave });
  latest.current = { name, document: history.present, revision, saved, canEdit, paused, prepareSave };
  const { setError, setMessage } = useToastFeedback();
  const dirty = draftDirty || name !== saved.name || history.present !== saved.document;
  const presentRef = useRef(history.present);
  presentRef.current = history.present;
  useEffect(() => {
    mounted.current = true;
    try { setAutoSaveEnabled(localStorage.getItem('wls-editor-autosave') === 'true'); } catch { /* Session-only preference if storage is unavailable. */ }
    setAutoSaveReady(true);
    return () => { mounted.current = false; };
  }, []);
  function toggleAutoSave(enabled: boolean) {
    setAutoSaveEnabled(enabled); setSaveFailed(false);
    try { localStorage.setItem('wls-editor-autosave', String(enabled)); } catch { /* Keep editing without storage. */ }
  }
  function change(document: VisualProjectDocument | ((current: VisualProjectDocument) => VisualProjectDocument)) {
    const next = typeof document === 'function' ? document(presentRef.current) : document;
    const result = visualProjectSchema.safeParse(next);
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Configuração inválida'); return false; }
    presentRef.current = result.data;
    latest.current.document = result.data;
    dispatch({ type: 'change', document: result.data });
    setError(''); setMessage('');
    return true;
  }
  const save = useCallback(async (mode: 'manual' | 'auto' = 'manual'): Promise<boolean> => {
    // Manual saves wait for auto-save, then flush any edits made during that request.
    while (flight.current) { if (!await flight.current) return false; }
    if (!mounted.current || !latest.current.canEdit || latest.current.paused) return false;
    if (latest.current.prepareSave && !latest.current.prepareSave()) { setSaveFailed(true); return false; }
    const current = latest.current;
    if (current.name === current.saved.name && current.document === current.saved.document) return true;
    const snapshot = { name: current.name, document: current.document };
    setSaving(true); setAutoSaving(mode === 'auto'); setSaveFailed(false);
    const request = (async () => {
      try {
        const result = await readResponse<{ revision: number }>(await fetch(`/api/visual-projects/${project.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...snapshot, revision: current.revision }),
        }));
        // Update refs before releasing the queue; the next request uses the new revision.
        latest.current.revision = result.revision; latest.current.saved = snapshot;
        if (mounted.current) { setRevision(result.revision); setSaved(snapshot); if (mode === 'manual') setMessage('Projeto salvo'); }
        return true;
      } catch (error) {
        if (mounted.current) { setSaveFailed(true); setError(error instanceof Error ? error.message : 'Erro ao salvar'); }
        return false;
      } finally {
        flight.current = null;
        if (mounted.current) { setSaving(false); setAutoSaving(false); }
      }
    })();
    flight.current = request;
    const ok = await request;
    // A successful request never claims newer local changes are already saved.
    if (ok && mode === 'manual' && (latest.current.name !== latest.current.saved.name || latest.current.document !== latest.current.saved.document)) return save('manual');
    return ok;
  }, [project.id, setError, setMessage]);
  useEffect(() => {
    if (!autoSaveReady || !autoSaveEnabled || !canEdit || paused || autoSavePaused || !dirty || saveFailed) return;
    const timer = setTimeout(() => { void save('auto'); }, 2000);
    return () => clearTimeout(timer);
  }, [name, history.present, draftVersion, autoSaveReady, autoSaveEnabled, canEdit, paused, autoSavePaused, dirty, saveFailed, save]);
  function acceptSaved(project: ProjectView) {
    const document = visualProjectSchema.parse(project.document);
    presentRef.current = document;
    dispatch({ type: 'change', document });
    setName(project.name); setRevision(project.revision); setSaved({ name: project.name, document });
    latest.current = { ...latest.current, name: project.name, document, revision: project.revision, saved: { name: project.name, document } };
    setSaveFailed(false);
    setError(''); setMessage('Alinhamento aplicado. Confira a sincronização no preview.');
  }
  return { document: history.present, getDocument: () => presentRef.current, name, setName, revision, dirty, saving, autoSaving, ready: autoSaveReady, autoSaveEnabled, toggleAutoSave, saveFailed, save, setError, setMessage, change, acceptSaved,
    undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}
