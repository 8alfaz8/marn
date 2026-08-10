/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  // CLAUDE.md/AGENTS.md are governed from the repo root (one file for both
  // prototype/ and the real product) — don't let Next.js generate competing
  // copies here.
  agentRules: false,
};

export default nextConfig;