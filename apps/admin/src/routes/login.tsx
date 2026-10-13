import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { BRAND_NAME } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { Badge, Button, Card, FieldError, Wordmark } from '@deskhand/ui'
import { adminSessionQuery, useAdminSignIn } from '../api/queries'

/** SSO mock. Real SSO with enforced two-factor is a backend concern (PRD 31.1). */
function LoginPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signIn = useAdminSignIn()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm p-8">
        <div className="flex items-center justify-between">
          <Wordmark className="text-lg" />
          <Badge>{t('internal')}</Badge>
        </div>
        <h1 className="mt-6 text-xl font-semibold">{t('login.title', { brand: BRAND_NAME })}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t('login.body', { brand: BRAND_NAME })}</p>
        <Button
          className="mt-6 w-full"
          disabled={signIn.isPending}
          onClick={() =>
            signIn.mutate(undefined, {
              onSuccess: (session) => {
                queryClient.setQueryData(adminSessionQuery.queryKey, session)
                void navigate({ to: '/' })
              },
            })
          }
        >
          <KeyRound />
          {t('login.cta')}
        </Button>
        {signIn.isError && <FieldError className="mt-3">{t('common:states.error.body')}</FieldError>}
        <p className="mt-6 text-xs text-fg-muted">{t('login.note')}</p>
      </Card>
    </main>
  )
}

export const Route = createFileRoute('/login')({ component: LoginPage })
