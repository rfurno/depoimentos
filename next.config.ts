import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false, // Remove X-Powered-By header
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Note: A full CSP is complex with Tailwind/shadcn inline styles and Supabase.
          // Consider adding a strict one later with 'unsafe-inline' for styles if needed,
          // or use a nonce-based approach for production hardening.
        ],
      },
    ]
  },
};

export default nextConfig;
