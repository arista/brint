# Design

Technical design for Brint

## Renderspecs

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

TextRenderSpec = string

FunctionRenderSpec = (ctx: RenderSpecCtx) => RenderSpec

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
  OnElementArgs
  PropertiesElementArgs
  XmlnsElementArgs

NormalElementArgs = Record<any string except ["on", "properties", "xmlns"], ElementValue>

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

XmlnsElementArgs = Record<"xmlns", ElementValue>

ElementValue =
  PrimitiveElementValue
  | ArrayElementValue
  | ObjectElementValue
  | FunctionElementValue

PrimitiveElementValue =
  NullElementValue
  | StringElementValue
  | BooleanElementValue
  | NumberElementValue

ResolvedElementValue =
  PrimitiveElementValue
  | ResolvedArrayElementValue
  | ResolvedObjectElementValue

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
  | Array<PrimitiveElementValue>

ObjectElementValue = Record<string, ObjectElementValueItem>

ObjectElementValueItem =
  PrimitiveElementValue
  | ObjectElementFunctionValue
  
ObjectElementFunctionValue = ()=>ResolvedObjectElementValueItem

ResolvedObjectElementValue = Record<string, ResolvedObjectElementValueItem>

ResolvedObjectElementValueItem =
  PrimitiveElementValue

FunctionElementValue = ()=>ResolvedElementValue

ComponentRenderSpec = ComponentRenderSpecWithArgs | ComponentRenderSpecNoArgs

ComponentRenderSpecWithArgs = [ComponentFunction ComponentArgs]
ComponentRenderSpecNoArgs = [ComponentFunction]

ComponentFunction = (props: ResolvedComponentArgs, ctx: RenderSpecCtx) => RenderSpec

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

RenderSpecCtx = {
  FIXME - define interface exposed to components
}

```
