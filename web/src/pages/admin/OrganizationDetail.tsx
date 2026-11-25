import { useParams } from "react-router";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/StatusChip";
import { Skeleton } from "../../components/ui/Skeleton";
import { TxStepper } from "../../components/chain/TxStepper";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminOrganization, type OrganizationWallet } from "../../hooks/useAdmin";
import { useContractTx } from "../../hooks/useContractTx";
import { api } from "../../lib/api";
import { toast } from "../../lib/toast";

export default function OrganizationDetailPage() {
  const { orgId } = useParams();
  const org = useAdminOrganization(orgId);
  useDocumentTitle(org.data?.name ?? "Organisation detail");

  if (org.isLoading) return <Skeleton className="h-64" />;
  if (!org.data) return <p className="text-sm text-ink-600">We couldn&apos;t load this organisation.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink-900">{org.data.name}</h1>
      <p className="mt-1 text-sm text-ink-600">
        {org.data.type === "BUYING_CENTRE" ? "Buying centre" : "Brand"} · {org.data.county} · {org.data.code}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink-900">Wallets</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {org.data.wallets.map((wallet) => (
            <WalletRow key={wallet.address} wallet={wallet} orgType={org.data.type} onSynced={() => void org.refetch()} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function WalletRow({
  wallet,
  orgType,
  onSynced,
}: {
  wallet: OrganizationWallet;
  orgType: "BUYING_CENTRE" | "BRAND";
  onSynced: () => void;
}) {
  const tx = useContractTx();

  async function approve() {
    const status = await tx.run({
      send: (contract) => (orgType === "BUYING_CENTRE" ? contract.addBuyingCentre(wallet.address) : contract.addBrand(wallet.address)),
      onSubmitted: async (txHash) => {
        await api.post("/api/admin/role-sync", { txHash });
      },
    });
    if (status === "synced") {
      toast.success("Wallet approved on-chain");
      onSynced();
    }
  }

  const outOfSync = wallet.status === "ACTIVE" && !wallet.onChainApproved;

  return (
    <li className="rounded-card border border-line-200 bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-900">{wallet.name}</p>
          <HashDisplay value={wallet.address} leadChars={6} trailChars={4} />
        </div>
        <div className="flex items-center gap-2">
          {outOfSync && <Chip tone="amber" icon={ShieldCheck} label="Out of sync" />}
          {wallet.onChainApproved ? (
            <Chip tone="success" icon={ShieldCheck} label="Approved on-chain" />
          ) : (
            <Button variant="secondary" icon={null} onClick={() => void approve()}>
              Approve on blockchain
            </Button>
          )}
        </div>
      </div>
      {tx.state.status !== "idle" && (
        <div className="mt-4">
          <TxStepper tx={tx.state} />
        </div>
      )}
    </li>
  );
}
