import type { RenderSpec } from "./index.js"

/**
 * RenderNode represents a live node in the render tree.
 * It connects a RenderSpec to its corresponding DOM node(s).
 */
export class RenderNode {
  /** The RenderSpec that generated this node */
  spec: RenderSpec

  /** The underlying DOM Node (if any) */
  node: Node | null = null

  /** The xmlns namespace inherited or specified for this node */
  xmlns: string | null = null

  /** Parent RenderNode */
  parent: RenderNode | null = null

  /** Previous sibling RenderNode */
  prev: RenderNode | null = null

  /** Next sibling RenderNode */
  next: RenderNode | null = null

  /** Child RenderNodes */
  children: RenderNode[] = []

  constructor(spec: RenderSpec) {
    this.spec = spec
  }

  /**
   * Add a child RenderNode at the end
   */
  appendChild(child: RenderNode): void {
    const lastChild = this.children[this.children.length - 1]

    child.parent = this

    if (lastChild) {
      lastChild.next = child
      child.prev = lastChild
    }

    this.children.push(child)
  }

  /**
   * Remove this RenderNode from its parent
   */
  remove(): void {
    if (this.parent) {
      const index = this.parent.children.indexOf(this)
      if (index !== -1) {
        this.parent.children.splice(index, 1)
      }
    }

    // Update sibling links
    if (this.prev) {
      this.prev.next = this.next
    }
    if (this.next) {
      this.next.prev = this.prev
    }

    this.parent = null
    this.prev = null
    this.next = null

    // Remove DOM node if present
    if (this.node && this.node.parentNode) {
      this.node.parentNode.removeChild(this.node)
    }

    // Recursively remove children
    for (const child of this.children) {
      child.remove()
    }
    this.children = []
  }

  /**
   * Find the nearest ancestor RenderNode that has a DOM node
   */
  findParentDomNode(): Node | null {
    let current: RenderNode | null = this.parent
    while (current) {
      if (current.node) {
        return current.node
      }
      current = current.parent
    }
    return null
  }

  /**
   * Find the DOM node that should come before this node's DOM node(s)
   * when inserting into the parent. This handles cases where previous
   * siblings may have no DOM node (like NullRenderSpec), and also
   * handles nested fragments by walking up through DOM-less ancestors.
   */
  findPreviousDomNode(): Node | null {
    // Walk backwards through siblings to find one with a DOM node
    let sibling = this.prev
    while (sibling) {
      const domNode = sibling.getLastDomNode()
      if (domNode) {
        return domNode
      }
      sibling = sibling.prev
    }

    // Nothing at this level - check parent's previous siblings
    // (but only if parent has no DOM node, i.e., is a fragment/function/etc.)
    if (this.parent && !this.parent.node) {
      return this.parent.findPreviousDomNode()
    }

    return null
  }

  /**
   * Get the last DOM node in this subtree (for insertion positioning)
   */
  getLastDomNode(): Node | null {
    // If we have a DOM node, return it
    if (this.node) {
      return this.node
    }

    // Otherwise, look at children from the end
    for (let i = this.children.length - 1; i >= 0; i--) {
      const childDom = this.children[i]?.getLastDomNode()
      if (childDom) {
        return childDom
      }
    }

    return null
  }

  /**
   * Get the first DOM node in this subtree
   */
  getFirstDomNode(): Node | null {
    if (this.node) {
      return this.node
    }

    for (const child of this.children) {
      const childDom = child.getFirstDomNode()
      if (childDom) {
        return childDom
      }
    }

    return null
  }
}
