# Test credentials

TakaTrace comes pre-loaded with fake test data so you can try every part of the system immediately, without a real wallet, real phone, or anyone's approval. None of this is real — every name, phone number, and address below is fictional test data that only works on your own local copy of the project.

This data is created automatically the first time the backend starts (see `server/prisma/seed.ts` if you're curious exactly how).

---

## Wallet logins (buying centre, brand, and admin staff)

These roles sign in through MetaMask. Each one corresponds to one of [Hardhat's](https://hardhat.org) well-known public test accounts — the same 20 accounts and keys that appear automatically every time any Hardhat project starts its local blockchain, pre-loaded with fake test money. They are published openly by the Hardhat project itself and are **never valid on any real network** — don't be alarmed that they're sitting in plain text here.

To use one: in MetaMask, go to **account icon → Add account or hardware wallet → Import account → Private Key**, then paste the key.

| Role | What they can do | Wallet address | Private key |
|---|---|---|---|
| **Admin** | Approve buying centres and brands, manage users, watch the blockchain connection, resolve disputes, see system-wide reports | `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **Buying centre operator** (Kariobangi Recyclers, Nairobi) | Weigh in pickers' plastic, create receipts, manage prices, handle payouts and disputes | `0x70997970c51812dc3a010c7d01b50e0d17dc79c8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **Brand A officer** (Brand A Beverages Ltd) | Browse verified receipts, claim recycling credit toward targets, see reports | `0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **Brand B officer** (Brand B Foods Ltd) | Same as Brand A, separate company | `0x90f79bf6eb2c4f870365e785982e1f101e93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |

Once imported, switch MetaMask to the account you want to test, make sure the network is still **TakaTrace Local** (see [Getting started](getting-started.md) step 7), then sign in on the website as usual.

### MetaMask local network settings (reference)

| Field | Value |
|---|---|
| Network name | TakaTrace Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency symbol | ETH |

---

## Waste pickers (SMS/USSD side)

Pickers never need a wallet, an app, or even a smartphone — they're identified only by their phone number, and interact with TakaTrace entirely through text messages and a USSD menu (the `*123#` style menus that work on any phone). The real integrations (Africa's Talking) aren't connected by default; instead, there's an on-screen phone simulator at **Admin → Demo** (or directly at `/simulate`) that behaves exactly like a real phone would, so you can test this flow without any SMS provider set up.

| Code | Name | Phone number | Preferred language |
|---|---|---|---|
| P-0001 | Wanjiru Kamau | +254711000101 | Swahili |
| P-0002 | Otieno Owuor | +254711000102 | English |
| P-0003 | Achieng Odhiambo | +254711000103 | Swahili |
| P-0004 | Mwangi Njoroge | +254711000104 | English |
| P-0005 | Fatuma Hassan | +254711000105 | Swahili |

To try the picker experience: sign in as the buying centre operator, create a weigh-in receipt for one of these pickers, then open the phone simulator and enter their phone number to see the SMS/USSD confirmation they'd receive.

---

## Other seeded data

- A second buying centre, **Mombasa Coastal Plastics** (code `MSA01`), exists but has no login of its own yet — useful if you need to test multi-centre scenarios. Add one via **Admin → Organizations → [the centre] → Add user**, using any of the other unused Hardhat test private keys (accounts #4 onward — see them printed in `.dev-logs/hardhat.log` after starting the project, or generate a fresh wallet of your own and have the admin add that wallet address instead).
- Recycling prices are pre-set at Kariobangi Recyclers (KES per kg): PET 25.00, HDPE 30.00, LDPE 15.00, PP 20.00, PS 10.00, Other 5.00.
- Brand A has 2026 recycling targets of 50,000 kg PET and 10,000 kg HDPE, so its dashboard has something to track progress against.

## Registering a wallet that isn't on this list

If you want to test with your own personal MetaMask wallet instead of an imported test key, an admin has to add it first:

1. Sign in as the **Admin** test account.
2. Go to an organisation (buying centre or brand) → **Add user**.
3. Paste your wallet's address (visible at the top of MetaMask), give it a name and role.
4. Switch MetaMask to your own wallet and sign in as usual.

If you instead see **"This wallet isn't approved on the blockchain yet"** after being added, it means the role was recorded in the database but not yet granted on the smart contract — this resolves itself automatically the next time `./start.sh` runs (see [Troubleshooting](troubleshooting.md), "Local blockchain was restarted").
