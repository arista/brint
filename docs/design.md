# Design

Technical design for Brint

## RenderSpec Type Definitions

```
RenderSpec =
    NullRenderSpec
    | TextRenderSpec
    | ElementRenderSpec
    | FunctionRenderSpec
    | ComponentRenderSpec
    | FragmentRenderSpec
    | ListRenderSpec

NullRenderSpec = null|undefined

TextRenderSpec = string | number

FunctionRenderSpec = (ctx: RenderContext) => RenderSpec

ElementRenderSpec =
    ElementRenderSpecNoArgsNoChildren |
    ElementRenderSpecNoArgsWithChildren |
    ElementRenderSpecWithArgsNoChildren |
    ElementRenderSpecWithArgsWithChildren |

ElementRenderSpecNoArgsNoChildren = [ElementName]
ElementRenderSpecNoArgsWithChildren = [ElementName, ElementChildRenderSpecs]
ElementRenderSpecWithArgsNoChildren = [ElementName, ElementArgs]
ElementRenderSpecWithArgsWithChildren = [ElementName, ElementArgs, ElementChildRenderSpecs]

ElementName = string

ElementChildRenderSpecs = Array<RenderSpec> | RenderSpec

ElementArgs = combined Record type with these possible elements:
  NormalElementArgs
  StyleElementArgs
  OnElementArgs
  PropertiesElementArgs
  XmlnsElementArgs

NormalElementArgs = Record<any string except ["on", "properties", "xmlns", "style"], ElementValue>

StyleElementArgs = Record<"style", StyleElementArgsEntries>

StyleElementArgsEntries = Record<string, ElementValue>

OnElementArgs = Record<"on", DomEventHandlers>

DomEventHandlers = Record<string, DomEventHandler>

DomEventHandler =
  FunctionDomEventHandler
  | OptionsDomEventHandler
  
FunctionDomEventHandler = FIXME - whatever the type signature is for the listener passed to addEventListener

OptionsDomEventHandler = {
  listener: FunctionDomEventHandler
  options: FIXME - whatever the type signature is for the options passed to addEventListener
}

PropertiesElementArgs = Record<"properties", PropertiesElementArgsValue>

PropertiesElementArgsValue = Record<string|Symbol, PropertiesElementArgsItem>

PropertiesElementArgsItem =
  FunctionPropertiesElementArgsItem
  | any non-function value

FunctionPropertiesElementArgsItem = ()=>any

XmlnsElementArgs = Record<"xmlns", string>

ElementValue =
  PrimitiveElementValue
  | ArrayElementValue
  | FunctionElementValue

PrimitiveElementValue =
  NullElementValue
  | StringElementValue
  | BooleanElementValue
  | NumberElementValue

ResolvedElementValue =
  PrimitiveElementValue
  | ResolvedArrayElementValue

NullElementValue = null|undefined

StringElementValue = string

BooleanElementValue = boolean

NumberElementValue = number

ArrayElementValue = Array<ArrayElementValueItem>

ArrayElementValueItem =
  PrimitiveElementValue
  | ArrayElementValue
  | ArrayElementFunctionValue

ArrayElementFunctionValue = ()=>ResolvedArrayElementValueItem

ResolvedArrayElementValue = Array<ResolvedArrayElementValueItem>

ResolvedArrayElementValueItem =
  PrimitiveElementValue
  | ResolvedArrayElementValue

FunctionElementValue = ()=>ResolvedElementValue

ComponentRenderSpec = ComponentRenderSpecWithProps | ComponentRenderSpecNoProps

ComponentRenderSpecWithProps = [ComponentFunction ComponentProps]
ComponentRenderSpecNoProps = [ComponentFunction]

ComponentFunction = (props: ResolvedComponentProps, ctx: RenderContext) => RenderSpec

ComponentProps = combined Record type with these possible elements:
  NormalComponentProps
  | OnComponentProps

NormalComponentProps = Record<any string except "on", ComponentArg>

ComponentArg =
  any non-function value
  | FunctionComponentArg

FunctionComponentArg = ()=>any

OnComponentProps = Record<"on", OnComponentHandlers>

OnComponentHandlers = Record<string, any>

ResolvedComponentProps = Record<string, any>

FragmentRenderSpec = [null (, RenderSpec)*]

ListRenderSpec<T> = [ListSymbol, ListItemsSpec<T>]

ListItemsSpec = {
  items: ListSource<T>
  each: ListItemFn<T>
}

ListSource =
  Array<T>
  | ListSourceFn<T>

ListSourceFn<T> = ()=>Array<T>

ListItemFn<T> = (item:T) => RenderSpec

ListSymbol = FIXME - a special Symbol exposed by the library

RenderContext = {
  FIXME - define interface exposed to components
}

```

## RenderNodes

Every RenderSpec eventually converts to a RenderNode, which is the "live" object that connects the DOM with the rest of the system.  Each RenderNode is associated with some set of DOM Nodes created from the RenderSpec (could be empty).  Each RenderNode is also aware of its position with respect to its parent and siblings, roughly mirroring the DOM, and allowing it to perform targeted modifications to the DOM.

RenderNodes also manage the reactive CachedFunctions provided by the chchchchanges library, tying them to the changes that need to be reflected in the DOM, and cleaning up CachedFunctions when RenderNodes are removed.

Finally, RenderNodes manage the state and callbacks required by the RenderContext API.

The type definition for a RenderNode looks something like this:

```
RenderNode {
  // The RenderSpec that generated this node
  spec: RenderSpec
  
  // The underlying DOM Node (if any)
  node: Node|null
  
  // The xmlns inherited or specified for this node
  xmlns: string|null

  // Tree relationships
  parent: RenderNode|null
  prev: RenderNode|null
  next: RenderNode|null
  children: Array<RenderNode>

  // ElementRenderSpec - items containing reactive values
  reactiveAttributes: Map<string, RenderNodeAttribute>|null
  reactiveStyles: Map<string, RenderNodeStyle>|null
  reactiveProperties: Map<string|symbol, RenderNodeProperty>|null

  // FunctionRenderSpec
  functionCachedFunction: CachedFunction|null

  // ComponentRenderSpec
  componentProps: Map<string|symbol, RenderNodeComponentProp>|null
  componentCachedFunction: CachedFunction|null
  
  // ListRenderSpec
  listItemsCachedFunction: CachedFunction|null
  list: Array<any>|null
  listItemsListener: ChangeListener from chchchchanges|null
}

RenderNodeAttribute {
  value: ReactiveElementValue
}

RenderNodeStyle {
  value: ReactiveElementValue
}

RenderNodeProperty {
  cachedFunction: CachedFunction
}

// Similar to ElementValue, except that functions have been converted to CachedFunctions
ReactiveElementValue =
  PrimitiveElementValue
  | ReactiveArrayElementValue
  | CachedFunction<ResolvedElementValue>

ReactiveArrayElementValue = Array<ReactiveArrayElementValueItem>

ReactiveArrayElementValueItem =
  PrimitiveElementValue
  | ReactiveArrayElementValue
  | CachedFunction<ResolvedArrayElementValueItem>

RenderNodeComponentProp =
  CachedFunction
  | any
```

### Tree Relationships

For the most part, the RenderNode tree relationships follow the DOM Node relationships.  There are, however, several instances where this is not the case:

* A RenderNode is generated from a NullRenderSpec that does not end up generating a DOM Node.  This still results in a RenderNode that is in the correct "place" in the tree, but has a null DOM Node
* A FragmentRenderSpec, which represents a set of Nodes that are grouped together logically, but are not actually parented by a single DOM Node.  This is represented by a parent RenderNode with a null DOM Node, but still located in the correct "place" in the tree, and with children that are the items in the fragment.
* FunctionRenderSpec and ComponentRenderSpec both end up calling a function to generate a RenderSpec.  The original Function/ComponentRenderSpec gets its own RenderSpec with a null DOM Node, and a single child RenderSpec which is the result of calling the function.
* ListRenderSpec is similar to Function/ComponentRenderSpec, except that multiple RenderSpecs are generated from an array's items, which are all treated as children of the RenderSpec.

This must be taken into account for operations that start with a RenderNode, and need to find the RenderNode corresponding to the actual DOM parent, prev, or next of that original RenderNode.  FIXME - is it better to carry out those operations by navigating the RenderNode tree, or is it just simpler to keep a Map or WeakMap mapping DOM Node to RenderNode?

### Reactive Values

For ElementRenderSpecs, the attributes, styles, properties, and xmlns value can all contain reactive functions.

For property and xmlns values, this is pretty straightforward, since their value is either a constant or a reactive function.  If a reactive function is involved, then the function is wrapped in a CachedFunction and a RenderNodeProperty or a RenderNodeXmlns is created.  The callback function from the CachedFunction simply re-runs the CachedFunction and updates the appropriate value.

For attribute and style values, it gets a little more complex because an ElementValue can contain nested array structures that contain reactive functions.  When first rendered, the ElementValue is recursively converted to a ReactiveElementValue, in which all the reactive functions are converted to CachedFunctions:

```
elementValueToReactiveElementValue(value: ElementValue, onChange): ReactiveElementResult

ReactiveElementResult {
  reactiveElement: ReactiveElement
  // True if the result contains any CachedFunctions
  isReactive: boolean
}
```

Then, whenever the attribute or style value needs to be converted to a string, it runs through the ReactiveElementValue using the rules described later to come up with a value.  When the callback for any of the CachedFunctions is called, it can simply run through that structure again and apply the new value.

### Removing Reactive Values

If a RenderNode is removed from the tree (discussed later how that happens), then cleanup operations will need to be performed.

This includes calling remove() on all CachedFunctions, which also means recursively descending through the various ReactiveElements and finding those CachedFunctions.  This also means unsubscribing any ChangeListeners.

### ReactiveElementValue Rendering

The following rules are applied to convert a ReactiveElementValue to a string (or null) required for an attribute value or style value:

```
renderReactiveElementValue(value: ReactiveElementValue): string|true|null
```

* If the value is a string, return it
* If the value is a number, then convert it to a string and return it
* If the value is null, undefined, or boolean false, then return null
* If the value is true, then return true
* If the value is an array:
    * build up a flattened "rendered array", going through each element:
        * if the element is a string, add it to the array
        * if the element is a number, convert to a string and add it to the array
        * if the element is null, undefined, or boolean (either false OR true), skip it
        * if the element is an Array, recusively apply the array rules, but keep adding values to the original "rendered array" (so that the result is flattened)
        * if the element is a CachedFunction:
            * evaluate the CachedFunction and apply the above array element rules to the result
    * if the "rendered array" is empty, return null
    * otherwise, return the elements of the "rendered array" joined by spaces
* If the value is a CachedFunction:
    * evaluate the CachedFunction and apply the above rules to the result

Return values of string, true, and null all have different meanings, as described in context below.

## RenderSpec Behaviors

The primary operation of the system is to take a RenderSpec and turn it into a RenderNode, with appropriate changes to the DOM.  Note, however, that often this operation will take place in the context of an existing RenderNode tree, in which a RenderSpec is to be converted to a RenderNode, at a place in the tree where a RenderNode already exists.

The "Rendering Over Existing RenderNodes" section below covers some of that.  But its fallback position is to render into an existing RenderNode that has been cleared out except for its children.  So for the cases outlined below, assume that is the starting state of the RenderNode - it has been cleared out, but it might still have children.

So as the rendering processes below proceed, they will set up the RenderNode in a particular way, then they might create children.  When they do so, they should do this recursively.  In other words, if the process is going to render the first child, and there's already a RenderNode in the first child's position, then go ahead and try to reuse that node.

And then when the process finishes, it needs to check if there are any remaining leftover children, and clear them out if so.

### NullRenderSpec

Renders to a RenderNode that has no associated DOM Node.  The RenderNode still remembers its place in the RenderNode tree, so that if it is later replaced with a DOM Node, it knows where that node should be inserted.

### TextRenderSpec

Renders to a DOM Text Node that is associated with a RenderNode.

### FragmentRenderSpec

Renders to a list of DOM nodes, each associated with its own RenderNode.  The Fragment's RenderNode acts as a parent to all of those child RenderNodes, even though the underlying DOM Nodes are actually siblings of other DOM nodes of the RenderNodes of siblings.

### ElementRenderSpec

Renders to a DOM Element that is associated with the RenderNode.  Any child RenderSpecs are recursively rendered to their RenderNodes that become children of this RenderNode.

Note that when creating the DOM Element, the namespace for this element needs to be determined:

* Read the xmlns element arg, if supplied.  If it is, then use that as the namespace and set the RenderNode's xmlns property
* If not supplied, then use the parent RenderNode's xmlns property

If ElementArgs are supplied, then they are treated as follows:

#### NormalElementArgs

Each key/value pair is treated as an element attribute.  For each key/value:

* `elementValueToReactiveElementValue` is called on the value
    * the callback is set to re-run the render step below
    * if a reactive value was found, add a RenderNodeAttribute
* `renderReactiveElementValue` is called on the ReactiveElementValue
    * if a string, then set the attribute value to that string
    * if true, then set the attribute value to its name
    * if null, then remove the attribute

#### StyleElementArgs

Each key/value pair is treated as a style property.  For each key/value:

* `elementValueToReactiveElementValue` is called on the value
    * the callback is set to re-run the render step below
    * if a reactive value was found, add a RenderNodeStyle
* `renderReactiveElementValue` is called on the ReactiveElementValue
    * if a string, then set the property style value to that string
    * if true, then ignore but print an error message - FIXME be more specific about the error message
    * if null, then remove the style property

#### OnElementArgs

If an "on" property is specified, then its value is expected to be an object that maps event names to listeners.  The listeners are added to the underlying DOM node using addEventListener.  No reactivity or CachedFunctions are involved.

#### PropertiesElementArgs

If a "properties" property is specified, then its value is expected to be an object whose key/value pairs will be set as properties on the underlying DOM Element.

The following rules are applied:

* If the value is a function:
    * create a CachedFunction around the function
    * add a RenderNodeProperty
    * the CachedFunction is evaluated, and the result is set directly on the property of the underlying DOM Element
    * the CachedFunction's callback will re-run that process
* Otherwise, the value is set directly on the property of the underlying DOM Element.

Note: this implies that if a property is actually intended to be a function value, then it must be wrapped in a function that returns that function.

#### XmlnsElementArgs

If an "xmlns" property is specified, then its value is used as the namespace for this element, and any inherited elements (by setting the RenderNode's xmlns value).  This cannot be a reactive element.


### FunctionRenderSpec

A FunctionRenderSpec is wrapped in a CachedFunction, which is assigned to a new RenderNode's functionCachedFunction.  The RenderNode has no DOM Node.  The CachedFunction is executed, resulting in a RenderSpec, and that RenderSpec is then converted to a RenderNode that becomes the sole child of the FunctionRenderSpec's RenderNode.

When the CachedFunction is invalidated, the function is re-run, and the resulting RenderSpec is applied against its existing children.  See the "Rendering Over Existing RenderNodes" section below.

### ComponentRenderSpec

Creates a RenderNode to hold the parts defined by the ComponentRenderSpec.  That RenderNode has a null DOM Node, but the RenderSpec generated by the component becomes the sole child of that RenderNode, similar to FunctionRenderSpec.

The RenderNode's componentProps are generated from the RenderSpec, in which functions are wrapped in CachedFunctions, except for those in the "on" property.

The componentCachedFunction is a function that goes through the componentProps, and builds a ResolvedComponentProps by executing any CachedFunctions.  It then passes the result to the component's function, and returns a RenderSpec.  Its callback function calls the render process below.

The render process calls the componentCachedFunction, takes the resulting RenderSpec, and applies it to its existing children.

### ListRenderSpec

Creates a RenderNode to hold the parts defined by the ListRenderSpec.  That RenderNode has a null DOM Node.  The RenderNodes generated by the list become children of this ListNode.

The "items" function is wrapped in a CachedFunction and set as the listItemsCachedFunction.  That function is executed, resulting in a list of items, which is stored as "list".  The "each" function is then run against each item, resulting in a RenderSpec that is added as a child.

The listItemsCachedFunction callback will re-run the above process (starting with executing the listItemsCachedFunction), first unsubscribing any existing listItemsListener from the list

A listItemsListener is then created and subscribed to the list (as an AfterChangeListener).  It listens for any changes to the list and tries to alter its children as surgically as it can.  In cases where it can't, it just falls back to regenerating all the item RenderSpecs.

In particular, it will try to react to these changes with special logic:

* ObjectSet (for number indexes)
* ArrayPop
* ArrayPush
* ArrayReverse
* ArrayShift
* ArrayUnshift
* ArraySplice

Other operations, such as ArraySort, ArrayFill, or ArrayCopyWithin, would fall back to full regeneration.

FIXME - define how each of those will be handled
FIXME - how to handle changes to the "length" property?  That will change as part of these operations, but it can also be changed directly by the application.

## Rendering Over Existing RenderNodes

In some cases, a RenderSpec needs to be converted to a RenderNode in a position where a RenderNode already exists.  A naive approach could be to remove that RenderNode and replace it with the new one, but this would be wasteful if many of the associated DOM Nodes are similar.

Here are the rules to follow when applying a RenderSpec to an existing RenderNode, based on the RenderSpec type:

* NullRenderSpec
    * If the existing RenderSpec.spec is also a NullRenderSpec, keep it
* TextRenderSpec
    * If the existing RenderSpec.spec is also a TextRenderSpec, then replace its node's text with the new Text
* ElementRenderSpec
    * If the existing RenderSpec.spec is also an ElementRenderSpec, and the new RenderSpec would generate the same element type and namespace, then reuse the RenderNode.  Reconcile the element's attributes from the new ElementRenderSpec.  Proceed recursively with the element's children.
    * FIXME - expand on "reconcile the element's attributes" - what happens to event listeners?  remove and readd?  try to reuse any of it at all?  Or just remove all old attributes and event listeners and add all new attributes and event listeners?

* FunctionRenderSpec, ComponentRenderSpec, FragmentRenderSpec, ListRenderSpec
    * All of these will have no DOM Node.  If the existing RenderSpec.spec also has no DOM Node, then clear out the RenderSpec (except its children), and reuse it.  Proceed recursively, and clear out any extra children.


In all other cases, perform a full RenderNode removal and replace.

## DOM Interface

TBD - is it worth defining our own interfaces for the DOM behaviors, at least in terms of creating nodes, adding children, etc.?  This would allow the library to operate against other DOM implementations, perhaps in test or SSR scenarios.
