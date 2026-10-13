import { devSettings } from './dev-settings'

/** Controllable clock (FE-DOC 8.5). Every mock timestamp comes from here. */
export function now(): Date {
  return new Date(Date.now() + devSettings().clockOffsetMs)
}

export function isoAgo(ms: number, from: Date = now()): string {
  return new Date(from.getTime() - ms).toISOString()
}

export function isoAhead(ms: number, from: Date = now()): string {
  return new Date(from.getTime() + ms).toISOString()
}

export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
/** Slot hold during checkout (PRD FR-PB.2: 5 to 10 minutes). */
export const HOLD_MS = 5 * MINUTE
