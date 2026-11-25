import type { Role } from "../types/api";

export function roleHome(role: Role): string {
  switch (role) {
    case "CENTRE_OPERATOR":
      return "/app/centre";
    case "BRAND_OFFICER":
      return "/app/brand";
    case "ADMIN":
      return "/app/admin";
  }
}

/** Used in "That area is for {label}." toasts when a signed-in user hits a route for another role. */
export function roleAreaLabel(role: Role): string {
  switch (role) {
    case "CENTRE_OPERATOR":
      return "buying centres";
    case "BRAND_OFFICER":
      return "brands";
    case "ADMIN":
      return "admins";
  }
}
