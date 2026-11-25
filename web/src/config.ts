function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export const config = {
  apiUrl: required("VITE_API_URL", import.meta.env.VITE_API_URL),
  rpcUrl: required("VITE_RPC_URL", import.meta.env.VITE_RPC_URL),
  chainId: Number(required("VITE_CHAIN_ID", import.meta.env.VITE_CHAIN_ID)),
  chainName: required("VITE_CHAIN_NAME", import.meta.env.VITE_CHAIN_NAME),
  explorerUrl: import.meta.env.VITE_EXPLORER_URL || "",
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
  ussdCode: import.meta.env.VITE_USSD_CODE || "*384*123#",
} as const;

export const chainIdHex = `0x${config.chainId.toString(16)}`;
