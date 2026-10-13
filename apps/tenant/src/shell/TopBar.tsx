import { Link } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { IconButton, Kbd, Wordmark } from '@deskhand/ui'
import { AccountMenu } from './AccountMenu'
import { AIStatusPill } from './AIStatusPill'
import { CommandPalette } from './CommandPalette'
import { HelpMenu } from './HelpMenu'
import { LocationSwitcher } from './LocationSwitcher'
import { NotificationCenter } from './NotificationCenter'
import { QuickCreate } from './QuickCreate'
import { SetupChecklistPill } from './SetupChecklistPill'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function TopBar() {
  const { t } = useTranslation('common')
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
      <Link to="/app/home" className="md:hidden" aria-label={t('nav.home')}>
        <Wordmark compact />
      </Link>
      <LocationSwitcher />
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg-muted transition-colors hover:border-fg-muted/40 sm:flex"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-start">{t('topbar.search')}</span>
        <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd>K</Kbd>
      </button>
      <IconButton label={t('topbar.search')} className="sm:hidden" onClick={() => setPaletteOpen(true)}>
        <Search />
      </IconButton>

      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <div className="hidden lg:flex">
          <SetupChecklistPill />
        </div>
        <AIStatusPill />

        <QuickCreate />
        <NotificationCenter />
        <HelpMenu />
        <AccountMenu />
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  )
}
