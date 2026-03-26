# Brint

A lightweight, reactive HTML rendering library for TypeScript. Brint uses plain functions and arrays to describe UI, with automatic re-rendering when data changes.

## Quick Example

```typescript
import { create } from 'brint'
import * as h from 'brint/elements'
import { ChangeDomain } from 'chchchchanges'

const domain = new ChangeDomain()
const brint = create({ changeDomain: domain })

// Create reactive state
const state = domain.changeEnable({ count: 0 })

// Render a counter
brint.render(
  h.div([
    h.h1("Counter"),
    h.p(() => `Count: ${state.count}`),
    h.button({ on: { click: () => state.count++ } }, "Increment")
  ]),
  document.getElementById("app")
)
```

When `state.count` changes, only the `<p>` element updates automatically.

## Elements

Import element helpers from `brint/elements`:

```typescript
import * as h from 'brint/elements'

// Simple element
h.div()

// With text child
h.div("Hello")

// With attributes
h.div({ id: "main", class: "container" })

// With attributes and children
h.div({ class: "card" }, [
  h.h2("Title"),
  h.p("Content")
])
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
  disabled: false,           // false = attribute not set
  required: true,            // true = attribute set
  class: ["btn", "primary"], // Arrays joined with spaces
})
```

### Styles

```typescript
h.div({
  style: {
    color: "red",
    fontSize: "16px",
    display: () => state.visible ? "block" : "none"
  }
})
```

### Event Listeners

```typescript
h.button({
  on: {
    click: (e) => console.log("Clicked!", e),
    mouseenter: {
      listener: handleHover,
      options: { once: true }
    }
  }
}, "Click me")
```

### DOM Properties

For properties that can't be set via attributes:

```typescript
h.input({
  properties: {
    value: () => state.inputValue
  },
  on: {
    input: (e) => state.inputValue = e.target.value
  }
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

Note: Components have their own reactivity behavior—see [Component Reactivity](#component-reactivity) for details on how components re-render and how to control update granularity.

## Fragments

Group multiple elements without a wrapper using `fragment()`:

```typescript
import { fragment } from 'brint'
import * as h from 'brint/elements'

fragment(
  h.header("Top"),
  h.main("Middle"),
  h.footer("Bottom")
)
```

## Lists

Render arrays efficiently with `list()`:

```typescript
import { list } from 'brint'
import * as h from 'brint/elements'

h.ul([
  list(
    () => state.todos,
    (todo) => h.li({ class: todo.done ? "done" : "" }, todo.text)
  )
])
```

List updates are surgical - adding/removing items doesn't re-render siblings.

The first argument can be a static array or a function returning an array (for reactivity).

## Components

Components are functions that receive props and return a RenderSpec:

```typescript
import * as h from 'brint/elements'

const Button = (props) => {
  return h.button({
    class: props.variant,
    on: props.on
  }, props.label)
}

// Use with array syntax: [Component, props]
[Button, {
  variant: "primary",
  label: "Submit",
  on: { click: () => handleSubmit() }
}]
```

### Reactive Props

Function props are automatically reactive:

```typescript
[Button, {
  label: () => state.isLoading ? "Loading..." : "Submit",
  disabled: () => state.isLoading
}]
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
    h.button({ on: { click: () => ctx.state.count++ } }, "+")
  ])
}
```

### Component Reactivity

Components are inherently reactive. The entire component function runs inside a change-detection context, so any change-enabled data accessed during execution becomes a dependency. When that data changes, the component re-renders.

```typescript
const Greeting = (props) => {
  // Accessing props.user.name here tracks it as a dependency
  return h.div(`Hello, ${props.user.name}!`)
}

// If user is change-enabled, changing user.name will re-render Greeting
[Greeting, { user: state.user }]
```

**Function-wrapping controls update granularity:**

```typescript
const Example = (props) => {
  return h.div([
    // Without function: entire component re-runs when count changes
    h.span(`Count: ${props.state.count}`),

    // With function: only this text node updates when count changes
    h.span(() => `Count: ${props.state.count}`),
  ])
}
```

Both approaches result in the UI updating, but function-wrapping is more efficient for frequently-changing values since it avoids re-running the component.

**Prop passing matters too:**

```typescript
// Reactive: function is evaluated inside change-detection
[Counter, { value: () => state.count }]

// Reactive: object is passed, property access happens inside component
[Counter, { state: state }]  // component accesses state.count

// NOT reactive: value is captured at spec-creation time
[Counter, { value: state.count }]  // just passes the number 42
```

When you pass a primitive value directly (like `state.count`), it's evaluated immediately and the component receives a static value. Wrap in a function or pass the parent object to maintain reactivity.

## SVG

Import SVG elements from `brint/svg`. The `svg()` root element automatically sets the SVG namespace:

```typescript
import { svg, circle, rect, path, g, text } from 'brint/svg'

svg({ width: 200, height: 200 }, [
  circle({ cx: 100, cy: 100, r: 50, fill: "blue" }),
  rect({ x: 10, y: 10, width: 30, height: 30, fill: "red" }),
  g({ transform: "translate(50, 50)" }, [
    path({ d: "M0 0 L20 20", stroke: "black" }),
    text({ x: 0, y: 30 }, "Hello")
  ])
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

// Components use array syntax directly: [Component, props?]
[Counter, { start: 10 }]

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
import { create } from 'brint'
import { ChangeDomain } from 'chchchchanges'

const brint = create({
  changeDomain: new ChangeDomain()
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
import { fragment } from 'brint'

fragment(child1, child2, child3)
```

### `list(items, each)`

Creates a list with surgical updates.

```typescript
import { list } from 'brint'
import * as h from 'brint/elements'

// Static items
list(todos, (todo) => h.li(todo.text))

// Reactive items
list(() => state.todos, (todo) => h.li(todo.text))
```

### `brint/elements`

HTML element helpers. Each element is a function that accepts optional attributes and children.

```typescript
import * as h from 'brint/elements'

// Void elements (no children): h.br, h.hr, h.img, h.input, h.meta, h.link, ...
// Normal elements: h.div, h.span, h.p, h.a, h.button, h.form, ...

// Or import individually if preferred:
import { div, span, a } from 'brint/elements'
```

### `brint/svg`

SVG element helpers. The `svg()` root automatically sets `xmlns`.

```typescript
import { svg, circle, rect, path, g, ... } from 'brint/svg'
import * as s from 'brint/svg'  // namespace import
```

### RenderContext

Available in function and component specs:

```typescript
interface RenderContext<T> {
  state: T                    // Change-enabled state
  onMount(callback): void     // Lifecycle hook
}
```

The `onMount` callback receives the DOM node (or null for fragments/lists) and can return a cleanup function.

## Installation

```bash
npm install brint chchchchanges
```

## License

MIT
