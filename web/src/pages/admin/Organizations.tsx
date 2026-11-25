import { useState } from "react";
import { Link } from "react-router";
import { Building2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminOrganizations, useCreateOrganization, type CreateOrganizationInput } from "../../hooks/useAdmin";
import { toast } from "../../lib/toast";

const KENYA_COUNTIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Machakos"];

export default function OrganizationsPage() {
  useDocumentTitle("Organisations");
  const organizations = useAdminOrganizations();
  const createOrg = useCreateOrganization();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateOrganizationInput>({
    type: "BUYING_CENTRE",
    name: "",
    code: "",
    county: KENYA_COUNTIES[0],
    contactName: "",
    email: "",
    phone: "",
  });

  async function handleCreate() {
    await createOrg.mutateAsync(form);
    toast.success("Organisation added");
    setOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-ink-900">Organisations</h1>
        <Button onClick={() => setOpen(true)}>Add organisation</Button>
      </div>

      <div className="mt-6">
        {organizations.isLoading ? (
          <Skeleton className="h-64" />
        ) : organizations.data && organizations.data.items.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>County</TH>
                  <TH>Code</TH>
                  <TH>Wallets</TH>
                  <TH>On-chain</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {organizations.data.items.map((org) => (
                  <TR key={org.id} className="hover:bg-cream-100">
                    <TD>
                      <Link to={`/app/admin/organizations/${org.id}`}>{org.name}</Link>
                    </TD>
                    <TD>{org.type === "BUYING_CENTRE" ? "Buying centre" : "Brand"}</TD>
                    <TD>{org.county}</TD>
                    <TDMono>{org.code}</TDMono>
                    <TD>{org.wallets}</TD>
                    <TD>{org.onChainApproved ? "Yes" : "No"}</TD>
                    <TD>{org.status}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={Building2} title="No organisations yet." action={<Button onClick={() => setOpen(true)}>Add organisation</Button>} />
        )}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add organisation">
        <div className="flex flex-col gap-4">
          <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateOrganizationInput["type"] }))}>
            <option value="BUYING_CENTRE">Buying centre</option>
            <option value="BRAND">Brand</option>
          </Select>
          <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Code"
            required
            helperText="3–8 uppercase letters/digits, unique"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
          <Select label="County" value={form.county} onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}>
            {KENYA_COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </Select>
          <Input label="Contact name" required value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Button loading={createOrg.isPending} onClick={() => void handleCreate()} className="self-start">
            Add organisation
          </Button>
        </div>
      </Modal>
    </div>
  );
}
