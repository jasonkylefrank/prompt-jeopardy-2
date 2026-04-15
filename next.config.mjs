/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  // Optional: Prevents hydration issues if you use underscores in filenames
  trailingSlash: true,
};

export default nextConfig;
