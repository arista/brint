# Brint

A lightweight, reactive HTML rendering library for TypeScript. Brint uses plain functions and arrays to describe UI, with automatic re-rendering when data changes.

## Quick Example

```typescript
import { create } from "brint"
import * as h from "brint/elements"
import { ChangeDomain } from "chchchchanges"

const domain = new ChangeDomain()
const brint = create({ changeDomain: domain })

// Create reactive state
const state = domain.changeEnable({ count: 0 })

// Render a counter
brint.render(
  h.div([
    h.h1("Counter"),
    h.p(() => `Count: ${state.count}`),
    h.button({ on: { click: () => state.count++ } }, "Increment"),
  ]),
  document.getElementById("app"),
)
```

When `state.count` changes, only the `<p>` element updates automatically.

## Elements

Import element helpers from `brint/elements`:

```typescript
import * as h from "brint/elements"

// Simple element
h.div()

// With text child
h.div("Hello")

// With attributes
h.div({ id: "main", class: "container" })

// With attributes and children
h.div({ class: "card" }, [h.h2("Title"), h.p("Content")])
```

Elements can be called four ways:

- `h.div()` - empty element
- `h.div("child")` or `h.div([child1, child2])` - with children
- `h.div({ class: "foo" })` - with attributes
- `h.div({ class: "foo" }, "child")` - with both

### Attributes

```typescript
h.input({
  type: "text",
  placeholder: "Enter name",
  disabled: false, // false = attribute not set
  required: true, // true = attribute set
  class: ["btn", "primary"], // Arrays joined with spaces
})
```

### Styles

```typescript
h.div({
  style: {
    color: "red",
    fontSize: "16px",
    display: () => (state.visible ? "block" : "none"),
  },
})
```

### Event Listeners

```typescript
h.button(
  {
    on: {
      click: (e) => console.log("Clicked!", e),
      mouseenter: {
        listener: handleHover,
        options: { once: true },
      },
    },
  },
  "Click me",
)
```

### DOM Properties

For properties that can't be set via attributes:

```typescript
h.input({
  properties: {
    value: () => state.inputValue,
  },
  on: {
    input: (e) => (state.inputValue = e.target.value),
  },
})
```

## Reactivity

Wrap any value in a function to make it reactive:

```typescript
// Static attribute
h.div({ class: "always-red" })

// Reactive attribute - updates when state.color changes
h.div({ class: () => state.color })

// Reactive text
() => `Hello, ${state.name}!`

// Reactive children
h.ul(() => state.items.map(item => h.li(item)))
```

Brint uses [chchchchanges](https://github.com/anthropics/chchchchanges) for change detection. Any data accessed inside a reactive function is automatically tracked.

Note: Components have their own reactivity behavior—see [Component Reactivity](#component-reactivity) for important pitfalls to avoid.

## Fragments

Group multiple elements without a wrapper using `fragment()`:

```typescript
import { fragment } from "brint"
import * as h from "brint/elements"

fragment(h.header("Top"), h.main("Middle"), h.footer("Bottom"))
```

## Lists

Render arrays efficiently with `list()`:

```typescript
import { list } from "brint"
import * as h from "brint/elements"

h.ul([
  list(
    () => state.todos,
    (todo) => h.li({ class: todo.done ? "done" : "" }, todo.text),
  ),
])
```

List updates are surgical - adding/removing items doesn't re-render siblings.

The first argument can be a static array or a function returning an array (for reactivity).

## Managing Existing Elements

Sometimes you need to control an element that already exists and lives outside your mount root — like `<html>`, `<body>`, or `<title>`. `manage()` applies args (and optionally children) to an existing element instead of creating a new one:

```typescript
import { manage, fragment } from "brint"

fragment(
  // Reactively set theme classes on <html> — its children (head/body) are untouched
  manage(document.documentElement, { class: () => themeClasses() }),

  // Set the document <title> text
  manage(document.querySelector("title")!, {}, () => state.pageTitle),

  // ...the rest of your app
)
```

`manage()` runs the same attribute / style / property / event-listener and children machinery as normal element specs — with two key differences:

- **Non-destructive.** Only what you pass is applied. It never clears attributes, styles, or properties the element already had (or that something else set).
- **Children are opt-in.** Omit `children` and the element's existing children are left completely alone. Provide `children` and brint takes ownership of the element's child list (clearing any existing children), then renders and reactively maintains yours.

The element itself is never created, inserted, moved, or removed by brint. On unmount, brint tears down its reactive bindings, event listeners, and any children it rendered, but leaves the element in place (with the last-applied values — they are not reverted).

## Components

Components are functions that receive props and optionally a RenderContext:

```typescript
import * as h from "brint/elements"

const Button = (props) => {
  return h.button(
    {
      class: props.variant,
      on: props.on,
    },
    props.label,
  )
}

// Just call the component function
Button({
  variant: "primary",
  label: "Submit",
  on: { click: () => handleSubmit() },
})
```

For type-safe props and access to RenderContext, use the `component()` helper:

```typescript
import { component } from "brint"

// Props are type-checked, component receives RenderContext
component(Button, {
  variant: "primary",
  label: "Submit",
  on: { click: () => handleSubmit() },
})
```

### Component State

Components receive a `RenderContext` for local state and lifecycle:

```typescript
const Counter = (props, ctx) => {
  // Initialize state (change-enabled automatically)
  ctx.state = { count: props.initial || 0 }

  // Lifecycle hook
  ctx.onMount(() => {
    console.log("Mounted!")
    return () => console.log("Unmounting...")
  })

  return h.div([
    h.span(() => `Count: ${ctx.state.count}`),
    h.button({ on: { click: () => ctx.state.count++ } }, "+"),
  ])
}
```

### Element Lifecycle (`onMount`)

Any element accepts an `onMount` arg — a lifecycle hook that runs once, after the element **and its children** are mounted, receiving the element's own DOM node. Unlike the component-level `ctx.onMount` (whose node is always `null`, since a component has no single node), the element hook always gives you a real `Node`:

```typescript
h.input({
  // el is the real <input> element — no querySelector, no null check
  onMount: (el) => (el as HTMLInputElement).focus(),
})
```

Return a function to run cleanup when the element is removed (unmount) — ideal for wiring up things brint doesn't manage, like observers or third-party widgets:

```typescript
h.div({
  onMount: (el) => {
    const observer = new ResizeObserver(/* … */)
    observer.observe(el)
    return () => observer.disconnect() // runs on removal
  },
})
```

Timing mirrors `ctx.onMount`: callbacks fire bottom-up (a child's `onMount` before its parent's), and cleanups run when the element is removed by a conditional, list change, or `unmount()`. An element's `onMount` fires once when it's created; it does not re-fire on reconciliation.

### Element Effects (`effect`)

Reactive attributes, styles and properties all end in "assign this value". An `effect` is for the cases that don't: a custom element that animates itself, an observer to attach and detach, a canvas to redraw. Where `onMount` runs once, an effect re-runs whenever the data it watches changes.

Build one with the `effect()` helper, which takes a **source** and a **callback**:

```typescript
import { effect } from "brint"

h.el("wa-dialog", {
  // The dialog animates its own open and close; `open` is the only public lever
  effect: effect(
    () => state.dialogOpen,
    (el, open) => {
      ;(el as WaDialog).open = open
    },
  ),
})
```

(Use a block body. A concise arrow body returns the assignment's value, which the callback's `void | (() => void)` return type rejects — the same papercut as React's `useEffect`.)

The **source** is tracked: anything it reads becomes a dependency, and the effect re-runs when any of it changes. The **callback** receives the element and the source's current value, and is _not_ tracked — it can read whatever it likes without creating a dependency, and it can write model state.

That split is deliberate, and it's the opposite of what most reactive libraries do (Solid's `createEffect`, Svelte's `$effect`, Vue's `watchEffect` all track the body). A write to change-enabled data from inside a tracking context is applied but **not** notified, so a tracked body would silently swallow model updates made from the very primitive people reach for to make them. Keeping only the source tracked removes that trap.

Watch several things at once by returning a composite. Nothing diffs it, so allocating a fresh object each time is fine:

```typescript
effect(
  () => ({ width: state.width, height: state.height }),
  (el, { width, height }) => redraw(el as HTMLCanvasElement, width, height),
)
```

Return a function to clean up. It runs before each re-run, and again when the element is removed:

```typescript
h.div({
  effect: effect(
    () => state.watchedElement,
    (el, enabled) => {
      if (!enabled) return
      const observer = new IntersectionObserver(/* … */)
      observer.observe(el)
      return () => observer.disconnect()
    },
  ),
})
```

Timing and semantics:

- **The first run is deferred to mount**, alongside `onMount` and for the same reason — the element is connected, upgraded, and in its final position. Within an element, `onMount` runs first, so the effect sees whatever it set up.
- **Re-runs are synchronous** when the source is invalidated.
- **Re-runs happen on invalidation, not on change.** If the source recomputes to the same value, the callback still runs. This matches reactive attributes and properties: brint's record of what it last applied is not the element's current state, since elements modify themselves.
- **Reconciliation replaces the effect.** When a re-rendering component produces the same element, the outgoing effect's cleanup runs and the incoming one takes over. (`onMount`, by contrast, does not re-fire.)

One rule comes with this: **an effect may only touch element state brint does not otherwise manage.** If a reactive attribute or property and an effect both write the same thing, whichever ran last wins, and nothing warns you.

### Component Reactivity

When used with the `component()` helper, component functions run inside a change-detection context. Any change-enabled data accessed during execution becomes a dependency. When that data changes, the component re-renders.

```typescript
const Greeting = (props) => {
  // Accessing props.user.name here tracks it as a dependency
  return h.div(`Hello, ${props.user.name}!`)
}

// If user is change-enabled, changing user.name will re-render Greeting
component(Greeting, { user: state.user })
```

#### Pitfall 1: Passing extracted values as props

When you extract a primitive value and pass it as a prop, the value is captured at that moment and loses reactivity:

```typescript
// BROKEN: state.count is evaluated immediately, component receives static value
component(Counter, { value: state.count }) // just passes 42, won't update

// WORKS: object is passed, property access happens inside component
component(Counter, { state: state }) // component accesses state.count
```

**Rule of thumb:** Pass objects, not extracted primitive values.

This pitfall is usually obvious—your UI won't update when you expect it to.

#### Pitfall 2: Components re-rendering too broadly

This pitfall is subtler. When you access reactive data directly in a component (without wrapping in a function), changes cause the _entire component_ to re-run:

```typescript
const Dashboard = (props) => {
  const { state } = props
  return h.div([
    h.header("Dashboard"),
    h.nav(/* ... expensive nav ... */),
    h.main([
      // Accessing state.tickCount here makes the ENTIRE Dashboard
      // re-render on every tick, including header and nav
      h.span(`Ticks: ${state.tickCount}`),
    ]),
  ])
}
```

The UI updates correctly, but you're doing more work than necessary. For frequently-changing values, wrap in a function to limit the update scope:

```typescript
const Dashboard = (props) => {
  const { state } = props
  return h.div([
    h.header("Dashboard"),
    h.nav(/* ... expensive nav ... */),
    h.main([
      // Only this text node updates on each tick
      h.span(() => `Ticks: ${state.tickCount}`),
    ]),
  ])
}
```

**Rule of thumb:** For values that change frequently (timers, animations, rapid user input), wrap the access in a function to avoid re-running the entire component.

## SVG

Import SVG elements from `brint/svg`. The `svg()` root element automatically sets the SVG namespace:

```typescript
import { svg, circle, rect, path, g, text } from "brint/svg"

svg({ width: 200, height: 200 }, [
  circle({ cx: 100, cy: 100, r: 50, fill: "blue" }),
  rect({ x: 10, y: 10, width: 30, height: 30, fill: "red" }),
  g({ transform: "translate(50, 50)" }, [
    path({ d: "M0 0 L20 20", stroke: "black" }),
    text({ x: 0, y: 30 }, "Hello"),
  ]),
])
```

## Under the Hood: RenderSpecs

The helper functions produce **RenderSpecs** - plain arrays and values that describe what to render. Understanding this format is useful for advanced usage:

```typescript
// Element helpers produce arrays: [tagName, attributes, children?]
h.div({ class: "card" }, "Hello")
// Equivalent to: ["div", { class: "card" }, "Hello"]

h.div("Hello")
// Equivalent to: ["div", {}, "Hello"]

// Note: The attributes object is always required in raw array syntax.
// This distinguishes elements from arrays of children.
// ["div", "text"] would be ambiguous - is it an element or two text children?
// Use ["div", {}, "text"] for elements, or just ["text1", "text2"] for children.

// fragment() produces: [null, ...children]
fragment(child1, child2)
// Equivalent to: [null, child1, child2]

// list() produces: [List, { items, each }]
list(items, renderFn)
// Equivalent to: [List, { items, each: renderFn }]

// component() produces a FunctionRenderSpec
component(Counter, { start: 10 })
// Equivalent to: (ctx) => Counter({ start: 10 }, ctx)

// Other RenderSpec types:
"text"              // Text node
42                  // Text node (number)
null                // Renders nothing
() => renderSpec    // Reactive function
```

You can use array syntax directly if you prefer, or mix it with helpers. When using the `h.*` helpers, you don't need to worry about the attributes object - the helpers handle it automatically.

## API Reference

### `create(config)`

Creates a Brint instance.

```typescript
import { create } from "brint"
import { ChangeDomain } from "chchchchanges"

const brint = create({
  changeDomain: new ChangeDomain(),
})
```

### `brint.render(spec, element)`

Renders a RenderSpec into a DOM element. Returns a handle with `unmount()`.

```typescript
const handle = brint.render(h.div("Hello"), document.body)

// Later: remove from DOM and clean up
handle.unmount()
```

### `fragment(...children)`

Creates a fragment (multiple siblings without a wrapper).

```typescript
import { fragment } from "brint"

fragment(child1, child2, child3)
```

### `list(items, each)`

Creates a list with surgical updates.

```typescript
import { list } from "brint"
import * as h from "brint/elements"

// Static items
list(todos, (todo) => h.li(todo.text))

// Reactive items
list(
  () => state.todos,
  (todo) => h.li(todo.text),
)
```

### `manage(element, args, children?)`

Applies `args` (and optionally `children`) to an **existing** element rather than creating a new one. Non-destructive — see [Managing Existing Elements](#managing-existing-elements).

```typescript
import { manage } from "brint"

// Attributes/styles only — leaves the element's children alone
manage(document.documentElement, { class: () => themeClasses() })

// With children — brint owns the element's child content
manage(document.querySelector("title")!, {}, () => state.pageTitle)
```

### `effect(source, callback)`

Builds an element's `effect` arg — a reactive imperative hook onto the element. The source is tracked; the callback is not. See [Element Effects](#element-effects-effect).

```typescript
import { effect } from "brint"

h.el("wa-dialog", {
  effect: effect(
    () => state.dialogOpen,
    (el, open) => {
      ;(el as WaDialog).open = open
    },
  ),
})
```

The callback may return a cleanup function, run before each re-run and when the element is removed. Use the helper rather than writing the object literal by hand — it's what infers the source's type for the callback.

### `component(fn, props)`

Creates a type-safe component from a function and props. Returns a FunctionRenderSpec that passes props to your component function along with a RenderContext.

```typescript
import { component } from "brint"

// Type-safe props, component receives RenderContext for state and lifecycle
component(MyComponent, { title: "Hello" })
```

### `brint/elements`

HTML element helpers. Each element is a function that accepts optional attributes and children.

```typescript
import * as h from "brint/elements"

// Void elements (no children): h.br, h.hr, h.img, h.input, h.meta, h.link, ...
// Normal elements: h.div, h.span, h.p, h.a, h.button, h.form, ...

// Or import individually if preferred:
import { div, span, a } from "brint/elements"
```

### `brint/svg`

SVG element helpers. The `svg()` root automatically sets `xmlns`.

```typescript
import { svg, circle, rect, path, g, ... } from 'brint/svg'
import * as s from 'brint/svg'  // namespace import
```

### RenderContext

Available in FunctionRenderSpec (including components created with `component()`):

```typescript
interface RenderContext<T> {
  state: T // Change-enabled state
  onMount(callback): void // Lifecycle hook
}
```

The component-level `ctx.onMount` callback runs as a lifecycle hook and can return a cleanup function. Its `node` argument is **always `null`** — a component has no single DOM node of its own (it may render a fragment, a list, or nothing). To get an element's actual DOM node, use the element-level [`onMount`](#element-lifecycle-onmount) arg instead.

## Installation

```bash
npm install brint chchchchanges
```

## License

MIT
