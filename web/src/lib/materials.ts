import type { Material } from "../types/api";

export const MATERIAL_LABEL: Record<Material, string> = {
  PET: "PET (1)",
  HDPE: "HDPE (2)",
  LDPE: "LDPE (4)",
  PP: "PP (5)",
  PS: "PS (6)",
  OTHER: "Other (7)",
};

export const MATERIALS: Material[] = ["PET", "HDPE", "LDPE", "PP", "PS", "OTHER"];
