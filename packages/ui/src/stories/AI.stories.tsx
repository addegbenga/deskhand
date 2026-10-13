import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AIBadge,
  AISurface,
  AutonomyChip,
  ConfidenceMeter,
  EmployeeCard,
  EvalResultsTable,
  KillSwitchButton,
  LanguageTierBadge,
  SandboxChat,
} from '../components/ai'

const meta = { title: 'Foundation/AI language' } satisfies Meta

export default meta
type Story = StoryObj

/** Everything the AI wrote or did is marked in violet with its confidence (FE-DOC 4.3). */
export const Draft: Story = {
  render: () => (
    <AISurface className="max-w-xl">
      <div className="mb-2 flex items-center gap-2">
        <AIBadge name="Ada" />
        <ConfidenceMeter level="high" />
      </div>
      <p className="text-sm">
        Hi Chioma! Medium knotless braids are ₦35,000 and take about 5 hours. I can book you on Saturday at 10am or 1pm.
      </p>
    </AISurface>
  ),
}

export const Drafting: Story = {
  render: () => (
    <AISurface drafting className="max-w-xl">
      <AIBadge name="Ada" />
    </AISurface>
  ),
}

export const ConfidenceLevels: Story = {
  render: () => (
    <div className="flex gap-4">
      <ConfidenceMeter level="high" />
      <ConfidenceMeter level="medium" />
      <ConfidenceMeter level="low" />
    </div>
  ),
}

export const Employee: Story = {
  render: () => (
    <EmployeeCard
      name="Ada"
      meta={
        <>
          <LanguageTierBadge tier="A" />
          <LanguageTierBadge tier="C" />
          <AutonomyChip level="approve" />
        </>
      }
    >
      <KillSwitchButton onClick={() => undefined} />
    </EmployeeCard>
  ),
}

export const Sandbox: Story = {
  render: () => (
    <SandboxChat
      messages={[{ id: '1', role: 'assistant', text: "I don't want to guess a price." }]}
      value=""
      onChange={() => undefined}
      onSend={() => undefined}
      placeholder="…"
      sendLabel="→"
    />
  ),
}

export const Evals: Story = {
  render: () => (
    <EvalResultsTable
      rows={[{ id: '1', language: 'en', suite: 'grounding', passed: true, score: 92 }]}
      languageLabel="Language"
      suiteLabel="Suite"
      resultLabel="Result"
    />
  ),
}
