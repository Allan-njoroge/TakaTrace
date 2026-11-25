# Everyday commands

Once you've done the one-time setup in [Getting started](getting-started.md), this is all you need day to day. Everything below is run from a terminal opened inside the project folder.

## Start everything

```shell
./start.sh
```

Starts the local blockchain, the backend, and the frontend, in the right order. Safe to run any time — if something's already running, it reuses it instead of starting a duplicate. It also automatically re-approves and re-anchors anything that needs it after a blockchain restart (see [Troubleshooting](troubleshooting.md) for what that means).

When it finishes, it prints three web addresses:

```
Hardhat RPC   http://127.0.0.1:8545
Backend API   http://127.0.0.1:3010/api/health
Frontend      http://127.0.0.1:5173
```

Open the **Frontend** address in your browser — that's the website. The other two are for the pieces working behind the scenes; you generally won't need to open those yourself.

## Stop everything

```shell
./stop.sh
```

Cleanly stops the blockchain, backend, and frontend. Run this when you're done for the day, or before restarting if something seems stuck.

## Check what's happening behind the scenes

Each piece writes its own log file as it runs, in `.dev-logs/`:

- `.dev-logs/hardhat.log` — the blockchain
- `.dev-logs/backend.log` — the server
- `.dev-logs/frontend.log` — the website build tool

If something isn't behaving as expected, these logs usually say why. See [Troubleshooting](troubleshooting.md) for how to read them.

## Reset the test data

If the test data gets messy (e.g. after a lot of manual testing) and you want to start over with a clean, freshly-seeded database:

```shell
./stop.sh
cd server
npm run db:reset
cd ..
./start.sh
```

This wipes the backend's database and recreates it with the same test data described in [Test credentials](test-credentials.md). It does **not** affect the blockchain itself or anything in your MetaMask wallet.
