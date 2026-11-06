import type { NextConfig } from 'next';
import { resolve } from 'node:path';
import { config } from 'dotenv';

// npm workspaces starts Next inside apps/web; the shared .env lives at the
// repository root. Existing deployment/app variables retain precedence.
config({ path: resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@wls/database','@wls/shared','@wls/video'],
};
export default nextConfig;
