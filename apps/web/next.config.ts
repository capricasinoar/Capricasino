import path from "node:path";
import type { NextConfig } from "next";

// Cabeceras de seguridad (Cap. 8.4). La CSP estricta con nonce queda pendiente
// (Next inyecta scripts inline); estas no rompen nada y aportan protección real.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // esta app no se embebe en iframes
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone", // para la imagen Docker (infra/docker/web.Dockerfile)
  outputFileTracingRoot: path.join(__dirname, "../.."), // raíz del monorepo
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
