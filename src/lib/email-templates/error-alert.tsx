import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  level?: string
  message?: string
  source?: string
  occurredAt?: string
  url?: string
  statusUrl?: string
}

const Email = ({ level = 'error', message = '—', source = '', occurredAt = '', url = '', statusUrl = 'https://muslly.com/status' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`خطأ ${level} — ${message.slice(0, 80)}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ خطأ جديد في التطبيق</Heading>
        <Section style={card}>
          <Text style={label}>المستوى</Text>
          <Text style={value}>{level}</Text>
          <Hr style={hr} />
          <Text style={label}>الرسالة</Text>
          <Text style={value}>{message}</Text>
          {source ? (<><Hr style={hr} /><Text style={label}>المصدر</Text><Text style={mono}>{source}</Text></>) : null}
          {url ? (<><Hr style={hr} /><Text style={label}>الصفحة</Text><Text style={mono}>{url}</Text></>) : null}
          {occurredAt ? (<><Hr style={hr} /><Text style={label}>وقت الحدوث</Text><Text style={value}>{occurredAt}</Text></>) : null}
        </Section>
        <Section style={{ textAlign: 'center', padding: '20px 0' }}>
          <Button href={statusUrl} style={btn}>عرض صفحة الحالة</Button>
        </Section>
        <Text style={footer}>هذه رسالة آلية من نظام تتبع الأخطاء.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `⚠️ خطأ ${d.level ?? 'error'} — ${(d.message ?? '').toString().slice(0, 80)}`,
  displayName: 'تنبيه خطأ تطبيق',
  previewData: {
    level: 'error',
    message: 'TypeError: cannot read properties of undefined',
    source: 'src/components/foo.tsx',
    occurredAt: new Date().toLocaleString('ar'),
    url: 'https://muslly.com/cart',
    statusUrl: 'https://muslly.com/status',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl' as const }
const container = { maxWidth: '560px', margin: '0 auto', padding: '24px' }
const h1 = { color: '#b45309', fontSize: '22px', margin: '0 0 16px' }
const card = { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }
const label = { color: '#6b7280', fontSize: '12px', margin: '0 0 4px', fontWeight: 700 }
const value = { color: '#111827', fontSize: '15px', margin: '0 0 6px' }
const mono = { color: '#111827', fontSize: '13px', fontFamily: 'monospace', margin: '0' }
const hr = { borderColor: '#fde68a', margin: '12px 0' }
const btn = { background: '#b45309', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 800 }
const footer = { color: '#9ca3af', fontSize: '12px', textAlign: 'center' as const, marginTop: '20px' }
