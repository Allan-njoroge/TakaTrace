import { shortAddress } from "../../lib/format";

const ROLE_LABEL: Record<string, string> = {
  CENTRE_OPERATOR: "Buying centre",
  BRAND_OFFICER: "Brand",
  ADMIN: "Admin",
};

export interface WalletChipProps {
  address: string;
  role: string;
  onClick?: () => void;
}

/** Short address + role, opens the account menu (spec 6.3). */
export function WalletChip({ address, role, onClick }: WalletChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-xs font-medium text-white"
    >
      {shortAddress(address)} {"·"} {ROLE_LABEL[role] ?? role}
    </button>
  );
}
