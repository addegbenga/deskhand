import { createFileRoute } from '@tanstack/react-router'
import { RecipeDetailPage } from '../../../features/grow/AutomationsPage'

export const Route = createFileRoute('/_shell/app/automations/$recipeId')({
  component: function RecipeRoute() {
    const { recipeId } = Route.useParams()
    return <RecipeDetailPage recipeId={recipeId} />
  },
})
