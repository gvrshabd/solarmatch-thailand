import type { InstallerActionResult } from './action-result';

export type NotesSnapshot = {
  text: string; revision: number; status: 'automatic' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
  savedAt: number | null; message: string; dirty: boolean;
};

/** One memory-only editor per company/delivery. Writes are serialized, never rebased over a conflict. */
export function createTeamNotesEditor(initial: {text: string; revision: number}, save: (text: string, revision: number) => Promise<InstallerActionResult>) {
  let state: NotesSnapshot = { ...initial, status: 'automatic', savedAt: null, message: '', dirty: false };
  let savedText = initial.text;
  let generation = 0;
  let disposed = false;
  let pending: {text: string; revision: number} | null = null;
  let running: Promise<boolean> | null = null;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<NotesSnapshot>) => {
    state = {...state, ...patch};
    listeners.forEach(listener => listener());
  };
  const editor = {
    configure(nextSave: typeof save) { save = nextSave; },
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    edit(text: string) {
      if (disposed) return;
      const dirty = text !== savedText;
      publish({text, dirty, status: state.status === 'conflict' ? 'conflict' : pending ? 'saving' : dirty ? 'dirty' : 'automatic', message: state.status === 'conflict' ? state.message : ''});
    },
    receive(text: string, revision: number) {
      if (disposed || revision <= state.revision) return;
      if (pending && text === pending.text.trim() && revision === pending.revision + 1) {
        // The API trims notes. A matching refresh may precede its acknowledgement;
        // only the explicit successful response advances our editable revision.
        return;
      } else if (!state.dirty && !pending) {
        savedText = text;
        publish({text, revision, status: 'automatic', message: ''});
      } else {
        // Keep the original revision and the draft: adopting the newer revision would overwrite a teammate's edit.
        publish({status: 'conflict'});
      }
    },
    flush(): Promise<boolean> {
      if (disposed) return Promise.resolve(false);
      if (running) return running;
      if (state.status === 'conflict') return Promise.resolve(false);
      if (!state.dirty) return Promise.resolve(true);
      const started = generation;
      running = (async () => {
        while (state.dirty && !disposed && started === generation) {
          const write = {text: state.text, revision: state.revision};
          pending = write;
          publish({status: 'saving', message: ''});
          let result: InstallerActionResult;
          try { result = await save(write.text, write.revision); }
          catch { result = {ok: false, message: 'Unable to save notes. Please try again.'}; }
          if (disposed || started !== generation) return false;
          pending = null;
          if (!result.ok) {
            publish({status: result.status === 409 ? 'conflict' : 'error', message: result.message});
            return false;
          }
          if (state.status === 'conflict') return false;
          savedText = write.text.trim();
          // Normalize only the submitted draft. Text edited during the request must survive.
          const text = state.text === write.text ? savedText : state.text;
          publish({text, revision: Math.max(state.revision, write.revision + 1), dirty: text !== savedText, status: text === savedText ? 'saved' : 'saving', savedAt: Date.now()});
        }
        return !disposed && !state.dirty;
      })().finally(() => { running = null; });
      return running;
    },
    retry(): Promise<boolean> {
      // A conflict retries with the ORIGINAL revision, so it can never silently replace a newer note.
      if (state.status === 'conflict') publish({status: 'dirty', message: ''});
      return editor.flush();
    },
    clear() {
      generation++;
      disposed = true;
      savedText = '';
      pending = null;
      publish({text: '', revision: 0, status: 'automatic', savedAt: null, message: '', dirty: false});
    },
  };
  return editor;
}

const drafts = new Map<string, ReturnType<typeof createTeamNotesEditor>>();
export function installerNotesEditor(key: string, initial: {text: string; revision: number}, save: Parameters<typeof createTeamNotesEditor>[1]) {
  if (typeof window === 'undefined') return createTeamNotesEditor(initial, save);
  let editor = drafts.get(key);
  if (!editor) { editor = createTeamNotesEditor(initial, save); drafts.set(key, editor); }
  editor.configure(save);
  return editor;
}
export function clearInstallerNotesDrafts(key?: string) {
  if (key !== undefined) { drafts.get(key)?.clear(); drafts.delete(key); return; }
  drafts.forEach(editor => editor.clear());
  drafts.clear();
}
