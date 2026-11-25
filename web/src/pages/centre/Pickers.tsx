import { useState } from "react";
import { Link } from "react-router";
import { Users } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { LinkButton } from "../../components/ui/LinkButton";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePickers } from "../../hooks/usePickers";
import { formatKg } from "../../lib/format";

export default function PickersPage() {
  useDocumentTitle("Pickers");
  const [q, setQ] = useState("");
  const pickers = usePickers({ q: q || undefined });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Pickers</h1>
        <LinkButton to="/app/centre/pickers/new">Register picker</LinkButton>
      </div>

      <div className="mt-6">
        <Input label="Search" placeholder="Phone, code or name" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
      </div>

      <div className="mt-6">
        {pickers.isLoading ? (
          <Skeleton className="h-64" />
        ) : pickers.data && pickers.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH>Phone</TH>
                  <TH>Registered</TH>
                  <TH className="text-right">Receipts</TH>
                  <TH className="text-right">Kg total</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {pickers.data.items.map((picker) => (
                  <TR key={picker.id} className="hover:bg-cream-100">
                    <TDMono>
                      <Link to={`/app/centre/pickers/${picker.id}`}>{picker.code}</Link>
                    </TDMono>
                    <TD>
                      {picker.firstName} {picker.lastName?.[0] ?? ""}
                    </TD>
                    <TD>{picker.phoneMasked}</TD>
                    <TD>{picker.registeredOn}</TD>
                    <TD className="text-right">{picker.receiptsCount}</TD>
                    <TD className="text-right">{formatKg(picker.kgTotal)}</TD>
                    <TD>{picker.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={Users} title="No pickers registered yet." action={<LinkButton to="/app/centre/pickers/new">Register picker</LinkButton>} />
        )}
      </div>
    </div>
  );
}
