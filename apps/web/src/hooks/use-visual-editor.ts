'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { visualProjectSchema, type ProjectView, type VisualProjectDocument } from '@wls/shared';
import { editorReducer } from '@/lib/editor/reducer';

export async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(typeof body === 'object' && body && 'error' in body && typeof body.error === 'string' ? body.error : 'Não foi possível concluir a operação');
  return body as T;
}
export function useVisualEditor(project: ProjectView) {
  const [history, dispatch] = useReducer(editorReducer, { past: [], present: project.document, future: [] });
  const [name, setName] = useState(project.name);
  const [revision, setRevision] = useState(project.revision);
  const [saved, setSaved] = useState({ name: project.name, document: project.document });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const dirty = name !== saved.name || history.present !== saved.document;
  const presentRef = useRef(history.present);
  presentRef.current = history.present;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(document: VisualProjectDocument | ((current: VisualProjectDocument) => VisualProjectDocument)) {
    const next = typeof document === 'function' ? document(presentRef.current) : document;
    const result = visualProjectSchema.safeParse(next);
    if (!result.success) { setError(result.error.issues[0]?.message ?? 'Configuração inválida'); return false; }
    presentRef.current = result.data;
    dispatch({ type: 'change', document: result.data });
    setError(''); setMessage('');
    return true;
  }
  async function save() {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const snapshot = { name, document: history.present };
      const result = await readResponse<{ revision: number }>(await fetch(`/api/visual-projects/${project.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...snapshot, revision }),
      }));
      setRevision(result.revision); setSaved(snapshot); setMessage('Projeto salvo');
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao salvar'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  function acceptSaved(project: ProjectView) {
    const document = visualProjectSchema.parse(project.document);
    presentRef.current = document;
    dispatch({ type: 'change', document });
    setName(project.name); setRevision(project.revision); setSaved({ name: project.name, document });
    setError(''); setMessage('Alinhamento aplicado. Confira a sincronização no preview.');
  }
  return { document: history.present, name, setName, revision, dirty, saving, save, error, setError, message, setMessage, change, acceptSaved,
    undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}
