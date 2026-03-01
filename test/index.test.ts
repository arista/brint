import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { create, List } from "../src/index.js"
import { ChangeDomain } from "chchchchanges"

describe("brint", () => {
  describe("create", () => {
    it("should create a Brint instance", () => {
      const domain = new ChangeDomain()
      const brint = create({ changeDomain: domain })

      assert.ok(brint)
      assert.equal(typeof brint.render, "function")
      assert.equal(brint.List, List)
    })

    it("should return a RenderHandle with unmount", () => {
      const domain = new ChangeDomain()
      const brint = create({ changeDomain: domain })

      // Create a mock element
      const element = {} as Element

      const handle = brint.render("hello", element)

      assert.ok(handle)
      assert.equal(typeof handle.unmount, "function")
    })
  })

  describe("List symbol", () => {
    it("should be a symbol", () => {
      assert.equal(typeof List, "symbol")
    })
  })
})
