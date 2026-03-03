import type { ChangeDomain, CachedFunction, Change, SubscriptionListener } from "chchchchanges"
import type {
  RenderSpec,
  ElementRenderSpec,
  ElementArgs,
  ElementChildRenderSpecs,
  FragmentRenderSpec,
  FunctionRenderSpec,
  ComponentRenderSpec,
  ComponentArgs,
  RenderContext,
  ListRenderSpec,
  ListItemsSpec,
} from "./index.js"
import { List } from "./index.js"
import { RenderNode, type ReactiveElementValue, type RenderNodeComponentProp } from "./render-node.js"

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
 * ElementRenderSpec is an array where the first element is a string (tag name)
 */
function isElementRenderSpec(spec: RenderSpec): spec is ElementRenderSpec {
  return Array.isArray(spec) && typeof spec[0] === "string"
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
 * Check if a value is a ComponentRenderSpec
 * ComponentRenderSpec is an array where the first element is a function
 */
function isComponentRenderSpec(spec: RenderSpec): spec is ComponentRenderSpec {
  return Array.isArray(spec) && typeof spec[0] === "function"
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
 * Apply event listeners to a DOM element.
 * Supports both simple functions and objects with listener + options.
 */
function applyEventListeners(element: Element, handlers: Record<string, unknown>): void {
  for (const [eventName, handler] of Object.entries(handlers)) {
    if (handler === null || handler === undefined) {
      continue
    }

    if (typeof handler === "function") {
      element.addEventListener(eventName, handler as EventListener)
    } else if (typeof handler === "object" && "listener" in handler) {
      const { listener, options } = handler as {
        listener: EventListener
        options?: AddEventListenerOptions
      }
      element.addEventListener(eventName, listener, options)
    }
  }
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
      element = document.createElement(tagName)
    }

    renderNode.node = element

    // Apply attributes, styles, event listeners, and properties
    if (args) {
      applyAttributes(element, args, domain, renderNode)

      if (args.style) {
        applyStyles(element, args.style, domain, renderNode)
      }

      if (args.on) {
        applyEventListeners(element, args.on)
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
    const ctx: RenderContext = {}

    // Find the actual parent DOM node for child insertion
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()

    // Create CachedFunction wrapping the render function
    const cf = domain.createCachedFunction(() => spec(ctx))
    renderNode.functionCachedFunction = cf

    // Execute function and render the result
    const childSpec = cf.call() as RenderSpec
    render(childSpec, renderNode, actualParentDomNode, xmlns, domain)

    // Set up listener for re-rendering on invalidation
    cf.addListener(() => {
      const newChildSpec = cf.call() as RenderSpec
      renderOver(newChildSpec, renderNode, actualParentDomNode, xmlns, domain)
    })

    return renderNode
  }

  if (isComponentRenderSpec(spec)) {
    // ComponentRenderSpec: wrap props in CachedFunctions, call component
    const [componentFn, componentArgs] = spec
    const ctx: RenderContext = {}

    // Find the actual parent DOM node for child insertion
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()

    // Process component props - wrap functions in CachedFunctions (except "on")
    const staticProps: Record<string, unknown> = {}
    const reactivePropCFs: Map<string, RenderNodeComponentProp> = new Map()

    if (componentArgs) {
      for (const [key, value] of Object.entries(componentArgs)) {
        if (key === "on") {
          // "on" handlers are passed through without wrapping
          staticProps[key] = value
        } else if (typeof value === "function") {
          // Wrap reactive prop in CachedFunction
          const cf = domain.createCachedFunction(value as () => unknown)
          reactivePropCFs.set(key, { cachedFunction: cf })
        } else {
          // Static prop
          staticProps[key] = value
        }
      }
    }

    // Store reactive props if any
    if (reactivePropCFs.size > 0) {
      renderNode.componentProps = reactivePropCFs
    }

    // Create componentCachedFunction that resolves props and calls component
    const componentCF = domain.createCachedFunction(() => {
      // Build resolved props by combining static props and calling reactive CFs
      const resolvedProps: Record<string, unknown> = { ...staticProps }
      for (const [key, prop] of reactivePropCFs) {
        resolvedProps[key] = prop.cachedFunction.call()
      }
      return componentFn(resolvedProps, ctx)
    })
    renderNode.componentCachedFunction = componentCF

    // Execute and render the result
    const childSpec = componentCF.call() as RenderSpec
    render(childSpec, renderNode, actualParentDomNode, xmlns, domain)

    // Set up listener for re-rendering on invalidation
    componentCF.addListener(() => {
      const newChildSpec = componentCF.call() as RenderSpec
      renderOver(newChildSpec, renderNode, actualParentDomNode, xmlns, domain)
    })

    return renderNode
  }

  if (isListRenderSpec(spec)) {
    // ListRenderSpec: wrap items in CachedFunction, render each item as a child
    const [, listItemsSpec] = spec as [typeof List, ListItemsSpec<unknown>]
    const { items, each } = listItemsSpec

    // Find the actual parent DOM node for child insertion
    const actualParentDomNode = parentDomNode || renderNode.findParentDomNode()

    // Helper to render a single item and return the RenderNode
    const renderItem = (item: unknown): RenderNode => {
      const childSpec = each(item)
      return render(childSpec, renderNode, actualParentDomNode, xmlns, domain)
    }

    // Helper to render all items
    const renderItems = (itemsArray: unknown[]) => {
      for (const item of itemsArray) {
        renderItem(item)
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
      const childRenderNode = renderItem(item)
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
          for (const element of change.elements) {
            renderItem(element)
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
  if (renderNode.componentProps) {
    for (const prop of renderNode.componentProps.values()) {
      prop.cachedFunction.remove()
    }
    renderNode.componentProps = null
  }
  if (renderNode.componentCachedFunction) {
    renderNode.componentCachedFunction.remove()
    renderNode.componentCachedFunction = null
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

  if (isComponentRenderSpec(spec) && isComponentRenderSpec(existingSpec)) {
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
    // NullRenderSpec: nothing to update
    return
  }

  if (isTextRenderSpec(spec)) {
    // TextRenderSpec: update the text content
    const newText = typeof spec === "number" ? String(spec) : spec
    if (existingNode.node) {
      existingNode.node.textContent = newText
    }
    return
  }

  // For now, other types (Element, Function, Fragment) get full replacement
  // Phase 10 will implement full attribute reconciliation for elements
  // For Phase 6, just remove and re-render for complex cases
  const parent = existingNode.parent
  if (parent) {
    existingNode.remove()
    render(spec, parent, parentDomNode, xmlns, domain)
  }
}

/**
 * Unmount a RenderNode tree, removing all DOM nodes and cleaning up.
 */
export function unmount(renderNode: RenderNode): void {
  renderNode.remove()
}
