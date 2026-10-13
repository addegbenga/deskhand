import { Link, useNavigate } from '@tanstack/react-router'
import { Languages, LogOut, Monitor, Rows3, Shield, User } from 'lucide-react'
import { LANGUAGES, setLanguage, useTranslation, type Language } from '@deskhand/i18n'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  usePreferences,
  type Density,
  type Theme,
} from '@deskhand/ui'
import { useSession, useSignOut } from '../api/queries'

export function AccountMenu() {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const { user, membership, account } = useSession()
  const signOut = useSignOut()
  const theme = usePreferences((s) => s.theme)
  const density = usePreferences((s) => s.density)
  const setTheme = usePreferences((s) => s.setTheme)
  const setDensity = usePreferences((s) => s.setDensity)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full" aria-label={t('topbar.account')}>
          <Avatar name={user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="text-sm font-medium text-fg">{user.name}</span>
          <span className="truncate">{user.email}</span>
          <span>{t('account.roleAt', { role: t(`roles.${membership.role}`), business: account.name })}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/$" params={{ _splat: 'settings/profile' }}>
            <User />
            {t('account.profile')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {t('account.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={i18n.language} onValueChange={(value) => setLanguage(value as Language)}>
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor />
            {t('account.theme')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              {(['light', 'dark', 'system'] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(`account.themes.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Rows3 />
            {t('account.density')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={density} onValueChange={(value) => setDensity(value as Density)}>
              {(['comfortable', 'compact'] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(`account.densities.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link to="/app/$" params={{ _splat: 'settings/security' }}>
            <Shield />
            {t('account.security')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut.mutate(undefined, { onSuccess: () => void navigate({ to: '/login' }) })}
        >
          <LogOut />
          {t('account.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
