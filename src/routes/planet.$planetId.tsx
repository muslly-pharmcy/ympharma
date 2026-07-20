import { createFileRoute } from '@tanstack/react-router'
import PlanetPage from '@/pages/PlanetPage'

export const Route = createFileRoute('/planet/$planetId')({
  component: PlanetPage,
})
