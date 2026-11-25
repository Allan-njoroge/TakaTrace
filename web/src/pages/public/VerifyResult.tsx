import { useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Seal } from "../../components/brand/Seal";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { Skeleton } from "../../components/ui/Skeleton";
import { Button } from "../../components/ui/Button";
import { LinkButton } from "../../components/ui/LinkButton";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useVerifyReceipt, type ClientVerdict } from "../../hooks/useVerifyReceipt";
import { formatDate, formatDateTime, formatKg } from "../../lib/format";
import { config } from "../../config";

const HEADLINE: Record<ClientVerdict, string> = {
  MATCH: "This receipt matches the blockchain.",
  MISMATCH: "This record was changed after it was saved.",
  NOT_ON_CHAIN: "This receipt hasn't been saved to the blockchain yet.",
  NOT_FOUND: "We couldn't find that receipt. Check the ID on your SMS.",
  CHAIN_UNAVAILABLE: "We couldn't reach the blockchain to check.",
};

export default function VerifyResultPage() {
  const { receiptId } = useParams();
  useDocumentTitle(receiptId ? `Verify ${receiptId}` : "Verify result");
  const { data, isLoading, isError, refetch, isFetching } = useVerifyReceipt(receiptId);
  const [showRecordText, setShowRecordText] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="mt-6 h-8 w-80" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-lg text-ink-900">We couldn&apos;t reach the blockchain to check. Try again.</p>
        <Button className="mt-6" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { server, verdict, browserHash, onChainHash } = data;
  const headline = HEADLINE[verdict];

  if (verdict === "NOT_FOUND") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-lg text-ink-900">We couldn&apos;t find receipt {receiptId}. Check the ID on your SMS.</p>
        <LinkButton to="/verify" variant="secondary" className="mt-6">
          Try another receipt
        </LinkButton>
      </div>
    );
  }

  const sealVariant = verdict === "MATCH" ? "verified" : verdict === "MISMATCH" ? "failed" : "neutral";

  return (
    <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Seal key={verdict} variant={sealVariant} stamp={verdict === "MATCH" || verdict === "MISMATCH"} size={96} />
        <div>
          <h1 className="text-2xl font-medium text-ink-900">{headline}</h1>
          {server && (
            <p className="mt-1 text-sm text-ink-600">
              Checked {formatDateTime(server.checkedAt)} directly against contract{" "}
              <HashDisplay value={server.contract.address} leadChars={6} trailChars={4} />.
            </p>
          )}
        </div>
      </div>

      {verdict === "CHAIN_UNAVAILABLE" && (
        <Button className="mt-4" variant="secondary" onClick={() => refetch()} loading={isFetching}>
          Retry
        </Button>
      )}

      {server?.record.supersededBy && (
        <p className="mt-6 rounded-input bg-amber-100 px-4 py-3 text-sm text-amber-700">
          This receipt was corrected.{" "}
          <Link to={`/verify/${server.record.supersededBy}`} className="underline">
            See the corrected receipt {server.record.supersededBy}
          </Link>
          .
        </p>
      )}

      {server && (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div
            className={`rounded-card border p-5 ${verdict === "MISMATCH" ? "border-danger-600 bg-danger-100" : "border-line-200 bg-paper"}`}
          >
            <h2 className="text-sm font-semibold text-ink-900">Record (from TakaTrace)</h2>
            {verdict === "MISMATCH" && (
              <p className="mt-2 text-sm text-danger-600">
                The details below are what TakaTrace shows now. They don&apos;t match what was saved on{" "}
                {data.onChainHash && server.onChain ? formatDate(server.onChain.recordedAt) : "the original date"}.
                Contact the buying centre or report it.
              </p>
            )}
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <Row label="Receipt ID" value={server.receiptId} mono />
              <Row label="Buying centre" value={server.record.centre.name} />
              <Row label="Picker" value={server.record.pickerCode} mono />
              <Row label="Material" value={server.record.material} />
              <Row label="Weight" value={formatKg(server.record.weightKg)} />
              <Row label="Weighed on" value={formatDate(server.record.weighedOn)} />
            </dl>
            {verdict === "MISMATCH" && (
              <LinkButton to={`/contact?receipt=${server.receiptId}`} variant="danger" className="mt-4">
                Report this receipt
              </LinkButton>
            )}
          </div>

          <div className="rounded-card border border-line-200 bg-paper p-5">
            <h2 className="text-sm font-semibold text-ink-900">Blockchain evidence</h2>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <Row label="Fingerprint on-chain" value={onChainHash ? <HashDisplay value={onChainHash} /> : "—"} />
              <Row label="Fingerprint of record" value={browserHash ? <HashDisplay value={browserHash} /> : "—"} />
              <Row label="Match" value={verdict === "MATCH" ? "✓ Yes" : verdict === "MISMATCH" ? "✗ No" : "—"} />
              {server.onChain && (
                <>
                  <Row label="Recorded by" value={<HashDisplay value={server.onChain.recordedBy} leadChars={6} trailChars={4} />} />
                  <Row label="Recorded at" value={formatDateTime(server.onChain.recordedAt)} />
                  {server.onChain.anchorTx && (
                    <Row
                      label="Transaction"
                      value={
                        <a
                          href={config.explorerUrl ? `${config.explorerUrl}/tx/${server.onChain.anchorTx}` : undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline"
                        >
                          <HashDisplay value={server.onChain.anchorTx} />
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      }
                    />
                  )}
                  <Row
                    label="Credit"
                    value={server.onChain.claimed ? `Claimed by ${server.onChain.claimedByName ?? "another brand"}` : "Not claimed"}
                  />
                  <Row label="Dispute" value={server.onChain.disputed ? "Under dispute" : "None"} />
                </>
              )}
            </dl>
          </div>
        </div>
      )}

      {server && (
        <div className="mt-8 flex flex-col gap-4">
          <Disclosure title="Show the exact record text that was hashed" open={showRecordText} onToggle={setShowRecordText}>
            <p className="font-mono text-xs break-all text-ink-900">{server.recordText}</p>
          </Disclosure>
          <Disclosure title="How this check works" open={showHowItWorks} onToggle={setShowHowItWorks}>
            <p className="text-sm text-ink-600">
              We rebuild the record from what TakaTrace stored, compute its fingerprint in your browser, and ask the
              blockchain directly whether that fingerprint matches what was saved. TakaTrace's server never tells
              your browser whether it matches — your browser decides that for itself.
            </p>
          </Disclosure>
        </div>
      )}

      <Button variant="ghost" icon={null} className="mt-8" onClick={() => refetch()} loading={isFetching} loadingLabel="Checking…">
        Check again
      </Button>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className={mono ? "font-mono text-xs text-ink-900" : "text-ink-900"}>{value}</dd>
    </div>
  );
}

function Disclosure({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line-200 pt-4">
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-ink-900"
      >
        {title}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
