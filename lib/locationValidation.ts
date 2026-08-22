import { locationNewSchema } from "@repo/db/schema";
import type { LocationOption, LocationRole } from "@/types/locations";

const roleOrder: Record<LocationRole, number> = {
  state: 0,
  city: 1,
  region: 2,
  area: 3,
  locality: 4,
  destination: 5,
};

const structuralRoleToAllowedParents: Record<
  Exclude<LocationRole, "destination">,
  readonly Exclude<LocationRole, "destination">[]
> = {
  state: [],
  city: ["state"],
  region: ["state"],
  area: ["city", "region"],
  locality: ["city", "area"],
};

export function normalizeLocationTag(locationTag?: string | null) {
  const trimmed = locationTag?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function sortRoles(roles: readonly LocationRole[]) {
  return [...roles].sort((a, b) => roleOrder[a] - roleOrder[b]);
}

function getStructuralRoles(roles: readonly LocationRole[]) {
  return roles.filter((role) => role !== "destination") as Exclude<
    LocationRole,
    "destination"
  >[];
}

function getAllowedParentIntersection(
  structuralRoles: readonly Exclude<LocationRole, "destination">[]
) {
  if (!structuralRoles.length) return null;

  const first = structuralRoleToAllowedParents[structuralRoles[0]];
  const intersection = new Set<LocationRole>(first);

  for (const role of structuralRoles.slice(1)) {
    const allowed = new Set(structuralRoleToAllowedParents[role]);
    for (const existing of [...intersection]) {
      if (!allowed.has(existing)) intersection.delete(existing);
    }
  }

  return intersection;
}

export function getAllowedParentRoles(roles: readonly LocationRole[]) {
  const structuralRoles = getStructuralRoles(roles);
  if (!structuralRoles.length) return [];
  if (structuralRoles.includes("state")) return [];
  return [...(getAllowedParentIntersection(structuralRoles) ?? [])];
}

export function getAllowedParentOptions(
  roles: readonly LocationRole[],
  locations: LocationOption[],
  currentLocationId?: string
) {
  const allowedParentRoles = getAllowedParentRoles(roles);
  if (!allowedParentRoles.length) return [];

  return locations.filter((location) => {
    if (location.id === currentLocationId) return false;
    return location.locationRoles.some((role) => allowedParentRoles.includes(role));
  });
}

export function validateLocationRoles(
  roles: readonly LocationRole[],
  locationTag?: string | null
) {
  if (!roles.length) {
    return { ok: false as const, error: "At least one location role is required." };
  }

  if (roles.length > 2) {
    return { ok: false as const, error: "A location can have at most two roles." };
  }

  const allowedRoles = new Set(locationNewSchema.locationRoleOptions);
  for (const role of roles) {
    if (!allowedRoles.has(role)) {
      return { ok: false as const, error: `Invalid location role: ${role}.` };
    }
  }

  const uniqueRoles = [...new Set(roles)];
  if (uniqueRoles.length !== roles.length) {
    return { ok: false as const, error: "Duplicate location roles are not allowed." };
  }

  const normalizedRoles = sortRoles(uniqueRoles);
  const isAllowedCombination = locationNewSchema.allowedLocationRoleCombinations.some(
    (combo) =>
      combo.length === normalizedRoles.length &&
      combo.every((role, index) => role === normalizedRoles[index])
  );

  if (!isAllowedCombination) {
    return {
      ok: false as const,
      error: `Invalid location role combination: ${normalizedRoles.join(", ")}.`,
    };
  }

  const normalizedLocationTag = normalizeLocationTag(locationTag);
  const requiresLocationTag = normalizedRoles.some(
    (role) => role === "state" || role === "city"
  );

  if (requiresLocationTag && !normalizedLocationTag) {
    return {
      ok: false as const,
      error: "Location tag is required for state and city locations.",
    };
  }

  if (normalizedLocationTag && !/^[A-Z]{3}$/.test(normalizedLocationTag)) {
    return {
      ok: false as const,
      error: "Location tag must be exactly three uppercase letters.",
    };
  }

  return {
    ok: true as const,
    normalizedRoles,
    normalizedLocationTag,
  };
}

export function validateLocationParentRoles(
  childRoles: readonly LocationRole[],
  parentRoles: readonly LocationRole[] | null,
  locationTag?: string | null
) {
  const childValidation = validateLocationRoles(childRoles, locationTag);
  if (!childValidation.ok) return childValidation;

  const structuralRoles = getStructuralRoles(childValidation.normalizedRoles);
  if (!structuralRoles.length) {
    return {
      ok: false as const,
      error: "A location must include at least one structural role.",
    };
  }

  const allowedParentIntersection = getAllowedParentIntersection(structuralRoles);
  if (!allowedParentIntersection) {
    return {
      ok: false as const,
      error: "Unable to determine allowed parent roles for this location.",
    };
  }

  if (structuralRoles.includes("state")) {
    if (parentRoles && parentRoles.length > 0) {
      return {
        ok: false as const,
        error: "State locations cannot have a parent.",
      };
    }
    return childValidation;
  }

  if (!parentRoles || parentRoles.length === 0) {
    return {
      ok: false as const,
      error: "This location requires a parent location.",
    };
  }

  const parentRoleSet = new Set(parentRoles);
  const hasValidParentRole = [...allowedParentIntersection].some((role) =>
    parentRoleSet.has(role)
  );

  if (!hasValidParentRole) {
    return {
      ok: false as const,
      error: `Invalid parent role for ${structuralRoles.join(" + ")}.`,
    };
  }

  return childValidation;
}
