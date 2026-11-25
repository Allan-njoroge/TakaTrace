import { Users as UsersIcon } from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Table, TableContainer, TBody, TD, TDMono, TH, THead, TR } from "../../components/ui/Table";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAdminUsers } from "../../hooks/useAdmin";

const ROLE_LABEL: Record<string, string> = {
  CENTRE_OPERATOR: "Buying centre",
  BRAND_OFFICER: "Brand",
  ADMIN: "Admin",
};

export default function AdminUsersPage() {
  useDocumentTitle("Users");
  const users = useAdminUsers();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Users</h1>

      <div className="mt-6">
        {users.isLoading ? (
          <Skeleton className="h-64" />
        ) : users.data && users.data.length > 0 ? (
          <TableContainer>
            <Table>
              <THead>
                <TR>
                  <TH>Wallet</TH>
                  <TH>Name</TH>
                  <TH>Role</TH>
                  <TH>On-chain</TH>
                </TR>
              </THead>
              <TBody>
                {users.data.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <HashDisplay value={user.walletAddress} leadChars={6} trailChars={4} />
                    </TD>
                    <TDMono>{user.displayName}</TDMono>
                    <TD>{ROLE_LABEL[user.role] ?? user.role}</TD>
                    <TD>{user.onChainApproved ? "Yes" : "No"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <EmptyState icon={UsersIcon} title="No users yet." />
        )}
      </div>
    </div>
  );
}
