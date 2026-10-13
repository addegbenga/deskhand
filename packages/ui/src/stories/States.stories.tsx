import type { Meta, StoryObj } from '@storybook/react-vite'
import { Users } from 'lucide-react'
import { Banner } from '../components/banner'
import { Button } from '../components/button'
import { Card, Skeleton } from '../components/display'
import { EmptyState, ErrorState, NoPermissionState, OfflineBanner, StaleBanner } from '../components/states'

const meta = { title: 'Foundation/States' } satisfies Meta

export default meta
type Story = StoryObj

/** The required state patterns (FE-DOC 4.5): every screen has loading, empty, error and no-permission. */
export const Empty: Story = {
  render: () => (
    <Card>
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Contacts appear here when customers message you, book or fill in a form."
        action={<Button>Add a contact</Button>}
      />
    </Card>
  ),
}

export const Loading: Story = {
  render: () => (
    <Card className="flex flex-col gap-3 p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </Card>
  ),
}

export const Error: Story = {
  render: () => (
    <Card>
      <ErrorState supportCode="DH-7Q2X9K" onRetry={() => undefined} />
    </Card>
  ),
}

export const NoPermission: Story = {
  render: () => (
    <Card>
      <NoPermissionState roleLabel="Admin" onRequestAccess={() => undefined} />
    </Card>
  ),
}

export const OfflineAndStale: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <OfflineBanner />
      <StaleBanner onRefresh={() => undefined} />
    </div>
  ),
}

export const Banners: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Banner severity="info" title="Your trial ends in 5 days" action={<Button size="sm">Choose a plan</Button>}>
        Pick a plan to keep inbox, bookings and AI running without a break.
      </Banner>
      <Banner severity="attention" title="WhatsApp: message quality is low" action={<Button size="sm">Fix connection</Button>}>
        Fix it to keep messages and bookings flowing.
      </Banner>
      <Banner severity="danger" title="Your account is suspended" onDismiss={() => undefined}>
        Sending and AI are paused while we review your account.
      </Banner>
    </div>
  ),
}
