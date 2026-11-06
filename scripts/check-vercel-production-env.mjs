#!/usr/bin/env node

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PRIMITIVE_API_KEY",
  "PRIMITIVE_FROM_EMAIL",
  "PRIMITIVE_DOMAIN_ID",
  "PRIMITIVE_WEBHOOK_SECRET",
  "SEND_EMAIL_HOOK_SECRET",
  "VIBENEST_APP_URL",
  "VIBENEST_AGENT_API_SECRET",
  "CRON_SECRET",
];

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID || "prj_diV6OavJj9uZXd4zAM3iNsyqRHRf";
const teamId = process.env.VERCEL_TEAM_ID || "team_V26zDnx54gE8Yckcj0CxbFhN";

if (!token) {
  console.error("Missing VERCEL_TOKEN. Create a Vercel access token with access to this project.");
  process.exit(2);
}

const configured = new Set();
let until;
for (let page = 0; page < 10; page += 1) {
  const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`);
  url.searchParams.set("decrypt", "false");
  url.searchParams.set("limit", "100");
  if (teamId) url.searchParams.set("teamId", teamId);
  if (until) url.searchParams.set("until", String(until));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    console.error(`Vercel env listing failed with HTTP ${response.status}; no values were requested or printed.`);
    process.exit(2);
  }

  const result = await response.json();
  const envs = Array.isArray(result.envs) ? result.envs : [];
  for (const item of envs) {
    if (item?.key && Array.isArray(item.target) && item.target.includes("production")) {
      configured.add(item.key);
    }
  }

  const next = result.pagination?.next;
  if (!next || next === until) break;
  until = next;
}

const missing = required.filter((key) => !configured.has(key));
console.log("VibeNest Vercel Production environment variable audit");
console.log(`Project: ${projectId}`);
console.log(`Required variables: ${required.length}`);
console.log(`Configured for Production: ${required.length - missing.length}/${required.length}`);
if (missing.length) {
  console.error("Missing Production variable names:");
  for (const key of missing) console.error(`- ${key}`);
  console.error("This checks variable presence and Production targeting only; it never decrypts or prints values.");
  process.exit(1);
}

console.log("All required variable names are configured for Production.");
console.log("Note: encrypted secret contents are intentionally not inspected.");
