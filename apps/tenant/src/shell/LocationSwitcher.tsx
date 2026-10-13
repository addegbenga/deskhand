import { Check, ChevronsUpDown, MapPin } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@deskhand/ui'
import { useSession } from '../api/queries'
import { useLocationStore, useSelectedLocation } from '../lib/location'

/** Scopes inbox, calendar, reports and AI employees (PRD 28.2). Hidden for single-location accounts. */
export function LocationSwitcher() {
  const { t } = useTranslation('common')
  const session = useSession()
  const setLocationId = useLocationStore((s) => s.setLocationId)
  const { location } = useSelectedLocation(session)
  if (session.locations.length < 2) return null

  const label = location?.name ?? t('topbar.allLocations')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-44 gap-1.5 px-2" aria-label={t('topbar.location', { name: label })}>
          <MapPin className="text-fg-muted" />
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="text-fg-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t('topbar.locations')}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setLocationId(null)}>
          <Check className={location ? 'opacity-0' : 'text-brand!'} />
          {t('topbar.allLocations')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {session.locations.map((loc) => (
          <DropdownMenuItem key={loc.id} onSelect={() => setLocationId(loc.id)}>
            <Check className={location?.id === loc.id ? 'text-brand!' : 'opacity-0'} />
            <span className="flex flex-col">
              <span>{loc.name}</span>
              <span className="text-xs text-fg-muted">{loc.city}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
