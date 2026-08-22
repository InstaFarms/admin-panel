import withFlowbiteReact from "flowbite-react/plugin/nextjs";
import { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// R2's public base URL is a plain passthrough (unlike the old Hetzner one, it's not
// built from endpoint+bucket — R2's S3 API endpoint isn't publicly readable, so
// R2_PUBLIC_URL is already the full public base on its own).
const r2PublicUrl = process.env.R2_PUBLIC_URL || undefined;
const r2PublicHostname = r2PublicUrl ? new URL(r2PublicUrl).hostname : undefined;

// Kept for backward compatibility: pre-migration rows may still hold an absolute URL
// built from the old Hetzner base (wallet attachments, GST certificates, space photos,
// and setting assets stored a fully-resolved URL at upload time rather than a relative
// key) — those keep resolving straight to Hetzner, and the read-only Bucket Browser
// still needs this too.
const hetznerBaseUrl =
  process.env.HETZNER_ENDPOINT && process.env.HETZNER_BUCKET
    ? `${process.env.HETZNER_ENDPOINT}/${process.env.HETZNER_BUCKET}`
    : undefined;

const nextConfig: NextConfig = {
  env: {
    ...(r2PublicUrl ? { NEXT_PUBLIC_R2_PUBLIC_URL: r2PublicUrl } : {}),
    ...(hetznerBaseUrl ? { NEXT_PUBLIC_HETZNER_BASE_URL: hetznerBaseUrl } : {}),
  },
  serverExternalPackages: ["pg", "firebase-admin"],
  transpilePackages: ["@repo/notification"],
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },

  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    optimizePackageImports: [
      'react-icons',
      'lucide-react',
      'recharts',
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "nbg1.your-objectstorage.com",
        pathname: "/**",
      },
      ...(r2PublicHostname
        ? [
            {
              protocol: "https" as const,
              hostname: r2PublicHostname,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
};

export default withSentryConfig(withFlowbiteReact(nextConfig), {
  org: "instafarms",
  project: "admin",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.CI,
  },
});
