import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Camera, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Checkbox } from "../../components/ui/Checkbox";
import { SidePanel } from "../../components/ui/SidePanel";
import { TxStepper } from "../../components/chain/TxStepper";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePickerLookup } from "../../hooks/usePickers";
import { usePrices } from "../../hooks/usePrices";
import { useUploadPhoto } from "../../hooks/useUploadPhoto";
import { useCreateReceipt, useAnchorReceipt, useReportAnchorCancelled } from "../../hooks/useReceipts";
import { useContractTx } from "../../hooks/useContractTx";
import { useWallet } from "../../hooks/useWallet";
import { api, ApiError } from "../../lib/api";
import { formatKes, formatKg, maskPhone } from "../../lib/format";
import { MATERIAL_LABEL, MATERIALS } from "../../lib/materials";
import { materialWeightSchema, type MaterialWeightValues } from "../../schemas/weighIn";
import { toast } from "../../lib/toast";
import PickerRegistrationForm from "./PickerRegistrationForm";
import type { Material, Picker, Receipt, UploadedPhoto } from "../../types/api";

const STEPS = ["Picker", "Material & weight", "Scale photo", "Review", "Save & anchor"] as const;

export default function NewWeighInPage() {
  useDocumentTitle("New weigh-in");
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [weighIn, setWeighIn] = useState<MaterialWeightValues | null>(null);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [saveStarted, setSaveStarted] = useState(false);

  useEffect(() => {
    if (!saveStarted) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStarted]);

  function goTo(nextStep: number) {
    setStep(nextStep);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink-900">New weigh-in</h1>
      <ol aria-label="Steps" className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-ink-600">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">—</span>}
            <button
              type="button"
              disabled={index > step}
              onClick={() => index < step && goTo(index)}
              aria-current={index === step ? "step" : undefined}
              className={index === step ? "text-forest-700" : index < step ? "underline" : "text-ink-600"}
            >
              {index + 1} {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 0 && (
          <StepPicker
            onSelect={(selected) => {
              setPicker(selected);
              goTo(1);
            }}
          />
        )}
        {step === 1 && picker && (
          <StepMaterialWeight
            initial={weighIn}
            onBack={() => goTo(0)}
            onNext={(values) => {
              setWeighIn(values);
              goTo(2);
            }}
          />
        )}
        {step === 2 && (
          <StepPhoto
            photo={photo}
            onBack={() => goTo(1)}
            onNext={(uploaded) => {
              setPhoto(uploaded);
              goTo(3);
            }}
          />
        )}
        {step === 3 && picker && weighIn && photo && (
          <StepReview
            picker={picker}
            weighIn={weighIn}
            photo={photo}
            confirmed={confirmed}
            onConfirmedChange={setConfirmed}
            onBack={() => goTo(2)}
            onSave={() => {
              setSaveStarted(true);
              goTo(4);
            }}
          />
        )}
        {step === 4 && picker && weighIn && photo && (
          <StepSaveAndAnchor
            picker={picker}
            weighIn={weighIn}
            photo={photo}
            idempotencyKey={idempotencyKey}
            onDone={() => setSaveStarted(false)}
            onRestart={() => {
              setSaveStarted(false);
              setPicker(null);
              setWeighIn(null);
              setPhoto(null);
              setConfirmed(false);
              goTo(0);
            }}
            onViewReceipt={(receiptId) => navigate(`/app/centre/receipts/${receiptId}`)}
          />
        )}
      </div>
    </div>
  );
}

function StepPicker({ onSelect }: { onSelect: (picker: Picker) => void }) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const lookup = usePickerLookup(submittedQuery, submittedQuery.length > 0);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  const blocked = lookup.data && lookup.data.status !== "ACTIVE";

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900">Find the picker</h2>
      <form onSubmit={handleSearch} className="mt-4 flex items-end gap-3">
        <Input
          label="Phone or picker code"
          placeholder="+254 7XX XXX XXX or P-0017"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" icon={<Search className="size-3.5" />}>
          Search
        </Button>
      </form>

      {submittedQuery && !lookup.isLoading && (
        <div className="mt-4">
          {lookup.data ? (
            <div className="rounded-card border border-line-200 bg-paper p-4">
              <p className="font-mono text-sm text-ink-900">{lookup.data.code}</p>
              <p className="mt-1 text-sm text-ink-600">
                {maskPhone(lookup.data.phone ?? "")} · {lookup.data.firstName} {lookup.data.lastName?.[0] ?? ""}
                {" · registered "}
                {lookup.data.registeredOn}
              </p>
              {blocked ? (
                <p className="mt-2 text-sm text-danger-600">
                  This picker is {lookup.data.status === "SUSPENDED" ? "suspended" : "has withdrawn consent"} and can&apos;t be
                  selected.
                </p>
              ) : (
                <Button className="mt-3" onClick={() => onSelect(lookup.data!)}>
                  Use this picker
                </Button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-600">No picker with that number.</p>
              <Button variant="secondary" className="mt-3" icon={null} onClick={() => setRegisterOpen(true)}>
                Register new picker
              </Button>
            </div>
          )}
        </div>
      )}

      <SidePanel isOpen={registerOpen} onClose={() => setRegisterOpen(false)} title="Register picker">
        <PickerRegistrationForm
          onRegistered={(newPicker) => {
            setRegisterOpen(false);
            onSelect(newPicker);
          }}
        />
      </SidePanel>
    </div>
  );
}

function StepMaterialWeight({
  initial,
  onBack,
  onNext,
}: {
  initial: MaterialWeightValues | null;
  onBack: () => void;
  onNext: (values: MaterialWeightValues) => void;
}) {
  const prices = usePrices();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaterialWeightValues>({
    resolver: zodResolver(materialWeightSchema),
    defaultValues: initial ?? { weighedOn: new Date().toISOString().slice(0, 10), note: "" },
  });

  const material = watch("material");
  const weightKg = watch("weightKg");
  const pricePerKg = prices.data?.find((price) => price.material === material)?.pricePerKgKes;
  const payoutPreview = pricePerKg && weightKg ? Number(weightKg) * pricePerKg : null;

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <h2 className="text-lg font-semibold text-ink-900">Material and weight</h2>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-ink-900">Material</legend>
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {MATERIALS.map((option) => {
            const price = prices.data?.find((p) => p.material === option)?.pricePerKgKes;
            const selected = material === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setValue("material", option as Material, { shouldValidate: true })}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1 rounded-card border p-3 text-center text-xs ${selected ? "border-forest-700 bg-lime-100" : "border-line-200 bg-paper"}`}
              >
                <span className="font-semibold text-ink-900">{MATERIAL_LABEL[option]}</span>
                <span className="text-ink-600">{price ? formatKes(price) + "/kg" : "—"}</span>
              </button>
            );
          })}
        </div>
        {errors.material && (
          <p role="alert" className="mt-2 text-sm text-danger-600">
            {errors.material.message}
          </p>
        )}
      </fieldset>

      <div className="mt-6">
        <Input
          label="Weight"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0.1}
          max={2000}
          helperText="Read the scale display exactly."
          error={errors.weightKg?.message}
          endAdornment="kg"
          {...register("weightKg", { valueAsNumber: true })}
        />
      </div>

      {payoutPreview !== null && (
        <p className="mt-3 text-sm text-ink-600">
          Picker will receive <span className="font-semibold text-ink-900">{formatKes(payoutPreview)}</span> (
          {formatKg(Number(weightKg))} {"×"} {formatKes(pricePerKg ?? 0)}/kg).
        </p>
      )}

      <div className="mt-6">
        <Input
          label="Weighed on"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          error={errors.weighedOn?.message}
          {...register("weighedOn")}
        />
      </div>

      <div className="mt-6">
        <label htmlFor="note" className="block text-sm font-semibold text-ink-900">
          Note (optional)
        </label>
        <textarea
          id="note"
          rows={2}
          maxLength={280}
          className="mt-1.5 w-full rounded-input border border-line-200 bg-paper p-3 text-base text-ink-900 outline-none focus:border-forest-700"
          {...register("note")}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Button type="button" variant="secondary" icon={null} onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function StepPhoto({
  photo,
  onBack,
  onNext,
}: {
  photo: UploadedPhoto | null;
  onBack: () => void;
  onNext: (photo: UploadedPhoto) => void;
}) {
  const upload = useUploadPhoto();
  const [preview, setPreview] = useState<string | null>(photo?.url ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));
    try {
      const uploaded = await upload.mutateAsync(file);
      setPreview(uploaded.url);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PROVIDER_ERROR") {
        setError("Photo storage isn't running. Start IPFS Desktop, then try again.");
      } else {
        setError("Couldn't upload the photo. Try again.");
      }
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900">Scale photo</h2>
      <p className="mt-1 text-sm text-ink-600">A clear photo of the scale display is required.</p>

      {preview && (
        <img src={preview} alt="Scale photo preview" className="mt-4 h-48 w-full rounded-card border border-line-200 object-cover" />
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink-900 px-5 text-sm font-semibold text-ink-900">
          <Camera className="size-4" aria-hidden="true" />
          {preview ? "Retake" : "Take photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
      </div>

      {upload.isPending && <p className="mt-3 text-sm text-ink-600">Uploading…</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-600">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-3">
        <Button type="button" variant="secondary" icon={null} onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!upload.data}
          onClick={() => upload.data && onNext(upload.data)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function StepReview({
  picker,
  weighIn,
  photo,
  confirmed,
  onConfirmedChange,
  onBack,
  onSave,
}: {
  picker: Picker;
  weighIn: MaterialWeightValues;
  photo: UploadedPhoto;
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900">Review</h2>
      <dl className="mt-4 flex flex-col divide-y divide-line-200 rounded-card border border-line-200 bg-paper">
        <Row label="Picker" value={`${picker.code} · ${maskPhone(picker.phone ?? "")}`} />
        <Row label="Material" value={MATERIAL_LABEL[weighIn.material]} />
        <Row label="Weight" value={formatKg(Number(weighIn.weightKg))} />
        <Row label="Weighed on" value={weighIn.weighedOn} />
        {weighIn.note && <Row label="Note" value={weighIn.note} />}
      </dl>
      <img src={photo.url} alt="Scale photo" className="mt-4 h-40 w-full rounded-card border border-line-200 object-cover" />

      <div className="mt-6">
        <Checkbox
          label="I confirm the weight matches the scale display and the picker has seen it."
          checked={confirmed}
          onChange={(event) => onConfirmedChange(event.target.checked)}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Button type="button" variant="secondary" icon={null} onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={!confirmed} onClick={onSave}>
          Save weigh-in
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-ink-900">{value}</dd>
    </div>
  );
}

function StepSaveAndAnchor({
  picker,
  weighIn,
  photo,
  idempotencyKey,
  onDone,
  onRestart,
  onViewReceipt,
}: {
  picker: Picker;
  weighIn: MaterialWeightValues;
  photo: UploadedPhoto;
  idempotencyKey: string;
  onDone: () => void;
  onRestart: () => void;
  onViewReceipt: (receiptId: string) => void;
}) {
  const createReceipt = useCreateReceipt();
  const wallet = useWallet();
  const tx = useContractTx();
  const [receipt, setReceipt] = useState<{ receiptId: string; dataHash: string; payoutKes: number } | null>(null);
  const anchor = useAnchorReceipt(receipt?.receiptId ?? "");
  const reportCancelled = useReportAnchorCancelled(receipt?.receiptId ?? "");
  const started = useMemo(() => ({ current: false }), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSave() {
    try {
      const created = await createReceipt.mutateAsync({
        pickerId: picker.id,
        material: weighIn.material,
        weightKg: Number(weighIn.weightKg),
        weighedOn: weighIn.weighedOn,
        photoId: photo.id,
        note: weighIn.note || undefined,
        operatorConfirmed: true,
        idempotencyKey,
      });
      setReceipt({ receiptId: created.receiptId, dataHash: created.dataHash, payoutKes: created.payoutKes });
      void signAndAnchor(created.receiptId, created.dataHash);
    } catch {
      toast.error("Couldn't save. Nothing was recorded.");
    }
  }

  async function signAndAnchor(receiptId: string, dataHash: string) {
    if (wallet.isWrongNetwork) {
      toast.error(`Switch MetaMask to ${wallet.chainId} to continue.`);
      await wallet.switchNetwork();
    }

    await tx.run({
      send: (contract) => contract.recordReceipt(receiptId, dataHash),
      onSubmitted: async (txHash) => {
        await anchor.mutateAsync(txHash);
      },
      waitForSync: async () => {
        const updated = await api.get<Receipt>(`/api/receipts/${receiptId}`);
        return updated.status === "ANCHORED";
      },
    });
  }

  useEffect(() => {
    if (tx.state.status === "synced" || tx.state.status === "rejected" || tx.state.status === "failed") {
      onDone();
    }
    if (tx.state.status === "rejected" && receipt) {
      void reportCancelled.mutateAsync("USER_REJECTED");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.state.status]);

  if (createReceipt.isPending || (!receipt && !createReceipt.isError)) {
    return <p className="text-sm text-ink-600">Saving weigh-in…</p>;
  }

  if (createReceipt.isError && !receipt) {
    return (
      <div>
        <p className="text-sm text-danger-600">Couldn&apos;t save. Nothing was recorded.</p>
        <Button className="mt-4" onClick={() => void runSave()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink-900">Save & anchor</h2>
      <p className="mt-1 font-mono text-sm text-ink-900">{receipt?.receiptId}</p>

      <div className="mt-6">
        <TxStepper tx={tx.state} />
      </div>

      {(tx.state.status === "rejected" || tx.state.status === "failed") && (
        <Button className="mt-4" onClick={() => receipt && void signAndAnchor(receipt.receiptId, receipt.dataHash)}>
          Anchor now
        </Button>
      )}

      {tx.state.status === "syncTimeout" && (
        <Button className="mt-4" onClick={() => receipt && void signAndAnchor(receipt.receiptId, receipt.dataHash)}>
          Check again
        </Button>
      )}

      {tx.state.status === "synced" && receipt && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={onRestart}>New weigh-in</Button>
          <Button variant="secondary" icon={null} onClick={() => window.print()}>
            Print receipt
          </Button>
          <Button variant="secondary" icon={null} onClick={() => onViewReceipt(receipt.receiptId)}>
            View receipt
          </Button>
        </div>
      )}
    </div>
  );
}
