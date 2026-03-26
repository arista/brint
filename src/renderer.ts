import type { ChangeDomain, CachedFunction, Change, SubscriptionListener } from "chchchchanges"
import type {
  RenderSpec,
  ElementRenderSpec,
  ElementArgs,
  ElementChildRenderSpecs,
  FragmentRenderSpec,
  FunctionRenderSpec,
  RenderContext,
  ListRenderSpec,
  ListItemsSpec,
} from "./index.js"
import { List } from "./index.js"
import {
  RenderNode,
  type ReactiveElementValue,
  type RenderNodeEventListener,
} from "./render-node.js"

/**
 * Result of converting an ElementValue to a ReactiveElementValue
 */
interface ReactiveElementResult {
  value: ReactiveElementValue
  isReactive: boolean
}

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
 * ElementRenderSpec is an array where:
 * - First element is a string (tag name)
 * - Second element is an ElementArgs object (not an array, not null)
 * This distinguishes it from RenderSpec[] which may start with a string (TextRenderSpec).
 */
function isElementRenderSpec(spec: RenderSpec): spec is ElementRenderSpec {
  return (
    Array.isArray(spec) &&
    spec.length >= 2 &&
    typeof spec[0] === "string" &&
    typeof spec[1] === "object" &&
    spec[1] !== null &&
    !Array.isArray(spec[1])
  )
}

/**
 * Check if a value is a FragmentRenderSpec
 * FragmentRenderSpec is an array where the first element is null
 */
function isFragmentRenderSpec(spec: RenderSpec): spec is FragmentRenderSpec {
  return Array.isArray(spec) && spec[0] === null
}

/**
 * Check if a value is a FunctionRenderSpec
 * FunctionRenderSpec is a function (not in an array)
 */
function isFunctionRenderSpec(spec: RenderSpec): spec is FunctionRenderSpec {
  return typeof spec === "function"
}

/**
 * Check if a value is a ListRenderSpec
 * ListRenderSpec is an array where the first element is the List symbol
 */
function isListRenderSpec(spec: RenderSpec): spec is ListRenderSpec {
  return Array.isArray(spec) && spec[0] === List
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
 * Array-type RenderSpecs (Element, Fragment, List) have specific patterns:
 * - ElementRenderSpec: first element is a string AND second is an object (args)
 * - FragmentRenderSpec: first element is null
 * - ListRenderSpec: first element is the List symbol
 *
 * If the array doesn't match any of these patterns, it's an array of RenderSpecs.
 */
function isRenderSpecArray(value: unknown): value is RenderSpec[] {
  if (!Array.isArray(value)) {
    return false
  }
  if (value.length === 0) {
    return true // Empty array is treated as array of children
  }
  const first = value[0]
  // FragmentRenderSpec: first element is null
  if (first === null) {
    return false
  }
  // ListRenderSpec: first element is a symbol
  if (typeof first === "symbol") {
    return false
  }
  // ElementRenderSpec: first element is string AND second is an object (args)
  if (typeof first === "string") {
    const second = value[1]
    if (typeof second === "object" && second !== null && !Array.isArray(second)) {
      return false // It's an ElementRenderSpec
    }
    // Otherwise it's an array of RenderSpecs starting with a TextRenderSpec
    return true
  }
  // Otherwise, it's an array of RenderSpecs
  return true
}

/**
 * Convert an ElementValue to a ReactiveElementValue.
 * Functions are wrapped in CachedFunctions that will trigger onChange when invalidated.
 *
 * @param value The ElementValue to convert
 * @param domain The ChangeDomain for creating CachedFunctions
 * @param onChange Callback to invoke when any reactive value changes
 * @param renderNode The RenderNode to register cleanup functions with
 */
function elementValueToReactiveElementValue(
  value: unknown,
  domain: ChangeDomain,
  onChange: () => void,
  renderNode: RenderNode,
): ReactiveElementResult {
  // Primitive values are not reactive
  if (value === null || value === undefined) {
    return { value, isReactive: false }
  }
  if (typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
    return { value, isReactive: false }
  }

  // Functions are wrapped in CachedFunctions
  if (typeof value === "function") {
    const cf = domain.createCachedFunction(value as () => unknown)
    cf.addListener(onChange)
    renderNode.addCleanup(cf)
    return { value: cf, isReactive: true }
  }

  // Arrays are processed recursively
  if (Array.isArray(value)) {
    let hasReactive = false
    const result: ReactiveElementValue[] = []

    for (const item of value) {
      const converted = elementValueToReactiveElementValue(item, domain, onChange, renderNode)
      result.push(converted.value)
      if (converted.isReactive) {
        hasReactive = true
      }
    }

    return { value: result, isReactive: hasReactive }
  }

  // Unknown types are treated as non-reactive null
  return { value: null, isReactive: false }
}

/**
 * Check if a value is a CachedFunction
 */
function isCachedFunction(value: unknown): value is CachedFunction<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "call" in value &&
    "remove" in value &&
    typeof (value as CachedFunction<unknown>).call === "function"
  )
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
 * Render a ReactiveElementValue array to a flattened, space-joined string.
 * Evaluates CachedFunctions and skips null, undefined, and booleans.
 */
function renderReactiveArrayValue(value: ReactiveElementValue[]): string | null {
  const rendered: string[] = []

  function processItem(item: ReactiveElementValue): void {
    // Skip null, undefined, and booleans (both true and false in arrays)
    if (item === null || item === undefined || typeof item === "boolean") {
      return
    }
    if (typeof item === "string") {
      rendered.push(item)
      return
    }
    if (typeof item === "number") {
      rendered.push(String(item))
      return
    }
    if (Array.isArray(item)) {
      for (const nested of item) {
        processItem(nested)
      }
      return
    }
    // CachedFunction: evaluate and process result
    if (isCachedFunction(item)) {
      const result = item.call()
      processItem(result as ReactiveElementValue)
      return
    }
  }

  for (const item of value) {
    processItem(item)
  }

  if (rendered.length === 0) {
    return null
  }
  return rendered.join(" ")
}

/**
 * Render a ReactiveElementValue to a string, true, or null for attribute/style setting.
 * Evaluates CachedFunctions when encountered.
 */
function renderReactiveElementValue(value: ReactiveElementValue): string | true | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === "boolean") {
    return value ? true : null
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    return String(value)
  }
  if (Array.isArray(value)) {
    return renderReactiveArrayValue(value)
  }
  // CachedFunction: evaluate and render the result
  if (isCachedFunction(value)) {
    const result = value.call()
    return renderReactiveElementValue(result as ReactiveElementValue)
  }
  return null
}

/**
 * Apply a single attribute value to an element
 */
function applyAttributeValue(element: Element, key: string, value: ReactiveElementValue): void {
  const rendered = renderReactiveElementValue(value)

  if (rendered === null) {
    element.removeAttribute(key)
  } else if (rendered === true) {
    element.setAttribute(key, key)
  } else {
    element.setAttribute(key, rendered)
  }
}

/**
 * Apply attributes to a DOM element, supporting reactive values.
 */
function applyAttributes(
  element: Element,
  args: ElementArgs,
  domain: ChangeDomain,
  renderNode: RenderNode,
): void {
  for (const [key, value] of Object.entries(args)) {
    // Skip special keys - handled separately
    if (key === "style" || key === "on" || key === "properties" || key === "xmlns") {
      continue
    }

    // Convert to reactive value
    const update = () => {
      const reactiveAttr = renderNode.reactiveAttributes?.get(key)
      if (reactiveAttr) {
        applyAttributeValue(element, key, reactiveAttr.value)
      }
    }

    const { value: reactiveValue, isReactive } = elementValueToReactiveElementValue(
      value,
      domain,
      update,
      renderNode,
    )

    // Apply the initial value
    applyAttributeValue(element, key, reactiveValue)

    // If reactive, store for updates
    if (isReactive) {
      if (!renderNode.reactiveAttributes) {
        renderNode.reactiveAttributes = new Map()
      }
      renderNode.reactiveAttributes.set(key, { value: reactiveValue, update })
    }
  }
}

/**
 * Apply a single style value to an element
 */
function applyStyleValue(
  elementWithStyle: Element & { style: CSSStyleDeclaration },
  property: string,
  value: ReactiveElementValue,
): void {
  const rendered = renderReactiveElementValue(value)

  if (rendered === true) {
    // Boolean true is not valid for style properties
    console.error(`Invalid style value: true for property "${property}"`)
    return
  }

  if (rendered === null) {
    // Remove the style property
    elementWithStyle.style.removeProperty(property)
  } else {
    // Set the style property
    // Note: camelCase properties need to use bracket notation
    ;(elementWithStyle.style as unknown as Record<string, string>)[property] = rendered
  }
}

/**
 * Apply styles to a DOM element, supporting reactive values.
 * Style properties use camelCase (matching DOM API).
 */
function applyStyles(
  element: Element,
  styles: Record<string, unknown>,
  domain: ChangeDomain,
  renderNode: RenderNode,
): void {
  // Check if element has a style property (HTMLElement or SVGElement)
  const elementWithStyle = element as Element & { style?: CSSStyleDeclaration }
  if (!elementWithStyle.style) {
    return
  }

  for (const [property, value] of Object.entries(styles)) {
    // Convert to reactive value
    const update = () => {
      const reactiveStyle = renderNode.reactiveStyles?.get(property)
      if (reactiveStyle) {
        applyStyleValue(
          elementWithStyle as Element & { style: CSSStyleDeclaration },
          property,
          reactiveStyle.value,
        )
      }
    }

    const { value: reactiveValue, isReactive } = elementValueToReactiveElementValue(
      value,
      domain,
      update,
      renderNode,
    )

    // Apply the initial value
    applyStyleValue(
      elementWithStyle as Element & { style: CSSStyleDeclaration },
      property,
      reactiveValue,
    )

    // If reactive, store for updates
    if (isReactive) {
      if (!renderNode.reactiveStyles) {
        renderNode.reactiveStyles = new Map()
      }
      renderNode.reactiveStyles.set(property, { value: reactiveValue, update })
    }
  }
}

/**
 * Apply event listeners to a DOM element and track them on RenderNode for cleanup.
 * Supports both simple functions and objects with listener + options.
 */
function applyEventListeners(
  element: Element,
  handlers: Record<string, unknown>,
  renderNode: RenderNode,
): void {
  for (const [eventName, handler] of Object.entries(handlers)) {
    if (handler === null || handler === undefined) {
      continue
    }

    let listenerEntry: RenderNodeEventListener | null = null

    if (typeof handler === "function") {
      element.addEventListener(eventName, handler as EventListener)
      listenerEntry = { handler: handler as EventListener }
    } else if (typeof handler === "object" && "listener" in handler) {
      const { listener, options } = handler as {
        listener: EventListener
        options?: AddEventListenerOptions
      }
      element.addEventListener(eventName, listener, options)
      listenerEntry = { handler: listener, options }
    }

    // Track the listener on the RenderNode for cleanup
    if (listenerEntry) {
      if (!renderNode.eventListeners) {
        renderNode.eventListeners = new Map()
      }
      renderNode.eventListeners.set(eventName, listenerEntry)
    }
  }
}

/**
 * Remove all tracked event listeners from a DOM element.
 */
function removeEventListeners(element: Element, renderNode: RenderNode): void {
  if (!renderNode.eventListeners) return

  for (const [eventName, { handler, options }] of renderNode.eventListeners) {
    element.removeEventListener(eventName, handler, options)
  }
  renderNode.eventListeners = null
}

/**
 * Apply a single property to an element
 */
function applyPropertyValue(
  element: Element,
  key: string | symbol,
  value: unknown,
): void {
  ;(element as unknown as Record<string | symbol, unknown>)[key] = value
}

/**
 * Apply properties directly to a DOM element, supporting reactive values.
 * Function values are wrapped in CachedFunctions.
 */
function applyProperties(
  element: Element,
  properties: Record<string | symbol, unknown>,
  domain: ChangeDomain,
  renderNode: RenderNode,
): void {
  // Process string keys
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "function") {
      // Wrap function in CachedFunction
      const cf = domain.createCachedFunction(value as () => unknown)
      const update = () => {
        const result = cf.call()
        applyPropertyValue(element, key, result)
      }

      // Register for cleanup
      renderNode.addCleanup(cf)

      // Add listener for updates
      cf.addListener(update)

      // Apply initial value
      const initialValue = cf.call()
      applyPropertyValue(element, key, initialValue)

      // Store for tracking
      if (!renderNode.reactiveProperties) {
        renderNode.reactiveProperties = new Map()
      }
      renderNode.reactiveProperties.set(key, { cachedFunction: cf, update })
    } else {
      // Static value - apply directly
      applyPropertyValue(element, key, value)
    }
  }

  // Handle symbol keys
  const symbolKeys = Object.getOwnPropertySymbols(properties)
  for (const key of symbolKeys) {
    const value = properties[key]

    if (typeof value === "function") {
      // Wrap function in CachedFunction
      const cf = domain.createCachedFunction(value as () => unknown)
      const update = () => {
        const result = cf.call()
        applyPropertyValue(element, key, result)
      }

      // Register for cleanup
      renderNode.addCleanup(cf)

      // Add listener for updates
      cf.addListener(update)

      // Apply initial value
      const initialValue = cf.call()
      applyPropertyValue(element, key, initialValue)

      // Store for tracking
      if (!renderNode.reactiveProperties) {
        renderNode.reactiveProperties = new Map()
      }
      renderNode.reactiveProperties.set(key, { cachedFunction: cf, update })
    } else {
      // Static value - apply directly
      applyPropertyValue(element, key, value)
    }
  }
}

/**
 * Render a RenderSpec into a RenderNode, optionally inserting into the DOM.
 *
 * @param spec The RenderSpec to render
 * @param parentNode Optional parent RenderNode for tree structure
 * @param parentDomNode Optional parent DOM node for insertion
 * @param xmlns The inherited XML namespace
 * @param domain The ChangeDomain for reactive values
 */
export function render(
  spec: RenderSpec,
  parentNode: RenderNode | null,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
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
      try {
        element = document.createElement(tagName)
      } 
      catch(e) {
        throw e
      }
    }

    renderNode.node = element

    // Apply attributes, styles, event listeners, and properties
    if (args) {
      applyAttributes(element, args, domain, renderNode)

      if (args.style) {
        applyStyles(element, args.style, domain, renderNode)
      }

      if (args.on) {
        applyEventListeners(element, args.on, renderNode)
      }

      if (args.properties) {
        applyProperties(element, args.properties, domain, renderNode)
      }
    }

    // Insert into DOM
    if (parentDomNode) {
      insertDomNode(renderNode, parentDomNode)
    }

    // Render children
    if (children !== null) {
      const childSpecs: RenderSpec[] = isRenderSpecArray(children) ? children : [children]
      for (const childSpec of childSpecs) {
        render(childSpec, renderNode, element, elementXmlns, domain)
      }
    }

    return renderNode
  }

  if (isFragmentRenderSpec(spec)) {
    // FragmentRenderSpec: no DOM node, but children become siblings in parent's DOM
    // The spec is [null, ...children]
    const childSpecs = spec.slice(1) as RenderSpec[]

    // Find the actual parent DOM node by walking up through DOM-less ancestors
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()

    // Render each child
    for (const childSpec of childSpecs) {
      render(childSpec, renderNode, actualParentDomNode, xmlns, domain)
    }

    return renderNode
  }

  if (isFunctionRenderSpec(spec)) {
    // FunctionRenderSpec: wrap function in CachedFunction, render result as child
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()
    const childSpec = setupFunctionSpec(renderNode, spec, actualParentDomNode, xmlns, domain)
    render(childSpec, renderNode, actualParentDomNode, xmlns, domain)
    // Call onMount callbacks after children are rendered (bottom-up order)
    callOnMountCallbacks(renderNode)
    return renderNode
  }

  if (isListRenderSpec(spec)) {
    // ListRenderSpec: wrap items in CachedFunction, render each item as a child
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()
    setupListSpec(renderNode, spec, actualParentDomNode, xmlns, domain)
    return renderNode
  }

  // Unknown RenderSpec type - return empty RenderNode
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
 * Insert all DOM nodes for a RenderNode (handles fragments that have multiple DOM nodes)
 */
function insertDomNodeForRenderNode(renderNode: RenderNode, parentDomNode: Node): void {
  if (renderNode.node) {
    // Simple case: single DOM node
    insertDomNode(renderNode, parentDomNode)
  } else {
    // Fragment or DOM-less node: insert all children's DOM nodes
    for (const child of renderNode.children) {
      insertDomNodeForRenderNode(child, parentDomNode)
    }
  }
}

/**
 * Clean up a RenderNode's internal state (CachedFunctions, etc.) without removing from parent
 */
function cleanupRenderNode(renderNode: RenderNode): void {
  // Clean up this node's reactive state
  if (renderNode.reactiveAttributes) {
    renderNode.reactiveAttributes = null
  }
  if (renderNode.reactiveStyles) {
    renderNode.reactiveStyles = null
  }
  if (renderNode.reactiveProperties) {
    renderNode.reactiveProperties = null
  }
  if (renderNode.functionCachedFunction) {
    renderNode.functionCachedFunction.remove()
    renderNode.functionCachedFunction = null
  }
  if (renderNode.listItemsCachedFunction) {
    renderNode.listItemsCachedFunction.remove()
    renderNode.listItemsCachedFunction = null
  }
  renderNode.listItemsListener = null
  renderNode.list = null

  // Recursively clean up children
  for (const child of renderNode.children) {
    cleanupRenderNode(child)
    // Also remove child's DOM node
    if (child.node && child.node.parentNode) {
      child.node.parentNode.removeChild(child.node)
    }
  }
  renderNode.children = []
}

/**
 * Move a RenderNode from its current position to a new index within the same parent.
 * Assumes the node is already a child of the parent.
 */
function moveChildToIndex(parent: RenderNode, child: RenderNode, newIndex: number, parentDomNode: Node | null): void {
  const currentIndex = parent.children.indexOf(child)
  if (currentIndex === -1 || currentIndex === newIndex) return

  // Remove from current position
  parent.children.splice(currentIndex, 1)

  // Update sibling links at old position
  if (child.prev) {
    child.prev.next = child.next
  }
  if (child.next) {
    child.next.prev = child.prev
  }

  // Insert at new position
  parent.children.splice(newIndex, 0, child)

  // Update sibling links at new position
  const prevSibling = newIndex > 0 ? parent.children[newIndex - 1] : null
  const nextSibling = parent.children[newIndex + 1] ?? null

  child.prev = prevSibling ?? null
  child.next = nextSibling

  if (prevSibling) {
    prevSibling.next = child
  }
  if (nextSibling) {
    nextSibling.prev = child
  }

  // Move DOM nodes to correct position
  if (parentDomNode) {
    // Remove DOM nodes
    if (child.node) {
      if (child.node.parentNode) {
        child.node.parentNode.removeChild(child.node)
      }
    } else {
      // For fragments, remove all child DOM nodes
      const collectDomNodes = (rn: RenderNode): Node[] => {
        if (rn.node) return [rn.node]
        return rn.children.flatMap(collectDomNodes)
      }
      for (const domNode of collectDomNodes(child)) {
        if (domNode.parentNode) {
          domNode.parentNode.removeChild(domNode)
        }
      }
    }

    // Re-insert at correct position
    insertDomNodeForRenderNode(child, parentDomNode)
  }
}

/**
 * Render a new RenderSpec over an existing RenderNode's children.
 * This implements basic reconciliation - reusing nodes where possible.
 *
 * @param spec The new RenderSpec to render
 * @param parentNode The parent RenderNode (whose children will be updated)
 * @param parentDomNode The parent DOM node for insertion
 * @param xmlns The inherited XML namespace
 * @param domain The ChangeDomain for reactive values
 */
function renderOver(
  spec: RenderSpec,
  parentNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  const existingChild = parentNode.children[0]

  // If we can reconcile with the existing child, do so
  if (existingChild && canReconcile(spec, existingChild)) {
    reconcile(spec, existingChild, parentDomNode, xmlns, domain)
    return
  }

  // Otherwise, remove all existing children and render fresh
  const childrenToRemove = [...parentNode.children]
  for (const child of childrenToRemove) {
    child.remove()
  }

  // Render the new spec
  render(spec, parentNode, parentDomNode, xmlns, domain)
}

/**
 * Check if a new RenderSpec can be reconciled with an existing RenderNode.
 * Returns true if they are the same "type" and can be reused.
 */
function canReconcile(spec: RenderSpec, existingNode: RenderNode): boolean {
  const existingSpec = existingNode.spec

  // NullRenderSpec can reconcile with NullRenderSpec
  if (isNullRenderSpec(spec) && isNullRenderSpec(existingSpec)) {
    return true
  }

  // TextRenderSpec can reconcile with TextRenderSpec
  if (isTextRenderSpec(spec) && isTextRenderSpec(existingSpec)) {
    return true
  }

  // ElementRenderSpec can reconcile with same tag/namespace ElementRenderSpec
  if (isElementRenderSpec(spec) && isElementRenderSpec(existingSpec)) {
    const newParsed = parseElementRenderSpec(spec)
    const existingParsed = parseElementRenderSpec(existingSpec)

    // Same tag name
    if (newParsed.tagName !== existingParsed.tagName) {
      return false
    }

    // Same namespace (check xmlns from args)
    const newXmlns = newParsed.args?.xmlns
    const existingXmlns = existingParsed.args?.xmlns
    if (newXmlns !== existingXmlns) {
      return false
    }

    return true
  }

  // FunctionRenderSpec, FragmentRenderSpec, etc. - DOM-less nodes can reconcile
  // with other DOM-less nodes of the same type
  if (isFunctionRenderSpec(spec) && isFunctionRenderSpec(existingSpec)) {
    return true
  }

  if (isFragmentRenderSpec(spec) && isFragmentRenderSpec(existingSpec)) {
    return true
  }

  if (isListRenderSpec(spec) && isListRenderSpec(existingSpec)) {
    return true
  }

  return false
}

/**
 * Reconcile a RenderSpec with an existing RenderNode, updating in place.
 */
function reconcile(
  spec: RenderSpec,
  existingNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  // Update the spec reference
  existingNode.spec = spec

  // Handle based on type
  if (isNullRenderSpec(spec)) {
    // NullRenderSpec: nothing to update, just clean up leftover children
    cleanupLeftoverChildren(existingNode, 0)
    return
  }

  if (isTextRenderSpec(spec)) {
    // TextRenderSpec: update the text content
    const newText = typeof spec === "number" ? String(spec) : spec
    if (existingNode.node) {
      existingNode.node.textContent = newText
    }
    cleanupLeftoverChildren(existingNode, 0)
    return
  }

  if (isElementRenderSpec(spec)) {
    // ElementRenderSpec: reconcile attributes, styles, properties, event listeners, and children
    reconcileElement(spec, existingNode, parentDomNode, xmlns, domain)
    return
  }

  if (isFragmentRenderSpec(spec)) {
    // FragmentRenderSpec: reconcile children
    const childSpecs = spec.slice(1) as RenderSpec[]
    const actualParentDomNode = parentDomNode || existingNode.findParentDomNode()
    reconcileChildren(childSpecs, existingNode, actualParentDomNode, xmlns, domain)
    return
  }

  if (isFunctionRenderSpec(spec)) {
    // FunctionRenderSpec: clean up old CachedFunction, set up new one
    reconcileFunctionSpec(spec, existingNode, parentDomNode, xmlns, domain)
    return
  }

  if (isListRenderSpec(spec)) {
    // ListRenderSpec: clean up old state, set up new list
    reconcileListSpec(spec, existingNode, parentDomNode, xmlns, domain)
    return
  }

  // Unknown type: full replacement
  const parent = existingNode.parent
  if (parent) {
    existingNode.remove()
    render(spec, parent, parentDomNode, xmlns, domain)
  }
}

/**
 * Clean up children beyond the specified index
 */
function cleanupLeftoverChildren(node: RenderNode, keepCount: number): void {
  while (node.children.length > keepCount) {
    const child = node.children[node.children.length - 1]!
    child.remove()
  }
}

/**
 * Reconcile children of a node with new child specs
 */
function reconcileChildren(
  childSpecs: RenderSpec[],
  parentNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  // Reconcile each child
  for (let i = 0; i < childSpecs.length; i++) {
    const childSpec = childSpecs[i]!
    const existingChild = parentNode.children[i]

    if (existingChild && canReconcile(childSpec, existingChild)) {
      // Reconcile existing child
      reconcile(childSpec, existingChild, parentDomNode, xmlns, domain)
    } else if (existingChild) {
      // Can't reconcile - remove and render fresh
      existingChild.remove()
      // Render new child at this position
      const newChild = render(childSpec, null, parentDomNode, xmlns, domain)
      // Insert at the correct position
      parentNode.insertChildAt(i, newChild)
    } else {
      // No existing child - render new one
      render(childSpec, parentNode, parentDomNode, xmlns, domain)
    }
  }

  // Clean up leftover children
  cleanupLeftoverChildren(parentNode, childSpecs.length)
}

/**
 * Reconcile an ElementRenderSpec with an existing element RenderNode
 */
function reconcileElement(
  spec: ElementRenderSpec,
  existingNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  const element = existingNode.node as Element
  if (!element) return

  const { args, children } = parseElementRenderSpec(spec)

  // Clean up old reactive state
  clearReactiveState(existingNode)

  // Get old attribute names from the element
  const oldAttrNames = new Set<string>()
  for (let i = 0; i < element.attributes.length; i++) {
    oldAttrNames.add(element.attributes[i]!.name)
  }

  // Apply new attributes and track which ones we're keeping
  const newAttrNames = new Set<string>()
  if (args) {
    for (const key of Object.keys(args)) {
      if (key === "style" || key === "on" || key === "properties" || key === "xmlns") {
        continue
      }
      newAttrNames.add(key)
    }
    applyAttributes(element, args, domain, existingNode)
  }

  // Remove old attributes that are no longer present
  for (const oldName of oldAttrNames) {
    if (!newAttrNames.has(oldName)) {
      element.removeAttribute(oldName)
    }
  }

  // Handle styles
  const elementWithStyle = element as Element & { style?: CSSStyleDeclaration }
  if (elementWithStyle.style) {
    // Get old style property names
    const oldStyleNames = new Set<string>()
    for (let i = 0; i < elementWithStyle.style.length; i++) {
      oldStyleNames.add(elementWithStyle.style[i]!)
    }

    // Apply new styles
    const newStyleNames = new Set<string>()
    if (args?.style) {
      for (const key of Object.keys(args.style)) {
        newStyleNames.add(key)
      }
      applyStyles(element, args.style, domain, existingNode)
    }

    // Remove old styles that are no longer present
    for (const oldName of oldStyleNames) {
      if (!newStyleNames.has(oldName)) {
        elementWithStyle.style.removeProperty(oldName)
      }
    }
  }

  // Handle event listeners - remove old listeners, then add new ones
  removeEventListeners(element, existingNode)
  if (args?.on) {
    applyEventListeners(element, args.on, existingNode)
  }

  // Handle properties
  if (args?.properties) {
    applyProperties(element, args.properties, domain, existingNode)
  }

  // Reconcile children
  const childSpecs: RenderSpec[] = children
    ? isRenderSpecArray(children)
      ? children
      : [children]
    : []
  reconcileChildren(childSpecs, existingNode, element, existingNode.xmlns, domain)
}

/**
 * Clear reactive state from a RenderNode (without removing the node itself)
 * Note: Event listeners are handled separately in reconcileElement since they
 * need the element reference for removeEventListener calls.
 */
function clearReactiveState(node: RenderNode): void {
  // Clean up reactive attributes
  if (node.reactiveAttributes) {
    node.reactiveAttributes = null
  }

  // Clean up reactive styles
  if (node.reactiveStyles) {
    node.reactiveStyles = null
  }

  // Clean up reactive properties
  if (node.reactiveProperties) {
    node.reactiveProperties = null
  }
}

/**
 * Create a RenderContext for a RenderNode.
 * The state is change-enabled via the ChangeDomain.
 */
function createRenderContext(renderNode: RenderNode, domain: ChangeDomain): RenderContext {
  // Initialize state as change-enabled
  renderNode.contextState = domain.enableChanges({}, `RenderContext.state`)

  return {
    get state() {
      return renderNode.contextState
    },
    set state(value: unknown) {
      renderNode.contextState = domain.enableChanges(value, `RenderContext.state`)
    },
    onMount(callback: (node: Node | null) => void | (() => void)) {
      if (!renderNode.onMountCallbacks) {
        renderNode.onMountCallbacks = []
      }
      renderNode.onMountCallbacks.push(callback)
    },
  }
}

/**
 * Call all registered onMount callbacks for a RenderNode.
 * Should be called after children are rendered (bottom-up order).
 * Stores any returned cleanup functions.
 */
function callOnMountCallbacks(renderNode: RenderNode): void {
  if (!renderNode.onMountCallbacks) return

  for (const callback of renderNode.onMountCallbacks) {
    const cleanup = callback(renderNode.node)
    if (typeof cleanup === "function") {
      if (!renderNode.lifecycleCleanups) {
        renderNode.lifecycleCleanups = []
      }
      renderNode.lifecycleCleanups.push(cleanup)
    }
  }
}

/**
 * Set up a FunctionRenderSpec on a RenderNode.
 * Creates the CachedFunction, sets up the re-render listener, and returns the initial child spec.
 * This is shared between initial render and reconciliation.
 */
function setupFunctionSpec(
  renderNode: RenderNode,
  spec: FunctionRenderSpec,
  actualParentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): RenderSpec {
  const ctx = createRenderContext(renderNode, domain)

  // Create CachedFunction wrapping the render function
  const cf = domain.createCachedFunction(() => spec(ctx))
  renderNode.functionCachedFunction = cf

  // Get initial child spec
  const childSpec = cf.call() as RenderSpec

  // Set up listener for re-rendering on invalidation
  cf.addListener(() => {
    const newChildSpec = cf.call() as RenderSpec
    renderOver(newChildSpec, renderNode, actualParentDomNode, xmlns, domain)
  })

  return childSpec
}

/**
 * Set up a ListRenderSpec on a RenderNode.
 * Creates helpers, sets up subscription, renders items, and sets up the listener.
 * This is shared between initial render and reconciliation.
 */
function setupListSpec(
  renderNode: RenderNode,
  spec: ListRenderSpec,
  actualParentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  const [, listItemsSpec] = spec as [typeof List, ListItemsSpec<unknown>]
  const { items, each } = listItemsSpec

  // Helper to render a single item and return the RenderNode
  const renderItem = (item: unknown, index: number): RenderNode => {
    const childSpec = each(item, index)
    return render(childSpec, renderNode, actualParentDomNode, xmlns, domain)
  }

  // Helper to render all items
  const renderItems = (itemsArray: unknown[]) => {
    for (let i = 0; i < itemsArray.length; i++) {
      renderItem(itemsArray[i], i)
    }
  }

  // Helper to clear and re-render all items (full regeneration)
  const regenerateItems = (itemsArray: unknown[]) => {
    // Remove all existing children
    const childrenToRemove = [...renderNode.children]
    for (const child of childrenToRemove) {
      child.remove()
    }
    // Render new items
    renderItems(itemsArray)
  }

  // Helper to render an item and insert at a specific position
  const renderItemAt = (index: number, item: unknown): RenderNode => {
    // Render the item (appends to end)
    const childRenderNode = renderItem(item, index)
    // Move it to the correct position
    const currentIndex = renderNode.children.indexOf(childRenderNode)
    if (currentIndex !== index && currentIndex !== -1) {
      moveChildToIndex(renderNode, childRenderNode, index, actualParentDomNode)
    }
    return childRenderNode
  }

  // Handle surgical list changes
  const handleListChange = (change: Change) => {
    switch (change.type) {
      case "ArrayPush": {
        // Add new items at the end
        const startIndex = renderNode.children.length
        for (let i = 0; i < change.elements.length; i++) {
          renderItem(change.elements[i], startIndex + i)
        }
        break
      }

      case "ArrayPop": {
        // Remove the last child
        const lastIndex = renderNode.children.length - 1
        if (lastIndex >= 0) {
          const child = renderNode.removeChildAt(lastIndex)
          if (child) {
            // Remove DOM nodes and clean up
            if (child.node && child.node.parentNode) {
              child.node.parentNode.removeChild(child.node)
            }
            // Clean up the child's internal state
            cleanupRenderNode(child)
          }
        }
        break
      }

      case "ArrayShift": {
        // Remove the first child
        if (renderNode.children.length > 0) {
          const child = renderNode.removeChildAt(0)
          if (child) {
            if (child.node && child.node.parentNode) {
              child.node.parentNode.removeChild(child.node)
            }
            cleanupRenderNode(child)
          }
        }
        break
      }

      case "ArrayUnshift": {
        // Add new items at the beginning
        for (let i = change.elements.length - 1; i >= 0; i--) {
          renderItemAt(0, change.elements[i])
        }
        break
      }

      case "ArraySplice": {
        // Remove deleteCount items starting at start, then insert new items
        const { start, deleteCount, items: newItems } = change

        // Remove items
        for (let i = 0; i < deleteCount; i++) {
          if (start < renderNode.children.length) {
            const child = renderNode.removeChildAt(start)
            if (child) {
              if (child.node && child.node.parentNode) {
                child.node.parentNode.removeChild(child.node)
              }
              cleanupRenderNode(child)
            }
          }
        }

        // Insert new items
        if (newItems) {
          for (let i = 0; i < newItems.length; i++) {
            renderItemAt(start + i, newItems[i])
          }
        }
        break
      }

      case "ArrayReverse": {
        // Reverse the order of children
        // First, collect all DOM nodes in order
        const domNodes: Node[] = []
        for (const child of renderNode.children) {
          const firstDom = child.getFirstDomNode()
          if (firstDom) {
            domNodes.push(firstDom)
          }
        }

        // Reverse children array
        renderNode.children.reverse()

        // Update sibling links
        for (let i = 0; i < renderNode.children.length; i++) {
          const child = renderNode.children[i]!
          child.prev = i > 0 ? renderNode.children[i - 1]! : null
          child.next = i < renderNode.children.length - 1 ? renderNode.children[i + 1]! : null
        }

        // Re-insert DOM nodes in reverse order
        if (actualParentDomNode && domNodes.length > 0) {
          // Remove all DOM nodes first
          for (const domNode of domNodes) {
            if (domNode.parentNode) {
              domNode.parentNode.removeChild(domNode)
            }
          }
          // Re-insert in new order (reversed)
          for (const child of renderNode.children) {
            insertDomNodeForRenderNode(child, actualParentDomNode)
          }
        }
        break
      }

      case "ObjectSet": {
        // Check if this is setting a numeric index
        const index = typeof change.prop === "number" ? change.prop : parseInt(String(change.prop), 10)
        if (!isNaN(index) && index >= 0 && index < renderNode.children.length) {
          // Replace the child at this index
          const oldChild = renderNode.removeChildAt(index)
          if (oldChild) {
            if (oldChild.node && oldChild.node.parentNode) {
              oldChild.node.parentNode.removeChild(oldChild.node)
            }
            cleanupRenderNode(oldChild)
          }
          renderItemAt(index, change.value)
        }
        // If not a valid index, ignore (shouldn't happen in normal usage)
        break
      }

      // Fallback for unsupported operations
      case "ArraySort":
      case "ArrayFill":
      case "ArrayCopyWithin":
      default: {
        // Full regeneration
        if (renderNode.list) {
          regenerateItems(renderNode.list)
        }
        break
      }
    }
  }

  if (typeof items === "function") {
    // Reactive items source - wrap in CachedFunction
    const itemsCF = domain.createCachedFunction(items)
    renderNode.listItemsCachedFunction = itemsCF

    // Initial render
    const initialItems = itemsCF.call() as unknown[]
    renderNode.list = initialItems
    renderItems(initialItems)

    // Subscribe to the list for surgical updates
    const subscriptionListener: SubscriptionListener = (change: Change) => {
      handleListChange(change)
    }
    renderNode.listItemsListener = subscriptionListener
    domain.subscribe(initialItems, subscriptionListener)

    // Set up listener for when the items function returns a different array
    itemsCF.addListener(() => {
      // Unsubscribe from old list
      if (renderNode.list && renderNode.listItemsListener) {
        domain.unsubscribe(renderNode.list, renderNode.listItemsListener)
      }

      // Get new items
      const newItems = itemsCF.call() as unknown[]
      renderNode.list = newItems

      // Full regeneration since this is a new array
      regenerateItems(newItems)

      // Subscribe to new list
      domain.subscribe(newItems, subscriptionListener)
    })
  } else {
    // Static items array - render once, but still subscribe for surgical updates
    renderNode.list = items
    renderItems(items)

    // Subscribe to the static array for changes
    const subscriptionListener: SubscriptionListener = (change: Change) => {
      handleListChange(change)
    }
    renderNode.listItemsListener = subscriptionListener
    domain.subscribe(items, subscriptionListener)
  }
}

/**
 * Reconcile a FunctionRenderSpec with an existing function RenderNode
 */
/**
 * Call lifecycle cleanup callbacks for a RenderNode during reconciliation.
 * This is the "unmount" part of reconciliation.
 */
function callLifecycleCleanups(node: RenderNode): void {
  if (node.lifecycleCleanups) {
    for (const cleanup of node.lifecycleCleanups) {
      cleanup()
    }
    node.lifecycleCleanups = null
  }
  node.onMountCallbacks = null
  node.contextState = null
}

function reconcileFunctionSpec(
  spec: FunctionRenderSpec,
  existingNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  // Call lifecycle cleanups (unmount part of reconciliation)
  callLifecycleCleanups(existingNode)

  // Clean up old CachedFunction
  if (existingNode.functionCachedFunction) {
    existingNode.functionCachedFunction.remove()
    existingNode.functionCachedFunction = null
  }

  const actualParentDomNode = parentDomNode || existingNode.findParentDomNode()

  // Set up the new function spec (creates CachedFunction, sets up listener)
  const childSpec = setupFunctionSpec(existingNode, spec, actualParentDomNode, xmlns, domain)

  // Try to reconcile with existing child if possible
  const existingChild = existingNode.children[0]
  if (existingChild && canReconcile(childSpec, existingChild)) {
    reconcile(childSpec, existingChild, actualParentDomNode, xmlns, domain)
  } else {
    // Remove old children and render new
    cleanupLeftoverChildren(existingNode, 0)
    render(childSpec, existingNode, actualParentDomNode, xmlns, domain)
  }

  // Call onMount callbacks (mount part of reconciliation)
  callOnMountCallbacks(existingNode)
}

/**
 * Reconcile a ListRenderSpec with an existing list RenderNode
 */
function reconcileListSpec(
  spec: ListRenderSpec,
  existingNode: RenderNode,
  parentDomNode: Node | null,
  xmlns: string | null,
  domain: ChangeDomain,
): void {
  // Clean up old list state
  if (existingNode.listItemsCachedFunction) {
    existingNode.listItemsCachedFunction.remove()
    existingNode.listItemsCachedFunction = null
  }
  if (existingNode.list && existingNode.listItemsListener) {
    domain.unsubscribe(existingNode.list, existingNode.listItemsListener)
  }
  existingNode.listItemsListener = null
  existingNode.list = null

  // Remove all old children since list reconciliation is complex
  cleanupLeftoverChildren(existingNode, 0)

  // Set up the new list spec using shared helper
  const actualParentDomNode = parentDomNode || existingNode.findParentDomNode()
  setupListSpec(existingNode, spec, actualParentDomNode, xmlns, domain)
}

/**
 * Unmount a RenderNode tree, removing all DOM nodes and cleaning up.
 */
export function unmount(renderNode: RenderNode): void {
  renderNode.remove()
}
