import { describe, expect, it } from 'vitest';
import { createTeamNotesEditor } from '@/components/installers/team-notes';
import type { InstallerActionResult } from '@/components/installers/action-result';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return {promise, resolve};
}

describe('installer team notes editor', () => {
  it('saves only changed text with the current revision and explicitly acknowledges success', async () => {
    const writes: [string, number][] = [];
    const editor = createTeamNotesEditor({text: 'Original', revision: 8}, async (text, revision) => { writes.push([text, revision]); return {ok: true}; });
    expect(await editor.flush()).toBe(true);
    expect(writes).toEqual([]);
    editor.edit('Call after 5');
    expect(await editor.flush()).toBe(true);
    expect(writes).toEqual([['Call after 5', 8]]);
    expect(editor.getSnapshot()).toMatchObject({text: 'Call after 5', revision: 9, status: 'saved', dirty: false});
    expect(await editor.flush()).toBe(true);
    expect(writes).toHaveLength(1);
  });

  it('serializes blur and navigation saves, preserving edits made while the first request is pending', async () => {
    const first = deferred<InstallerActionResult>();
    const second = deferred<InstallerActionResult>();
    const writes: [string, number][] = [];
    const editor = createTeamNotesEditor({text: '', revision: 3}, (text, revision) => { writes.push([text, revision]); return writes.length === 1 ? first.promise : second.promise; });
    editor.edit('First edit');
    const blur = editor.flush();
    editor.edit('Later edit');
    const navigation = editor.flush();
    expect(navigation).toBe(blur);
    expect(writes).toEqual([['First edit', 3]]);
    first.resolve({ok: true});
    await Promise.resolve();
    expect(writes).toEqual([['First edit', 3], ['Later edit', 4]]);
    expect(editor.getSnapshot()).toMatchObject({text: 'Later edit', dirty: true, status: 'saving'});
    second.resolve({ok: true});
    expect(await navigation).toBe(true);
    expect(editor.getSnapshot()).toMatchObject({text: 'Later edit', revision: 5, dirty: false, status: 'saved'});
  });

  it('recognizes a refresh for its own in-flight save, without replacing a newer draft', async () => {
    const ack = deferred<InstallerActionResult>();
    const writes: number[] = [];
    const editor = createTeamNotesEditor({text: 'Original', revision: 2}, async (_text, revision) => { writes.push(revision); return writes.length === 1 ? ack.promise : {ok: true}; });
    editor.edit('Saved request');
    const flush = editor.flush();
    editor.edit('Newer draft');
    editor.receive('Saved request', 3);
    expect(editor.getSnapshot()).toMatchObject({text: 'Newer draft', revision: 2, dirty: true});
    ack.resolve({ok: true});
    expect(await flush).toBe(true);
    expect(writes).toEqual([2, 3]);
    editor.receive('Saved request', 3);
    expect(editor.getSnapshot()).toMatchObject({text: 'Newer draft', revision: 4, dirty: false});
  });

  it('keeps a conflicted draft and retries with the original revision, never overwriting newer server notes', async () => {
    const writes: [string, number][] = [];
    const editor = createTeamNotesEditor({text: 'Original', revision: 7}, async (text, revision) => { writes.push([text, revision]); return {ok: false, status: 409, code: 'notes_changed_or_unavailable', message: 'Existing conflict message'}; });
    editor.edit('My unsaved note');
    expect(await editor.flush()).toBe(false);
    editor.receive('Teammate note', 8);
    expect(editor.getSnapshot()).toMatchObject({text: 'My unsaved note', revision: 7, dirty: true, status: 'conflict', message: 'Existing conflict message'});
    expect(await editor.flush()).toBe(false);
    expect(writes).toHaveLength(1);
    expect(await editor.retry()).toBe(false);
    expect(writes).toEqual([['My unsaved note', 7], ['My unsaved note', 7]]);
  });

  it('handles network failure, exposes error, and retries without losing edits', async () => {
    let attempts = 0;
    const editor = createTeamNotesEditor({text: '', revision: 0}, async () => { if (++attempts === 1) throw new Error('offline'); return {ok: true}; });
    editor.edit('Necessary request details');
    expect(await editor.flush()).toBe(false);
    expect(editor.getSnapshot()).toMatchObject({text: 'Necessary request details', status: 'error', dirty: true, revision: 0});
    expect(await editor.retry()).toBe(true);
    expect(editor.getSnapshot()).toMatchObject({status: 'saved', dirty: false, revision: 1});
  });

  it('rejects a teammate refresh while dirty and stops draining a request after a conflict', async () => {
    const ack = deferred<InstallerActionResult>();
    let calls = 0;
    const editor = createTeamNotesEditor({text: '', revision: 4}, () => { calls++; return ack.promise; });
    editor.edit('First');
    const flush = editor.flush();
    editor.edit('Second');
    editor.receive('Teammate note', 6);
    ack.resolve({ok: true});
    expect(await flush).toBe(false);
    expect(calls).toBe(1);
    expect(editor.getSnapshot()).toMatchObject({text: 'Second', revision: 4, status: 'conflict', dirty: true});
  });

  it('clears private drafts on withdrawal/auth reset and ignores late responses', async () => {
    const ack = deferred<InstallerActionResult>();
    let calls = 0;
    const editor = createTeamNotesEditor({text: 'Private original', revision: 2}, () => { calls++; return ack.promise; });
    editor.edit('Private pending');
    const flush = editor.flush();
    editor.clear();
    ack.resolve({ok: true});
    expect(await flush).toBe(false);
    editor.receive('Private server data', 4);
    editor.edit('Late edit');
    expect(await editor.flush()).toBe(false);
    expect(calls).toBe(1);
    expect(editor.getSnapshot()).toMatchObject({text: '', revision: 0, dirty: false, savedAt: null});
  });

  it('accepts newer server notes only when the editor is clean', () => {
    const editor = createTeamNotesEditor({text: 'Before', revision: 1}, async () => ({ok: true}));
    editor.receive('Teammate update', 2);
    expect(editor.getSnapshot()).toMatchObject({text: 'Teammate update', revision: 2, dirty: false});
    editor.receive('Stale response', 1);
    expect(editor.getSnapshot().text).toBe('Teammate update');
  });

  it('normalizes server-trimmed notes only after an explicit successful acknowledgement', async () => {
    const ack = deferred<InstallerActionResult>();
    const editor = createTeamNotesEditor({text: 'Before', revision: 4}, () => ack.promise);
    editor.edit('  Required details  \n');
    const flush = editor.flush();
    editor.receive('Required details', 5);
    expect(editor.getSnapshot()).toMatchObject({text: '  Required details  \n', revision: 4, status: 'saving', dirty: true});
    ack.resolve({ok: true});
    expect(await flush).toBe(true);
    expect(editor.getSnapshot()).toMatchObject({text: 'Required details', revision: 5, status: 'saved', dirty: false});
  });

  it('keeps newer in-flight edits when the server trims an earlier submitted note', async () => {
    const first = deferred<InstallerActionResult>();
    const second = deferred<InstallerActionResult>();
    const writes: [string, number][] = [];
    const editor = createTeamNotesEditor({text: '', revision: 1}, (text, revision) => { writes.push([text, revision]); return writes.length === 1 ? first.promise : second.promise; });
    editor.edit('  First note  ');
    const flush = editor.flush();
    editor.edit('  Newer complete note  ');
    editor.receive('First note', 2);
    expect(editor.getSnapshot()).toMatchObject({text: '  Newer complete note  ', revision: 1, status: 'saving'});
    first.resolve({ok: true});
    await Promise.resolve();
    expect(writes).toEqual([['  First note  ', 1], ['  Newer complete note  ', 2]]);
    expect(editor.getSnapshot()).toMatchObject({text: '  Newer complete note  ', revision: 2, status: 'saving', dirty: true});
    editor.receive('Newer complete note', 3);
    second.resolve({ok: true});
    expect(await flush).toBe(true);
    expect(editor.getSnapshot()).toMatchObject({text: 'Newer complete note', revision: 3, status: 'saved', dirty: false});
  });

  it('does not adopt a matching refresh revision if its own write subsequently conflicts', async () => {
    const ack = deferred<InstallerActionResult>();
    const writes: number[] = [];
    const editor = createTeamNotesEditor({text: '', revision: 2}, (_text, revision) => { writes.push(revision); return ack.promise; });
    editor.edit('  Same content as teammate  ');
    const flush = editor.flush();
    editor.receive('Same content as teammate', 3);
    ack.resolve({ok: false, status: 409, message: 'Conflict'});
    expect(await flush).toBe(false);
    expect(editor.getSnapshot()).toMatchObject({text: '  Same content as teammate  ', revision: 2, status: 'conflict', dirty: true});
    expect(await editor.retry()).toBe(false);
    expect(writes).toEqual([2, 2]);
  });
});
