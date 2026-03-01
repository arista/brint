# Overview

This library is intended to be a simple, lightweight tool for rendering HTML, with the ability to re-render based on changing dependent data. The library's ability to respond to changing data is provided by the chchchchanges library.

## Basic Rendering

The basic function of the library is to translate "RenderSpec" structures into HTML. The basic form of a RenderSpec is:

```
RenderSpec = TextRenderSpec | ElementRenderSpec | FunctionRenderSpec | NullRenderSpec | ArrayRenderSpec

StringRenderSpec:
"{string}"

FunctionRenderSpec:
() => RenderSpec

NullRenderSpec:
null

ComponentRenderSpec:
[{Function} {function argument object}]

ElementRenderSpec:
["{element name}" {element attributes} [{child RenderSpecs}]]

ArrayRenderSpec:
[RenderSpec]

```

A TextRenderSpec translates into a DOM Text node, while an ElementRenderSpec translates to a DOM Element.

A NullRenderSpec translates into no DOM node

A FunctionRenderSpec is treated specially (see the section below on Reactive Rerendering), but the basic idea is that the function is called, and the result is treated as a RenderSpec.

An ArrayRenderSpec allows multiple RenderSpecs to be rendered to DOM Nodes and treated internally as a single unit (although not as a single DOM Node). TBD - how to avoid confusing it with child RenderSpecs?

ComponentRenderSpec is described later.

For an ElementRenderSpec, the "tag attributes" must be an Object. Except where noted below, the Object entries define element attributes, where the property name directly maps to an attribute name, and the property value maps to the attribute value.

Property values are interpreted as follows:

- null/undefined: the attribute is not included
- string: the value becomes the attribute value
- boolean: true = the attribute's value is its name, false = the attribute is not included
- number: the number is converted to a string
- array: the elements are converted recursively (see below), then joined separated by spaces. If the array is empty, do not include the attribute. When converting recursively, follow these same rules, except:
  - null/undefined means don't include in the list
  - otherwise only string, number, and function are permitted - all others are an error
- object: the values are converted recursively (see below), then entries are formatted as "{name}: {value}", and joined with "; ". If the result is empty, do not include the attribute. When converting recursively, follow these same rules, except:
  - null/undefined means don't include in the list
  - otherwise only string, number, and function are permitted - all others are an error
- function: special (see "Reactive Rerendering" below)

TBD - do the above rules match what one would expect if coming from React or Vue?

There are a few properties of the Object that are treated specially:

- "xmlns": interpreted the same as other property values above, but translates into specifying the namespace of the element name, as opposed to an element attribute

- "on": this is expected to be an object, and is used to assign listeners to the resulting element. Each entry defines one listener to be added using DOM's addEventListener. The name of the entry is the event type to listen for. The value is either a listener function, or an object of the form:

```
{
  listener: event listener function
  options?: addEventListener options
}
```

## Reactive Rerendering

Once a RenderSpec is translated to a DOM node, it needs to detect changes in its source data and re-render the appropriate portions of the DOM. This reactivity is provided through the chchchchanges library. This library allows an application to create "CachedFunctions" - these are ordinary no-args functions that can detect their dependencies when called, then provide a callback when any of those dependencies change.

This is used in the following ways:

### Function element attribute

For an ElementRenderSpec, an element's attribute value may be a function. In this case, the function is wrapped in a chchchchanges.CachedFunction. It is called initially to obtain its initial value. A callback is then registered with the CachedFunction. When the CachedFunction is invalidated, it is re-run and the attribute value is updated appropriately.

Note that this treatment is not applied to the values of the "on" attribute, since its values are expected to be functions, and are unlikely to change in ways that require reactive rerendering.

### FunctionRenderSpec

A no-args function may be supplied as a RenderSpec, in which case the function is wrapped in a chchchchanges.CachedFunction. The function is evaluated into a RenderSpec which is then translated into a DOM node. When the CachedFunction is invalidated, it is re-run and its result will replace the DOM node.

### ComponentRenderSpec

The specified function takes a single {function argument object}, which is a set of keys/values. The function argument object is passed as the sole argument of the function, and the result is expected to be a RenderSpec.

Argument values that are functions are wrapped in CachedFunctions and evaluated before being passed to the function. If any of those Cachedfunctions changes, the argument object is updated and the function is re-run and its result is re-rendered.
