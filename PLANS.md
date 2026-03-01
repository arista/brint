# Plans

This document tracks the roadmap and planned features for brint

## Current Focus

Let's start with creating the basic scaffolding for a typescript project. I guess this would be Phase 1a of the Implementation Plan below. Look at ../chchchchanges to see what previous choices I made for scaffolding. I also had you create a DEVELOPMENT.md that outlines the functions a developer would need to use (and I think it's referenced from CLAUDE.md so you know what to do in the future).

Remember that most of the technical design is in [design](./docs/design.md), informed by the [overview](./docs/overview.md). There is also an older [analysis](./overview-analysis.md) that might be helpful, but might be out of date with respect to the design document.

## Implementation Plan

### Phase 1: Project Scaffolding

- TypeScript/build configuration
- Package structure
- Core type definitions (RenderSpec, RenderNode)
- Top-level API skeleton (`create`, `Brint`, `RenderHandle`)

### Phase 2: Basic Static Rendering

- NullRenderSpec → RenderNode (no DOM node)
- TextRenderSpec → Text node
- ElementRenderSpec → Element (static attributes only, no reactivity)
- Basic tree structure (parent/children/prev/next)

### Phase 3: Element Details (Static)

- Normal attributes
- Style handling
- Event listeners (`on`)
- Properties
- xmlns handling and inheritance

### Phase 4: Fragments and Children

- FragmentRenderSpec
- ElementChildRenderSpecs (array vs single)
- DOM insertion logic (finding correct insertion point when parent RenderNode has no DOM node)

### Phase 5: Reactivity for Elements

- CachedFunction integration with chchchchanges
- `elementValueToReactiveElementValue`
- `renderReactiveElementValue`
- Reactive attributes, styles, properties
- Cleanup (remove CachedFunctions on RenderNode removal)

### Phase 6: FunctionRenderSpec

- Wrap in CachedFunction
- Re-render child on invalidation
- Basic reconciliation (same type → reuse, different → replace)

### Phase 7: ComponentRenderSpec

- Component props (wrap functions in CachedFunctions, except `on`)
- `componentCachedFunction`
- Re-render on prop changes

### Phase 8: ListRenderSpec (Basic)

- `listItemsCachedFunction`
- Generate children from items
- Full regeneration on list change (no surgical updates yet)

### Phase 9: List Surgical Updates

- Subscribe to list changes via `listItemsListener`
- Handle: ArrayPush, ArrayPop, ArrayShift, ArrayUnshift, ObjectSet, ArraySplice, ArrayReverse
- Fallback for other operations

### Phase 10: Reconciliation Polish

- Full "Rendering Over Existing RenderNodes" implementation
- Element attribute reconciliation (add/remove/update)
- Cleanup leftover children

## TODO

- Define RenderContext and component lifecycle
- Define Error handling
- Define external Types
