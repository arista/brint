import type {
  RenderSpec,
  ElementRenderSpec,
  ElementArgs,
  ElementChildRenderSpecs,
  PrimitiveElementValue,
} from "./index.js"
import { RenderNode } from "./render-node.js"

/**
 * Check if a value is a NullRenderSpec
 */
function isNullRenderSpec(spec: RenderSpec): spec is null | undefined {
  return spec === null || spec === undefined
}

/**
 * Check if a value is a TextRenderSpec (string or number)
 */
function isTextRenderSpec(spec: RenderSpec): spec is string | number {
  return typeof spec === "string" || typeof spec === "number"
}

/**
 * Check if a value is an ElementRenderSpec
 * ElementRenderSpec is an array where the first element is a string (tag name)
 */
function isElementRenderSpec(spec: RenderSpec): spec is ElementRenderSpec {
  return Array.isArray(spec) && typeof spec[0] === "string"
}

/**
 * Check if a value is an ElementArgs object (vs ElementChildRenderSpecs)
 * ElementArgs is a plain object, while ElementChildRenderSpecs is an array or RenderSpec
 */
function isElementArgs(value: unknown): value is ElementArgs {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as ElementArgs).toString === "function"
  )
}

/**
 * Check if a value is an array of RenderSpecs (vs a single array-type RenderSpec)
 * Array-type RenderSpecs (Element, Fragment, List, Component) all have a specific first element:
 * - ElementRenderSpec: first element is a string
 * - FragmentRenderSpec: first element is null
 * - ListRenderSpec: first element is a symbol
 * - ComponentRenderSpec: first element is a function
 *
 * If the first element is none of these, it's an array of RenderSpecs.
 */
function isRenderSpecArray(value: unknown): value is RenderSpec[] {
  if (!Array.isArray(value)) {
    return false
  }
  if (value.length === 0) {
    return true // Empty array is treated as array of children
  }
  const first = value[0]
  // If first element is string, null, symbol, or function, it's a single RenderSpec
  if (
    typeof first === "string" ||
    first === null ||
    typeof first === "symbol" ||
    typeof first === "function"
  ) {
    return false
  }
  // Otherwise, it's an array of RenderSpecs
  return true
}

/**
 * Parse an ElementRenderSpec into its components
 */
function parseElementRenderSpec(spec: ElementRenderSpec): {
  tagName: string
  args: ElementArgs | null
  children: ElementChildRenderSpecs | null
} {
  const [tagName, second, third] = spec

  if (second === undefined) {
    // [tagName]
    return { tagName, args: null, children: null }
  }

  if (third !== undefined) {
    // [tagName, args, children]
    return { tagName, args: second as ElementArgs, children: third as ElementChildRenderSpecs }
  }

  // [tagName, second] - need to determine if second is args or children
  if (isElementArgs(second)) {
    return { tagName, args: second, children: null }
  } else {
    return { tagName, args: null, children: second as ElementChildRenderSpecs }
  }
}

/**
 * Render an ElementValue to a string for attribute setting.
 * For Phase 2, we only handle primitive values (no arrays or functions).
 */
function renderPrimitiveElementValue(value: PrimitiveElementValue): string | true | null {
  if (value === null || value === undefined) {
    return null
  }
  if (value === true) {
    return true
  }
  if (value === false) {
    return null
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    return String(value)
  }
  return null
}

/**
 * Apply static attributes to a DOM element.
 * For Phase 2, we skip style, on, properties, and xmlns special handling.
 * We only handle primitive attribute values (no arrays or functions).
 */
function applyStaticAttributes(element: Element, args: ElementArgs): void {
  for (const [key, value] of Object.entries(args)) {
    // Skip special keys for now (Phase 3)
    if (key === "style" || key === "on" || key === "properties" || key === "xmlns") {
      continue
    }

    // For Phase 2, only handle primitive values
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined
    ) {
      const rendered = renderPrimitiveElementValue(value)

      if (rendered === null) {
        element.removeAttribute(key)
      } else if (rendered === true) {
        element.setAttribute(key, key)
      } else {
        element.setAttribute(key, rendered)
      }
    }
    // Skip arrays and functions for now (Phase 5)
  }
}

/**
 * Render a RenderSpec into a RenderNode, optionally inserting into the DOM.
 *
 * @param spec The RenderSpec to render
 * @param parentNode Optional parent RenderNode for tree structure
 * @param parentDomNode Optional parent DOM node for insertion
 * @param xmlns The inherited XML namespace
 */
export function render(
  spec: RenderSpec,
  parentNode: RenderNode | null = null,
  parentDomNode: Node | null = null,
  xmlns: string | null = null,
): RenderNode {
  const renderNode = new RenderNode(spec)
  renderNode.xmlns = xmlns

  if (parentNode) {
    parentNode.appendChild(renderNode)
  }

  if (isNullRenderSpec(spec)) {
    // NullRenderSpec: no DOM node, just a placeholder in the tree
    return renderNode
  }

  if (isTextRenderSpec(spec)) {
    // TextRenderSpec: create a Text node
    const textContent = typeof spec === "number" ? String(spec) : spec
    const textNode = document.createTextNode(textContent)
    renderNode.node = textNode

    if (parentDomNode) {
      insertDomNode(renderNode, parentDomNode)
    }

    return renderNode
  }

  if (isElementRenderSpec(spec)) {
    // ElementRenderSpec: create an Element
    const { tagName, args, children } = parseElementRenderSpec(spec)

    // Determine namespace
    let elementXmlns = xmlns
    if (args?.xmlns) {
      elementXmlns = args.xmlns
    }
    renderNode.xmlns = elementXmlns

    // Create element with appropriate namespace
    let element: Element
    if (elementXmlns) {
      element = document.createElementNS(elementXmlns, tagName)
    } else {
      element = document.createElement(tagName)
    }

    renderNode.node = element

    // Apply static attributes
    if (args) {
      applyStaticAttributes(element, args)
    }

    // Insert into DOM
    if (parentDomNode) {
      insertDomNode(renderNode, parentDomNode)
    }

    // Render children
    if (children !== null) {
      const childSpecs: RenderSpec[] = isRenderSpecArray(children) ? children : [children]
      for (const childSpec of childSpecs) {
        render(childSpec, renderNode, element, elementXmlns)
      }
    }

    return renderNode
  }

  // For Phase 2, we don't handle FunctionRenderSpec, ComponentRenderSpec,
  // FragmentRenderSpec, or ListRenderSpec yet.
  // Just return an empty RenderNode.
  return renderNode
}

/**
 * Insert a RenderNode's DOM node into the parent DOM node at the correct position.
 */
function insertDomNode(renderNode: RenderNode, parentDomNode: Node): void {
  const domNode = renderNode.node
  if (!domNode) return

  // Find the previous sibling's DOM node to insert after
  const prevDomNode = renderNode.findPreviousDomNode()

  if (prevDomNode && prevDomNode.parentNode === parentDomNode) {
    // Insert after the previous sibling
    parentDomNode.insertBefore(domNode, prevDomNode.nextSibling)
  } else {
    // Insert at the beginning or append
    const firstChild = parentDomNode.firstChild
    if (firstChild) {
      parentDomNode.insertBefore(domNode, firstChild)
    } else {
      parentDomNode.appendChild(domNode)
    }
  }
}

/**
 * Unmount a RenderNode tree, removing all DOM nodes and cleaning up.
 */
export function unmount(renderNode: RenderNode): void {
  renderNode.remove()
}
