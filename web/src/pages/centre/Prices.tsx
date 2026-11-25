import { useState } from "react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePrices, useUpdatePrices } from "../../hooks/usePrices";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";
import { toast } from "../../lib/toast";
import type { Material } from "../../types/api";

export default function PricesPage() {
  useDocumentTitle("Prices");
  const prices = usePrices();
  const updatePrices = useUpdatePrices();
  // Only touched fields live here; untouched fields fall back to the fetched price (derived below).
  const [edits, setEdits] = useState<Partial<Record<Material, string>>>({});

  function valueFor(material: Material): string {
    if (edits[material] !== undefined) return edits[material];
    return (prices.data?.find((p) => p.material === material)?.pricePerKgKes ?? 0).toFixed(2);
  }

  const errors: Partial<Record<Material, string>> = {};
  for (const material of MATERIALS) {
    const value = Number(valueFor(material));
    if (Number.isNaN(value) || value < 0.01 || value > 1000) {
      errors[material] = "Enter a price between 0.01 and 1,000.00 KES.";
    }
  }
  const hasErrors = Object.keys(errors).length > 0;

  async function handleSave() {
    await updatePrices.mutateAsync(MATERIALS.map((material) => ({ material, pricePerKgKes: Number(valueFor(material)) })));
    setEdits({});
    toast.success("Prices saved");
  }

  if (prices.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink-900">Prices</h1>
      <p className="mt-1 text-sm text-ink-600">
        Saving creates a new price from today. Past receipts keep the price they were bought at.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {MATERIALS.map((material) => (
          <Input
            key={material}
            label={MATERIAL_LABEL[material]}
            type="number"
            step="0.01"
            endAdornment="KES/kg"
            value={valueFor(material)}
            onChange={(event) => setEdits((prev) => ({ ...prev, [material]: event.target.value }))}
            error={errors[material]}
          />
        ))}
      </div>

      <Button className="mt-6" disabled={hasErrors} loading={updatePrices.isPending} onClick={() => void handleSave()}>
        Save prices
      </Button>
    </div>
  );
}
