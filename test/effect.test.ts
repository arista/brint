import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import { Window } from "happy-dom"
import { create, effect, list, manage } from "../src/index.js"
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

describe("element effects", () => {
  let container: Element

  beforeEach(() => {
    container = mountRoot()
  })

  it("runs once on mount, with the element and the source's value", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ open: true })

    const runs: Array<{ tag: string; value: unknown }> = []

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.open,
            (e, open) => {
              runs.push({ tag: e.tagName, value: open })
            },
          ),
        },
      ],
      container,
    )

    assert.deepEqual(runs, [{ tag: "DIV", value: true }])
  })

  it("does not run before the element is in the document", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: 1 })

    // Args are applied before insertion, so an effect that ran at apply time
    // would see a detached element. This is the whole reason the first run is
    // queued.
    let connectedAtFirstRun: boolean | null = null

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.value,
            (e) => {
              connectedAtFirstRun ??= document.body.contains(e)
            },
          ),
        },
      ],
      container,
    )

    assert.equal(connectedAtFirstRun, true)
  })

  it("runs after the element's onMount", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: 1 })

    const order: string[] = []

    brint.render(
      [
        "div",
        {
          onMount: () => {
            order.push("onMount")
          },
          effect: effect(
            () => state.value,
            () => {
              order.push("effect")
            },
          ),
        },
      ],
      container,
    )

    assert.deepEqual(order, ["onMount", "effect"])
  })

  it("re-runs when the source changes", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ open: false })

    const values: unknown[] = []

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.open,
            (_e, open) => {
              values.push(open)
            },
          ),
        },
      ],
      container,
    )

    state.open = true
    state.open = false

    assert.deepEqual(values, [false, true, false])
  })

  it("re-runs on invalidation even when the source's value is unchanged", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ tick: 0, open: false })

    let runs = 0

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => {
              // Depends on tick, but does not return it
              void state.tick
              return state.open
            },
            () => {
              runs++
            },
          ),
        },
      ],
      container,
    )

    assert.equal(runs, 1)

    // Same contract as reactive attributes and properties: brint's last value is
    // not the element's current state, so an invalidation always re-applies.
    state.tick = 1

    assert.equal(runs, 2)
  })

  it("takes a composite source for multiple dependencies", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ width: 10, height: 20 })

    const sizes: Array<[number, number]> = []

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => ({ width: state.width, height: state.height }),
            (_e, { width, height }) => {
              sizes.push([width, height])
            },
          ),
        },
      ],
      container,
    )

    state.height = 30

    assert.deepEqual(sizes, [
      [10, 20],
      [10, 30],
    ])
  })

  it("does not track reads made by the callback", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ source: 0, other: "a" })

    let runs = 0

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.source,
            () => {
              // Only the source function is tracked, so this read must not
              // become a dependency
              void state.other
              runs++
            },
          ),
        },
      ],
      container,
    )

    assert.equal(runs, 1)

    state.other = "b"
    assert.equal(runs, 1)

    state.source = 1
    assert.equal(runs, 2)
  })

  it("notifies model writes made by the callback", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ source: 0, written: "" })

    let observed = 0

    brint.render(
      [
        "div",
        {
          // The callback runs outside the tracking scope, so a write here goes
          // through the normal notify path rather than being silently applied.
          effect: effect(
            () => state.source,
            (_e, value) => {
              state.written = `v${value}`
            },
          ),
          properties: {
            title: () => {
              observed++
              return state.written
            },
          },
        },
      ],
      container,
    )

    const div = container.firstChild as HTMLElement
    assert.equal(div.title, "v0")

    state.source = 1
    assert.equal(div.title, "v1")
    assert.ok(observed > 1, "the reactive property should have been notified")
  })

  it("runs the cleanup before each re-run", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: 0 })

    const log: string[] = []

    brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.value,
            (_e, value) => {
              log.push(`run ${value}`)
              return () => log.push(`cleanup ${value}`)
            },
          ),
        },
      ],
      container,
    )

    state.value = 1
    state.value = 2

    assert.deepEqual(log, ["run 0", "cleanup 0", "run 1", "cleanup 1", "run 2"])
  })

  it("runs the cleanup when the element is unmounted", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: 0 })

    const log: string[] = []

    const handle = brint.render(
      [
        "div",
        {
          effect: effect(
            () => state.value,
            () => () => log.push("cleanup"),
          ),
        },
      ],
      container,
    )

    handle.unmount()
    assert.deepEqual(log, ["cleanup"])

    // And it stops re-running
    state.value = 1
    assert.deepEqual(log, ["cleanup"])
  })

  it("runs the cleanup when a list item is surgically removed", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: 0 })
    const items = domain.enableChanges(["a", "b"])

    const log: string[] = []

    brint.render(
      list(
        () => items,
        (item: string) => [
          "div",
          {
            effect: effect(
              () => state.value,
              () => {
                log.push(`run ${item}`)
                return () => log.push(`cleanup ${item}`)
              },
            ),
          },
        ],
      ),
      container,
    )

    assert.deepEqual(log, ["run a", "run b"])

    items.pop()
    assert.deepEqual(log, ["run a", "run b", "cleanup b"])

    // The removed item's effect must not re-run against its detached element
    state.value = 1
    assert.deepEqual(log, ["run a", "run b", "cleanup b", "cleanup a", "run a"])
  })

  it("re-establishes the effect when the element is reconciled", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ generation: 0, value: 0 })

    const log: string[] = []
    let mounts = 0

    brint.render(() => {
      const generation = state.generation
      return [
        "div",
        {
          onMount: () => {
            mounts++
          },
          effect: effect(
            () => state.value,
            (_e, value) => {
              log.push(`gen${generation} run ${value}`)
              return () => log.push(`gen${generation} cleanup ${value}`)
            },
          ),
        },
      ]
    }, container)

    assert.deepEqual(log, ["gen0 run 0"])
    assert.equal(mounts, 1)

    // Re-render the body: the element is reused, so onMount does not fire again,
    // but the effect belongs to the outgoing args and has to be replaced.
    state.generation = 1
    assert.deepEqual(log, ["gen0 run 0", "gen0 cleanup 0", "gen1 run 0"])
    assert.equal(mounts, 1)

    // Only the new generation's effect is live
    state.value = 1
    assert.deepEqual(log, [
      "gen0 run 0",
      "gen0 cleanup 0",
      "gen1 run 0",
      "gen1 cleanup 0",
      "gen1 run 1",
    ])
  })

  it("stops the effect when the new args have none", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ withEffect: true, value: 0 })

    const log: string[] = []

    brint.render(
      () =>
        state.withEffect
          ? [
              "div",
              {
                effect: effect(
                  () => state.value,
                  () => {
                    log.push("run")
                    return () => log.push("cleanup")
                  },
                ),
              },
            ]
          : ["div", {}],
      container,
    )

    assert.deepEqual(log, ["run"])

    state.withEffect = false
    assert.deepEqual(log, ["run", "cleanup"])

    state.value = 1
    assert.deepEqual(log, ["run", "cleanup"])
  })

  it("works on a managed element", () => {
    const domain = new ChangeDomain()
    const brint = create({ changeDomain: domain })
    const state = domain.enableChanges({ value: "a" })

    const seen: unknown[] = []

    brint.render(
      manage(document.documentElement, {
        effect: effect(
          () => state.value,
          (e, value) => {
            seen.push(`${e.tagName}:${value}`)
          },
        ),
      }),
      container,
    )

    assert.deepEqual(seen, ["HTML:a"])

    state.value = "b"
    assert.deepEqual(seen, ["HTML:a", "HTML:b"])
  })
})
