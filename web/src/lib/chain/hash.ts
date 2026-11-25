import { id } from "ethers";

/** keccak256 of the UTF-8 record text — identical to the contract's makeHash(). */
export function hashRecordText(text: string): string {
  return id(text);
}
