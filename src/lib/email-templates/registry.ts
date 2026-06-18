import type { ComponentType } from 'react'
import { template as incidentAlert } from './incident-alert'
import { template as errorAlert } from './error-alert'
import { template as testEmail } from './test-email'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'incident-alert': incidentAlert,
  'error-alert': errorAlert,
  'test-email': testEmail,
}
