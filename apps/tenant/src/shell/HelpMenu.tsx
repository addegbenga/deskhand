import { Link } from '@tanstack/react-router'
import { Activity, BookOpen, CircleHelp, FlaskConical, LifeBuoy, Newspaper, Sparkles } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  toast,
} from '@deskhand/ui'

const SHOW_DEV = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true'

export function HelpMenu() {
  const { t } = useTranslation('common')
  const items = [
    { id: 'docs', icon: BookOpen },
    { id: 'aiHelper', icon: Sparkles },
    { id: 'support', icon: LifeBuoy },
    { id: 'status', icon: Activity },
    { id: 'whatsNew', icon: Newspaper },
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={t('topbar.help')} className="max-sm:hidden">
          <CircleHelp />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => toast(t(`help.${item.id}`), { description: t('help.notInMock') })}>
            <item.icon />
            {t(`help.${item.id}`)}
          </DropdownMenuItem>
        ))}
        {SHOW_DEV && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('help.developer')}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/dev/states">
                <FlaskConical />
                {t('dev.statesTitle')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dev/scenarios">
                <FlaskConical />
                {t('dev.scenariosTitle')}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
