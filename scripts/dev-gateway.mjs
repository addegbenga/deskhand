#!/usr/bin/env node
/**
 * Dev gateway: one origin for every app, so they share one MSW worker and one IndexedDB
 * (a change in the tenant app shows up in the admin console and public pages).
 *
 *   /admin/*                          -> admin   (Vite, base /admin/)
 *   /_public/*                        -> public  (Vite, base /_public/)
 *   /b/ /p/ /pay/ /r/ /l/ /embed/ /f/
 *   /preferences/ /privacy/           -> public, rewritten under /_public so customers see clean URLs
 *   everything else                   -> tenant  (Vite, base /)
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import { createProxyServer } from 'http-proxy-3'

const PORT = Number(process.env.GATEWAY_PORT ?? 5170)
const TARGETS = {
  tenant: `http://localhost:${process.env.TENANT_PORT ?? 5173}`,
  admin: `http://localhost:${process.env.ADMIN_PORT ?? 5174}`,
  public: `http://localhost:${process.env.PUBLIC_PORT ?? 5175}`,
}
const PUBLIC_PREFIXES = ['/b/', '/p/', '/pay/', '/r/', '/l/', '/embed/', '/f/', '/preferences/', '/privacy/']

function isPublicPath(url) {
  const path = (url.split('?')[0] ?? '/')
  return PUBLIC_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix))
}

/** Picks the app for a request and rewrites req.url where needed. */
function resolve(req) {
  const url = req.url ?? '/'
  if (url.startsWith('/admin/') || url.split('?')[0] === '/admin') return TARGETS.admin
  if (url.startsWith('/_public/')) return TARGETS.public
  if (isPublicPath(url)) {
    req.url = `/_public${url}`
    return TARGETS.public
  }
  return TARGETS.tenant
}

const proxy = createProxyServer({ changeOrigin: false, ws: true, xfwd: true })

proxy.on('error', (error, req, res) => {
  const message = `Gateway could not reach the app for ${req?.url}. Is it running? (${error.code ?? error.message})`
  if (res && 'writeHead' in res && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(message)
  } else if (res && 'destroy' in res) {
    res.destroy()
  }
})

const server = http.createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path === '/admin' || path === '/_public') {
    res.writeHead(302, { Location: `${path}/` })
    res.end()
    return
  }
  proxy.web(req, res, { target: resolve(req) })
})

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: resolve(req) })
})

if (process.argv.includes('--with-apps')) {
  const apps = spawn('pnpm', ['-r', '--parallel', '--filter', './apps/*', 'dev'], { stdio: 'inherit' })
  const stop = () => {
    apps.kill('SIGTERM')
    server.close()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  apps.on('exit', (code) => process.exit(code ?? 0))
}

server.listen(PORT, () => {
  console.log(`\n  Deskhand dev gateway  http://localhost:${PORT}\n`)
  console.log(`  Tenant app     http://localhost:${PORT}/`)
  console.log(`  Admin console  http://localhost:${PORT}/admin/`)
  console.log(`  Public pages   http://localhost:${PORT}/_public/  (e.g. /b/amaka-braids)\n`)
})
