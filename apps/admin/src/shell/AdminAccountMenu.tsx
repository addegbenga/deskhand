import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Languages, LogOut, Monitor, Rows3 } from 'lucide-react'
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
import { useAdminSession, useAdminSignOut } from '../api/queries'

export function AdminAccountMenu() {
  const { t, i18n } = useTranslation('admin')
  const session = useAdminSession()
  const signOut = useAdminSignOut()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)
  const density = usePreferences((s) => s.density)
  const setDensity = usePreferences((s) => s.setDensity)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('account.label')}
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Avatar name={session.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium text-fg">{session.name}</span>
          <span className="truncate text-xs font-normal text-fg-muted">{session.email}</span>
          <span className="text-xs font-normal text-fg-muted">{t(`personas.${session.persona}`)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {t('common:account.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={i18n.language} onValueChange={(value) => setLanguage(value as Language)}>
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang} value={lang}>
                  {t(`common:languages.${lang}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor />
            {t('common:account.theme')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
              {(['light', 'dark', 'system'] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(`common:account.themes.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Rows3 />
            {t('common:account.density')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={density} onValueChange={(value) => setDensity(value as Density)}>
              {(['comfortable', 'compact'] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {t(`common:account.densities.${value}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            signOut.mutate(undefined, {
              onSuccess: () => {
                queryClient.clear()
                void navigate({ to: '/login' })
              },
            })
          }
        >
          <LogOut className="rtl:rotate-180" />
          {t('account.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
