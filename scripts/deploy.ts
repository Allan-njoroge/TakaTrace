import { network } from "hardhat";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const { ethers } = await network.connect();

// Practice accounts: 0 = admin (NEMA / PRO), 1 = buying centre, 2 = Brand A, 3 = Brand B
const [admin, centre, brandA, brandB] = await ethers.getSigners();

console.log("Deploying TakaTrace from admin:", admin.address);
const takaTrace = await ethers.deployContract("TakaTrace");
await takaTrace.waitForDeployment();
const address = await takaTrace.getAddress();
console.log("TakaTrace deployed at:", address);

const { chainId } = await ethers.provider.getNetwork();

// On the laptop blockchain (chain 31337), set up the demo roles automatically
if (chainId === 31337n) {
  await (await takaTrace.addBuyingCentre(centre.address)).wait();
  await (await takaTrace.addBrand(brandA.address)).wait();
  await (await takaTrace.addBrand(brandB.address)).wait();
  console.log("Buying centre:", centre.address);
  console.log("Brand A:      ", brandA.address);
  console.log("Brand B:      ", brandB.address);
}

// Save address + ABI for the website and the backend server
const artifact = JSON.parse(
  await readFile("artifacts/contracts/TakaTrace.sol/TakaTrace.json", "utf8")
);
const contractInfo = JSON.stringify(
  { address, chainId: chainId.toString(), abi: artifact.abi, deployedAt: new Date().toISOString() },
  null,
  2
);
for (const dir of ["web/src", "server/src"]) {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/contract.json`, contractInfo);
}
console.log("Saved web/src/contract.json and server/src/contract.json");