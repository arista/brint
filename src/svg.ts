/**
 * SVG Element Helper Functions
 *
 * Tree-shakeable helper functions for creating SVG ElementRenderSpecs.
 * The svg() root element automatically sets xmlns="http://www.w3.org/2000/svg".
 *
 * Usage:
 *   import { svg, circle, rect, path } from 'brint/svg'
 *   // or
 *   import * as svg from 'brint/svg'
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
// Constants
// ============================================================================

const SVG_NAMESPACE = "http://www.w3.org/2000/svg"

// ============================================================================
// Types
// ============================================================================

type Children = ElementChildRenderSpecs

function isElementArgs(value: unknown): value is ElementArgs {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// ============================================================================
// Attribute Interfaces
// ============================================================================

/**
 * Base attributes shared by all SVG elements.
 */
export interface BaseSvgElementArgs {
  style?: StyleElementArgsEntries
  on?: DomEventHandlers
  properties?: PropertiesElementArgsValue
  xmlns?: string
  // Core attributes
  id?: ElementValue
  class?: ElementValue
  tabindex?: ElementValue
  lang?: ElementValue
  // Presentation attributes (common)
  fill?: ElementValue
  stroke?: ElementValue
  "stroke-width"?: ElementValue
  "stroke-linecap"?: ElementValue
  "stroke-linejoin"?: ElementValue
  "stroke-dasharray"?: ElementValue
  "stroke-dashoffset"?: ElementValue
  "stroke-opacity"?: ElementValue
  "fill-opacity"?: ElementValue
  "fill-rule"?: ElementValue
  opacity?: ElementValue
  transform?: ElementValue
  "transform-origin"?: ElementValue
  visibility?: ElementValue
  display?: ElementValue
  "clip-path"?: ElementValue
  "clip-rule"?: ElementValue
  mask?: ElementValue
  filter?: ElementValue
  "pointer-events"?: ElementValue
  cursor?: ElementValue
  // Index signature for other attributes
  [key: string]:
    | ElementValue
    | StyleElementArgsEntries
    | DomEventHandlers
    | PropertiesElementArgsValue
    | undefined
}

/**
 * SVG root element attributes.
 */
export interface SvgElementArgs extends BaseSvgElementArgs {
  viewBox?: ElementValue
  width?: ElementValue
  height?: ElementValue
  preserveAspectRatio?: ElementValue
  x?: ElementValue
  y?: ElementValue
}

/**
 * Circle element attributes.
 */
export interface CircleElementArgs extends BaseSvgElementArgs {
  cx?: ElementValue
  cy?: ElementValue
  r?: ElementValue
  pathLength?: ElementValue
}

/**
 * Ellipse element attributes.
 */
export interface EllipseElementArgs extends BaseSvgElementArgs {
  cx?: ElementValue
  cy?: ElementValue
  rx?: ElementValue
  ry?: ElementValue
  pathLength?: ElementValue
}

/**
 * Rect element attributes.
 */
export interface RectElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  rx?: ElementValue
  ry?: ElementValue
  pathLength?: ElementValue
}

/**
 * Line element attributes.
 */
export interface LineElementArgs extends BaseSvgElementArgs {
  x1?: ElementValue
  y1?: ElementValue
  x2?: ElementValue
  y2?: ElementValue
  pathLength?: ElementValue
}

/**
 * Path element attributes.
 */
export interface PathElementArgs extends BaseSvgElementArgs {
  d?: ElementValue
  pathLength?: ElementValue
}

/**
 * Polygon element attributes.
 */
export interface PolygonElementArgs extends BaseSvgElementArgs {
  points?: ElementValue
  pathLength?: ElementValue
}

/**
 * Polyline element attributes.
 */
export interface PolylineElementArgs extends BaseSvgElementArgs {
  points?: ElementValue
  pathLength?: ElementValue
}

/**
 * Text element attributes.
 */
export interface TextElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  dx?: ElementValue
  dy?: ElementValue
  rotate?: ElementValue
  textLength?: ElementValue
  lengthAdjust?: ElementValue
  "text-anchor"?: ElementValue
  "dominant-baseline"?: ElementValue
  "alignment-baseline"?: ElementValue
  "font-family"?: ElementValue
  "font-size"?: ElementValue
  "font-style"?: ElementValue
  "font-weight"?: ElementValue
  "font-variant"?: ElementValue
  "font-stretch"?: ElementValue
  "letter-spacing"?: ElementValue
  "word-spacing"?: ElementValue
  "text-decoration"?: ElementValue
  "writing-mode"?: ElementValue
}

/**
 * TSpan element attributes.
 */
export interface TSpanElementArgs extends TextElementArgs {}

/**
 * TextPath element attributes.
 */
export interface TextPathElementArgs extends BaseSvgElementArgs {
  href?: ElementValue
  path?: ElementValue
  startOffset?: ElementValue
  method?: ElementValue
  spacing?: ElementValue
  side?: ElementValue
  "text-anchor"?: ElementValue
}

/**
 * G (group) element attributes.
 */
export interface GElementArgs extends BaseSvgElementArgs {}

/**
 * Defs element attributes.
 */
export interface DefsElementArgs extends BaseSvgElementArgs {}

/**
 * Symbol element attributes.
 */
export interface SymbolElementArgs extends BaseSvgElementArgs {
  viewBox?: ElementValue
  preserveAspectRatio?: ElementValue
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  refX?: ElementValue
  refY?: ElementValue
}

/**
 * Use element attributes.
 */
export interface UseElementArgs extends BaseSvgElementArgs {
  href?: ElementValue
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
}

/**
 * Image element attributes.
 */
export interface ImageElementArgs extends BaseSvgElementArgs {
  href?: ElementValue
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  preserveAspectRatio?: ElementValue
  crossorigin?: ElementValue
  decoding?: ElementValue
}

/**
 * ForeignObject element attributes.
 */
export interface ForeignObjectElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
}

/**
 * Marker element attributes.
 */
export interface MarkerElementArgs extends BaseSvgElementArgs {
  viewBox?: ElementValue
  preserveAspectRatio?: ElementValue
  refX?: ElementValue
  refY?: ElementValue
  markerUnits?: ElementValue
  markerWidth?: ElementValue
  markerHeight?: ElementValue
  orient?: ElementValue
}

/**
 * ClipPath element attributes.
 */
export interface ClipPathElementArgs extends BaseSvgElementArgs {
  clipPathUnits?: ElementValue
}

/**
 * Mask element attributes.
 */
export interface MaskElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  maskUnits?: ElementValue
  maskContentUnits?: ElementValue
}

/**
 * Pattern element attributes.
 */
export interface PatternElementArgs extends BaseSvgElementArgs {
  viewBox?: ElementValue
  preserveAspectRatio?: ElementValue
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  patternUnits?: ElementValue
  patternContentUnits?: ElementValue
  patternTransform?: ElementValue
  href?: ElementValue
}

/**
 * LinearGradient element attributes.
 */
export interface LinearGradientElementArgs extends BaseSvgElementArgs {
  x1?: ElementValue
  y1?: ElementValue
  x2?: ElementValue
  y2?: ElementValue
  gradientUnits?: ElementValue
  gradientTransform?: ElementValue
  spreadMethod?: ElementValue
  href?: ElementValue
}

/**
 * RadialGradient element attributes.
 */
export interface RadialGradientElementArgs extends BaseSvgElementArgs {
  cx?: ElementValue
  cy?: ElementValue
  r?: ElementValue
  fx?: ElementValue
  fy?: ElementValue
  fr?: ElementValue
  gradientUnits?: ElementValue
  gradientTransform?: ElementValue
  spreadMethod?: ElementValue
  href?: ElementValue
}

/**
 * Stop element attributes.
 */
export interface StopElementArgs extends BaseSvgElementArgs {
  offset?: ElementValue
  "stop-color"?: ElementValue
  "stop-opacity"?: ElementValue
}

/**
 * Filter element attributes.
 */
export interface FilterElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  filterUnits?: ElementValue
  primitiveUnits?: ElementValue
}

/**
 * Common filter primitive attributes.
 */
export interface FilterPrimitiveElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  width?: ElementValue
  height?: ElementValue
  result?: ElementValue
  in?: ElementValue
}

/**
 * feBlend element attributes.
 */
export interface FeBlendElementArgs extends FilterPrimitiveElementArgs {
  in2?: ElementValue
  mode?: ElementValue
}

/**
 * feColorMatrix element attributes.
 */
export interface FeColorMatrixElementArgs extends FilterPrimitiveElementArgs {
  type?: ElementValue
  values?: ElementValue
}

/**
 * feComponentTransfer element attributes.
 */
export interface FeComponentTransferElementArgs extends FilterPrimitiveElementArgs {}

/**
 * feFuncR/G/B/A element attributes.
 */
export interface FeFuncElementArgs extends BaseSvgElementArgs {
  type?: ElementValue
  tableValues?: ElementValue
  slope?: ElementValue
  intercept?: ElementValue
  amplitude?: ElementValue
  exponent?: ElementValue
  offset?: ElementValue
}

/**
 * feComposite element attributes.
 */
export interface FeCompositeElementArgs extends FilterPrimitiveElementArgs {
  in2?: ElementValue
  operator?: ElementValue
  k1?: ElementValue
  k2?: ElementValue
  k3?: ElementValue
  k4?: ElementValue
}

/**
 * feConvolveMatrix element attributes.
 */
export interface FeConvolveMatrixElementArgs extends FilterPrimitiveElementArgs {
  order?: ElementValue
  kernelMatrix?: ElementValue
  divisor?: ElementValue
  bias?: ElementValue
  targetX?: ElementValue
  targetY?: ElementValue
  edgeMode?: ElementValue
  preserveAlpha?: ElementValue
}

/**
 * feDiffuseLighting element attributes.
 */
export interface FeDiffuseLightingElementArgs extends FilterPrimitiveElementArgs {
  surfaceScale?: ElementValue
  diffuseConstant?: ElementValue
  "lighting-color"?: ElementValue
}

/**
 * feDisplacementMap element attributes.
 */
export interface FeDisplacementMapElementArgs extends FilterPrimitiveElementArgs {
  in2?: ElementValue
  scale?: ElementValue
  xChannelSelector?: ElementValue
  yChannelSelector?: ElementValue
}

/**
 * feDropShadow element attributes.
 */
export interface FeDropShadowElementArgs extends FilterPrimitiveElementArgs {
  dx?: ElementValue
  dy?: ElementValue
  stdDeviation?: ElementValue
  "flood-color"?: ElementValue
  "flood-opacity"?: ElementValue
}

/**
 * feFlood element attributes.
 */
export interface FeFloodElementArgs extends FilterPrimitiveElementArgs {
  "flood-color"?: ElementValue
  "flood-opacity"?: ElementValue
}

/**
 * feGaussianBlur element attributes.
 */
export interface FeGaussianBlurElementArgs extends FilterPrimitiveElementArgs {
  stdDeviation?: ElementValue
  edgeMode?: ElementValue
}

/**
 * feImage element attributes.
 */
export interface FeImageElementArgs extends FilterPrimitiveElementArgs {
  href?: ElementValue
  preserveAspectRatio?: ElementValue
  crossorigin?: ElementValue
}

/**
 * feMerge element attributes.
 */
export interface FeMergeElementArgs extends FilterPrimitiveElementArgs {}

/**
 * feMergeNode element attributes.
 */
export interface FeMergeNodeElementArgs extends BaseSvgElementArgs {
  in?: ElementValue
}

/**
 * feMorphology element attributes.
 */
export interface FeMorphologyElementArgs extends FilterPrimitiveElementArgs {
  operator?: ElementValue
  radius?: ElementValue
}

/**
 * feOffset element attributes.
 */
export interface FeOffsetElementArgs extends FilterPrimitiveElementArgs {
  dx?: ElementValue
  dy?: ElementValue
}

/**
 * feSpecularLighting element attributes.
 */
export interface FeSpecularLightingElementArgs extends FilterPrimitiveElementArgs {
  surfaceScale?: ElementValue
  specularConstant?: ElementValue
  specularExponent?: ElementValue
  "lighting-color"?: ElementValue
}

/**
 * feTile element attributes.
 */
export interface FeTileElementArgs extends FilterPrimitiveElementArgs {}

/**
 * feTurbulence element attributes.
 */
export interface FeTurbulenceElementArgs extends FilterPrimitiveElementArgs {
  baseFrequency?: ElementValue
  numOctaves?: ElementValue
  seed?: ElementValue
  stitchTiles?: ElementValue
  type?: ElementValue
}

/**
 * Light source element attributes.
 */
export interface FeDistantLightElementArgs extends BaseSvgElementArgs {
  azimuth?: ElementValue
  elevation?: ElementValue
}

export interface FePointLightElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  z?: ElementValue
}

export interface FeSpotLightElementArgs extends BaseSvgElementArgs {
  x?: ElementValue
  y?: ElementValue
  z?: ElementValue
  pointsAtX?: ElementValue
  pointsAtY?: ElementValue
  pointsAtZ?: ElementValue
  specularExponent?: ElementValue
  limitingConeAngle?: ElementValue
}

/**
 * Animate element attributes.
 */
export interface AnimateElementArgs extends BaseSvgElementArgs {
  attributeName?: ElementValue
  from?: ElementValue
  to?: ElementValue
  by?: ElementValue
  values?: ElementValue
  dur?: ElementValue
  begin?: ElementValue
  end?: ElementValue
  repeatCount?: ElementValue
  repeatDur?: ElementValue
  fill?: ElementValue
  calcMode?: ElementValue
  keyTimes?: ElementValue
  keySplines?: ElementValue
  additive?: ElementValue
  accumulate?: ElementValue
}

/**
 * AnimateMotion element attributes.
 */
export interface AnimateMotionElementArgs extends AnimateElementArgs {
  path?: ElementValue
  rotate?: ElementValue
  keyPoints?: ElementValue
}

/**
 * AnimateTransform element attributes.
 */
export interface AnimateTransformElementArgs extends AnimateElementArgs {
  type?: ElementValue
}

/**
 * Set element attributes.
 */
export interface SetElementArgs extends BaseSvgElementArgs {
  attributeName?: ElementValue
  to?: ElementValue
  begin?: ElementValue
  end?: ElementValue
  dur?: ElementValue
  fill?: ElementValue
}

/**
 * MPath element attributes.
 */
export interface MPathElementArgs extends BaseSvgElementArgs {
  href?: ElementValue
}

/**
 * A (anchor) element attributes.
 */
export interface AElementArgs extends BaseSvgElementArgs {
  href?: ElementValue
  target?: ElementValue
  download?: ElementValue
  rel?: ElementValue
  hreflang?: ElementValue
  type?: ElementValue
  referrerpolicy?: ElementValue
}

/**
 * Switch element attributes.
 */
export interface SwitchElementArgs extends BaseSvgElementArgs {
  requiredFeatures?: ElementValue
  requiredExtensions?: ElementValue
  systemLanguage?: ElementValue
}

// ============================================================================
// Element Factory Functions
// ============================================================================

function makeEl<Args extends BaseSvgElementArgs>(tag: string) {
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

function makeVoidEl<Args extends BaseSvgElementArgs>(tag: string) {
  return (args?: Args): ElementRenderSpec =>
    args ? [tag, args as ElementArgs] : [tag, {}]
}

/**
 * Create an SVG element with any tag name. Use this for SVG elements
 * not exported by this module. Does not auto-set xmlns.
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
// SVG Root Element (auto-sets xmlns)
// ============================================================================

/**
 * Create an SVG root element. Automatically sets xmlns to the SVG namespace
 * unless explicitly overridden.
 */
export function svg(argsOrChildren?: SvgElementArgs | Children, children?: Children): ElementRenderSpec {
  if (argsOrChildren === undefined) {
    return ["svg", { xmlns: SVG_NAMESPACE }]
  }
  if (children !== undefined) {
    // args and children provided
    const args = argsOrChildren as SvgElementArgs
    return ["svg", { xmlns: SVG_NAMESPACE, ...args } as ElementArgs, children]
  }
  if (isElementArgs(argsOrChildren)) {
    // only args provided
    const args = argsOrChildren as SvgElementArgs
    return ["svg", { xmlns: SVG_NAMESPACE, ...args } as ElementArgs]
  }
  // only children provided
  return ["svg", { xmlns: SVG_NAMESPACE }, argsOrChildren as Children]
}

// ============================================================================
// Container Elements
// ============================================================================

export const g = makeEl<GElementArgs>("g")
export const defs = makeEl<DefsElementArgs>("defs")
export const symbol = makeEl<SymbolElementArgs>("symbol")
export const use = makeVoidEl<UseElementArgs>("use")
export const marker = makeEl<MarkerElementArgs>("marker")
export const clipPath = makeEl<ClipPathElementArgs>("clipPath")
export const mask = makeEl<MaskElementArgs>("mask")
export const pattern = makeEl<PatternElementArgs>("pattern")
export const switch_ = makeEl<SwitchElementArgs>("switch")

// ============================================================================
// Shape Elements
// ============================================================================

export const circle = makeVoidEl<CircleElementArgs>("circle")
export const ellipse = makeVoidEl<EllipseElementArgs>("ellipse")
export const line = makeVoidEl<LineElementArgs>("line")
export const path = makeVoidEl<PathElementArgs>("path")
export const polygon = makeVoidEl<PolygonElementArgs>("polygon")
export const polyline = makeVoidEl<PolylineElementArgs>("polyline")
export const rect = makeVoidEl<RectElementArgs>("rect")

// ============================================================================
// Text Elements
// ============================================================================

export const text = makeEl<TextElementArgs>("text")
export const tspan = makeEl<TSpanElementArgs>("tspan")
export const textPath = makeEl<TextPathElementArgs>("textPath")

// ============================================================================
// Gradient Elements
// ============================================================================

export const linearGradient = makeEl<LinearGradientElementArgs>("linearGradient")
export const radialGradient = makeEl<RadialGradientElementArgs>("radialGradient")
export const stop = makeVoidEl<StopElementArgs>("stop")

// ============================================================================
// Filter Elements
// ============================================================================

export const filter = makeEl<FilterElementArgs>("filter")
export const feBlend = makeVoidEl<FeBlendElementArgs>("feBlend")
export const feColorMatrix = makeVoidEl<FeColorMatrixElementArgs>("feColorMatrix")
export const feComponentTransfer = makeEl<FeComponentTransferElementArgs>("feComponentTransfer")
export const feFuncR = makeVoidEl<FeFuncElementArgs>("feFuncR")
export const feFuncG = makeVoidEl<FeFuncElementArgs>("feFuncG")
export const feFuncB = makeVoidEl<FeFuncElementArgs>("feFuncB")
export const feFuncA = makeVoidEl<FeFuncElementArgs>("feFuncA")
export const feComposite = makeVoidEl<FeCompositeElementArgs>("feComposite")
export const feConvolveMatrix = makeVoidEl<FeConvolveMatrixElementArgs>("feConvolveMatrix")
export const feDiffuseLighting = makeEl<FeDiffuseLightingElementArgs>("feDiffuseLighting")
export const feDisplacementMap = makeVoidEl<FeDisplacementMapElementArgs>("feDisplacementMap")
export const feDropShadow = makeVoidEl<FeDropShadowElementArgs>("feDropShadow")
export const feFlood = makeVoidEl<FeFloodElementArgs>("feFlood")
export const feGaussianBlur = makeVoidEl<FeGaussianBlurElementArgs>("feGaussianBlur")
export const feImage = makeVoidEl<FeImageElementArgs>("feImage")
export const feMerge = makeEl<FeMergeElementArgs>("feMerge")
export const feMergeNode = makeVoidEl<FeMergeNodeElementArgs>("feMergeNode")
export const feMorphology = makeVoidEl<FeMorphologyElementArgs>("feMorphology")
export const feOffset = makeVoidEl<FeOffsetElementArgs>("feOffset")
export const feSpecularLighting = makeEl<FeSpecularLightingElementArgs>("feSpecularLighting")
export const feTile = makeVoidEl<FeTileElementArgs>("feTile")
export const feTurbulence = makeVoidEl<FeTurbulenceElementArgs>("feTurbulence")

// Light sources (children of feDiffuseLighting/feSpecularLighting)
export const feDistantLight = makeVoidEl<FeDistantLightElementArgs>("feDistantLight")
export const fePointLight = makeVoidEl<FePointLightElementArgs>("fePointLight")
export const feSpotLight = makeVoidEl<FeSpotLightElementArgs>("feSpotLight")

// ============================================================================
// Other Elements
// ============================================================================

export const image = makeVoidEl<ImageElementArgs>("image")
export const foreignObject = makeEl<ForeignObjectElementArgs>("foreignObject")
export const a = makeEl<AElementArgs>("a")
export const title = makeEl<BaseSvgElementArgs>("title")
export const desc = makeEl<BaseSvgElementArgs>("desc")
export const metadata = makeEl<BaseSvgElementArgs>("metadata")

// ============================================================================
// Animation Elements
// ============================================================================

export const animate = makeVoidEl<AnimateElementArgs>("animate")
export const animateMotion = makeEl<AnimateMotionElementArgs>("animateMotion")
export const animateTransform = makeVoidEl<AnimateTransformElementArgs>("animateTransform")
export const set = makeVoidEl<SetElementArgs>("set")
export const mpath = makeVoidEl<MPathElementArgs>("mpath")
