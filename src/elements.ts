/**
 * HTML Element Helper Functions
 *
 * Tree-shakeable helper functions for creating ElementRenderSpecs.
 *
 * Usage:
 *   import { div, span, a } from 'brint/elements'
 *   // or
 *   import * as h from 'brint/elements'
 */

import type {
  ElementRenderSpec,
  ElementArgs,
  ElementChildRenderSpecs,
  DomEventHandlers,
  StyleElementArgsEntries,
  PropertiesElementArgsValue,
  ElementValue,
} from "./index.js"

// ============================================================================
// Types
// ============================================================================

type Children = ElementChildRenderSpecs

function isElementArgs(value: unknown): value is ElementArgs {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Create an element with any tag name. Use this for custom elements
 * or any elements not exported by this module.
 */
export function el(
  tag: string,
  argsOrChildren?: ElementArgs | Children,
  children?: Children
): ElementRenderSpec {
  if (argsOrChildren === undefined) {
    return [tag, {}]
  }
  if (children !== undefined) {
    return [tag, argsOrChildren as ElementArgs, children]
  }
  if (isElementArgs(argsOrChildren)) {
    return [tag, argsOrChildren]
  }
  // Children without args - include empty args object
  return [tag, {}, argsOrChildren]
}

// ============================================================================
// Attribute Interfaces
// ============================================================================

/**
 * Base attributes shared by all HTML elements.
 */
export interface BaseElementArgs {
  style?: StyleElementArgsEntries
  on?: DomEventHandlers
  properties?: PropertiesElementArgsValue
  xmlns?: string
  id?: ElementValue
  class?: ElementValue
  title?: ElementValue
  tabindex?: ElementValue
  hidden?: ElementValue
  lang?: ElementValue
  dir?: ElementValue
  draggable?: ElementValue
  contenteditable?: ElementValue
  spellcheck?: ElementValue
  autofocus?: ElementValue
  // Index signature for data-*, aria-*, and other attributes
  [key: string]:
    | ElementValue
    | StyleElementArgsEntries
    | DomEventHandlers
    | PropertiesElementArgsValue
    | undefined
}

export interface AnchorElementArgs extends BaseElementArgs {
  href?: ElementValue
  target?: ElementValue
  rel?: ElementValue
  download?: ElementValue
  hreflang?: ElementValue
  type?: ElementValue
  referrerpolicy?: ElementValue
}

export interface InputElementArgs extends BaseElementArgs {
  type?: ElementValue
  name?: ElementValue
  value?: ElementValue
  placeholder?: ElementValue
  disabled?: ElementValue
  readonly?: ElementValue
  required?: ElementValue
  checked?: ElementValue
  min?: ElementValue
  max?: ElementValue
  step?: ElementValue
  pattern?: ElementValue
  autocomplete?: ElementValue
  autofocus?: ElementValue
  form?: ElementValue
  list?: ElementValue
  maxlength?: ElementValue
  minlength?: ElementValue
  multiple?: ElementValue
  size?: ElementValue
  accept?: ElementValue
}

export interface ImgElementArgs extends BaseElementArgs {
  src?: ElementValue
  alt?: ElementValue
  width?: ElementValue
  height?: ElementValue
  loading?: ElementValue
  decoding?: ElementValue
  srcset?: ElementValue
  sizes?: ElementValue
  crossorigin?: ElementValue
  referrerpolicy?: ElementValue
  usemap?: ElementValue
  ismap?: ElementValue
}

export interface FormElementArgs extends BaseElementArgs {
  action?: ElementValue
  method?: ElementValue
  enctype?: ElementValue
  novalidate?: ElementValue
  target?: ElementValue
  autocomplete?: ElementValue
  name?: ElementValue
  rel?: ElementValue
}

export interface ButtonElementArgs extends BaseElementArgs {
  type?: ElementValue
  disabled?: ElementValue
  name?: ElementValue
  value?: ElementValue
  form?: ElementValue
  formaction?: ElementValue
  formenctype?: ElementValue
  formmethod?: ElementValue
  formnovalidate?: ElementValue
  formtarget?: ElementValue
  popovertarget?: ElementValue
  popovertargetaction?: ElementValue
}

export interface LinkElementArgs extends BaseElementArgs {
  href?: ElementValue
  rel?: ElementValue
  type?: ElementValue
  media?: ElementValue
  crossorigin?: ElementValue
  integrity?: ElementValue
  as?: ElementValue
  sizes?: ElementValue
  imagesrcset?: ElementValue
  imagesizes?: ElementValue
  referrerpolicy?: ElementValue
  disabled?: ElementValue
}

export interface MetaElementArgs extends BaseElementArgs {
  name?: ElementValue
  content?: ElementValue
  charset?: ElementValue
  "http-equiv"?: ElementValue
  media?: ElementValue
}

export interface ScriptElementArgs extends BaseElementArgs {
  src?: ElementValue
  type?: ElementValue
  async?: ElementValue
  defer?: ElementValue
  crossorigin?: ElementValue
  integrity?: ElementValue
  nomodule?: ElementValue
  referrerpolicy?: ElementValue
  blocking?: ElementValue
}

export interface AreaElementArgs extends BaseElementArgs {
  href?: ElementValue
  alt?: ElementValue
  coords?: ElementValue
  shape?: ElementValue
  target?: ElementValue
  download?: ElementValue
  rel?: ElementValue
  referrerpolicy?: ElementValue
}

export interface SourceElementArgs extends BaseElementArgs {
  src?: ElementValue
  srcset?: ElementValue
  type?: ElementValue
  media?: ElementValue
  sizes?: ElementValue
  width?: ElementValue
  height?: ElementValue
}

export interface OlElementArgs extends BaseElementArgs {
  start?: ElementValue
  reversed?: ElementValue
  type?: ElementValue
}

export interface LiElementArgs extends BaseElementArgs {
  value?: ElementValue
}

export interface ThElementArgs extends BaseElementArgs {
  colspan?: ElementValue
  rowspan?: ElementValue
  scope?: ElementValue
  headers?: ElementValue
  abbr?: ElementValue
}

export interface TdElementArgs extends BaseElementArgs {
  colspan?: ElementValue
  rowspan?: ElementValue
  headers?: ElementValue
}

export interface LabelElementArgs extends BaseElementArgs {
  for?: ElementValue
}

export interface SelectElementArgs extends BaseElementArgs {
  name?: ElementValue
  disabled?: ElementValue
  required?: ElementValue
  multiple?: ElementValue
  size?: ElementValue
  form?: ElementValue
  autocomplete?: ElementValue
}

export interface OptionElementArgs extends BaseElementArgs {
  value?: ElementValue
  disabled?: ElementValue
  selected?: ElementValue
  label?: ElementValue
}

export interface OptgroupElementArgs extends BaseElementArgs {
  label?: ElementValue
  disabled?: ElementValue
}

export interface TextareaElementArgs extends BaseElementArgs {
  name?: ElementValue
  rows?: ElementValue
  cols?: ElementValue
  placeholder?: ElementValue
  disabled?: ElementValue
  readonly?: ElementValue
  required?: ElementValue
  maxlength?: ElementValue
  minlength?: ElementValue
  wrap?: ElementValue
  form?: ElementValue
  autocomplete?: ElementValue
  spellcheck?: ElementValue
}

export interface ProgressElementArgs extends BaseElementArgs {
  value?: ElementValue
  max?: ElementValue
}

export interface MeterElementArgs extends BaseElementArgs {
  value?: ElementValue
  min?: ElementValue
  max?: ElementValue
  low?: ElementValue
  high?: ElementValue
  optimum?: ElementValue
}

export interface MediaElementArgs extends BaseElementArgs {
  src?: ElementValue
  controls?: ElementValue
  autoplay?: ElementValue
  loop?: ElementValue
  muted?: ElementValue
  preload?: ElementValue
  crossorigin?: ElementValue
}

export interface VideoElementArgs extends MediaElementArgs {
  width?: ElementValue
  height?: ElementValue
  poster?: ElementValue
  playsinline?: ElementValue
  disablepictureinpicture?: ElementValue
  disableremoteplayback?: ElementValue
}

export interface CanvasElementArgs extends BaseElementArgs {
  width?: ElementValue
  height?: ElementValue
}

export interface SvgElementArgs extends BaseElementArgs {
  viewBox?: ElementValue
  width?: ElementValue
  height?: ElementValue
  fill?: ElementValue
  stroke?: ElementValue
  preserveAspectRatio?: ElementValue
}

export interface IframeElementArgs extends BaseElementArgs {
  src?: ElementValue
  srcdoc?: ElementValue
  name?: ElementValue
  width?: ElementValue
  height?: ElementValue
  sandbox?: ElementValue
  allow?: ElementValue
  loading?: ElementValue
  referrerpolicy?: ElementValue
  allowfullscreen?: ElementValue
}

export interface DetailsElementArgs extends BaseElementArgs {
  open?: ElementValue
  name?: ElementValue
}

export interface DialogElementArgs extends BaseElementArgs {
  open?: ElementValue
}

export interface TimeElementArgs extends BaseElementArgs {
  datetime?: ElementValue
}

export interface DataElementArgs extends BaseElementArgs {
  value?: ElementValue
}

export interface OutputElementArgs extends BaseElementArgs {
  for?: ElementValue
  form?: ElementValue
  name?: ElementValue
}

export interface MapElementArgs extends BaseElementArgs {
  name?: ElementValue
}

export interface ObjectElementArgs extends BaseElementArgs {
  data?: ElementValue
  type?: ElementValue
  name?: ElementValue
  width?: ElementValue
  height?: ElementValue
  form?: ElementValue
}

export interface EmbedElementArgs extends BaseElementArgs {
  src?: ElementValue
  type?: ElementValue
  width?: ElementValue
  height?: ElementValue
}

export interface SlotElementArgs extends BaseElementArgs {
  name?: ElementValue
}

export interface ColElementArgs extends BaseElementArgs {
  span?: ElementValue
}

export interface ColgroupElementArgs extends BaseElementArgs {
  span?: ElementValue
}

export interface BlockquoteElementArgs extends BaseElementArgs {
  cite?: ElementValue
}

export interface QElementArgs extends BaseElementArgs {
  cite?: ElementValue
}

export interface DelElementArgs extends BaseElementArgs {
  cite?: ElementValue
  datetime?: ElementValue
}

export interface InsElementArgs extends BaseElementArgs {
  cite?: ElementValue
  datetime?: ElementValue
}

// ============================================================================
// Element Factory Functions
// ============================================================================

function makeEl<Args extends BaseElementArgs>(tag: string) {
  function builder(): ElementRenderSpec
  function builder(children: Children): ElementRenderSpec
  function builder(args: Args): ElementRenderSpec
  function builder(args: Args, children: Children): ElementRenderSpec
  function builder(
    argsOrChildren?: Args | Children,
    children?: Children
  ): ElementRenderSpec {
    if (argsOrChildren === undefined) {
      return [tag, {}]
    }
    if (children !== undefined) {
      return [tag, argsOrChildren as ElementArgs, children]
    }
    if (isElementArgs(argsOrChildren)) {
      return [tag, argsOrChildren as ElementArgs]
    }
    // Children without args - include empty args object
    return [tag, {}, argsOrChildren as Children]
  }
  return builder
}

function makeVoidEl<Args extends BaseElementArgs>(tag: string) {
  return (args?: Args): ElementRenderSpec =>
    args ? [tag, args as ElementArgs] : [tag, {}]
}

// ============================================================================
// Void elements (no children)
// ============================================================================

export const area = makeVoidEl<AreaElementArgs>("area")
export const base = makeVoidEl<BaseElementArgs>("base")
export const br = makeVoidEl<BaseElementArgs>("br")
export const col = makeVoidEl<ColElementArgs>("col")
export const embed = makeVoidEl<EmbedElementArgs>("embed")
export const hr = makeVoidEl<BaseElementArgs>("hr")
export const img = makeVoidEl<ImgElementArgs>("img")
export const input = makeVoidEl<InputElementArgs>("input")
export const link = makeVoidEl<LinkElementArgs>("link")
export const meta = makeVoidEl<MetaElementArgs>("meta")
export const source = makeVoidEl<SourceElementArgs>("source")
export const track = makeVoidEl<BaseElementArgs>("track")
export const wbr = makeVoidEl<BaseElementArgs>("wbr")

// ============================================================================
// Document structure
// ============================================================================

export const html = makeEl<BaseElementArgs>("html")
export const head = makeEl<BaseElementArgs>("head")
export const body = makeEl<BaseElementArgs>("body")
export const title = makeEl<BaseElementArgs>("title")
export const style = makeEl<BaseElementArgs>("style")
export const script = makeEl<ScriptElementArgs>("script")

// ============================================================================
// Sectioning
// ============================================================================

export const header = makeEl<BaseElementArgs>("header")
export const footer = makeEl<BaseElementArgs>("footer")
export const main = makeEl<BaseElementArgs>("main")
export const nav = makeEl<BaseElementArgs>("nav")
export const article = makeEl<BaseElementArgs>("article")
export const section = makeEl<BaseElementArgs>("section")
export const aside = makeEl<BaseElementArgs>("aside")
export const address = makeEl<BaseElementArgs>("address")

// ============================================================================
// Headings
// ============================================================================

export const h1 = makeEl<BaseElementArgs>("h1")
export const h2 = makeEl<BaseElementArgs>("h2")
export const h3 = makeEl<BaseElementArgs>("h3")
export const h4 = makeEl<BaseElementArgs>("h4")
export const h5 = makeEl<BaseElementArgs>("h5")
export const h6 = makeEl<BaseElementArgs>("h6")
export const hgroup = makeEl<BaseElementArgs>("hgroup")

// ============================================================================
// Block content
// ============================================================================

export const div = makeEl<BaseElementArgs>("div")
export const p = makeEl<BaseElementArgs>("p")
export const blockquote = makeEl<BlockquoteElementArgs>("blockquote")
export const pre = makeEl<BaseElementArgs>("pre")
export const figure = makeEl<BaseElementArgs>("figure")
export const figcaption = makeEl<BaseElementArgs>("figcaption")
export const hr_ = makeEl<BaseElementArgs>("hr") // Alternative if needed as element with children

// ============================================================================
// Inline content
// ============================================================================

export const span = makeEl<BaseElementArgs>("span")
export const a = makeEl<AnchorElementArgs>("a")
export const strong = makeEl<BaseElementArgs>("strong")
export const em = makeEl<BaseElementArgs>("em")
export const b = makeEl<BaseElementArgs>("b")
export const i = makeEl<BaseElementArgs>("i")
export const u = makeEl<BaseElementArgs>("u")
export const s = makeEl<BaseElementArgs>("s")
export const small = makeEl<BaseElementArgs>("small")
export const mark = makeEl<BaseElementArgs>("mark")
export const sub = makeEl<BaseElementArgs>("sub")
export const sup = makeEl<BaseElementArgs>("sup")
export const code = makeEl<BaseElementArgs>("code")
export const kbd = makeEl<BaseElementArgs>("kbd")
export const samp = makeEl<BaseElementArgs>("samp")
export const var_ = makeEl<BaseElementArgs>("var")
export const abbr = makeEl<BaseElementArgs>("abbr")
export const cite = makeEl<BaseElementArgs>("cite")
export const q = makeEl<QElementArgs>("q")
export const dfn = makeEl<BaseElementArgs>("dfn")
export const time = makeEl<TimeElementArgs>("time")
export const data = makeEl<DataElementArgs>("data")
export const ruby = makeEl<BaseElementArgs>("ruby")
export const rt = makeEl<BaseElementArgs>("rt")
export const rp = makeEl<BaseElementArgs>("rp")
export const bdi = makeEl<BaseElementArgs>("bdi")
export const bdo = makeEl<BaseElementArgs>("bdo")
export const del = makeEl<DelElementArgs>("del")
export const ins = makeEl<InsElementArgs>("ins")

// ============================================================================
// Lists
// ============================================================================

export const ul = makeEl<BaseElementArgs>("ul")
export const ol = makeEl<OlElementArgs>("ol")
export const li = makeEl<LiElementArgs>("li")
export const dl = makeEl<BaseElementArgs>("dl")
export const dt = makeEl<BaseElementArgs>("dt")
export const dd = makeEl<BaseElementArgs>("dd")
export const menu = makeEl<BaseElementArgs>("menu")

// ============================================================================
// Tables
// ============================================================================

export const table = makeEl<BaseElementArgs>("table")
export const thead = makeEl<BaseElementArgs>("thead")
export const tbody = makeEl<BaseElementArgs>("tbody")
export const tfoot = makeEl<BaseElementArgs>("tfoot")
export const tr = makeEl<BaseElementArgs>("tr")
export const th = makeEl<ThElementArgs>("th")
export const td = makeEl<TdElementArgs>("td")
export const caption = makeEl<BaseElementArgs>("caption")
export const colgroup = makeEl<ColgroupElementArgs>("colgroup")

// ============================================================================
// Forms
// ============================================================================

export const form = makeEl<FormElementArgs>("form")
export const fieldset = makeEl<BaseElementArgs>("fieldset")
export const legend = makeEl<BaseElementArgs>("legend")
export const label = makeEl<LabelElementArgs>("label")
export const button = makeEl<ButtonElementArgs>("button")
export const select = makeEl<SelectElementArgs>("select")
export const option = makeEl<OptionElementArgs>("option")
export const optgroup = makeEl<OptgroupElementArgs>("optgroup")
export const textarea = makeEl<TextareaElementArgs>("textarea")
export const output = makeEl<OutputElementArgs>("output")
export const progress = makeEl<ProgressElementArgs>("progress")
export const meter = makeEl<MeterElementArgs>("meter")
export const datalist = makeEl<BaseElementArgs>("datalist")

// ============================================================================
// Media
// ============================================================================

export const audio = makeEl<MediaElementArgs>("audio")
export const video = makeEl<VideoElementArgs>("video")
export const picture = makeEl<BaseElementArgs>("picture")
export const canvas = makeEl<CanvasElementArgs>("canvas")
export const svg = makeEl<SvgElementArgs>("svg")
export const iframe = makeEl<IframeElementArgs>("iframe")
export const object = makeEl<ObjectElementArgs>("object")
export const map = makeEl<MapElementArgs>("map")

// ============================================================================
// Interactive
// ============================================================================

export const details = makeEl<DetailsElementArgs>("details")
export const summary = makeEl<BaseElementArgs>("summary")
export const dialog = makeEl<DialogElementArgs>("dialog")

// ============================================================================
// Misc
// ============================================================================

export const template = makeEl<BaseElementArgs>("template")
export const slot = makeEl<SlotElementArgs>("slot")
export const noscript = makeEl<BaseElementArgs>("noscript")
export const search = makeEl<BaseElementArgs>("search")
