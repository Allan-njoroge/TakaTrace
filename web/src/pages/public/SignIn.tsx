import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useWallet } from "../../hooks/useWallet";
import { getBrowserProvider } from "../../lib/chain/provider";
import { api, ApiError } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { roleHome } from "../../lib/roles";
import type { Me } from "../../types/api";

type Step = "idle" | "connecting" | "signing" | "verifying";

const ERROR_FOR_CODE: Record<string, string> = {
  NOT_FOUND:
    "This wallet isn't registered with TakaTrace. Ask your admin to add it, or switch account in MetaMask.",
  FORBIDDEN: "This wallet has been suspended. Contact your admin.",
  ROLE_NOT_ON_CHAIN: "Your wallet isn't approved on the blockchain yet. Ask your admin to finish approval.",
};

export default function SignInPage() {
  const wallet = useWallet();
  const [step, setStep] = useState<Step>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();

  async function handleSignIn() {
    setErrorMessage(null);

    if (!wallet.hasWallet) {
      setErrorMessage("MetaMask isn't installed in this browser.");
      return;
    }

    try {
      setStep("connecting");
      const address = await wallet.connect();

      setStep("signing");
      const nonce = await api.get<{ message: string }>(`/api/auth/nonce?address=${encodeURIComponent(address)}`);
      const signer = await getBrowserProvider().getSigner();
      const signature = await signer.signMessage(nonce.message);

      setStep("verifying");
      const me = await api.post<Me>("/api/auth/verify", { address, signature });
      queryClient.setQueryData(queryKeys.me(), me);

      const next = params.get("next");
      navigate(next || roleHome(me.user.role));
    } catch (error) {
      if (error instanceof Error && /cancelled|rejected/i.test(error.message)) {
        setErrorMessage("Sign-in cancelled. Nothing was shared.");
      } else if (error instanceof ApiError && ERROR_FOR_CODE[error.code]) {
        setErrorMessage(ERROR_FOR_CODE[error.code]);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Something went wrong signing in. Try again.");
      }
    } finally {
      setStep("idle");
    }
  }

  const steps = [
    { label: "Connect wallet", done: step !== "idle" || wallet.address !== null },
    { label: "Sign the message (free, no transaction)", done: step === "verifying" },
    { label: "Done", done: false },
  ];

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <p className="text-xs font-medium tracking-wide text-ink-600">Sign in</p>
      <h1 className="mt-2 text-3xl font-medium text-ink-900">Sign in with your wallet.</h1>
      <p className="mt-3 text-base text-ink-600">
        Buying centres, brands and admins sign in with the MetaMask account that TakaTrace approved for them.
        Pickers don&apos;t need to sign in.
      </p>

      <Button
        variant="wallet"
        icon={<Wallet className="size-3.5" />}
        loading={step !== "idle"}
        loadingLabel={step === "connecting" ? "Connecting…" : step === "signing" ? "Waiting for signature…" : "Signing in…"}
        onClick={() => void handleSignIn()}
        className="mt-8"
      >
        Sign in with MetaMask
      </Button>

      {errorMessage && (
        <p role="alert" className="mt-4 text-sm text-danger-600">
          {errorMessage}
        </p>
      )}

      <ol className="mt-10 flex flex-col gap-3 border-t border-line-200 pt-6 text-sm text-ink-600">
        {steps.map((item, index) => (
          <li key={item.label} className="flex items-center gap-3">
            <span className="flex size-6 items-center justify-center rounded-full border border-line-200 text-xs">{index + 1}</span>
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
