import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as MissionControlImport } from './routes/mission-control'
import { Route as AIChatImport } from './routes/ai-chat'
import { Route as LoginImport } from './routes/login'
import { Route as PlanetPageImport } from './routes/planets.$id'

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const MissionControlRoute = MissionControlImport.update({
  path: '/mission-control',
  getParentRoute: () => rootRoute,
} as any)

const AIChatRoute = AIChatImport.update({
  path: '/ai-chat',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const PlanetPageRoute = PlanetPageImport.update({
  path: '/planets/$id',
  getParentRoute: () => rootRoute,
} as any)

export const routeTree = rootRoute.addChildren([
  IndexRoute,
  MissionControlRoute,
  AIChatRoute,
  LoginRoute,
  PlanetPageRoute,
])
