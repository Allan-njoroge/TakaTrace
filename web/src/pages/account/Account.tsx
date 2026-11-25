import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { HashDisplay } from "../../components/chain/HashDisplay";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useMe } from "../../hooks/useMe";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { toast } from "../../lib/toast";

const ROLE_LABEL: Record<string, string> = {
  CENTRE_OPERATOR: "Buying centre",
  BRAND_OFFICER: "Brand",
  ADMIN: "Admin",
};

export default function AccountPage() {
  useDocumentTitle("My account");
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!me) return null;

  const walletAddress = me.user.walletAddress;

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    queryClient.setQueryData(queryKeys.me(), null);
    navigate("/");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(walletAddress);
    toast.success("Address copied");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-ink-900">My account</h1>
      <dl className="mt-6 divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-ink-600">Wallet</dt>
          <dd>
            <HashDisplay value={me.user.walletAddress} leadChars={6} trailChars={4} />
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-ink-600">Role</dt>
          <dd className="text-sm font-medium text-ink-900">{ROLE_LABEL[me.user.role] ?? me.user.role}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-ink-600">Organisation</dt>
          <dd className="text-sm font-medium text-ink-900">{me.organization?.name ?? "—"}</dd>
        </div>
      </dl>
      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={() => void handleCopy()}>
          Copy address
        </Button>
        <Button variant="danger" icon={null} onClick={() => void handleSignOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
