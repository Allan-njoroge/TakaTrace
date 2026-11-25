import { toast as sonnerToast } from "sonner";

/** Thin wrapper over sonner so every toast gets the same left colour bar (spec 4.5). */
export const toast = {
  success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) =>
    sonnerToast.success(message, options),
  error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) =>
    sonnerToast.error(message, options),
  info: (message: string, options?: Parameters<typeof sonnerToast>[1]) => sonnerToast(message, options),
  loading: (message: string, options?: Parameters<typeof sonnerToast.loading>[1]) =>
    sonnerToast.loading(message, options),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
