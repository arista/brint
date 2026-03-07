import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/elements.ts", "src/svg.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
})
