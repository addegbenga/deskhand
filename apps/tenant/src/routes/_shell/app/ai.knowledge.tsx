import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeLayout } from '../../../features/ai/KnowledgePage'

export const Route = createFileRoute('/_shell/app/ai/knowledge')({ component: KnowledgeLayout })
