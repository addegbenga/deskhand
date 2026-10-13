import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { MarketCode } from '@deskhand/schemas'
import { Checkbox, Switch } from '../components/controls'
import { FieldError, FieldHint, Input, Label, Textarea } from '../components/input'
import { CurrencyInput, DatePicker, PhoneInput, TimePicker } from '../components/pickers'

const meta = { title: 'Foundation/Inputs' } satisfies Meta

export default meta
type Story = StoryObj

export const TextFields: Story = {
  render: () => (
    <div className="grid max-w-sm gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" placeholder="e.g. Chioma Okafor" />
        <FieldHint>As the customer would like to be addressed.</FieldHint>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" aria-invalid defaultValue="chioma@" />
        <FieldError>Enter a full email address.</FieldError>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" rows={3} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox defaultChecked /> Customer agreed to receive messages
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch defaultChecked /> Show AI suggestions
      </label>
    </div>
  ),
}

/** Locale-aware fields: they follow the location's country, currency, time zone and week start. */
export const LocaleAware: Story = {
  render: function Render() {
    const [market, setMarket] = useState<MarketCode>('NG')
    const [phone, setPhone] = useState('')
    const [date, setDate] = useState<string | null>(null)
    const [time, setTime] = useState<string | null>(null)
    const [amount, setAmount] = useState<number | null>(35000)
    return (
      <div className="grid max-w-sm gap-4">
        <PhoneInput market={market} onMarketChange={setMarket} value={phone} onChange={setPhone} />
        <DatePicker value={date} onChange={setDate} locale="en-NG" placeholder="Pick a date" />
        <TimePicker value={time} onChange={setTime} locale="en-NG" hourCycle="h12" placeholder="Pick a time" />
        <CurrencyInput value={amount} onChange={setAmount} currency="NGN" locale="en-NG" />
      </div>
    )
  },
}
