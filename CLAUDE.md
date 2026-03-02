## Dependency on chchchchanges

This library depends on chchchchanges to provide reactivity support. For now, assume that this library can be found at ../chchchchanges. For the time being, assume both libraries are being co-developed.

## Testing notes

**Do not use `assert.equal` or `assert.strictEqual` to compare DOM elements directly.**

When assertions fail, Node's assert module tries to inspect and serialize the values to generate error messages. Happy-dom DOM elements have circular parent/child references that cause infinite traversal, leading to heap exhaustion and test hangs.

Instead of:
```typescript
assert.equal(container.firstChild, span) // HANGS if elements differ
```

Use manual comparison or compare specific properties:
```typescript
// Compare references manually
if (container.firstChild !== span) {
  throw new Error("Elements differ")
}

// Or compare properties
assert.equal(container.firstChild?.textContent, span.textContent)
```
