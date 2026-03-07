# Plans

This document tracks the roadmap and planned features for brint

## Current Focus

## Docs and references

When working, remember that most of the technical design is in [design](./docs/design.md), informed by the [overview](./docs/overview.md). There is also an older [analysis](./overview-analysis.md) that might be helpful, but might be out of date with respect to the design document.

## Implementation Plan

### Phase 1: Project Scaffolding (COMPLETE)

- ~~TypeScript/build configuration~~
- ~~Package structure~~
- ~~Core type definitions (RenderSpec, RenderNode)~~
- ~~Top-level API skeleton (`create`, `Brint`, `RenderHandle`)~~

### Phase 2: Basic Static Rendering (COMPLETE)

- ~~NullRenderSpec → RenderNode (no DOM node)~~
- ~~TextRenderSpec → Text node~~
- ~~ElementRenderSpec → Element (static attributes only, no reactivity)~~
- ~~Basic tree structure (parent/children/prev/next)~~

### Phase 3: Element Details (Static) (COMPLETE)

- ~~Normal attributes~~
- ~~Style handling~~
- ~~Event listeners (`on`)~~
- ~~Properties~~
- ~~xmlns handling and inheritance~~

### Phase 4: Fragments and Children (COMPLETE)

- ~~FragmentRenderSpec~~
- ~~ElementChildRenderSpecs (array vs single)~~
- ~~DOM insertion logic (finding correct insertion point when parent RenderNode has no DOM node)~~

### Phase 5: Reactivity for Elements (COMPLETE)

- ~~CachedFunction integration with chchchchanges~~
- ~~`elementValueToReactiveElementValue`~~
- ~~`renderReactiveElementValue`~~
- ~~Reactive attributes, styles, properties~~
- ~~Cleanup (remove CachedFunctions on RenderNode removal)~~

### Phase 6: FunctionRenderSpec (COMPLETE)

- ~~Wrap in CachedFunction~~
- ~~Re-render child on invalidation~~
- ~~Basic reconciliation (same type → reuse, different → replace)~~

### Phase 7: ComponentRenderSpec (COMPLETE)

- ~~Component props (wrap functions in CachedFunctions, except `on`)~~
- ~~`componentCachedFunction`~~
- ~~Re-render on prop changes~~

### Phase 8: ListRenderSpec (Basic) (COMPLETE)

- ~~`listItemsCachedFunction`~~
- ~~Generate children from items~~
- ~~Full regeneration on list change (no surgical updates yet)~~

### Phase 9: List Surgical Updates (COMPLETE)

- ~~Subscribe to list changes via `listItemsListener`~~
- ~~Handle: ArrayPush, ArrayPop, ArrayShift, ArrayUnshift, ObjectSet, ArraySplice, ArrayReverse~~
- ~~Fallback for other operations~~

### Phase 10: Reconciliation Polish (COMPLETE)

- ~~Full "Rendering Over Existing RenderNodes" implementation~~
- ~~Element attribute reconciliation (add/remove/update)~~
- ~~Cleanup leftover children~~

## TODO

- Define Error handling
- Define external Types
