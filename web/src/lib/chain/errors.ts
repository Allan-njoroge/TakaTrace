/** Maps a raw ethers/MetaMask error to the friendly message from spec section 13.4. */

interface MaybeEthersError {
  code?: string | number;
  reason?: string;
  shortMessage?: string;
  message?: string;
  info?: { error?: { message?: string } };
}

const REVERT_MESSAGES: Record<string, string> = {
  "Only the admin can do this": "Only the TakaTrace admin wallet can do this.",
  "Only an approved buying centre can do this": "This wallet isn't approved on the blockchain as a buying centre.",
  "Only an approved brand can do this": "This wallet isn't approved on the blockchain as a brand.",
  "This receipt ID is already used": "This receipt ID is already on the blockchain.",
  "Receipt does not exist": "This receipt isn't on the blockchain.",
  "Credit already claimed by another brand": "Another brand already claimed this credit. Each credit can be claimed once.",
  "Receipt is under dispute": "This receipt is under dispute, so it can't be claimed until it's resolved.",
  "Credit already claimed": "This credit was already claimed, so its dispute status can't change on the blockchain.",
  "Only admin or recording centre": "Only the centre that recorded this receipt, or the admin, can change its dispute status.",
};

function extractRevertReason(error: MaybeEthersError): string | undefined {
  const candidates = [error.reason, error.info?.error?.message, error.shortMessage, error.message];
  for (const candidate of candidates) {
    if (!candidate) continue;
    for (const known of Object.keys(REVERT_MESSAGES)) {
      if (candidate.includes(known)) return known;
    }
  }
  return undefined;
}

export function getFriendlyChainErrorMessage(error: unknown): string {
  const err = (error ?? {}) as MaybeEthersError;

  if (err.code === "ACTION_REJECTED" || err.code === 4001) {
    return "You cancelled in MetaMask. Nothing was sent to the blockchain.";
  }

  const knownRevert = extractRevertReason(err);
  if (knownRevert) {
    return REVERT_MESSAGES[knownRevert];
  }

  if (err.code === "NETWORK_ERROR") {
    return "Can't reach the blockchain. Is the local node running?";
  }

  const message = err.shortMessage ?? err.message ?? "";
  if (/nonce too high/i.test(message)) {
    return "MetaMask's history is out of date after a blockchain restart. In MetaMask: Settings → Advanced → Clear activity tab data.";
  }

  const shortReason = err.shortMessage ?? message.slice(0, 160) ?? "Unknown error.";
  return `The blockchain rejected this. Details: ${shortReason}`;
}
