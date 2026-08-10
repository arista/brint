import type { ChangeDomain } from "chchchchanges"
import { RenderNode } from "./render-node.js"
import { render as renderSpec, unmount as unmountRenderNode } from "./renderer.js"

// Re-export RenderNode for external use
export { RenderNode }

// ============================================================================
// Symbols
// ============================================================================

/**
 * Symbol used to identify ListRenderSpecs
 */
export const List = Symbol("List")

/**
 * Symbol used to identify ManageRenderSpecs
 */
export const Manage = Symbol("Manage")

// ============================================================================
// RenderSpec Types
// ============================================================================

export type RenderSpec =
  | NullRenderSpec
  | TextRenderSpec
  | ElementRenderSpec
  | FunctionRenderSpec
  | FragmentRenderSpec
  // ListRenderSpec's T is invariant (it appears in both Array<T> and (item: T) => ...
  // positions), so `any` is the only argument that lets a ListRenderSpec<SpecificT>
  // (e.g. from list()) stay assignable to RenderSpec. unknown/never break one side.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ListRenderSpec<any>
  | ManageRenderSpec

export type NullRenderSpec = null | undefined

export type TextRenderSpec = string | number

export type FunctionRenderSpec = (ctx: RenderContext) => RenderSpec

// ElementRenderSpec always requires an ElementArgs object as the second element.
// This distinguishes it from RenderSpec[] (array of children) which may start with a string.
export type ElementRenderSpec =
  | [ElementName, ElementArgs]
  | [ElementName, ElementArgs, ElementChildRenderSpecs]

export type ElementName = string

export type ElementChildRenderSpecs = RenderSpec[] | RenderSpec

export type ElementArgs = {
  style?: StyleElementArgsEntries
  on?: DomEventHandlers
  properties?: PropertiesElementArgsValue
  xmlns?: string
  onMount?: OnMountCallback
} & NormalElementArgs

export type NormalElementArgs = Record<string, ElementValue>

export type StyleElementArgsEntries = Record<string, ElementValue>

export type DomEventHandlers = Record<string, DomEventHandler>

export type DomEventHandler = FunctionDomEventHandler | OptionsDomEventHandler

export type FunctionDomEventHandler = EventListenerOrEventListenerObject

export type OptionsDomEventHandler = {
  listener: FunctionDomEventHandler
  options: AddEventListenerOptions
}

export type PropertiesElementArgsValue = Record<string | symbol, PropertiesElementArgsItem>

export type PropertiesElementArgsItem = (() => unknown) | unknown

export type ElementValue = PrimitiveElementValue | ArrayElementValue | FunctionElementValue

export type PrimitiveElementValue = null | undefined | string | boolean | number

export type ArrayElementValue = ArrayElementValueItem[]

export type ArrayElementValueItem =
  | PrimitiveElementValue
  | ArrayElementValue
  | ArrayElementFunctionValue

export type ArrayElementFunctionValue = () => ResolvedArrayElementValueItem

export type ResolvedElementValue = PrimitiveElementValue | ResolvedArrayElementValue

export type ResolvedArrayElementValue = ResolvedArrayElementValueItem[]

export type ResolvedArrayElementValueItem = PrimitiveElementValue | PrimitiveElementValue[]

export type FunctionElementValue = () => ResolvedElementValue

export type FragmentRenderSpec = [null, ...RenderSpec[]]

export type ListRenderSpec<T = unknown> = [typeof List, ListItemsSpec<T>]

/**
 * A spec that applies args (and optionally children) to an EXISTING element
 * rather than creating a new one. See `manage()`.
 */
export type ManageRenderSpec = [typeof Manage, ManageSpec]

export type ManageSpec = {
  element: Element
  args: ElementArgs
  /**
   * If omitted, the element's existing children are left untouched. If provided,
   * brint takes ownership of the element's children (clearing existing ones).
   */
  children?: ElementChildRenderSpecs
}

export type ListItemsSpec<T> = {
  items: ListSource<T>
  each: ListItemFn<T>
}

// Readonly: brint only ever reads the source array — it subscribes to it and
// iterates it, and never mutates it. Accepting `readonly T[]` lets an owning
// collection hand over its ordering directly (multindex's `orderedArray` is
// readonly precisely because the index is its sole author) without a cast.
export type ListSource<T> = readonly T[] | ListSourceFn<T>

export type ListSourceFn<T> = () => readonly T[]

export type ListItemFn<T> = (item: T, index: number) => RenderSpec

// ============================================================================
// RenderContext
// ============================================================================

/**
 * Callback for onMount lifecycle hook.
 * Receives the DOM Node associated with the RenderNode (null for Function/Component/Fragment/List).
 * If the callback returns a function, that function will be called during cleanup.
 */
export type OnMountCallback = (node: Node | null) => void | (() => void)

/**
 * Callback for an element's `onMount` arg (see `BaseElementArgs`). Unlike the
 * component-level `ctx.onMount` (whose node is null — a component has no single
 * DOM node), an element always has its own node, so this receives a non-null
 * `Node`. If it returns a function, that function runs when the element is
 * removed (unmount cleanup).
 */
export type ElementMountCallback = (node: Node) => void | (() => void)

/**
 * RenderContext provides lifecycle notifications and state management
 * for FunctionRenderSpec.
 */
export interface RenderContext<T = unknown> {
  /**
   * Application state associated with this RenderNode.
   * The value is automatically change-enabled via the ChangeDomain,
   * so child RenderSpecs can reference the state and be notified of changes.
   */
  state: T

  /**
   * Register a callback to run after this node and its children are mounted.
   * The callback receives the DOM Node associated with this RenderNode.
   * If the callback returns a function, that function will be called during cleanup.
   */
  onMount(callback: OnMountCallback): void
}

// ============================================================================
// Top-Level API
// ============================================================================

export interface BrintConfig {
  changeDomain: ChangeDomain
}

export interface Brint {
  render(spec: RenderSpec, element: Element): RenderHandle
  List: typeof List
  Manage: typeof Manage
}

export interface RenderHandle {
  unmount(): void
}

/**
 * Create a new Brint instance
 */
export function create(config: BrintConfig): Brint {
  const { changeDomain } = config

  return {
    render(spec: RenderSpec, element: Element): RenderHandle {
      // Create a root RenderNode that wraps the container element
      const rootRenderNode = new RenderNode(null)
      rootRenderNode.node = element

      // Render the spec as a child of the root, passing the ChangeDomain for reactivity
      const childRenderNode = renderSpec(spec, rootRenderNode, element, null, changeDomain)

      return {
        unmount() {
          unmountRenderNode(childRenderNode)
        },
      }
    },
    List,
    Manage,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a fragment containing multiple children without a wrapper element.
 *
 * @example
 * fragment(
 *   ["header", "Top"],
 *   ["main", "Middle"],
 *   ["footer", "Bottom"]
 * )
 */
export function fragment(...children: RenderSpec[]): FragmentRenderSpec {
  return [null, ...children]
}

/**
 * Create a list that renders each item using the provided function.
 * List updates are surgical - adding/removing items doesn't re-render siblings.
 *
 * @param items - Array of items or a function returning an array (for reactivity)
 * @param each - Function that takes an item and index, returns a RenderSpec
 *
 * @example
 * // Static items
 * list(todos, (todo, index) => ["li", todo.text])
 *
 * // Reactive items
 * list(() => state.todos, (todo, index) => ["li", todo.text])
 */
export function list<T>(items: ListSource<T>, each: ListItemFn<T>): ListRenderSpec<T> {
  return [List, { items, each }]
}

/**
 * Manage an EXISTING element instead of creating a new one — useful for elements
 * outside the mount root, like `<html>`, `<body>`, or `<title>`.
 *
 * Applies `args` (attributes, styles, properties, event listeners) the same way
 * element specs do, but **non-destructively**: only what you pass is set; nothing
 * else on the element is cleared. Reactive values work as usual.
 *
 * Children are optional:
 *  - **omitted** — the element's existing children are left completely alone.
 *  - **provided** — brint takes ownership of the element's children (clearing any
 *    existing ones), then renders and reactively maintains yours.
 *
 * The element itself is never created, inserted, moved, or removed by brint.
 *
 * @example
 * // Reactively set the theme classes on <html>, leaving its children alone
 * manage(document.documentElement, { class: () => themeClasses() })
 *
 * @example
 * // Set the document title text
 * manage(document.querySelector("title")!, {}, () => state.pageTitle)
 */
export function manage(
  element: Element,
  args: ElementArgs,
  children?: ElementChildRenderSpecs,
): ManageRenderSpec {
  return children === undefined
    ? [Manage, { element, args }]
    : [Manage, { element, args, children }]
}

/**
 * Create a type-safe component from a function and props.
 *
 * Components are just functions that receive props and a RenderContext.
 * This helper provides proper type inference for component props.
 *
 * @param fn - The component function
 * @param props - Props to pass to the component (type-checked against fn's parameter type)
 *
 * @example
 * component(MyComponent, { title: "Hello" })  // Type-checked!
 */
export function component<P>(
  fn: (props: P, ctx: RenderContext) => RenderSpec,
  props: P,
): FunctionRenderSpec {
  return (ctx) => fn(props, ctx)
}
