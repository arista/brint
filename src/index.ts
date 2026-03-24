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

// ============================================================================
// RenderSpec Types
// ============================================================================

export type RenderSpec =
  | NullRenderSpec
  | TextRenderSpec
  | ElementRenderSpec
  | FunctionRenderSpec
  | ComponentRenderSpec
  | FragmentRenderSpec
  | ListRenderSpec<any>

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

export type ComponentRenderSpec = [ComponentFunction, ComponentArgs] | [ComponentFunction]

// Using `any` for props to avoid contravariance issues: components declare specific
// prop types (e.g., HeaderProps), but ComponentFunction must accept any component.
// Strict typing here would reject valid components due to parameter contravariance.
export type ResolvedComponentArgs = any

export type ComponentFunction = (props: ResolvedComponentArgs, ctx: RenderContext) => RenderSpec

export type ComponentArgs = {
  on?: OnComponentHandlers
} & NormalComponentArgs

export type NormalComponentArgs = Record<string, ComponentArg>

export type ComponentArg = (() => unknown) | unknown

export type OnComponentHandlers = Record<string, unknown>

export type FragmentRenderSpec = [null, ...RenderSpec[]]

export type ListRenderSpec<T = unknown> = [typeof List, ListItemsSpec<T>]

export type ListItemsSpec<T> = {
  items: ListSource<T>
  each: ListItemFn<T>
}

export type ListSource<T> = T[] | ListSourceFn<T>

export type ListSourceFn<T> = () => T[]

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
 * RenderContext provides lifecycle notifications and state management
 * for FunctionRenderSpec and ComponentRenderSpec.
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
