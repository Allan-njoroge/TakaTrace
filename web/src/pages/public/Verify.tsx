import { useState } from "react";
import { useNavigate } from "react-router";
import { ScanLine } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api } from "../../lib/api";
import type { VerifyResponse } from "../../types/api";

const RECEIPT_ID_PATTERN = /^TT-[A-Z0-9]{3,8}-\d{6}$/;

function normalizeReceiptId(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export default function VerifyPage() {
  useDocumentTitle("Verify");
  const navigate = useNavigate();
  const [receiptId, setReceiptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [recordText, setRecordText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteChecking, setPasteChecking] = useState(false);
  const hasCameraScanner = typeof window !== "undefined" && "BarcodeDetector" in window;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeReceiptId(receiptId);
    if (!RECEIPT_ID_PATTERN.test(normalized)) {
      setError("Receipt IDs look like TT-NRB01-000042.");
      return;
    }
    setError(null);
    navigate(`/verify/${normalized}`);
  }

  async function handlePasteSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasteError(null);
    setPasteChecking(true);
    try {
      const result = await api.post<VerifyResponse>("/api/verify/text", { recordText });
      navigate(`/verify/${result.receiptId}`);
    } catch {
      setPasteError("We couldn't match that record text. Check it was copied in full.");
    } finally {
      setPasteChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-ink-600">Verify</p>
      <h1 className="mt-2 text-3xl font-medium text-ink-900">Check a recycling receipt.</h1>
      <p className="mt-2 text-base text-ink-600">Enter the receipt ID from the SMS or printed receipt.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <Input
          label="Receipt ID"
          placeholder="TT-NRB01-000042"
          value={receiptId}
          onChange={(event) => setReceiptId(event.target.value)}
          error={error ?? undefined}
          className="flex-1"
        />
        <Button type="submit">Check receipt</Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-sm text-ink-600">
        <span className="h-px flex-1 bg-line-200" />
        or
        <span className="h-px flex-1 bg-line-200" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {hasCameraScanner && (
          <Button variant="secondary" icon={<ScanLine className="size-3.5" />}>
            Scan QR code
          </Button>
        )}
        <Button variant="ghost" icon={null} onClick={() => setShowPaste((value) => !value)}>
          Paste the full record text
        </Button>
      </div>

      {showPaste && (
        <form onSubmit={handlePasteSubmit} className="mt-6 flex flex-col gap-3">
          <label htmlFor="record-text" className="text-sm font-semibold text-ink-900">
            Record text
          </label>
          <textarea
            id="record-text"
            value={recordText}
            onChange={(event) => setRecordText(event.target.value)}
            rows={3}
            className="rounded-input border border-line-200 bg-paper p-3 font-mono text-xs text-ink-900 outline-none focus:border-forest-700"
            placeholder="v1|TT-NRB01-000042|P-0017|PET|50.00|2026-11-10|bafy…|9f2c…"
          />
          {pasteError && (
            <p role="alert" className="text-sm text-danger-600">
              {pasteError}
            </p>
          )}
          <Button type="submit" loading={pasteChecking} loadingLabel="Checking…" className="self-start">
            Check this text
          </Button>
        </form>
      )}
    </div>
  );
}
