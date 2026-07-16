import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { Window } from "happy-dom"
import { create, manage, fragment } from "../src/index.js"
import { ChangeDomain } from "chchchchanges"

let window: Window
let document: Document

beforeEach(() => {
  window = new Window()
  document = window.document
  ;(globalThis as unknown as { document: Document }).document = document
})

afterEach(() => {
  window.close()
})

const mountRoot = (): Element => {
  const el = document.createElement("div")
  document.body.appendChild(el)
  return el
}

describe("manage", () => {
  it("applies attributes to an existing element without clearing others", () => {
    const html = document.documentElement
    html.setAttribute("data-existing", "keep")

    const brint = create({ changeDomain: new ChangeDomain() })
    brint.render(manage(html, { class: "added", lang: "en" }), mountRoot())

    assert.equal(html.getAttribute("data-existing"), "keep")
    assert.equal(html.getAttribute("class"), "added")
    assert.equal(html.getAttribute("lang"), "en")
  })

  it("applies styles without clearing existing inline styles", () => {
    const html = document.documentElement
    html.style.setProperty("color", "red")

    const brint = create({ changeDomain: new ChangeDomain() })
    brint.render(manage(html, { style: { background: "blue" } }), mountRoot())

    assert.equal(html.style.getPropertyValue("color"), "red")
    assert.equal(html.style.getPropertyValue("background"), "blue")
  })

  it("leaves existing children alone when children are omitted", () => {
    const html = document.documentElement
    const childCountBefore = html.children.length // <head>, <body>

    const brint = create({ changeDomain: new ChangeDomain() })
    brint.render(manage(html, { class: "themed" }), mountRoot())

    assert.equal(html.getAttribute("class"), "themed")
    assert.equal(html.children.length, childCountBefore)
    assert.ok(html.querySelector("body"))
  })

  it("takes ownership of children when provided (clears existing, sets new)", () => {
    const title = document.createElement("title")
    title.textContent = "Old Title"
    document.head.appendChild(title)

    const brint = create({ changeDomain: new ChangeDomain() })
    brint.render(manage(title, {}, "New Title"), mountRoot())

    assert.equal(title.textContent, "New Title")
  })

  it("updates reactive attributes", () => {
    const domain = new ChangeDomain()
    const state = domain.enableChanges({ cls: "a" }) as { cls: string }
    const html = document.documentElement

    const brint = create({ changeDomain: domain })
    brint.render(manage(html, { class: () => state.cls }), mountRoot())
    assert.equal(html.getAttribute("class"), "a")

    state.cls = "b"
    assert.equal(html.getAttribute("class"), "b")
  })

  it("does not remove the element on unmount, but detaches listeners and managed children", () => {
    const title = document.createElement("title")
    title.textContent = "Existing"
    document.head.appendChild(title)

    let clicks = 0
    const brint = create({ changeDomain: new ChangeDomain() })
    const handle = brint.render(
      manage(title, { on: { click: () => clicks++ } }, "Managed"),
      mountRoot(),
    )

    assert.equal(title.textContent, "Managed")
    title.dispatchEvent(new window.Event("click"))
    assert.equal(clicks, 1)

    handle.unmount()

    // The element itself is left in the document...
    assert.ok(document.head.contains(title))
    // ...its brint-managed children are removed...
    assert.equal(title.textContent, "")
    // ...and the listener we added is detached.
    title.dispatchEvent(new window.Event("click"))
    assert.equal(clicks, 1)
  })

  it("renders sibling content correctly alongside a managed portal", () => {
    const html = document.documentElement
    const root = mountRoot()

    const brint = create({ changeDomain: new ChangeDomain() })
    brint.render(
      fragment(manage(html, { class: "themed" }), ["div", { id: "content" }, "hello"]),
      root,
    )

    assert.equal(html.getAttribute("class"), "themed")
    assert.equal(root.querySelector("#content")?.textContent, "hello")
    // the managed <html> is not pulled into the mount root
    assert.equal(root.querySelector("html"), null)
  })
})
