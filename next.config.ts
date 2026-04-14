import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, PUT, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Authorization, Content-Type, Accept, Origin, X-Requested-With",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
