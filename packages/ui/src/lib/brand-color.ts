import type { CSSProperties } from 'react'

function luminance(hex: string): number | null {
  const match = /^#?([\da-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return null
  const channels = [0, 2, 4].map((i) => parseInt(match[1]!.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Applies a tenant's brand color (data, not code) as the --brand token for a subtree,
 * with a foreground that keeps AA contrast. Invalid values fall back to the default brand.
 */
export function brandStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!color) return undefined
  const lum = luminance(color)
  if (lum === null) return undefined
  return { '--brand': color, '--brand-fg': lum > 0.4 ? 'var(--on-light)' : 'var(--on-dark)' } as CSSProperties
}
