import { createStartHandler, defaultRenderHandler } from '@tanstack/react-start'
import { createRouter } from './router'

const router = createRouter()

export default createStartHandler({
  createRouter,
  renderHandler: defaultRenderHandler,
})
