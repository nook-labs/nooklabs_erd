import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // 로컬 네트워크 IP 접속 허용
  allowedDevOrigins: [
    "172.30.1.96",
    "172.30.1.96:3000",
    "172.30.1.92",
    "172.30.1.92:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "0.0.0.0",
    "0.0.0.0:3000",
  ],
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
