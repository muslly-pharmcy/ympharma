import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  sentAt?: string
}

const Email = ({ sentAt = new Date().toLocaleString('ar') }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رسالة اختبار من muslly.com</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Tajawal, Arial, sans-serif', direction: 'rtl' }}>
      <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '24px' }}>
        <Heading style={{ color: '#16a34a' }}>✅ نجح إرسال البريد</Heading>
        <Text>هذه رسالة اختبار من لوحة تحكم muslly.com للتأكد من إعداد SPF/DKIM/DMARC على notify.muslly.com.</Text>
        <Text style={{ color: '#6b7280', fontSize: '12px' }}>أُرسلت في: {sentAt}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '✅ رسالة اختبار من muslly.com',
  displayName: 'اختبار البريد',
  previewData: { sentAt: new Date().toLocaleString('ar') },
} satisfies TemplateEntry
