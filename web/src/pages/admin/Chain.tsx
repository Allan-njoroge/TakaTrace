import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { Skeleton } from "../../components/ui/Skeleton";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminChain, useIntegrityScan, useResyncChain } from "../../hooks/useAdmin";
import { useReanchorAll } from "../../hooks/useDemoTools";
import { config } from "../../config";
import { toast } from "../../lib/toast";

export default function ChainPage() {
  useDocumentTitle("Blockchain");
  const chain = useAdminChain();
  const resync = useResyncChain();
  const scan = useIntegrityScan();
  const reanchorAll = useReanchorAll();
  const [scanResult, setScanResult] = useState<Awaited<ReturnType<typeof scan.mutateAsync>> | null>(null);

  if (chain.isLoading) return <Skeleton className="h-64" />;
  if (!chain.data) return <p className="text-sm text-ink-600">Couldn&apos;t load blockchain status.</p>;

  const c = chain.data;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink-900">Blockchain</h1>

      {c.chainReset && (
        <Banner
          severity="danger"
          message={`The local blockchain was restarted. ${c.receiptsNeedingReanchor} receipts need re-anchoring.`}
        />
      )}

      <dl className="mt-6 flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
        <Row label="Chain ID" value={c.chainId.toString()} />
        <Row label="RPC URL" value={c.rpcUrl} />
        <Row label="Latest block" value={c.latestBlock.toString()} />
        <Row label="Contract address" value={<HashDisplay value={c.contractAddress} leadChars={6} trailChars={4} />} />
        <Row label="Admin address" value={<HashDisplay value={c.adminAddress} leadChars={6} trailChars={4} />} />
        <Row label="Epoch" value={c.epoch.toString()} />
        <Row label="Genesis hash" value={<HashDisplay value={c.genesisHash} leadChars={6} trailChars={4} />} />
      </dl>

      <section className="mt-8 rounded-card border border-line-200 bg-paper p-5">
        <h2 className="text-sm font-semibold text-ink-900">Indexer</h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-600">Status</dt>
            <dd className="text-ink-900">{c.indexer.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Last processed block</dt>
            <dd className="text-ink-900">{c.indexer.lastProcessedBlock}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Lag</dt>
            <dd className="text-ink-900">{c.indexer.lagBlocks} blocks</dd>
          </div>
          {c.indexer.lastError && (
            <div className="flex justify-between">
              <dt className="text-ink-600">Last error</dt>
              <dd className="text-danger-600">{c.indexer.lastError}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon={null}
          loading={resync.isPending}
          onClick={async () => {
            await resync.mutateAsync();
            toast.success("Resyncing from block 0");
          }}
        >
          Resync from block 0
        </Button>
        <Button
          variant="secondary"
          icon={null}
          loading={scan.isPending}
          onClick={async () => {
            const result = await scan.mutateAsync();
            setScanResult(result);
          }}
        >
          Run integrity scan
        </Button>
        {config.demoMode && (
          <Button
            variant="secondary"
            icon={null}
            loading={reanchorAll.isPending}
            onClick={async () => {
              await reanchorAll.mutateAsync();
              toast.success("Re-anchoring all receipts");
            }}
          >
            Re-anchor all (demo mode)
          </Button>
        )}
      </div>

      {scanResult && (
        <div className="mt-6 rounded-card border border-line-200 bg-paper p-5">
          <p className="text-sm text-ink-900">
            Checked {scanResult.checked} · {scanResult.match} match · {scanResult.mismatch} mismatch · {scanResult.notOnChain} not on
            chain
          </p>
          {scanResult.mismatches.length > 0 && (
            <ul className="mt-3 list-inside list-disc text-sm text-danger-600">
              {scanResult.mismatches.map((m) => (
                <li key={m.receiptId} className="font-mono text-xs">
                  {m.receiptId} — {m.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-ink-900">{value}</dd>
    </div>
  );
}
