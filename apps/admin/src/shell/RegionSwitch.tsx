import { Globe } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { DataRegionSchema, type DataRegion } from '@deskhand/schemas'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@deskhand/ui'
import { useRegion } from '../lib/region'

const OPTIONS: (DataRegion | 'all')[] = ['all', ...DataRegionSchema.options]

export function RegionSwitch() {
  const { t } = useTranslation('admin')
  const region = useRegion((s) => s.region)
  const setRegion = useRegion((s) => s.setRegion)
  return (
    <Select value={region} onValueChange={(value) => setRegion(value as DataRegion | 'all')}>
      <SelectTrigger aria-label={t('region.label')} className="h-9 w-auto gap-2">
        <Globe className="size-4 text-fg-muted" aria-hidden />
        <span className="max-sm:sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        {OPTIONS.map((value) => (
          <SelectItem key={value} value={value}>
            {t(`region.${value}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
