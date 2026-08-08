/** @type {import('next').NextConfig} */
// output:'standalone' keeps the door open to running this in a container
// (e.g. AWS me-central-1) without a rewrite when data residency requires it.
const nextConfig = { output: 'standalone', reactStrictMode: true };
export default nextConfig;
