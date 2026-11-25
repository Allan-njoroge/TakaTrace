#!/usr/bin/env node
// Checks whether any receipts need re-anchoring (BACKEND_SPEC.md section 13.5 — this
// happens whenever the local Hardhat node restarts, since it wipes all chain history)
// and, if so, re-anchors them automatically via the demo signer. Called from
// ../../start.sh after the backend comes up. Always a best-effort step: never exits
// non-zero, so it can't block the rest of start.sh.
//
// Signs in with Hardhat's well-known, public practice admin key (account #0 — see
// BACKEND_SPEC.md section 13.7; worthless outside a local Hardhat node, never a real
// key), matching DEMO_SIGNER_KEYS in server/.env. Only meaningful when DEMO_MODE=true
// and the server actually has DEMO_SIGNER_KEYS configured — start.sh only calls this
// when DEMO_MODE=true, and a 404 from /api/demo/* (demo mode off) or a sign-in
// failure (wallet not registered/approved — e.g. a non-demo deployment) are both
// treated as "nothing to do here", not errors.

import { Wallet } from "ethers";

const BASE = process.env.TAKATRACE_API_URL || "http://127.0.0.1:3010";
const ADMIN_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function signIn() {
  const wallet = new Wallet(ADMIN_KEY);
  const nonceRes = await fetch(`${BASE}/api/auth/nonce?address=${wallet.address}`);
  if (!nonceRes.ok) throw new Error(`nonce request failed: ${nonceRes.status}`);
  const { message } = await nonceRes.json();
  const signature = await wallet.signMessage(message);
  const verifyRes = await fetch(`${BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!verifyRes.ok) throw new Error(`sign-in failed: ${verifyRes.status}`);
  const cookie = verifyRes.headers.get("set-cookie");
  if (!cookie) throw new Error("no session cookie returned");
  return cookie;
}

async function main() {
  const cookie = await signIn();

  const chainRes = await fetch(`${BASE}/api/admin/chain`, { headers: { Cookie: cookie } });
  if (!chainRes.ok) throw new Error(`chain status request failed: ${chainRes.status}`);
  const chain = await chainRes.json();

  if (chain.receiptsNeedingReanchor === 0) {
    console.log("    No receipts need re-anchoring.");
    return;
  }

  console.log(`    ${chain.receiptsNeedingReanchor} receipt(s) need re-anchoring — fixing...`);
  const reanchorRes = await fetch(`${BASE}/api/demo/reanchor-all`, { method: "POST", headers: { Cookie: cookie } });
  if (!reanchorRes.ok) {
    console.log(`    Couldn't auto-fix (status ${reanchorRes.status}) — re-anchor manually from Admin -> Blockchain.`);
    return;
  }
  const result = await reanchorRes.json();
  console.log(`    Re-approved ${result.reapproved} role(s), re-anchored ${result.reanchored} receipt(s).`);
}

main().catch((err) => {
  console.log(`    Skipped auto re-anchor check (${err.message}).`);
});
