import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/contrato.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: false,
  target: "es2020",
});
