import { QRCodeSVG } from "qrcode.react";
import { Seal } from "../../components/brand/Seal";
import { formatDate, formatKes, formatKg } from "../../lib/format";
import { MATERIAL_LABEL } from "../../lib/materials";
import type { Receipt } from "../../types/api";

/** A4 / 80mm-thermal-friendly print view (spec 8.5). Rendered via ?print=1 on the receipt detail route. */
export default function ReceiptPrint({ receipt }: { receipt: Receipt }) {
  const verifyUrl = `${window.location.origin}/verify`;
  const shortLinkUrl = `${window.location.origin}/v/${receipt.receiptId}`;
  const pricePerKg = receipt.weightKg > 0 ? receipt.payoutKes / receipt.weightKg : 0;

  return (
    <div className="mx-auto max-w-sm bg-paper p-6 text-ink-900 print:p-0">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">TakaTrace</p>
        <Seal size={64} />
      </div>
      <p className="mt-4 font-mono text-2xl font-semibold">{receipt.receiptId}</p>
      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <Row label="Buying centre" value={receipt.centre.name} />
        <Row label="Picker" value={receipt.pickerCode} />
        <Row label="Material" value={MATERIAL_LABEL[receipt.material]} />
        <Row label="Weight" value={formatKg(receipt.weightKg)} />
        <Row label="Price" value={`${formatKes(pricePerKg)}/kg`} />
        <Row label="Payout" value={formatKes(receipt.payoutKes)} />
        <Row label="Date" value={formatDate(receipt.weighedOn)} />
      </dl>

      <div className="mt-6 flex items-center gap-4 border-t border-line-200 pt-4">
        <QRCodeSVG value={shortLinkUrl} size={96} />
        <p className="text-xs text-ink-600">Check this receipt at {verifyUrl}</p>
      </div>

      <div className="mt-6 print:hidden">
        <button type="button" onClick={() => window.print()} className="rounded-full border border-ink-900 px-5 py-2 text-sm font-semibold">
          Print
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
