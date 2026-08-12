# Element effects

**Status: built.** Proposed 2026-08-11, implemented 2026-08-12. This document
records what exists and why the design went the way it did; the decisions it
works through were real forks, and two of them were resolved differently from the
original proposal.

## The gap it fills

brint's reactive hooks onto an element — attributes, styles, properties — all end
in "assign this value". `onMount` gives you the node but no `ChangeDomain`, so a
callback that wants to react to later changes has nothing to hang off.

That leaves no supported way to drive an element _imperatively_ in response to a
model change: a custom element that animates itself, an observer to attach and
detach, a canvas to redraw.

## The API

```ts
el("wa-dialog", {
  effect: effect(
    () => props.dialogOpen,
    (e, open) => {
      ;(e as WaDialog).open = open
    },
  ),
})
```

`effect(source, callback)` is exported from `brint`. The `source` is tracked:
whatever it reads is subscribed to, and the effect re-runs when any of it
changes. The `callback` is **not** tracked. It returns an optional cleanup, run
before each re-run and again when the element is removed.

The helper exists for type inference. `ElementArgs` is not generic, so a bare
tuple in that position would give the callback an `unknown` value (and, under
`strictFunctionTypes`, reject a callback that annotates it). `effect()` ties the
two halves together at the call site; `ElementEffect` erases the type after that.

Multiple dependencies compose by returning a composite — there is no diffing on
it, so a fresh object each time is fine:

```ts
effect(
  () => ({ width: state.width, height: state.height }),
  (e, { width, height }) => resize(e as HTMLCanvasElement, width, height),
)
```

**The rule that comes with it: an effect may only touch element state brint does
not otherwise manage.** `managedAttributes` exists because a custom element that
reflects its own state would otherwise have it stripped by the next reconcile.
With effects there are three possible writers of any given element state — the
element, a reactive attribute or property, and an effect — and a conflict between
them is silent.

## The decisions

### Tracked source, not tracked body

The substantive fork. Vue ships both: `watchEffect(fn)` (tracked body) versus
`watch(source, cb)` (tracked source). Solid's `createEffect` and Svelte's
`$effect` are tracked-body, and so was the original proposal here.

Tracked source won on a specific hazard. A model write inside a tracking scope is
applied and **silently not notified** — `chchchchanges/src/object-handler.ts`
returns `Reflect.set` directly when `domain.changeContext != null`, skipping the
notify block. An effect is a side-effect primitive, so people will write model
updates in it, and under a tracked body that failure is invisible.

With the source tracked and the callback outside the scope, the hazard is gone by
construction rather than by a rule you have to remember. The proposal's companion
suggestion — adding `untracked()` to chchchchanges — was therefore **not built**.
It remains independently useful (the same hazard exists inside any component
body) but it is no longer a prerequisite for anything.

The honest cost: every comparable primitive is tracked-body, so this reads as the
odd one out, and the common "just poke the element from the model" case is more
verbose than `effect: e => { e.open = m.dialogOpen }` would have been. Offering
both spellings was considered and rejected — two forms of one concept, plus a
rule about which is safe. `test/effect.test.ts` pins the semantics ("does not
track reads made by the callback", "notifies model writes made by the callback"),
so the choice is not just a comment.

### First run with the mount queue

Not at arg-apply time. Args are applied before insertion, and several paths
render a node and only afterwards move it into position. An effect wants the same
guarantee `onMount` already has — element connected, upgraded, in final position.
Re-runs after that are synchronous on invalidation.

The queue entry carries an `effectOnly` flag. Reconciliation re-establishes an
element's effect against the new args while the element itself stays mounted, so
it must queue the effect _without_ re-firing `onMount`.

Within a node: `onMount` first, then the effect, so an effect sees whatever the
mount callbacks set up.

### Re-runs on invalidation, not on change

The callback is invoked on every invalidation of the source, including when it
recomputes to the same value. This matches reactive attributes and properties,
and it is not an oversight in any of the three: brint's record of what it last
applied is not the element's current state, because elements write their own
state. A value-equality short-circuit would let an element that changed itself
drift permanently out of sync with the model bound to it. There is a pinning test
for the property case in `test/index.test.ts`.

### Cleanup

`void | (() => void)`, run before each re-run and at teardown. This is what makes
the primitive general — attach/detach a listener, start/stop an observer — rather
than just "assign a property".

Building it required fixing the teardown asymmetry the proposal flagged as
suspected: `cleanupRenderNode()` and `clearReactiveState()` dropped the reactive
maps without unsubscribing the `CachedFunction`s behind them, on the surgical
list-removal and element-reconciliation paths respectively. Confirmed with tests
and fixed first (see commit "Unsubscribe reactive args' CachedFunctions on both
teardown paths"), so effects were built on corrected teardown rather than
inheriting the bug.

## The case that prompted it

taterhome's auth modal. A `wa-dialog` has to be closed programmatically after a
successful login, and must run its own fade-out rather than vanish when the model
row is removed.

Worth recording, because the original proposal got this partly wrong: **the
public lever really is the `open` property, and `show()` never needed to be
called.** `handleOpenChange` is decorated `watch("open", { waitUntilFirstUpdate:
true })`, so setting `open = true` any time after the element's first Lit update
runs `show()` with its animation, autofocus, and `wa-show`/`wa-after-show` events.
That is exactly what Web Awesome's own `data-dialog="open <id>"` handler does.

What breaks the animation is an `open` that is already `true` at first render:
`firstUpdated()` then calls `this.dialog.showModal()` directly, skipping all of
it. So the requirement is not "call `show()`", it is "the `true` must land after
`hasUpdated`".

That gate is Lit's, not brint's. brint's mount queue is synchronous within the
render pass while Lit's first update is a microtask, so an effect's first run is
still too early to set `open = true` on a freshly created dialog — the app has to
wait for `updateComplete`. What the effect removes is the _close_ path and the
element handoff: the controller no longer has to hold a `WaDialog` reference to
close it, and the whole lifecycle can be driven from a model field.

## Deferred

- **Component-level effects** (`ctx.effect` on `RenderContext`, no element). The
  general form. Deferred until there is a case that needs it.
- **Multiple effects per element.** `effect` is singular; compose in the callback.
  An array is a trivial extension if a second case appears.
- **`untracked()` in chchchchanges.** See above — no longer needed here.
