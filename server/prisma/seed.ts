import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// Hardhat's well-known local practice accounts (printed by `npx hardhat node`).
const ADMIN_ADDR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const CENTRE_ADDR = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const BRAND_A_ADDR = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
const BRAND_B_ADDR = "0x90f79bf6eb2c4f870365e785982e1f101e93b906";

const CONSENT_VERSION = "2026-11-v1";

async function main() {
  const operator = await prisma.organization.upsert({
    where: { code: "TTPRO" },
    create: { type: "OPERATOR", name: "TakaTrace PRO", code: "TTPRO" },
    update: {},
  });

  const admin = await prisma.user.upsert({
    where: { walletAddress: ADMIN_ADDR },
    create: { walletAddress: ADMIN_ADDR, displayName: "TakaTrace Admin", role: "ADMIN", organizationId: operator.id },
    update: {},
  });

  const centre = await prisma.organization.upsert({
    where: { code: "NRB01" },
    create: { type: "CENTRE", name: "Kariobangi Recyclers", code: "NRB01", county: "Nairobi" },
    update: {},
  });
  await prisma.user.upsert({
    where: { walletAddress: CENTRE_ADDR },
    create: { walletAddress: CENTRE_ADDR, displayName: "Kariobangi Recyclers Operator", role: "CENTRE_OPERATOR", organizationId: centre.id },
    update: {},
  });

  await prisma.organization.upsert({
    where: { code: "MSA01" },
    create: { type: "CENTRE", name: "Mombasa Coastal Plastics", code: "MSA01", county: "Mombasa" },
    update: {},
  });

  const brandA = await prisma.organization.upsert({
    where: { code: "BRANDA" },
    create: { type: "BRAND", name: "Brand A Beverages Ltd", code: "BRANDA" },
    update: {},
  });
  await prisma.user.upsert({
    where: { walletAddress: BRAND_A_ADDR },
    create: { walletAddress: BRAND_A_ADDR, displayName: "Brand A Officer", role: "BRAND_OFFICER", organizationId: brandA.id },
    update: {},
  });
  await prisma.eprTarget.upsert({
    where: { brandOrgId_year_material: { brandOrgId: brandA.id, year: 2026, material: "PET" } },
    create: { brandOrgId: brandA.id, year: 2026, material: "PET", targetGrams: 50_000_000 },
    update: {},
  });
  await prisma.eprTarget.upsert({
    where: { brandOrgId_year_material: { brandOrgId: brandA.id, year: 2026, material: "HDPE" } },
    create: { brandOrgId: brandA.id, year: 2026, material: "HDPE", targetGrams: 10_000_000 },
    update: {},
  });

  const brandB = await prisma.organization.upsert({
    where: { code: "BRANDB" },
    create: { type: "BRAND", name: "Brand B Foods Ltd", code: "BRANDB" },
    update: {},
  });
  await prisma.user.upsert({
    where: { walletAddress: BRAND_B_ADDR },
    create: { walletAddress: BRAND_B_ADDR, displayName: "Brand B Officer", role: "BRAND_OFFICER", organizationId: brandB.id },
    update: {},
  });

  const prices: [string, string][] = [
    ["PET", "25.00"],
    ["HDPE", "30.00"],
    ["LDPE", "15.00"],
    ["PP", "20.00"],
    ["PS", "10.00"],
    ["OTHER", "5.00"],
  ];
  for (const [material, kes] of prices) {
    const existing = await prisma.price.findFirst({ where: { organizationId: centre.id, material } });
    if (!existing) {
      const [whole, frac] = kes.split(".");
      await prisma.price.create({ data: { organizationId: centre.id, material, pricePerKgCents: Number(whole) * 100 + Number(frac), effectiveFrom: new Date(), createdByUserId: admin.id } });
    }
  }

  const pickers: [string, string, string, "en" | "sw"][] = [
    ["P-0001", "Wanjiru", "Kamau", "sw"],
    ["P-0002", "Otieno", "Owuor", "en"],
    ["P-0003", "Achieng", "Odhiambo", "sw"],
    ["P-0004", "Mwangi", "Njoroge", "en"],
    ["P-0005", "Fatuma", "Hassan", "sw"],
  ];
  for (const [code, firstName, lastName, language] of pickers) {
    const phone = `+25471100010${code.slice(-1)}`;
    await prisma.picker.upsert({
      where: { code },
      create: {
        code,
        firstName,
        lastName,
        phone,
        language,
        consentAt: new Date(),
        consentVersion: CONSENT_VERSION,
        consentByUserId: admin.id,
        registeredByOrgId: centre.id,
      },
      update: {},
    });
  }
  await prisma.counter.upsert({ where: { name: "picker" }, create: { name: "picker", value: pickers.length }, update: {} });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
