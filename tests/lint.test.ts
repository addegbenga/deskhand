import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** S0 acceptance: lint blocks raw colors and hard-coded strings (FE-DOC 10, S0). */
const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) })
const FILE = 'apps/tenant/src/features/probe.tsx'

async function messages(code: string) {
  const [result] = await eslint.lintText(code, { filePath: FILE })
  return result?.messages.map((m) => m.message) ?? []
}

describe('lint guardrails', () => {
  it('blocks hard-coded JSX text', async () => {
    expect(await messages('export const Probe = () => <p>Hello there</p>')).toEqual([expect.stringMatching(/i18n key/)])
  })

  it('blocks hard-coded user-visible attributes', async () => {
    const found = await messages('export const Probe = () => <input placeholder="Your name" aria-label="Name" />')
    expect(found).toHaveLength(2)
  })

  it('blocks raw, arbitrary and palette colors', async () => {
    expect(await messages(`export const Probe = () => <p style={{ color: '#ff0000' }} />`)).toHaveLength(1)
    expect((await messages('export const Probe = () => <p className="bg-[#ff0000]" />')).join()).toMatch(/Arbitrary/)
    expect(await messages('export const Probe = () => <p className="text-red-500" />')).toEqual([expect.stringMatching(/palette/)])
  })

  it('allows tokens, i18n calls and punctuation', async () => {
    const code = `
      import { useTranslation } from '@deskhand/i18n'
      export function Probe() {
        const { t } = useTranslation()
        return <p className="bg-brand text-fg-muted" aria-label={t('a11y.notices')}>{t('app.demoData')} · 3</p>
      }`
    expect(await messages(code)).toEqual([])
  })
})
