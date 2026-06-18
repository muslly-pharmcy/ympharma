import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  severity?: string
  summary?: string
  startedAt?: string
  incidentId?: string
  statusUrl?: string
}

const SEVERITY_AR: Record<string, string> = {
  minor: 'بسيط',
  major: 'مهم',
  critical: 'حرج',
}

const Email = ({ severity = 'minor', summary = '—', startedAt = '', incidentId = '', statusUrl = 'https://muslly.com/status' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`تنبيه حادث ${SEVERITY_AR[severity] ?? severity} — ${summary}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚨 تنبيه حادث على muslly.com</Heading>
        <Section style={card}>
          <Text style={label}>الخطورة</Text>
          <Text style={value}>{SEVERITY_AR[severity] ?? severity}</Text>
          <Hr style={hr} />
          <Text style={label}>الوصف</Text>
          <Text style={value}>{summary}</Text>
          <Hr style={hr} />
          <Text style={label}>بدأ في</Text>
          <Text style={value}>{startedAt || 'الآن'}</Text>
          {incidentId ? (
            <>
              <Hr style={hr} />
              <Text style={label}>رقم الحادث</Text>
              <Text style={mono}>{incidentId}</Text>
            </>
          ) : null}
        </Section>
        <Section style={{ textAlign: 'center', padding: '20px 0' }}>
          <Button href={statusUrl} style={btn}>عرض صفحة الحالة</Button>
        </Section>
        <Text style={footer}>هذه رسالة آلية من نظام مراقبة الخدمة.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `🚨 حادث ${SEVERITY_AR[d.severity] ?? d.severity ?? ''} — ${d.summary ?? 'تنبيه نظام'}`,
  displayName: 'تنبيه حادث (Uptime)',
  previewData: {
    severity: 'major',
    summary: 'تأخر في الاستجابة على الموقع الرئيسي',
    startedAt: new Date().toLocaleString('ar'),
    incidentId: 'demo-123',
    statusUrl: 'https://muslly.com/status',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl' as const }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px' }
const h1 = { color: '#dc2626', fontSize: '22px', margin: '0 0 16px' }
const card = { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px' }
const label = { color: '#6b7280', fontSize: '12px', margin: '0 0 4px', fontWeight: 700 }
const value = { color: '#111827', fontSize: '15px', margin: '0 0 6px' }
const mono = { color: '#111827', fontSize: '13px', fontFamily: 'monospace', margin: '0' }
const hr = { borderColor: '#fecaca', margin: '12px 0' }
const btn = { background: '#dc2626', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 800 }
const footer = { color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, marginTop: '20px' }
