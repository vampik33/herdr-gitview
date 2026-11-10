// The panel shown (the Changes button, cmd-shift-g): the list opens no
// diff and selects no file (fork); a click or j/k does.
import { world, reset } from "./stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
const { default: GitList } = await import("../mods/gitview/main.js");
const { FileList } = await import("../mods/gitview/filelist.js");
const { liveView, setView, viewIn } = await import("../mods/gitview/shared.js");

const TAB = "t1";
const SPACE = { id: "spA", active: true, tabs: [{ id: TAB }] };
const WHERE = { root: "/r", on: null, base: null };
const f = (path) => ({ path, kind: "modified", letter: "M", add: 1, del: 1, rev: `rev-${path}` });
const STATUS = { sections: [{ id: "changes", title: "Changes", files: [f("a.rs"), f("b.rs")] }] };

// A list as it is after a hide: its status loaded, b.rs selected, the
// tab's view still on b.rs (hiding closed the pane, not the view).
function hiddenList({ diffPane = false } = {}) {
  reset({ spaces: [SPACE], focused: { tab: TAB }, panes: diffPane ? [{ tab: TAB, pane: "p1", mod: "gitview-diff" }] : [] });
  const work = new FileList(STATUS, WHERE);
  work.rebuild(false);
  work.select(work.findFile("b.rs", "changes"));
  setView(TAB, work.viewFor(work.row()));
  const list = Object.create(GitList.prototype);
  const ctx = { key: "k", tab: TAB, space: SPACE.id, cwd: "/r", on: null };
  Object.assign(list, {
    mode: "files",
    work,
    ctx,
    loadedKey: "k",
    statusAt: Date.now(),
    place: { tab: (c) => c?.tab ?? null, shown: () => true },
    tr: { line() {} },
    context: () => ctx,
    refreshes: 0,
    refresh() { this.refreshes++; },
    selects: 0,
    select() { this.selects++; },
  });
  return list;
}

const cx = { spawn: () => assert.fail("nothing waits for the status"), notify() {} };

test("shown with no diff pane: nothing opens, nothing stays selected", () => {
  const list = hiddenList();
  list.openOnShow(cx);
  assert.equal(list.selects, 0);
  assert.equal(list.work.row(), null);
  assert.equal(liveView(viewIn(TAB)), null);
  assert.deepEqual(world.runs, []);
});

test("shown with a stale status: it refreshes, still opening nothing", () => {
  const list = hiddenList();
  list.statusAt = 0;
  list.openOnShow(cx);
  assert.equal(list.refreshes, 1);
  assert.equal(list.selects, 0);
  assert.equal(list.work.row(), null);
});

test("a refresh after the show keeps the list unselected", () => {
  const list = hiddenList();
  list.openOnShow(cx);
  list.work.update(STATUS, WHERE);
  list.followSelection();
  assert.equal(list.work.row(), null);
});

test("shown with the tab's diff pane still there: its file stays", () => {
  const list = hiddenList({ diffPane: true });
  list.openOnShow(cx);
  assert.equal(list.work.row()?.file.path, "b.rs");
  assert.equal(liveView(viewIn(TAB))?.path, "b.rs");
});
