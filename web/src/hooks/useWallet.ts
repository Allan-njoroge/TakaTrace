import { useCallback, useEffect, useSyncExternalStore } from "react";
import { BrowserProvider } from "ethers";
import { chainIdHex, config } from "../config";
import { getFriendlyChainErrorMessage } from "../lib/chain/errors";

interface WalletState {
  address: string | null;
  chainId: number | null;
  connecting: boolean;
  hasWallet: boolean;
}

let state: WalletState = {
  address: null,
  chainId: null,
  connecting: false,
  hasWallet: typeof window !== "undefined" && Boolean(window.ethereum),
};

const listeners = new Set<() => void>();

function setState(partial: Partial<WalletState>) {
  state = { ...state, ...partial };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

let walletListenersAttached = false;

function attachWalletListeners() {
  if (walletListenersAttached || !window.ethereum) return;
  walletListenersAttached = true;

  window.ethereum.on?.("accountsChanged", (...args: unknown[]) => {
    const accounts = args[0] as string[];
    setState({ address: accounts[0] ?? null });
  });

  window.ethereum.on?.("chainChanged", (...args: unknown[]) => {
    const chainIdHexValue = args[0] as string;
    setState({ chainId: Number.parseInt(chainIdHexValue, 16) });
  });
}

async function refreshFromProvider() {
  if (!window.ethereum) return;
  attachWalletListeners();
  const provider = new BrowserProvider(window.ethereum);
  const [accounts, network] = await Promise.all([
    provider.send("eth_accounts", []) as Promise<string[]>,
    provider.getNetwork(),
  ]);
  setState({ address: accounts[0] ?? null, chainId: Number(network.chainId) });
}

if (typeof window !== "undefined" && window.ethereum) {
  refreshFromProvider().catch(() => undefined);
}

export interface UseWalletResult extends WalletState {
  isWrongNetwork: boolean;
  connect: () => Promise<string>;
  switchNetwork: () => Promise<void>;
}

/** Shared wallet state: address, chain, connect() and switchNetwork() (spec 13.1, 13.3). */
export function useWallet(): UseWalletResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    attachWalletListeners();
  }, []);

  const connect = useCallback(async (): Promise<string> => {
    if (!window.ethereum) {
      throw new Error("MetaMask isn't installed in this browser.");
    }
    setState({ connecting: true });
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      const network = await provider.getNetwork();
      const address = accounts[0] ?? null;
      setState({ address, chainId: Number(network.chainId) });
      if (!address) throw new Error("No account was returned by MetaMask.");
      return address;
    } catch (error) {
      throw new Error(getFriendlyChainErrorMessage(error));
    } finally {
      setState({ connecting: false });
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: config.chainName,
              rpcUrls: [config.rpcUrl],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            },
          ],
        });
      } else {
        throw new Error(getFriendlyChainErrorMessage(error));
      }
    }
  }, []);

  return {
    ...snapshot,
    isWrongNetwork: snapshot.chainId !== null && snapshot.chainId !== config.chainId,
    connect,
    switchNetwork,
  };
}
