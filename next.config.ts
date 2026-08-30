import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "tree-sitter",
    "tree-sitter-javascript",
    "tree-sitter-typescript",
    "tree-sitter-python",
  ],
};

export default nextConfig;
