# Design

Technical design for Brint

## Renderspecs

```
RenderSpec =
    NullRenderSpec
    | TextRenderSpec
    | ElementRenderSpec
    | FunctionRenderSpec
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
ElementRenderSpecNoArgsWithChildren = [ElementName, ChildRenderSpecs]
ElementRenderSpecWithArgsNoChildren = [ElementName, ElementArgs]
ElementRenderSpecWithArgsWithChildren = [ElementName, ElementArgs, ChildRenderSpecs]

ElementName = string

ElementArgs =
  NormalElementArgs
  | OnElementArgs
  | PropertiesElementArgs
  | XmlnsElementArgs

NormalElementArgs = Record<any string except ["on", "properties", "xmlns"], ElementValue>

OnElementArgs = Record<"on", DomEventHandlers>

DomEventHandlers = Record<string, DomEventHandler>

DomEventHandler =
  FunctionDomEventHandler
  | OptionsDomEventHandler
  
FunctionDomEventHandler = {whatever the type signature is for the listener passed to addEventListener}

OptionsDomEventHandler = {
  listener: FunctionDomEventHandler
  options: {whatever the type signature is for the options passed to addEventListener}
}

PropertiesElementArgs = Record<string|Symbol, PropertiesElementArgsItem>

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

ChildRenderSpecs = Array<RenderSpec> | RenderSpec


ComponentRenderSpec = ComponentRenderSpecWithArgs | ComponentRenderSpecNoArgs

ComponentRenderSpecWithArgs = [ComponentFunction ComponentArgs]
ComponentRenderSpecNoArgs = [ComponentFunction]

ComponentFunction = (args: ResolvedComponentArgs, ctx: RenderSpecCtx) => RenderSpec

ComponentArgs = ???

ResolvedComponentArgs = Record<string, any>

FragmentRenderSpec = [null, RenderSpecArray]

ListRenderSpec<T> = [ListSymbol, ListSourceFn<T>, ListItemFn<T>]

ListSourceFn<T> = ()=>Array<T>

ListItemFn<T> = (item:T) => RenderSpec

RenderSpecCtx = {
  FIXME - define interface exposed to components
}

```
