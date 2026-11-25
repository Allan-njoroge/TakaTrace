import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import { useHealth } from "../../hooks/useHealth";
import { useMe } from "../../hooks/useMe";
import { useWallet } from "../../hooks/useWallet";
import { config } from "../../config";
import { shortAddress } from "../../lib/format";

interface SystemBannersProps {
  /** "app" pages also check the connected wallet (network, account, MetaMask presence). */
  scope: "public" | "app";
}

/** Shows the single highest-priority system banner, per the order in spec 6.4. */
export function SystemBanners({ scope }: SystemBannersProps) {
  const health = useHealth();
  const { data: me } = useMe();
  const wallet = useWallet();

  const extraCount = scope === "app" ? countExtraBanners({ health, me, wallet, scope }) : 0;

  const banner = pickBanner({ health, me, wallet, scope });
  if (!banner) return null;

  return (
    <div>
      {banner}
      {extraCount > 0 && <p className="bg-cream-100 px-4 py-1 text-right text-xs text-ink-600">+{extraCount} more</p>}
    </div>
  );
}

function pickBanner({
  health,
  me,
  wallet,
  scope,
}: {
  health: ReturnType<typeof useHealth>;
  me: ReturnType<typeof useMe>["data"];
  wallet: ReturnType<typeof useWallet>;
  scope: "public" | "app";
}) {
  if (health.isError && health.failureCount >= 2) {
    return (
      <Banner
        severity="danger"
        message="TakaTrace server is not responding. Changes can't be saved."
        action={
          <Button variant="secondary" onClick={() => health.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (health.data && !health.data.chain.contractDeployed) {
    return (
      <Banner
        severity="danger"
        message="The smart contract isn't deployed on this network. Run the deploy script, then reload."
        action={
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    );
  }

  if (health.data?.chain.chainReset) {
    const isAdmin = me?.user.role === "ADMIN";
    return (
      <Banner
        severity="warning"
        message="The local blockchain was restarted. Receipts need re-anchoring."
        action={
          isAdmin ? (
            <LinkButton variant="secondary" to="/app/admin/chain">
              Re-anchor now
            </LinkButton>
          ) : (
            <span className="text-sm font-medium">Tell your admin</span>
          )
        }
      />
    );
  }

  if (scope !== "app") return null;

  if (wallet.hasWallet && wallet.chainId !== null && wallet.isWrongNetwork) {
    return (
      <Banner
        severity="warning"
        message="MetaMask is on a different network."
        action={
          <Button variant="secondary" onClick={() => void wallet.switchNetwork()}>
            Switch to {config.chainName}
          </Button>
        }
      />
    );
  }

  if (me && wallet.address && wallet.address.toLowerCase() !== me.user.walletAddress.toLowerCase()) {
    return (
      <Banner
        severity="warning"
        message={`MetaMask switched to a different account (${shortAddress(wallet.address)}). Sign in again to continue as that account.`}
        action={
          <LinkButton variant="secondary" to="/sign-in">
            Sign in again
          </LinkButton>
        }
      />
    );
  }

  if (!wallet.hasWallet) {
    return (
      <Banner
        severity="info"
        message="Install MetaMask to sign weigh-ins and claims."
        action={
          <Button
            variant="secondary"
            onClick={() => window.open("https://metamask.io", "_blank", "noopener,noreferrer")}
          >
            Get MetaMask
          </Button>
        }
      />
    );
  }

  return null;
}

function countExtraBanners(args: Parameters<typeof pickBanner>[0]): number {
  // Re-run the same checks and count how many (beyond the first) would have applied.
  const checks = [
    () => args.health.isError && args.health.failureCount >= 2,
    () => Boolean(args.health.data && !args.health.data.chain.contractDeployed),
    () => Boolean(args.health.data?.chain.chainReset),
    () => args.scope === "app" && args.wallet.hasWallet && args.wallet.chainId !== null && args.wallet.isWrongNetwork,
    () =>
      args.scope === "app" &&
      Boolean(args.me && args.wallet.address && args.wallet.address.toLowerCase() !== args.me.user.walletAddress.toLowerCase()),
    () => args.scope === "app" && !args.wallet.hasWallet,
  ];
  const activeCount = checks.filter((check) => check()).length;
  return Math.max(0, activeCount - 1);
}
