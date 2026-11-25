import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { encryptIdNumber } from "../../lib/crypto.js";
import { gramsToKgNumber } from "../../lib/dto.js";
import { AppError } from "../../lib/errors.js";
import { nextPickerCode } from "../../lib/ids.js";
import { maskPhone, normalizeKenyanPhone } from "../../lib/phone.js";
import { sendSms } from "../../providers/sms/service.js";
import type { SessionUser } from "../../middleware/session.js";

export const CONSENT_VERSION = "2026-11-v1";

interface PickerRow {
  id: string;
  code: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  language: string;
  status: string;
  createdAt: Date;
  registeredByOrgId: string;
}

interface PickerStats {
  receiptsCount: number;
  kgTotal: number;
  lastWeighIn: string | null;
}

async function statsForPickers(pickerIds: string[]): Promise<Map<string, PickerStats>> {
  if (pickerIds.length === 0) return new Map();
  const grouped = await prisma.receipt.groupBy({
    by: ["pickerId"],
    where: { pickerId: { in: pickerIds }, status: { not: "SUPERSEDED" } },
    _sum: { weightGrams: true },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const map = new Map<string, PickerStats>();
  for (const g of grouped) {
    map.set(g.pickerId, {
      receiptsCount: g._count._all,
      kgTotal: gramsToKgNumber(g._sum.weightGrams ?? 0),
      lastWeighIn: g._max.createdAt?.toISOString() ?? null,
    });
  }
  return map;
}

/** Maps a picker row to the frontend's Picker shape — masked phone always, raw phone
 * only when the caller is viewing the picker's own detail page (owning centre/admin). */
function toPickerDto(picker: PickerRow, stats: PickerStats | undefined, includePhone: boolean) {
  return {
    id: picker.id,
    code: picker.code,
    firstName: picker.firstName,
    lastName: picker.lastName,
    phoneMasked: maskPhone(picker.phone),
    ...(includePhone ? { phone: picker.phone } : {}),
    language: picker.language as "en" | "sw",
    registeredOn: picker.createdAt.toISOString(),
    receiptsCount: stats?.receiptsCount ?? 0,
    kgTotal: stats?.kgTotal ?? 0,
    lastWeighIn: stats?.lastWeighIn ?? null,
    status: picker.status as "ACTIVE" | "SUSPENDED" | "CONSENT_WITHDRAWN",
  };
}

export async function registerPicker(user: SessionUser, input: { firstName: string; lastName?: string; phone: string; language?: "en" | "sw"; idNumber?: string; consentConfirmed: boolean }) {
  if (!user.organizationId) throw new AppError("FORBIDDEN", "Your account isn't linked to a buying centre.");
  if (!input.consentConfirmed) throw new AppError("VALIDATION", "Consent must be confirmed before registering a picker.", { consentConfirmed: "Required" });

  const phone = normalizeKenyanPhone(input.phone);
  const existing = await prisma.picker.findUnique({ where: { phone } });
  if (existing) throw new AppError("CONFLICT", `This phone number is already registered as ${existing.code}.`);

  const picker = await prisma.$transaction(async (tx) => {
    const code = await nextPickerCode(tx);
    const row = await tx.picker.create({
      data: {
        code,
        firstName: input.firstName,
        lastName: input.lastName,
        phone,
        language: input.language ?? "en",
        idNumberEnc: input.idNumber ? encryptIdNumber(input.idNumber) : null,
        idNumberLast4: input.idNumber ? input.idNumber.slice(-4) : null,
        consentAt: new Date(),
        consentVersion: CONSENT_VERSION,
        consentByUserId: user.id,
        registeredByOrgId: user.organizationId as string,
      },
    });
    await writeAudit(tx, { actorType: "USER", actorId: user.id, action: "PICKER_REGISTERED", entityType: "Picker", entityId: row.id, summary: `Registered ${code} (${maskPhone(phone)}).` });
    return row;
  });

  await sendSms({ phone, pickerId: picker.id, template: "WELCOME", lang: picker.language as "en" | "sw", vars: { code: picker.code } });
  return toPickerDto(picker, undefined, false);
}

/** Used by the demo phone simulator (public in demo mode, needs the raw phone to dial). */
export async function listAllActivePickersWithPhone() {
  const pickers = await prisma.picker.findMany({ where: { status: "ACTIVE" }, orderBy: { code: "asc" } });
  const stats = await statsForPickers(pickers.map((p) => p.id));
  return pickers.map((p) => toPickerDto(p, stats.get(p.id), true));
}

export async function listPickers(user: SessionUser, filters: { q?: string; status?: string }) {
  if (!user.organizationId && user.role !== "ADMIN") throw new AppError("FORBIDDEN", "You can't do this.");
  const pickers = await prisma.picker.findMany({
    where: {
      registeredByOrgId: user.role === "ADMIN" ? undefined : (user.organizationId as string),
      status: filters.status,
      OR: filters.q ? [{ code: { contains: filters.q } }, { phone: { contains: filters.q } }, { firstName: { contains: filters.q } }, { lastName: { contains: filters.q } }] : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const stats = await statsForPickers(pickers.map((p) => p.id));
  return pickers.map((p) => toPickerDto(p, stats.get(p.id), false));
}

export async function lookupPicker(user: SessionUser, q: string) {
  const picker = await prisma.picker.findFirst({
    where: { registeredByOrgId: user.organizationId as string, OR: [{ code: q }, { phone: q.startsWith("+") ? q : undefined }] },
  });
  if (!picker) throw new AppError("NOT_FOUND", "Picker not found.");
  const stats = await statsForPickers([picker.id]);
  return toPickerDto(picker, stats.get(picker.id), true);
}

export async function getPickerDetail(user: SessionUser, id: string) {
  const picker = await requirePickerForUser(user, id);
  const stats = await statsForPickers([picker.id]);
  return toPickerDto(picker, stats.get(picker.id), true);
}

export async function updatePicker(user: SessionUser, id: string, input: { firstName?: string; lastName?: string; language?: "en" | "sw"; phone?: string; consentConfirmed?: boolean }) {
  const picker = await requirePickerForUser(user, id);
  const data: Record<string, unknown> = {};
  if (input.firstName) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.language) data.language = input.language;
  if (input.phone) {
    if (!input.consentConfirmed) throw new AppError("VALIDATION", "Changing the phone number requires fresh consent.", { consentConfirmed: "Required" });
    const normalized = normalizeKenyanPhone(input.phone);
    const existing = await prisma.picker.findUnique({ where: { phone: normalized } });
    if (existing && existing.id !== picker.id) throw new AppError("CONFLICT", `This phone number is already registered as ${existing.code}.`);
    data.phone = normalized;
    data.consentAt = new Date();
    data.consentVersion = CONSENT_VERSION;
    data.consentByUserId = user.id;
  }
  const updated = await prisma.picker.update({ where: { id: picker.id }, data });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "PICKER_UPDATED", entityType: "Picker", entityId: picker.id, summary: "Picker details updated." });
  const stats = await statsForPickers([updated.id]);
  return toPickerDto(updated, stats.get(updated.id), true);
}

export async function setPickerStatus(user: SessionUser, id: string, status: "ACTIVE" | "SUSPENDED", reason?: string) {
  const picker = await requirePickerForUser(user, id);
  await prisma.picker.update({ where: { id: picker.id }, data: { status, statusReason: reason } });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "PICKER_SUSPENDED", entityType: "Picker", entityId: picker.id, summary: `Status set to ${status}${reason ? `: ${reason}` : ""}.` });
}

export async function sendTestSms(user: SessionUser, id: string): Promise<void> {
  const picker = await requirePickerForUser(user, id);
  await sendSms({ phone: picker.phone, pickerId: picker.id, template: "WELCOME", lang: picker.language as "en" | "sw", vars: { code: picker.code }, bypassOptOut: true });
}

async function requirePickerForUser(user: SessionUser, id: string) {
  const picker = await prisma.picker.findUnique({ where: { id } });
  if (!picker) throw new AppError("NOT_FOUND", "Picker not found.");
  if (user.role !== "ADMIN" && picker.registeredByOrgId !== user.organizationId) throw new AppError("FORBIDDEN", "You can't do this.");
  return picker;
}
