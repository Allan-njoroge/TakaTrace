export interface StorageProvider {
  name: "IPFS_LOCAL" | "PINATA" | "NONE";
  put(bytes: Uint8Array): Promise<string>; // returns CID
  get(cid: string): AsyncIterable<Uint8Array>;
}
