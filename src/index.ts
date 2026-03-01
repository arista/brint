import type { ChangeDomain } from "chchchchanges"

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
  | ListRenderSpec

export type NullRenderSpec = null | undefined

export type TextRenderSpec = string | number

export type FunctionRenderSpec = (ctx: RenderContext) => RenderSpec

export type ElementRenderSpec =
  | [ElementName]
  | [ElementName, ElementChildRenderSpecs]
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

export type ComponentFunction = (props: ResolvedComponentArgs, ctx: RenderContext) => RenderSpec

export type ComponentArgs = {
  on?: OnComponentHandlers
} & NormalComponentArgs

export type NormalComponentArgs = Record<string, ComponentArg>

export type ComponentArg = (() => unknown) | unknown

export type OnComponentHandlers = Record<string, unknown>

export type ResolvedComponentArgs = Record<string, unknown>

export type FragmentRenderSpec = [null, ...RenderSpec[]]

export type ListRenderSpec<T = unknown> = [typeof List, ListItemsSpec<T>]

export type ListItemsSpec<T> = {
  items: ListSource<T>
  each: ListItemFn<T>
}

export type ListSource<T> = T[] | ListSourceFn<T>

export type ListSourceFn<T> = () => T[]

export type ListItemFn<T> = (item: T) => RenderSpec

// ============================================================================
// RenderContext (TBD - placeholder for now)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RenderContext {
  // TODO: Define lifecycle hooks
  // onMount(callback: () => void | (() => void)): void
  // onUnmount(callback: () => void): void
  // getElement(): Element | null
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
  const { changeDomain: _changeDomain } = config

  return {
    render(_spec: RenderSpec, _element: Element): RenderHandle {
      // TODO: Implement rendering
      return {
        unmount() {
          // TODO: Implement unmount
        },
      }
    },
    List,
  }
}
