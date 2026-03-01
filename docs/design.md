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

ComponentRenderSpec = ComponentRenderSpecWithArgs | ComponentRenderSpecNoArgs

ComponentRenderSpecWithArgs = [ComponentFunction ComponentArgs]
ComponentRenderSpecNoArgs = [ComponentFunction]

ComponentFunction = (props: ResolvedComponentArgs, ctx: RenderContext) => RenderSpec

ComponentArgs = combined Record type with these possible elements:
  NormalComponentArgs
  | OnComponentArgs

NormalComponentArgs = Record<any string except "on", ComponentArg>

ComponentArg =
  any non-function value
  | FunctionComponentArg

FunctionComponentArg = ()=>any

OnComponentArgs = Record<"on", OnComponentHandlers>

OnComponentHandlers = Record<string, any>

ResolvedComponentArgs = Record<string, any>

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
  // The underlying DOM Node (if any)
  node: Node|null
  
  // The xmlns inherited or specified for this node
  xmlns: string|null

  // Tree relationships
  parent: RenderNode|null
  prev: RenderNode|null
  next: RenderNode|null
  children: Array<RenderNode>

  // Items containing reactive values
  reactiveAttributes: Map<string, RenderNodeAttribute>|null
  reactiveStyles: Map<string, RenderNodeStyle>|null
  reactiveProperties: Map<string|symbol, RenderNodeProperty>|null
  reactiveXmlns: RenderNodeXmlns|null
}

RenderNodeAttribute {
  value: ReactiveElementValue
}

RenderNodeStyle {
  value: ReactiveElementValue
}

RenderNodeXmlns {
  value: ReactiveElementValue
}

RenderNodeProperty {
  cachedFunction: CachedFunction
}

RenderNodeXmlns {
  value: ReactiveElementValue
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

FIXME - specify this

### ComponentRenderSpec

FIXME - specify this

### ListRenderSpec

FIXME - specify this

