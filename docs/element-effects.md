# Element effects (proposal)

**Status: proposed, nothing implemented.** Written 2026-08-11 from a taterhome
session. This records a design discussion and the evidence behind it so it can be
picked up cold. Nothing here has been built or tested.

## The gap

brint has no supported way to run an *imperative* effect against an element in
response to a model change. The reactive hooks that reach an element —
attributes, styles, properties — all end in "assign this value". `onMount` gives
you the node but no `ChangeDomain`, so a callback that wants to react to later
changes has nothing to hang off.

Every reactive read in brint goes through a `CachedFunction` created in one of
three places (attribute/style/property thunks, a component body, a list items
source). None of them lets the application supply the *body*.

## The case that surfaced it

taterhome's auth modal (`app/webapps/taterhome/src/frontend/components/AuthModal.ts`).
A `wa-dialog` has to be closed programmatically after a successful login, and it
must run its own fade-out rather than vanish when the model row is removed.

Web Awesome's dialog owns its open/close animation:

- `show()` and `requestClose()` are `private` in the `.d.ts`; the public lever is
  the `open` property ("Toggle this attribute to show and hide the dialog").
- Setting `open = false` after first update hits a `watch("open", {waitUntilFirstUpdate: true})`
  → `requestClose()` → dispatch `wa-hide` → animate → dispatch `wa-after-hide`.
  That is the same path the X button and Escape take.
- But an `open` that is already `true` *at element-creation time* makes Lit's
  `firstUpdated` call `this.dialog.showModal()` directly — no show animation, no
  `[autofocus]` handling.

And brint applies element args **before** insertion (`renderer.ts:724-732`), so a
declarative `open: () => …` binding that starts `true` destroys the open
animation. The dialog is therefore opened imperatively from `onMount` — and the
close has no matching hook.

## What works today, without any brint change

Two options, both usable now.

### 1. Model-driven close (chosen for taterhome, not yet written)

Add a lifecycle field to the modal's model and bind `open` as a *property*:

```ts
// Model
dialogState: "Opening" | "Open" | "Closing"   // starts "Opening"

// View
properties: { open: () => props.dialogOpen }  // dialogOpen === (dialogState === "Open")

// Controller
requestClose() { m.dialogState = "Closing" }
```

The value applied is `false` at creation and `false` again on close. What does
the work is the **invalidation**, not a value change: brint re-applies a reactive
property on every invalidation without comparing to the last value
(`renderer.ts:541-544`). By the time the second write lands, `show()` has set
`open = true` itself, so writing `false` closes the dialog with its animation.

The one invariant this rests on is that non-diffing behaviour. If a value-equality
short-circuit is ever added there as an optimization, the dialog silently stops
closing — no type error, no exception. **If that optimization is ever
considered, this document is the reason not to do it silently.** A brint test
pinning "reactive property re-applies on invalidation even when the value is
unchanged" would be cheap insurance.

(A plain `open: boolean` model field also works — assigning `false` over `false`
still notifies, since the change proxy's set trap has no old/new comparison,
`chchchchanges/src/object-handler.ts:181-197` — but then two non-diffing
behaviours are load-bearing instead of one, and the closing assignment reads as a
no-op. The enum makes the transition real.)

### 2. Hand the controller a close callback

`onDialogMount: (close: () => void) => void`. The DOM stays in the view file, the
controller holds a `(() => void) | null`. No hidden invariants; costs an
imperative handoff. Rejected as the default only because option 1 keeps the
controller DOM-free.

## The proposal

A new element arg:

```ts
export type ElementArgs = {
  style?: StyleElementArgsEntries
  on?: DomEventHandlers
  properties?: PropertiesElementArgsValue
  effect?: ElementEffectCallback        // ← new
  xmlns?: string
  onMount?: OnMountCallback
} & NormalElementArgs

/**
 * Runs with reads tracked: any change to what the body read re-runs it.
 * A returned function is the cleanup, run before each re-run and at teardown.
 */
export type ElementEffectCallback = (node: Element) => void | (() => void)
```

Call site:

```ts
h.el("wa-dialog", {
  onMount: e => U.onWaDialogReady(e, e => (e as any).show()),
  effect: e => { (e as WaDialog).open = props.dialogOpen },
})
```

Implementation is a near-copy of `applyProperties` (`renderer.ts:530-565`) with
three differences: it passes the element instead of a key, it stores and runs the
returned cleanup, and its first call is scheduled rather than immediate.

```ts
function applyEffect(element, effect, domain, renderNode) {
  let cleanup: (() => void) | null = null
  const cf = domain.createCachedFunction(() => effect(element))
  const run = () => {
    cleanup?.()
    const result = cf.call()
    cleanup = typeof result === "function" ? result : null
  }
  renderNode.addCleanup(cf)
  cf.addListener(run)
  scheduleEffect(renderNode, run)   // first run goes through the mount queue
}
```

## Decisions, with recommendations

### 1. First-run timing → with the mount queue

Not at arg-apply time. Args are applied pre-insertion (`renderer.ts:724-732`),
which is the whole reason the dialog case exists. `renderer.ts:1347-1356` already
records why mounts are deferred until the tree settles (a callback that focuses
its element otherwise loses the focus to `<body>` when the node is later moved).
An effect wants that same guarantee: element connected, upgraded, in final
position. Re-runs after that are synchronous on invalidation.

### 2. Cleanup contract → `void | (() => void)`, run before each re-run and at teardown

This is what makes the primitive general — attach/detach a listener, start/stop
an observer — rather than just "assign a property".

**Blocker to resolve first:** brint has two teardown paths and they disagree.
`RenderNode.remove()` drains `cleanupFunctions` (`render-node.ts:260-264`);
`cleanupRenderNode()` nulls the reactive maps but never calls `.remove()` on
those `CachedFunction`s (`renderer.ts:854-886`), and it is the path the surgical
list updates take (`renderer.ts:1507, 1521, 1547, 1622`). That looks like a live
leak for reactive attributes/styles/properties on surgically-removed list items —
the CF stays subscribed and keeps firing against a detached element. **Not
confirmed by a test.** Effects must not inherit it, so this is worth checking
before (or as part of) building them.

### 3. Tracked body vs tracked source → tracked body, plus `untracked()` in chchchchanges

The real fork. Vue ships both: `watchEffect(fn)` (tracked body) vs
`watch(source, cb)` (tracked source, callback outside the scope). Solid's
`createEffect` and Svelte's `$effect` are tracked-body; React's `useEffect` is
neither (explicit deps, untracked body).

Tracked body is the ergonomic one and is what was asked for. Its hazard here is
specific: **a model write inside a tracking scope is applied and silently not
notified** — `chchchchanges/src/object-handler.ts:178-180` returns `Reflect.set`
directly when `domain.changeContext != null`, skipping the notify block. For a
primitive whose purpose is side effects, people will write model updates in it,
and the failure is invisible.

There is no escape hatch today. `changeContext` is a plain public field
(`chchchchanges/src/change-domain.ts:32`, saved/restored at `:104-139`), so:

```ts
untracked<T>(f: () => T): T {
  const prev = this.changeContext
  this.changeContext = null
  try { return f() } finally { this.changeContext = prev }
}
```

That turns "don't write model state in an effect" from a rule you have to
remember into something expressible. It is independently useful — the same hazard
exists inside any component body.

## Counter-arguments

**Ownership.** It legitimizes imperative DOM code in views and adds a third
writer to element state. `managedAttributes` exists (`render-node.ts:100-103`)
precisely because "a custom element that reflects its own state (`wa-dialog`
writes `open` when it opens) would otherwise have that state stripped by the next
reconcile". With effects there would be the element, a reactive attribute, and an
effect all able to write `open`, and a conflict would be silent. If this ships,
the rule ships with it: **an effect may only touch element state brint does not
otherwise manage.**

**Re-entrancy.** An effect that writes to the DOM can synchronously dispatch
events — `el.open = false` fires `wa-hide` before the assignment returns — so
application code re-enters from inside a change flush. Survivable: the write
happens after `cf.call()` returns, so it is outside the tracking scope, and
invalidations only originate outside tracking scopes anyway. But it is a new
re-entrancy path and worth a test.

**The cheaper alternative.** Don't add a concept: pass the `ChangeDomain` to
`onMount` callbacks (or expose it on `RenderContext`), and let the application
build its own `CachedFunction` and return `cf.remove` as the cleanup. About eight
lines per call site, no new API surface. Not preferred — those eight lines are
listener wiring and teardown, which is what a primitive should own, and
hand-rolled versions will get teardown wrong in exactly the way the two paths in
decision 2 already differ. But it is a reasonable way to get one real call site
before committing to an API.

## Deferred

- **Component-level effects** (`ctx.effect` on `RenderContext`, no element). The
  general form. Deferred until there is a case that needs it; the element arg
  covers the one that prompted this.
- **Multiple effects per element.** `effect` is singular; compose in the
  callback. An array is a trivial extension if a second case appears.

## Picking this up

1. Decide whether to build it at all, or take the "pass the domain to `onMount`"
   route for one call site first.
2. If building: confirm the decision-2 teardown asymmetry with a test, fix it,
   then add `effect` on top of the corrected teardown.
3. Add `untracked()` to chchchchanges alongside it.
4. Add the regression test pinning non-diffing re-application of reactive
   properties (see "What works today", option 1) — taterhome depends on it either
   way.
