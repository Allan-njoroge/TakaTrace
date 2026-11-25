import { Link } from "react-router";
import { MessageSquareWarning } from "lucide-react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useDisputes } from "../../hooks/useDisputes";
import { formatDateTime } from "../../lib/format";

const OPENED_BY_LABEL: Record<string, string> = {
  PICKER_USSD: "Picker (USSD)",
  PICKER_SMS: "Picker (SMS)",
  CENTRE: "Centre",
};

export default function DisputesPage() {
  useDocumentTitle("Disputes");
  const disputes = useDisputes();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Disputes</h1>

      <div className="mt-6">
        {disputes.isLoading ? (
          <Skeleton className="h-64" />
        ) : disputes.data && disputes.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Dispute</TH>
                  <TH>Receipt</TH>
                  <TH>Opened by</TH>
                  <TH>Reason</TH>
                  <TH>Opened</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {disputes.data.items.map((dispute) => (
                  <TR key={dispute.id} className="hover:bg-cream-100">
                    <TDMono>
                      <Link to={`/app/centre/disputes/${dispute.id}`}>{dispute.id}</Link>
                    </TDMono>
                    <TDMono>{dispute.receiptId}</TDMono>
                    <TD>{OPENED_BY_LABEL[dispute.openedBy] ?? dispute.openedBy}</TD>
                    <TD>{dispute.reason}</TD>
                    <TD>
                      {formatDateTime(dispute.openedAt)}
                      {dispute.ageHours > 48 && <span className="ml-2 text-xs font-medium text-amber-700">Overdue</span>}
                    </TD>
                    <TD>{dispute.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={MessageSquareWarning} title="No disputes." />
        )}
      </div>
    </div>
  );
}
