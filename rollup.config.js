import { defineConfig } from "rollup";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";

export default defineConfig([
  {
    input: "src/index.ts",
    output: {
      file: "dist/leaflet.trackmarker.d.ts",
      format: "es",
    },
    plugins: [
      dts({
        respectExternal: false,
      }),
    ],
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/leaflet.trackmarker.esm.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/leaflet.trackmarker.umd.js",
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
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        declarationMap: false,
        sourceMap: true,
        emitDeclarationOnly: true,
      }),
      terser(),
    ],
  },
]);
