import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    // Las suites de integración comparten DB: sin paralelismo entre archivos.
    fileParallelism: false,
  },
  plugins: [
    // esbuild no emite decorator metadata (lo necesita la DI de Nest) → SWC.
    swc.vite({ jsc: { transform: { legacyDecorator: true, decoratorMetadata: true }, target: "es2022" } }),
  ],
});
