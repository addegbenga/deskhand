import { Link } from '@tanstack/react-router'
import { formatMoney, formatDateTime, useTranslation } from '@deskhand/i18n'
import type { ConversationThread } from '@deskhand/schemas'
import { Badge, ConsentBadge, CreatedByChip, Pane } from '@deskhand/ui'
import { useLocaleContext } from '../../lib/location'
import { useSession } from '../../api/queries'

export function ContactSidePanel({ thread }: { thread: ConversationThread }) {
  const { t } = useTranslation(['inbox', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const { contact } = thread
  const name = `${contact.firstName} ${contact.lastName}`

  return (
    <Pane className="overflow-y-auto p-4">
      <Link to="/app/contacts/$contactId" params={{ contactId: contact.id }} className="text-base font-semibold hover:underline">
        {name}
      </Link>
      <p className="mt-1 text-sm text-fg-muted">
        {[contact.phone, contact.email].filter(Boolean).join(' · ') || t('panel.noContact')}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        <CreatedByChip kind={contact.createdBy.kind} />
        {contact.optedOut && <Badge tone="danger">{t('panel.optedOut')}</Badge>}
        {contact.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <dl className="mt-4 grid gap-2 text-sm">
        <div>
          <dt className="text-xs text-fg-muted">{t('panel.language')}</dt>
          <dd>{contact.language}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-muted">{t('panel.stage')}</dt>
          <dd>{contact.stage}</dd>
        </div>
        {contact.value != null && (
          <div>
            <dt className="text-xs text-fg-muted">{t('panel.value')}</dt>
            <dd>{formatMoney(contact.value, ctx.currency, ctx.locale)}</dd>
          </div>
        )}
        {Object.entries(contact.customFields).map(([key, value]) =>
          value == null || value === '' ? null : (
            <div key={key}>
              <dt className="text-xs text-fg-muted">{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ),
        )}
      </dl>
      <h3 id="contact-consent" className="mt-5 scroll-mt-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {t('panel.consent')}
      </h3>
      <ul className="mt-2 flex flex-col gap-1">
        {contact.consents.map((entry) => (
          <li key={entry.channel} className="flex items-center justify-between text-sm">
            {t(`common:channels.${entry.channel}`)}
            <ConsentBadge status={entry.status} />
          </li>
        ))}
      </ul>
      {thread.summary && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('panel.summary')}</h3>
          <p className="mt-1 text-sm">{thread.summary}</p>
        </>
      )}
      {thread.nextAction && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('panel.next')}</h3>
          <p className="mt-1 text-sm">{thread.nextAction}</p>
        </>
      )}
      {thread.upcomingBookings.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('panel.bookings')}</h3>
          <ul className="mt-1 text-sm">
            {thread.upcomingBookings.map((booking) => (
              <li key={booking.id}>
                {booking.service} · {formatDateTime(booking.startsAt, ctx, { timeStyle: 'short' })}
              </li>
            ))}
          </ul>
        </>
      )}
      {thread.recentPayments.length > 0 && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('panel.payments')}</h3>
          <ul className="mt-1 text-sm">
            {thread.recentPayments.map((payment) => (
              <li key={payment.id}>
                {formatMoney(payment.amount, payment.currency || ctx.currency, ctx.locale)} · {payment.status}
              </li>
            ))}
          </ul>
        </>
      )}
      {thread.messages.some((item) => item.kind === 'system') && (
        <>
          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('panel.timeline')}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {thread.messages
              .filter((item) => item.kind === 'system')
              .map((item) => (
                <li key={item.id} className="text-fg-muted">
                  {item.body}
                </li>
              ))}
          </ul>
        </>
      )}
    </Pane>
  )
}
