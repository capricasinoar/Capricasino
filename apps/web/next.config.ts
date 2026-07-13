import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // para la imagen Docker (infra/docker/web.Dockerfile)
  outputFileTracingRoot: path.join(__dirname, "../.."), // raíz del monorepo
};

export default nextConfig;
