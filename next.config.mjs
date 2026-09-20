/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: { "/api/invoices/*/payment-request": ["./assets/fonts/*.ttf"] },
    serverComponentsExternalPackages: ["node:sqlite"],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({ "node:sqlite": "commonjs node:sqlite" });
    return config;
  },
};

export default nextConfig;
