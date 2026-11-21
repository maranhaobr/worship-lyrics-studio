'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/components/preferences-provider';
import { editorExitEvent, type EditorExitAction } from '@/lib/editor/navigation';

export function UnsavedChangesGuard({ dirty, saving, failed, save, onPendingChange }: { dirty: boolean; saving: boolean; failed: boolean; save: () => Promise<boolean>; onPendingChange: (pending: boolean) => void }) {
  const t = useTranslation(), router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const current = useRef({ dirty, saving, save }); current.current = { dirty, saving, save };
  const [pending, setPending] = useState<{ proceed: EditorExitAction } | null>(null);
  const [guardVersion, setGuardVersion] = useState(0);
  const alive = useRef(true);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false), permit = useRef(false);
  const sentinel = useRef(false), token = useRef('');
  const silentTraversal = useRef<(() => void) | null>(null);
  const afterRemoval = useRef<(() => void)[]>([]);
  const removeHistoryGuard = useRef<(proceed: () => void) => void>(() => undefined);
  useEffect(() => {
    token.current = crypto.randomUUID();
    alive.current = true;
    const marker = '__wlsEditorGuard';
    function removeSentinel(proceed: () => void) {
      if (silentTraversal.current) { afterRemoval.current.push(() => removeSentinel(proceed)); return; }
      if (!sentinel.current) { proceed(); return; }
      // Remove our same-URL entry before routing, preserving the actual Back destination.
      silentTraversal.current = () => { sentinel.current = false; proceed(); };
      history.back();
    }
    removeHistoryGuard.current = removeSentinel;
    function ask(proceed: EditorExitAction) {
      if (pendingRef.current) return;
      pendingRef.current = true; setPending({ proceed });
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (current.current.dirty && !permit.current) { event.preventDefault(); event.returnValue = ''; }
    }
    function click(event: MouseEvent) {
      if (!current.current.dirty || permit.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const url = new URL(anchor.href, location.href);
      if (!['http:', 'https:'].includes(url.protocol) || (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      ask(() => { if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash); else location.assign(url.href); });
    }
    function custom(event: Event) {
      if (!current.current.dirty || permit.current) return;
      event.preventDefault();
      ask((event as CustomEvent<{ proceed: EditorExitAction }>).detail.proceed);
    }
    function popstate(event: PopStateEvent) {
      if (silentTraversal.current) {
        event.stopImmediatePropagation();
        const callback = silentTraversal.current; silentTraversal.current = null; callback();
        const callbacks = afterRemoval.current.splice(0); callbacks.forEach(action => action());
        return;
      }
      if (!sentinel.current || permit.current || event.state?.[marker] === token.current) return;
      // Back reached the original same-URL entry. Restore the editor before asking.
      event.stopImmediatePropagation();
      if (!current.current.dirty) { sentinel.current = false; history.back(); return; }
      silentTraversal.current = () => ask(() => history.back());
      history.forward();
    }
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    window.addEventListener(editorExitEvent, custom);
    window.addEventListener('popstate', popstate, true);
    return () => {
      alive.current = false;
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
      window.removeEventListener(editorExitEvent, custom);
      window.removeEventListener('popstate', popstate, true);
    };
  }, [router]);
  useEffect(() => {
    if (dirty && !sentinel.current && !permit.current && !silentTraversal.current && history.length > 1) {
      history.pushState({ ...history.state, __wlsEditorGuard: token.current }, '', location.href);
      sentinel.current = true;
    } else if (!dirty && sentinel.current && !pendingRef.current) removeHistoryGuard.current(() => undefined);
  }, [dirty, guardVersion]);
  useEffect(() => { onPendingChange(Boolean(pending)); }, [pending, onPendingChange]);
  useEffect(() => {
    const element = dialog.current;
    if (pending && element && !element.open) element.showModal();
    if (!pending && element?.open) element.close();
  }, [pending]);
  function cancel() {
    if (busy) return;
    pendingRef.current = false; setPending(null);
    if (!current.current.dirty) removeHistoryGuard.current(() => undefined);
  }
  function leave() {
    if (!pending) return;
    permit.current = true; pendingRef.current = false; setPending(null);
    removeHistoryGuard.current(() => {
      const restore = () => { if (alive.current) { permit.current = false; setGuardVersion(value => value + 1); } };
      try {
        const result = pending.proceed();
        if (result instanceof Promise) void result.then(ok => { if (!ok) restore(); }).catch(restore);
      } catch { restore(); }
    });
  }
  async function saveAndLeave() {
    setBusy(true);
    try { if (await current.current.save()) leave(); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="unsaved-title" aria-describedby="unsaved-description" style={{ color: 'inherit' }} className="card w-[calc(100%_-_2rem)] max-w-lg backdrop:bg-black/70 shadow-2xl" onCancel={event => { event.preventDefault(); cancel(); }}>
    <h2 id="unsaved-title" className="font-bold text-xl">{t('Salvar alterações antes de sair?')}</h2>
    <p id="unsaved-description" className="my-4 text-sm">{t('Existem alterações que ainda não foram salvas. Você pode salvar o projeto, sair sem salvar ou continuar editando.')}</p>
    {failed && <p role="alert" className="my-4 text-sm text-red-400">{t('Não foi possível salvar. Confira os campos e a conexão, ou resolva o conflito antes de sair. Suas alterações continuam neste editor.')}</p>}
    <div className="flex flex-wrap justify-end gap-2"><button autoFocus className="btn-secondary" disabled={busy} onClick={cancel}>{t('Continuar editando')}</button><button className="btn-secondary text-amber-400" disabled={busy || saving} onClick={leave}>{t('Sair sem salvar')}</button><button className="btn" disabled={busy} onClick={() => void saveAndLeave()}>{t(busy ? 'Salvando...' : 'Salvar e sair')}</button></div>
  </dialog>;
}
