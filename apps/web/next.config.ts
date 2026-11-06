import type { NextConfig } from 'next';
const nextConfig: NextConfig = { transpilePackages: ['@wls/database','@wls/shared'] };
export default nextConfig;
