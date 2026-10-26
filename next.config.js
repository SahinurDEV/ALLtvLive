/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Report-only for now: streams and logos come from thousands of hosts, so
  // the policy is watched before it is enforced.
  { key: "Content-Security-Policy-Report-Only", value: csp() },
];

function csp() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://www.youtube.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "media-src 'self' blob: https: http:",
    "connect-src 'self' https: http:",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://*.googlesyndication.com https://*.doubleclick.net",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

const nextConfig = {
  images: {
    // All logos are third-party URLs rendered with `unoptimized`; turning the
    // optimizer off removes the /_next/image proxy for arbitrary hosts.
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async rewrites() {
    // The sitemap is split into /sitemap/0.xml…; /sitemap.xml stays valid as the index.
    return [{ source: "/sitemap.xml", destination: "/sitemap-index.xml" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Browsers must always fetch the latest service worker.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

module.exports = nextConfig;
