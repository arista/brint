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

    afterEach(() => {
      // Clear container to help with cleanup
      container.innerHTML = ""
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

      it("should handle array attribute (space-joined)", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { class: ["foo", "bar", "baz"] }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("class"), "foo bar baz")
      })

      it("should flatten nested arrays in attributes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { class: ["foo", ["bar", "baz"], "qux"] }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("class"), "foo bar baz qux")
      })

      it("should skip null, undefined, and booleans in array attributes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          ["div", { class: ["foo", null, "bar", undefined, true, false, "baz"] }],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("class"), "foo bar baz")
      })

      it("should convert numbers in array attributes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { "data-values": [1, 2, 3] }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("data-values"), "1 2 3")
      })

      it("should handle empty array as null attribute", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { class: [] }], container)

        const div = container.firstChild as Element
        assert.equal(div.hasAttribute("class"), false)
      })
    })

    describe("styles", () => {
      it("should apply style properties", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { style: { color: "red", backgroundColor: "blue" } }], container)

        const div = container.firstChild as HTMLElement
        assert.equal(div.style.color, "red")
        assert.equal(div.style.backgroundColor, "blue")
      })

      it("should handle numeric style values", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { style: { opacity: 0.5, zIndex: 10 } }], container)

        const div = container.firstChild as HTMLElement
        assert.equal(div.style.opacity, "0.5")
        assert.equal(div.style.zIndex, "10")
      })

      it("should remove style property with null", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        // First set a style
        const div = document.createElement("div")
        div.style.color = "red"
        container.appendChild(div)

        // Render with null should remove it
        brint.render(["div", { style: { color: null } }], div)

        const inner = div.firstChild as HTMLElement
        assert.equal(inner.style.color, "")
      })

      it("should handle array style values (space-joined)", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        // Use boxShadow as it accepts space-separated values
        brint.render(["div", { style: { boxShadow: ["1px", "2px", "3px", "black"] } }], container)

        const div = container.firstChild as HTMLElement
        assert.equal(div.style.boxShadow, "1px 2px 3px black")
      })
    })

    describe("event listeners", () => {
      it("should add event listener", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })
        let clicked = false

        brint.render(
          [
            "button",
            {
              on: {
                click: () => {
                  clicked = true
                },
              },
            },
          ],
          container,
        )

        const button = container.firstChild as HTMLElement
        button.click()

        assert.equal(clicked, true)
      })

      it("should support event listener with options", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })
        let count = 0

        brint.render(
          [
            "button",
            {
              on: {
                click: {
                  listener: () => {
                    count++
                  },
                  options: { once: true },
                },
              },
            },
          ],
          container,
        )

        const button = container.firstChild as HTMLElement
        button.click()
        button.click()
        button.click()

        assert.equal(count, 1)
      })
    })

    describe("properties", () => {
      it("should set DOM properties", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["input", { properties: { value: "hello" } }], container)

        const input = container.firstChild as HTMLInputElement
        assert.equal(input.value, "hello")
      })

      it("should set custom properties", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(["div", { properties: { customData: { foo: "bar" } } }], container)

        const div = container.firstChild as HTMLElement & { customData: unknown }
        assert.deepEqual(div.customData, { foo: "bar" })
      })
    })

    describe("xmlns", () => {
      it("should create SVG elements with namespace", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          [
            "svg",
            { xmlns: "http://www.w3.org/2000/svg" },
            ["circle", { cx: "50", cy: "50", r: "40" }],
          ],
          container,
        )

        const svg = container.firstChild as SVGElement
        assert.equal(svg.namespaceURI, "http://www.w3.org/2000/svg")

        const circle = svg.firstChild as SVGElement
        assert.equal(circle.namespaceURI, "http://www.w3.org/2000/svg")
        assert.equal(circle.getAttribute("cx"), "50")
      })

      it("should inherit xmlns to nested children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          [
            "svg",
            { xmlns: "http://www.w3.org/2000/svg" },
            ["g", [["rect", { x: "0", y: "0", width: "100", height: "100" }]]],
          ],
          container,
        )

        const svg = container.firstChild as SVGElement
        const g = svg.firstChild as SVGElement
        const rect = g.firstChild as SVGElement

        assert.equal(g.namespaceURI, "http://www.w3.org/2000/svg")
        assert.equal(rect.namespaceURI, "http://www.w3.org/2000/svg")
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

    describe("FragmentRenderSpec", () => {
      it("should render a simple fragment with children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render([null, ["span", "first"], ["span", "second"]], container)

        assert.equal(container.childNodes.length, 2)
        assert.equal((container.childNodes[0] as Element).tagName, "SPAN")
        assert.equal((container.childNodes[0] as Element).textContent, "first")
        assert.equal((container.childNodes[1] as Element).tagName, "SPAN")
        assert.equal((container.childNodes[1] as Element).textContent, "second")
      })

      it("should render an empty fragment", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render([null], container)

        assert.equal(container.childNodes.length, 0)
      })

      it("should render fragment at the beginning of element children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          ["div", {}, [[null, ["span", "a"], ["span", "b"]], ["p", "c"]]],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.childNodes.length, 3)
        assert.equal((div.childNodes[0] as Element).tagName, "SPAN")
        assert.equal((div.childNodes[0] as Element).textContent, "a")
        assert.equal((div.childNodes[1] as Element).tagName, "SPAN")
        assert.equal((div.childNodes[1] as Element).textContent, "b")
        assert.equal((div.childNodes[2] as Element).tagName, "P")
        assert.equal((div.childNodes[2] as Element).textContent, "c")
      })

      it("should render fragment in the middle of element children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          ["div", {}, [["p", "before"], [null, ["span", "a"], ["span", "b"]], ["p", "after"]]],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.childNodes.length, 4)
        assert.equal((div.childNodes[0] as Element).tagName, "P")
        assert.equal((div.childNodes[0] as Element).textContent, "before")
        assert.equal((div.childNodes[1] as Element).tagName, "SPAN")
        assert.equal((div.childNodes[1] as Element).textContent, "a")
        assert.equal((div.childNodes[2] as Element).tagName, "SPAN")
        assert.equal((div.childNodes[2] as Element).textContent, "b")
        assert.equal((div.childNodes[3] as Element).tagName, "P")
        assert.equal((div.childNodes[3] as Element).textContent, "after")
      })

      it("should render fragment at the end of element children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          ["div", {}, [["p", "before"], [null, ["span", "a"], ["span", "b"]]]],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.childNodes.length, 3)
        assert.equal((div.childNodes[0] as Element).tagName, "P")
        assert.equal((div.childNodes[1] as Element).tagName, "SPAN")
        assert.equal((div.childNodes[2] as Element).tagName, "SPAN")
      })

      it("should render nested fragments", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        // [null, span-a, [null, span-b, span-c], span-d]
        brint.render(
          [null, ["span", "a"], [null, ["span", "b"], ["span", "c"]], ["span", "d"]],
          container,
        )

        assert.equal(container.childNodes.length, 4)
        assert.equal((container.childNodes[0] as Element).textContent, "a")
        assert.equal((container.childNodes[1] as Element).textContent, "b")
        assert.equal((container.childNodes[2] as Element).textContent, "c")
        assert.equal((container.childNodes[3] as Element).textContent, "d")
      })

      it("should handle fragment with null children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render([null, ["span", "a"], null, ["span", "b"]], container)

        assert.equal(container.childNodes.length, 2)
        assert.equal((container.childNodes[0] as Element).textContent, "a")
        assert.equal((container.childNodes[1] as Element).textContent, "b")
      })

      it("should handle fragment with text children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render([null, "hello", " ", "world"], container)

        assert.equal(container.childNodes.length, 3)
        assert.equal(container.textContent, "hello world")
      })

      it("should handle deeply nested fragments", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        // Three levels of nesting
        brint.render(
          [
            "div",
            {},
            [
              [null, ["span", "1"], [null, ["span", "2"], [null, ["span", "3"]]]],
            ],
          ],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.childNodes.length, 3)
        assert.equal((div.childNodes[0] as Element).textContent, "1")
        assert.equal((div.childNodes[1] as Element).textContent, "2")
        assert.equal((div.childNodes[2] as Element).textContent, "3")
      })

      it("should inherit xmlns through fragments", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(
          [
            "svg",
            { xmlns: "http://www.w3.org/2000/svg" },
            [[null, ["circle", { r: "10" }], ["rect", { width: "20" }]]],
          ],
          container,
        )

        const svg = container.firstChild as SVGElement
        const circle = svg.childNodes[0] as SVGElement
        const rect = svg.childNodes[1] as SVGElement

        assert.equal(circle.namespaceURI, "http://www.w3.org/2000/svg")
        assert.equal(rect.namespaceURI, "http://www.w3.org/2000/svg")
      })

      it("should unmount fragment and remove all children", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const handle = brint.render([null, ["span", "a"], ["span", "b"]], container)

        assert.equal(container.childNodes.length, 2)

        handle.unmount()

        assert.equal(container.childNodes.length, 0)
      })
    })

    describe("reactive attributes", () => {
      it("should update attribute when reactive value changes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ className: "initial" })

        brint.render(["div", { class: () => state.className }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("class"), "initial")

        // Update the state
        state.className = "updated"

        // The attribute should be updated
        assert.equal(div.getAttribute("class"), "updated")
      })

      it("should update attribute with reactive array value", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ active: false })

        brint.render(
          ["div", { class: ["base", () => (state.active ? "active" : null)] }],
          container,
        )

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("class"), "base")

        // Update the state
        state.active = true

        // The attribute should include "active" now
        assert.equal(div.getAttribute("class"), "base active")
      })

      it("should remove attribute when reactive value becomes null", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ title: "hello" as string | null })

        brint.render(["div", { title: () => state.title }], container)

        const div = container.firstChild as Element
        assert.equal(div.getAttribute("title"), "hello")

        // Set to null
        state.title = null

        // The attribute should be removed
        assert.equal(div.hasAttribute("title"), false)
      })
    })

    describe("reactive styles", () => {
      it("should update style when reactive value changes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ color: "red" })

        brint.render(["div", { style: { color: () => state.color } }], container)

        const div = container.firstChild as HTMLElement
        assert.equal(div.style.color, "red")

        // Update the state
        state.color = "blue"

        // The style should be updated
        assert.equal(div.style.color, "blue")
      })

      it("should remove style when reactive value becomes null", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ display: "block" as string | null })

        brint.render(["div", { style: { display: () => state.display } }], container)

        const div = container.firstChild as HTMLElement
        assert.equal(div.style.display, "block")

        // Set to null
        state.display = null

        // The style should be removed
        assert.equal(div.style.display, "")
      })
    })

    describe("reactive properties", () => {
      it("should update property when reactive value changes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ value: "initial" })

        brint.render(["input", { properties: { value: () => state.value } }], container)

        const input = container.firstChild as HTMLInputElement
        assert.equal(input.value, "initial")

        // Update the state
        state.value = "updated"

        // The property should be updated
        assert.equal(input.value, "updated")
      })

      it("should handle non-reactive properties alongside reactive ones", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ reactive: "reactive-value" })

        brint.render(
          [
            "input",
            {
              properties: {
                value: () => state.reactive,
                placeholder: "static-value",
              },
            },
          ],
          container,
        )

        const input = container.firstChild as HTMLInputElement
        assert.equal(input.value, "reactive-value")
        assert.equal(input.placeholder, "static-value")

        // Update the reactive property
        state.reactive = "new-value"

        assert.equal(input.value, "new-value")
        assert.equal(input.placeholder, "static-value")
      })
    })

    describe("cleanup", () => {
      it("should cleanup reactive values when unmounting", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ value: "test" })
        let callCount = 0

        const handle = brint.render(
          [
            "div",
            {
              class: () => {
                callCount++
                return state.value
              },
            },
          ],
          container,
        )

        // Initial render calls the function
        assert.equal(callCount, 1)

        // Update should call again
        state.value = "updated"
        assert.equal(callCount, 2)

        // Unmount
        handle.unmount()

        // After unmount, updates should NOT call the function
        state.value = "after-unmount"
        assert.equal(callCount, 2) // Still 2, not 3
      })

      it("should cleanup nested reactive values in arrays", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ a: "a", b: "b" })
        let callCountA = 0
        let callCountB = 0

        const handle = brint.render(
          [
            "div",
            {
              class: [
                () => {
                  callCountA++
                  return state.a
                },
                () => {
                  callCountB++
                  return state.b
                },
              ],
            },
          ],
          container,
        )

        // Initial render
        assert.equal(callCountA, 1)
        assert.equal(callCountB, 1)

        // Update should call both
        state.a = "aa"
        state.b = "bb"
        assert.equal(callCountA, 2)
        assert.equal(callCountB, 2)

        // Unmount
        handle.unmount()

        // After unmount, updates should NOT call functions
        state.a = "aaa"
        state.b = "bbb"
        assert.equal(callCountA, 2)
        assert.equal(callCountB, 2)
      })
    })

    describe("FunctionRenderSpec", () => {
      it("should render a function that returns an element", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(() => ["div", "hello"], container)

        assert.equal(container.childNodes.length, 1)
        const div = container.firstChild as Element
        assert.equal(div.tagName, "DIV")
        assert.equal(div.textContent, "hello")
      })

      it("should render a function that returns text", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(() => "hello world", container)

        assert.equal(container.childNodes.length, 1)
        assert.equal(container.textContent, "hello world")
      })

      it("should render a function that returns null", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        brint.render(() => null, container)

        assert.equal(container.childNodes.length, 0)
      })

      it("should re-render when reactive dependencies change", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ count: 0 })

        brint.render(() => ["span", String(state.count)], container)

        const span = container.firstChild as Element
        assert.equal(span.textContent, "0")

        // Update the state
        state.count = 42

        // The content should be updated
        // Note: We don't assert element identity because comparing DOM elements with
        // assert.equal causes infinite loops due to circular parent/child references
        // in happy-dom. The element may or may not be reused depending on reconciliation.
        assert.equal((container.firstChild as Element).textContent, "42")
      })

      it("should update text content when returning different text", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ message: "hello" })

        brint.render(() => state.message, container)

        assert.equal(container.textContent, "hello")

        // Update the state
        state.message = "world"

        // The text should be updated
        assert.equal(container.textContent, "world")
      })

      it("should replace element when tag changes", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ useDiv: true })

        brint.render(() => (state.useDiv ? ["div", "content"] : ["span", "content"]), container)

        assert.equal((container.firstChild as Element).tagName, "DIV")

        // Change tag
        state.useDiv = false

        assert.equal((container.firstChild as Element).tagName, "SPAN")
      })

      it("should handle function returning element with nested function via fragment", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ value: "test" })

        // Use fragment syntax [null, ...children] to embed a function
        brint.render(
          () => ["div", {}, [null, () => ["span", state.value]]],
          container,
        )

        const div = container.firstChild as Element
        const span = div.firstChild as Element
        assert.equal(span.tagName, "SPAN")
        assert.equal(span.textContent, "test")

        // Update state
        state.value = "updated"

        assert.equal((div.firstChild as Element).textContent, "updated")
      })

      it("should cleanup function CachedFunction on unmount", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        const state = domain.enableChanges({ value: "test" })
        let callCount = 0

        const handle = brint.render(() => {
          callCount++
          return ["div", state.value]
        }, container)

        assert.equal(callCount, 1)

        // Update should trigger re-render
        state.value = "updated"
        assert.equal(callCount, 2)

        // Unmount
        handle.unmount()

        // After unmount, updates should NOT trigger re-render
        state.value = "after unmount"
        assert.equal(callCount, 2)
      })

      it("should pass RenderContext to function", () => {
        const domain = new ChangeDomain()
        const brint = create({ changeDomain: domain })

        let receivedCtx: unknown = null

        brint.render((ctx) => {
          receivedCtx = ctx
          return ["div", "test"]
        }, container)

        assert.notEqual(receivedCtx, null)
        assert.equal(typeof receivedCtx, "object")
      })
    })
  })
})
