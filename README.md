# Brint

A lightweight, reactive HTML rendering library for TypeScript. Brint uses plain arrays and functions to describe UI, with automatic re-rendering when data changes.

## Quick Example

```typescript
import { create } from 'brint'
import { ChangeDomain } from 'chchchchanges'

const domain = new ChangeDomain()
const brint = create({ changeDomain: domain })

// Create reactive state
const state = domain.enableChanges({ count: 0 })

// Render a counter
brint.render(
  ["div", [
    ["h1", "Counter"],
    ["p", () => `Count: ${state.count}`],
    ["button", { on: { click: () => state.count++ } }, "Increment"]
  ]],
  document.getElementById("app")
)
```

When `state.count` changes, only the `<p>` element updates automatically.

## Core Concepts

### RenderSpec

Everything you render is a **RenderSpec** - a plain value that describes what to render:

```typescript
// Text
"Hello World"

// Element: [tagName, attributes?, children?]
["div", { class: "container" }, "Content"]

// Function (reactive)
() => `Current time: ${state.time}`

// Component
[MyComponent, { title: "Hello" }]

// Fragment (multiple siblings)
[null, ["span", "One"], ["span", "Two"]]

// List
[List, { items: users, each: (user) => ["li", user.name] }]

// Null (renders nothing)
null
```

### Reactivity

Wrap any value in a function to make it reactive:

```typescript
// Static attribute
["div", { class: "always-red" }]

// Reactive attribute - updates when state.color changes
["div", { class: () => state.color }]

// Reactive text
() => `Hello, ${state.name}!`

// Reactive children
["ul", () => state.items.map(item => ["li", item])]
```

Brint uses [chchchchanges](https://github.com/anthropics/chchchchanges) for change detection. Any data accessed inside a reactive function is automatically tracked.

## Elements

Elements are arrays: `[tagName, attributes?, children?]`

```typescript
// Simple element
["div"]

// With text child
["div", "Hello"]

// With attributes
["div", { id: "main", class: "container" }]

// With attributes and children
["div", { class: "card" }, [
  ["h2", "Title"],
  ["p", "Content"]
]]
```

### Attributes

```typescript
["input", {
  type: "text",
  placeholder: "Enter name",
  disabled: false,           // false = attribute not set
  required: true,            // true = attribute set to "required"
  class: ["btn", "primary"], // Arrays joined with spaces
}]
```

### Styles

```typescript
["div", {
  style: {
    color: "red",
    fontSize: "16px",
    display: () => state.visible ? "block" : "none"
  }
}]
```

### Event Listeners

```typescript
["button", {
  on: {
    click: (e) => console.log("Clicked!", e),
    mouseenter: {
      listener: handleHover,
      options: { once: true }
    }
  }
}, "Click me"]
```

### DOM Properties

For properties that can't be set via attributes (like `value` on inputs):

```typescript
["input", {
  properties: {
    value: () => state.inputValue
  },
  on: {
    input: (e) => state.inputValue = e.target.value
  }
}]
```

## Components

Components are functions that receive props and return a RenderSpec:

```typescript
const Button = (props) => {
  return ["button", {
    class: props.variant,
    on: { click: props.onClick }
  }, props.label]
}

// Use with array syntax
[Button, {
  variant: "primary",
  label: "Submit",
  onClick: () => handleSubmit()
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

  // Lifecycle
  ctx.onMount(() => {
    console.log("Mounted!")
    return () => console.log("Unmounting...")
  })

  return ["div", [
    ["span", () => `Count: ${ctx.state.count}`],
    ["button", { on: { click: () => ctx.state.count++ } }, "+"]
  ]]
}
```

## Lists

Render arrays efficiently with the `List` symbol:

```typescript
import { create, List } from 'brint'

const { List } = brint

brint.render(
  ["ul", [
    List,
    {
      items: () => state.todos,
      each: (todo) => ["li", { class: todo.done ? "done" : "" }, todo.text]
    }
  ]],
  container
)
```

List updates are surgical - adding/removing items doesn't re-render the entire list.

## Fragments

Group multiple elements without a wrapper:

```typescript
// Fragment with null as first element
[null,
  ["header", "Top"],
  ["main", "Middle"],
  ["footer", "Bottom"]
]
```

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
const handle = brint.render(["div", "Hello"], document.body)

// Later: remove from DOM and clean up
handle.unmount()
```

### `brint.List`

Symbol for list rendering.

### RenderContext

Available in function and component specs:

```typescript
interface RenderContext<T> {
  state: T                    // Change-enabled state
  onMount(callback): void     // Lifecycle hook
}
```

## Installation

```bash
npm install brint chchchchanges
```

## License

MIT
