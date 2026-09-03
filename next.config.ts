import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Turbopack confunda el root del proyecto con "GitHub Proyects" (vive fuera de este git).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
