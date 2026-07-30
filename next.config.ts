import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/retainer/compile": ["./src/templates/retainer/*.b64"],
  },
};

export default nextConfig;
