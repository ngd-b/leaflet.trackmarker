import { defineConfig } from "rollup";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.esm.js",
      format: "es",
      sourcemap: true,
    },
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "L",
      extend: true,
      sourcemap: true,
      globals: {
        leaflet: "L",
        "@turf/turf": "turf",
      },
    },
  ],
  external: ["leaflet", "@turf/turf"],
  plugins: [typescript(), process.env.NODE_ENV === "production" && terser()],
});
