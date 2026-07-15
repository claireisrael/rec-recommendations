import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const staffLocal = path.join(root, "config", "staff.json");
const staffExample = path.join(root, "config", "staff.example.json");
const staffFile = fs.existsSync(staffLocal) ? staffLocal : staffExample;
const staffAlias = fs.existsSync(staffLocal)
  ? "./config/staff.json"
  : "./config/staff.example.json";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@staff-config": staffAlias,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@staff-config": staffFile,
    };
    return config;
  },
};

export default nextConfig;
