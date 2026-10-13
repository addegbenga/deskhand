import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { STATUS_MAP, StatusChip, type StatusDomain } from '../components/status-chip'

const meta = { title: 'Foundation/StatusChip' } satisfies Meta

export default meta

const AnyStatusChip = StatusChip as (props: { domain: StatusDomain; value: string }) => ReactElement

/** Every domain and value from FE-DOC 4.4. The same status always looks the same, with an icon as well as color. */
export const AllStatuses: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(Object.keys(STATUS_MAP) as StatusDomain[]).map((domain) => (
        <div key={domain} className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-xs font-medium text-fg-muted">{domain}</span>
          {Object.keys(STATUS_MAP[domain]).map((value) => (
            <AnyStatusChip key={value} domain={domain} value={value} />
          ))}
        </div>
      ))}
    </div>
  ),
}
