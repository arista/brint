import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { Window } from "happy-dom"
import { create, List, RenderNode } from "../src/index.js"
import { ChangeDomain } from "chchchchanges"

// Set up DOM environment
let window: Window
let document: Document

beforeEach(() => {
  window = new Window()
  document = window.document
  // Make document globally available for the renderer
  ;(globalThis as unknown as { document: Document }).document = document
})

afterEach(() => {
  window.close()
})

describe("brint", () => {
  describe("create", () => {
    it("should create a Brint instance", () => {
      const domain = new ChangeDomain()
      const brint = create({ changeDomain: domain })

      assert.ok(brint)
      assert.equal(typeof brint.render, "function")
      assert.equal(brint.List, List)
    })
  })

  describe("List symbol", () => {
    it("should be a symbol", () => {
      assert.equal(typeof List, "symbol")
    })
  })

  describe("RenderNode", () => {
    it("should create a RenderNode with spec", () => {
      const node = new RenderNode("hello")
      assert.equal(node.spec, "hello")
      assert.equal(node.node, null)
      assert.equal(node.parent, null)
      assert.deepEqual(node.children, [])
    })

    it("should manage parent-child relationships", () => {
      const parent = new RenderNode(null)
      const child1 = new RenderNode("a")
      const child2 = new RenderNode("b")

      parent.appendChild(child1)
      parent.appendChild(child2)

      assert.equal(child1.parent, parent)
      assert.equal(child2.parent, parent)
      assert.equal(child1.next, child2)
      assert.equal(child2.prev, child1)
      assert.deepEqual(parent.children, [child1, child2])
    })

    it("should remove from parent correctly", () => {
      const parent = new RenderNode(null)
      const child1 = new RenderNode("a")
      const child2 = new RenderNode("b")
      const child3 = new RenderNode("c")

      parent.appendChild(child1)
      parent.appendChild(child2)
      parent.appendChild(child3)

      child2.remove()

      assert.equal(child1.next, child3)
      assert.equal(child3.prev, child1)
      assert.deepEqual(parent.children, [child1, child3])
      assert.equal(child2.parent, null)
    })

    it("should find previous DOM node through nested fragments", () => {
      // Simulate: div > [fragmentA > [span, fragmentB > [target]]]
      // When finding previous DOM node for target, should find span

      const divNode = new RenderNode(["div"])
      const divDom = document.createElement("div")
      divNode.node = divDom

      const fragmentA = new RenderNode(null) // fragment has no DOM node
      divNode.appendChild(fragmentA)

      const spanNode = new RenderNode(["span"])
      const spanDom = document.createElement("span")
      spanNode.node = spanDom
      fragmentA.appendChild(spanNode)

      const fragmentB = new RenderNode(null) // nested fragment, no DOM node
      fragmentA.appendChild(fragmentB)

      const target = new RenderNode(["p"])
      fragmentB.appendChild(target)

      // target has no prev sibling at its level, but should find span
      // by walking up through fragmentB to fragmentA's previous sibling
      const prevDom = target.findPreviousDomNode()
      assert.equal(prevDom, spanDom)
    })

    it("should return null when no previous DOM node exists", () => {
      const divNode = new RenderNode(["div"])
      const divDom = document.createElement("div")
      divNode.node = divDom

      const fragment = new RenderNode(null)
      divNode.appendChild(fragment)

      const target = new RenderNode(["p"])
      fragment.appendChild(target)

      // target is first child of fragment, and fragment is first child of div
      // div has a DOM node, so we stop there - no previous DOM node
      const prevDom = target.findPreviousDomNode()
      assert.equal(prevDom, null)
    })
  })

  describe("render", () => {
    let container: Element

    beforeEach(() => {
      container = document.createElement("div")
      document.body.appendChild(container)
    })

    describe("NullRenderSpec", () => {
      it("should render null as empty", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(null, container)

        assert.equal(container.childNodes.length, 0)
      })

      it("should render undefined as empty", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(undefined, container)

        assert.equal(container.childNodes.length, 0)
      })
    })

    describe("TextRenderSpec", () => {
      it("should render a string as text node", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render("hello world", container)

        assert.equal(container.childNodes.length, 1)
        assert.equal(container.textContent, "hello world")
      })

      it("should render a number as text node", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(42, container)

        assert.equal(container.childNodes.length, 1)
        assert.equal(container.textContent, "42")
      })
    })

    describe("ElementRenderSpec", () => {
      it("should render a simple element", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div"], container)

        assert.equal(container.childNodes.length, 1)
        assert.equal((container.firstChild as Element).tagName, "DIV")
      })

      it("should render an element with text child", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["span", "hello"], container)

        assert.equal(container.childNodes.length, 1)
        const span = container.firstChild as Element
        assert.equal(span.tagName, "SPAN")
        assert.equal(span.textContent, "hello")
      })

      it("should render an element with attributes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { id: "test", class: "foo" }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("id"), "test")
        assert.equal(div.getAttribute("class"), "foo")
      })

      it("should render an element with attributes and children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { id: "parent" }, ["span", "child"]], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("id"), "parent")
        assert.equal(div.childNodes.length, 1)
        const span = div.firstChild as Element
        assert.equal(span.tagName, "SPAN")
        assert.equal(span.textContent, "child")
      })

      it("should render multiple children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          [
            "div",
            {},
            [
              ["span", "first"],
              ["span", "second"],
            ],
          ],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.childNodes.length, 2)
        assert.equal((div.childNodes[0] as Element).textContent, "first")
        assert.equal((div.childNodes[1] as Element).textContent, "second")
      })

      it("should handle boolean true attribute", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["input", { disabled: true }], container)

        const input = container.firstChild as Element
        assert.equal(input.getAttribute("disabled"), "disabled")
      })

      it("should handle boolean false attribute", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["input", { disabled: false }], container)

        const input = container.firstChild as Element
        assert.equal(input.hasAttribute("disabled"), false)
      })

      it("should handle null attribute", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["input", { placeholder: null }], container)

        const input = container.firstChild as Element
        assert.equal(input.hasAttribute("placeholder"), false)
      })

      it("should handle numeric attribute", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["input", { tabindex: 5 }], container)

        const input = container.firstChild as Element
        assert.equal(input.getAttribute("tabindex"), "5")
      })
    })

    describe("unmount", () => {
      it("should remove rendered content", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const handle = brint.render(["div", "hello"], container)
        assert.equal(container.childNodes.length, 1)

        handle.unmount()
        assert.equal(container.childNodes.length, 0)
      })
    })
  })
})
