import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeTrainingPage } from '../../../features/ai/KnowledgePage'

export const Route = createFileRoute('/_shell/app/ai/knowledge/training')({ component: KnowledgeTrainingPage })
