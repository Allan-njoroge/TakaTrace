# Using TakaTrace — a full walkthrough

This walks through every part of the whole system, in the order a real recycling transaction would actually happen: a picker brings in plastic, a centre weighs it and pays them, the receipt gets verified publicly, and a brand claims it toward its recycling targets — with an admin overseeing all of it. Use this once you've finished [Getting started](getting-started.md) and have the site open and signed in.

Follow it top to bottom the first time, using the test identities from [Test credentials](test-credentials.md), to see the whole system work end to end.

---

## 1. Sign in as the buying centre operator

1. If you're signed in as someone else, sign out (top-right menu) first.
2. In MetaMask, switch to the **buying centre** test account (see [Test credentials](test-credentials.md) for the key to import — `0x70997970...`).
3. On TakaTrace, **Sign in with MetaMask**. You land on the centre's dashboard, showing today's weigh-ins, cash paid out, and anything needing attention.

## 2. Record a weigh-in (create a receipt)

This is the core action of the whole system — the moment a picker's plastic becomes a permanent record.

1. Go to **New weigh-in**.
2. Pick an existing test picker (e.g. `P-0001 — Wanjiru Kamau`), or register a new one on the spot.
3. Enter a material type (e.g. PET), a weight in kilograms, and attach a photo of the scale (any image works for testing).
4. Submit. You'll see the receipt move through a short sequence of states — drafted, then **anchored on the blockchain** (this is the step where its fingerprint gets permanently written to the smart contract; it happens automatically in the background and the screen updates live when it's done, no action needed from you).
5. Open the new receipt from **Receipts**. Note its **receipt code** — you'll use it in step 4 below.

## 3. Pay the picker

1. Still as the centre operator, go to **Payouts**.
2. Find the receipt and trigger its payout. In this demo setup, no real money moves — a mock payment provider simulates success (or, if you want to see what a failure looks like, see the `MOCK_PAYOUT_FAIL_PHONES` setting mentioned in `BACKEND_SPEC.md`).
3. Open the **phone simulator** (**Admin → Demo**, or go directly to `/simulate`) and enter the picker's phone number (e.g. `+254711000101`) to see the SMS confirmation they'd receive on a real phone.

## 4. Verify the receipt publicly

Anyone — not just someone signed in — can check that a receipt is genuine.

1. Sign out, or just open a new private/incognito browser window.
2. Go to the homepage and use the **verify a receipt** option, entering the receipt code from step 2 (or scanning its QR code if one was generated).
3. You should see the exact details that were recorded — material, weight, date, centre — along with confirmation that it's genuinely anchored on the blockchain. This is the same page a member of the public, a journalist, or an auditor would use to spot-check a brand's recycling claims.

## 5. Claim the receipt as a brand

1. Sign out and sign back in as a **brand officer** (e.g. Brand A — key `0x3c44cdddb6...`).
2. On the brand dashboard, you'll see verified, unclaimed receipts available to claim.
3. Claim the receipt from step 2. It now counts toward that brand's recycling target, visible on their dashboard and in their reports.

## 6. Oversee it all as admin

1. Sign out and sign back in as the **admin** (key `0xac0974bec3...`).
2. Explore:
   - **Overview** — a system-wide summary of activity.
   - **Organizations** — approve or manage buying centres and brands.
   - **Users** — see or add who can sign in, and with what role.
   - **Blockchain** — the live connection status to the local chain, and whether anything needs re-anchoring.
   - **Audit** — a log of every significant action taken in the system, by whom.
   - **Integrations** — test the SMS, payout, and photo storage connections.
   - **Demo** — the phone simulator and other demo-only tools (only visible because `DEMO_MODE=true`).

## 7. Try a dispute (optional)

Disputes model what happens when a recorded weigh-in is challenged (e.g. "this weight looks wrong").

1. As the centre operator, open a receipt and raise a dispute against it.
2. As the admin, go to **Disputes** (or the centre's own **Disputes** page) and resolve it — either upholding the original receipt or correcting it.

---

## What to look at if you want to see "under the hood"

- **`.dev-logs/`** — raw logs from each of the three running pieces (see [Everyday commands](everyday-commands.md)).
- **Admin → Blockchain** — shows the exact smart contract address currently in use, and how many blocks behind (if any) the backend's records are from the chain itself.
- **Admin → Audit** — every action anyone takes, in order, who did it, and when — the same kind of trail a real compliance team would want to review.

Once you're comfortable with this flow, [Project structure](project-structure.md) explains how the code behind each of these screens is organised.
