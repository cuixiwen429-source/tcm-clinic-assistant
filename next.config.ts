import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow pdfkit in server bundles
  serverExternalPackages: ["pdfkit", "@react-pdf/renderer"],
  // Ensure prisma migration files are included in serverless bundles
  // (accessed dynamically via fs.readFileSync, not statically imported)
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/**/*"],
  },
  experimental: {
    // serverActions available by default in Next 15
  },
};

export default nextConfig;
