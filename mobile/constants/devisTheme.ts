import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { DevisStatus } from "@/constants/types";

// -----------------------------------------------------------------------
// Design system du module Devis — même famille que Support / SAV.
// -----------------------------------------------------------------------

export const DEVIS_COLORS = {
  surface: "#F5F5F8",
  surfaceDeep: "#EDEDF0",
  ink: "#13131A",
  subink: "#4A4A4F",
  muted: "#8D8D96",
  line: "#E5E2DA",
};

export const DEVIS_STATUS_KEYS: Record<DevisStatus, string> = {
  pending: "devisStatusPending",
  in_progress: "devisStatusInProgress",
  answered: "devisStatusAnswered",
  rejected: "devisStatusRejected",
  closed: "devisStatusClosed",
};

export const DEVIS_STATUS_META: Record<
  DevisStatus,
  { fallbackLabel: string; color: string; soft: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    fallbackLabel: "En attente",
    color: "#B45309",
    soft: "#FBEEDC",
    icon: "time-outline",
  },
  in_progress: {
    fallbackLabel: "En cours",
    color: COLORS.primary,
    soft: `${COLORS.primary}1A`,
    icon: "sync-outline",
  },
  answered: {
    fallbackLabel: "Répondu",
    color: "#15803D",
    soft: "#E3F3E6",
    icon: "checkmark-circle-outline",
  },
  rejected: {
    fallbackLabel: "Refusé",
    color: "#EF4444",
    soft: "#FEE2E2",
    icon: "close-circle-outline",
  },
  closed: {
    fallbackLabel: "Clôturé",
    color: "#6B7280",
    soft: "#F3F4F6",
    icon: "lock-closed-outline",
  },
};

export const DEVIS_STATUS_ORDER: DevisStatus[] = [
  "pending",
  "in_progress",
  "answered",
  "rejected",
  "closed",
];

export function formatDevisDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[1][0]] : [parts[0]?.[0]];
  return chars.join("").toUpperCase();
}