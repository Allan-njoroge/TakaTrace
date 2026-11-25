import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Checkbox } from "../../components/ui/Checkbox";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { useCreatePicker } from "../../hooks/usePickers";
import { pickerSchema, normalizeKenyanPhone, type PickerFormValues } from "../../schemas/picker";
import { ApiError } from "../../lib/api";
import type { Picker } from "../../types/api";

const CONSENT_NOTICE = {
  en: "TakaTrace will store your phone number and every weigh-in you sell, and will send you an SMS receipt each time. Your name and ID are kept private and are never sent to the blockchain.",
  sw: "TakaTrace itahifadhi nambari yako ya simu na kila mzigo unaouza, na itakutumia ujumbe wa SMS kila wakati. Jina lako na kitambulisho vinahifadhiwa kwa siri na havipelekwi kwenye blockchain.",
};

export default function PickerRegistrationForm({ onRegistered }: { onRegistered: (picker: Picker) => void }) {
  const createPicker = useCreatePicker();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PickerFormValues>({
    resolver: zodResolver(pickerSchema),
    defaultValues: { language: "en", consentConfirmed: false },
  });

  async function onSubmit(values: PickerFormValues) {
    try {
      const picker = await createPicker.mutateAsync({ ...values, phone: normalizeKenyanPhone(values.phone) });
      onRegistered(picker);
    } catch (error) {
      if (error instanceof ApiError && error.fields?.phone) {
        setError("phone", { message: error.fields.phone });
      } else {
        setError("root", { message: "Couldn't register the picker. Try again." });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <Input label="First name" required error={errors.firstName?.message} {...register("firstName")} />
      <Input label="Last name (optional)" error={errors.lastName?.message} {...register("lastName")} />
      <Input
        label="Phone (M-Pesa number)"
        required
        startAdornment="+254"
        placeholder="7XX XXX XXX"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Select label="Preferred language" required error={errors.language?.message} {...register("language")}>
        <option value="en">English</option>
        <option value="sw">Kiswahili</option>
      </Select>
      <Input label="ID number (optional)" error={errors.idNumber?.message} {...register("idNumber")} />

      <div>
        <Checkbox
          label="The picker agreed to TakaTrace storing their phone number and weigh-ins, and receiving SMS receipts."
          error={errors.consentConfirmed?.message}
          {...register("consentConfirmed")}
        />
        <button type="button" onClick={() => setNoticeOpen(true)} className="mt-1.5 text-sm underline-offset-4 hover:underline">
          Read consent notice
        </button>
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-danger-600">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" loading={createPicker.isPending} loadingLabel="Registering…" className="self-start">
        Register picker
      </Button>

      <Modal isOpen={noticeOpen} onClose={() => setNoticeOpen(false)} title="Consent notice">
        <p className="text-sm text-ink-900">{CONSENT_NOTICE.en}</p>
        <p className="mt-4 text-sm text-ink-900">{CONSENT_NOTICE.sw}</p>
      </Modal>
    </form>
  );
}
