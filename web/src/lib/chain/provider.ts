import { BrowserProvider, JsonRpcProvider } from "ethers";
import { config } from "../../config";

let readProvider: JsonRpcProvider | null = null;

/** No wallet needed — used for public reads (verify page, transparency). */
export function getReadProvider(): JsonRpcProvider {
  readProvider ??= new JsonRpcProvider(config.rpcUrl);
  return readProvider;
}

/** Requires MetaMask (or another injected wallet). Throws if none is installed. */
export function getBrowserProvider(): BrowserProvider {
  if (!window.ethereum) {
    throw new Error("MetaMask isn't installed in this browser.");
  }
  return new BrowserProvider(window.ethereum);
}
