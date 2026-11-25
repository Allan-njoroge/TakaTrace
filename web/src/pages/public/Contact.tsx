import { useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api, ApiError } from "../../lib/api";
import { contactSchema, type ContactFormValues } from "../../schemas/contact";

const TOPIC_OPTIONS: Array<{ value: ContactFormValues["topic"]; label: string }> = [
  { value: "GENERAL", label: "General" },
  { value: "REPORT_RECEIPT", label: "Report a receipt" },
  { value: "JOIN_CENTRE", label: "Join as a buying centre" },
  { value: "JOIN_BRAND", label: "Join as a brand" },
];

export default function ContactPage() {
  useDocumentTitle("Contact");
  const [params] = useSearchParams();
  const receiptId = params.get("receipt") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
    getValues,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { topic: receiptId ? "REPORT_RECEIPT" : "GENERAL", receiptId },
  });

  async function onSubmit(values: ContactFormValues) {
    try {
      await api.post("/api/public/contact", values);
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATE_LIMITED") {
        setError("root", { message: "Too many messages from this device. Try again in a few minutes." });
      } else {
        setError("root", { message: "Something went wrong sending your message. Try again." });
      }
    }
  }

  if (isSubmitSuccessful) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
        <p className="text-lg text-ink-900">Thanks — we&apos;ll reply to {getValues("email")}.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-ink-600">Contact</p>
      <h1 className="mt-2 text-3xl font-medium text-ink-900">Get in touch.</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-5" noValidate>
        <Input label="Name" required autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Input label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="Organisation (optional)" autoComplete="organization" error={errors.organization?.message} {...register("organization")} />
        <Select label="Topic" required error={errors.topic?.message} {...register("topic")}>
          {TOPIC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input label="Receipt ID (optional)" error={errors.receiptId?.message} {...register("receiptId")} />
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-ink-900">
            Message <span className="text-danger-600">*</span>
          </label>
          <textarea
            id="message"
            rows={5}
            aria-invalid={Boolean(errors.message) || undefined}
            aria-describedby={errors.message ? "message-error" : undefined}
            className="mt-1.5 w-full rounded-input border border-line-200 bg-paper p-3 text-base text-ink-900 outline-none focus:border-forest-700"
            {...register("message")}
          />
          {errors.message && (
            <p id="message-error" role="alert" className="mt-1.5 text-sm text-danger-600">
              {errors.message.message}
            </p>
          )}
        </div>
        {errors.root && (
          <p role="alert" className="text-sm text-danger-600">
            {errors.root.message}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} loadingLabel="Sending…" className="self-start">
          Send message
        </Button>
      </form>
    </div>
  );
}
