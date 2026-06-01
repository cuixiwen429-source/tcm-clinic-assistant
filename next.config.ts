import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow pdfkit in server bundles
  serverExternalPackages: ["pdfkit", "@react-pdf/renderer"],
  experimental: {
    // serverActions available by default in Next 15
  },
};

export default nextConfig;
