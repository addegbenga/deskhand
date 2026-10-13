import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeOverviewPage } from '../../../features/ai/KnowledgePage'

export const Route = createFileRoute('/_shell/app/ai/knowledge/overview')({ component: KnowledgeOverviewPage })
