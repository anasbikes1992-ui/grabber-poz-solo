/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3", "node-thermal-printer", "pdf-lib", "xlsx"],
};

export default nextConfig;
