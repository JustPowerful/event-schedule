import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["pg-native"],
  noExternal: [],
  treeshake: true,
  tsconfig: "tsconfig.json",
});
