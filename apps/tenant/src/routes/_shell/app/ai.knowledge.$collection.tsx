import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeCollectionPage } from '../../../features/ai/KnowledgePage'

export const Route = createFileRoute('/_shell/app/ai/knowledge/$collection')({ component: KnowledgeCollectionPage })
