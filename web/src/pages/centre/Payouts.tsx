import { useState } from "react";
import { Banknote } from "lucide-react";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { PayoutStatusChip } from "../../components/ui/StatusChip";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePayouts, useRetryPayout } from "../../hooks/usePayouts";
import { formatKes } from "../../lib/format";
import { toast } from "../../lib/toast";

export default function PayoutsPage() {
  useDocumentTitle("Payouts");
  const [status, setStatus] = useState("");
  const payouts = usePayouts({ status: status || undefined });
  const retry = useRetryPayout();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Payouts</h1>

      {payouts.data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Paid today" value={formatKes(payouts.data.totals.paidToday)} />
          <SummaryCard label="Pending" value={payouts.data.totals.pending.toString()} />
          <SummaryCard label="Failed" value={payouts.data.totals.failed.toString()} />
        </div>
      )}

      <div className="mt-6">
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
        </Select>
      </div>

      <div className="mt-6">
        {payouts.isLoading ? (
          <Skeleton className="h-64" />
        ) : payouts.data && payouts.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Picker</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Provider</TH>
                  <TH>Status</TH>
                  <TH>M-Pesa ID</TH>
                  <TH>Updated</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {payouts.data.items.map((payout) => (
                  <TR key={payout.id}>
                    <TDMono>{payout.receiptId}</TDMono>
                    <TDMono>{payout.pickerCode}</TDMono>
                    <TD className="text-right">{formatKes(payout.amountKes)}</TD>
                    <TD>{payout.provider === "MOCK" ? "Mock" : "M-Pesa sandbox"}</TD>
                    <TD>
                      <PayoutStatusChip status={payout.status} />
                      {payout.failureReason && <p className="mt-1 text-xs text-danger-600">{payout.failureReason}</p>}
                    </TD>
                    <TD className="font-mono text-xs">{payout.mpesaTransactionId ?? "—"}</TD>
                    <TD>{payout.updatedAt}</TD>
                    <TD>
                      {payout.status === "FAILED" && (
                        <Button
                          variant="secondary"
                          icon={null}
                          disabled={retry.isPending}
                          onClick={async () => {
                            await retry.mutateAsync(payout.id);
                            toast.success("Retrying payout");
                          }}
                        >
                          Retry payout
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={Banknote} title="No payouts yet." />
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line-200 bg-paper p-4">
      <p className="text-xs font-medium text-ink-600">{label}</p>
      <p className="mt-1 text-xl font-medium text-ink-900">{value}</p>
    </div>
  );
}
