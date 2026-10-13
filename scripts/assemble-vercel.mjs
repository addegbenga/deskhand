#!/usr/bin/env node
/**
 * Merge the three Vite apps into one static tree so production matches the
 * local gateway: one origin, one MSW worker, one IndexedDB.
 *
 *   /admin/*     admin (base /admin/)
 *   /_public/*   public assets (base /_public/)
 *   /b /p /pay /r /l /embed /f /preferences /privacy  -> public SPA
 *   everything else -> tenant
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const out = join(root, 'dist')
const apps = {
  tenant: join(root, 'apps/tenant/dist'),
  admin: join(root, 'apps/admin/dist'),
  public: join(root, 'apps/public/dist'),
}

for (const [name, dir] of Object.entries(apps)) {
  if (!existsSync(dir)) {
    throw new Error(`Missing ${dir}. Build ${name} first (pnpm build).`)
  }
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(apps.tenant, out, { recursive: true })
mkdirSync(join(out, 'admin'), { recursive: true })
cpSync(apps.admin, join(out, 'admin'), { recursive: true })
mkdirSync(join(out, '_public'), { recursive: true })
cpSync(apps.public, join(out, '_public'), { recursive: true })

console.log('Assembled static site into dist/ (tenant + /admin + /_public)')
