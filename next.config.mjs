/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  // CLAUDE.md/AGENTS.md at repo root are hand-written and govern both this
  // tree and prototype/ — don't let Next.js generate competing copies.
  agentRules: false,
};

export default nextConfig;
