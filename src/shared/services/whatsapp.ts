// WhatsApp Business API Integration for MUSLLY AI OS

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0'
const WHATSAPP_TOKEN = import.meta.env.VITE_WHATSAPP_API_TOKEN
const PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID

export interface WhatsAppMessage {
  to: string
  body: string
  type: 'text' | 'template' | 'image' | 'document'
  templateName?: string
  language?: string
  variables?: Record<string, string>
}

export interface WhatsAppTemplate {
  name: string
  language: string
  components: any[]
}

export class WhatsAppService {
  private apiUrl: string
  private token: string
  private phoneNumberId: string

  constructor() {
    this.apiUrl = WHATSAPP_API_URL
    this.token = WHATSAPP_TOKEN || ''
    this.phoneNumberId = PHONE_NUMBER_ID || ''
  }

  // Send Text Message
  async sendTextMessage(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'text',
          text: { body },
        }),
      })

      const data = await response.json()

      if (data.messages && data.messages[0]) {
        return { success: true, messageId: data.messages[0].id }
      }

      return { success: false, error: data.error?.message || 'Unknown error' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  // Send Template Message
  async sendTemplateMessage(to: string, templateName: string, language: string = 'ar', variables?: Record<string, string>): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const components: any[] = []

      if (variables) {
        const bodyParams = Object.values(variables).map(value => ({
          type: 'text',
          text: value,
        }))

        components.push({
          type: 'body',
          parameters: bodyParams,
        })
      }

      const response = await fetch(`${this.apiUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatPhone(to),
          type: 'template',
          template: {
            name: templateName,
            language: { code: language },
            components,
          },
        }),
      })

      const data = await response.json()

      if (data.messages && data.messages[0]) {
        return { success: true, messageId: data.messages[0].id }
      }

      return { success: false, error: data.error?.message || 'Unknown error' }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  // Send Order Confirmation
  async sendOrderConfirmation(phone: string, orderId: string, total: number, items: string[]): Promise<{ success: boolean }> {
    const message = `✅ تم تأكيد طلبك #${orderId.slice(0, 8)}

📦 المنتجات:
${items.map(item => `• ${item}`).join('\n')}

💰 الإجمالي: ${total.toLocaleString()} ر.ي

شكراً لاختيارك صيدلية المصلي!`

    const result = await this.sendTextMessage(phone, message)
    return { success: result.success }
  }

  // Send Delivery Update
  async sendDeliveryUpdate(phone: string, orderId: string, status: string, estimatedTime?: string): Promise<{ success: boolean }> {
    const statusMessages: Record<string, string> = {
      assigned: '🚚 تم تعيين سائق لطلبك',
      picked_up: '📦 تم استلام طلبك من الصيدلية',
      in_transit: '🛣️ طلبك في الطريق إليك',
      delivered: '✅ تم توصيل طلبك بنجاح!',
    }

    let message = statusMessages[status] || 'تحديث حالة الطلب'
    message += `\n\nرقم الطلب: #${orderId.slice(0, 8)}`

    if (estimatedTime) {
      message += `\n⏰ وقت التوصيل المتوقع: ${estimatedTime}`
    }

    const result = await this.sendTextMessage(phone, message)
    return { success: result.success }
  }

  // Send Prescription Reminder
  async sendPrescriptionReminder(phone: string, patientName: string, medication: string, dosage: string): Promise<{ success: boolean }> {
    const message = `⏰ تذكير بالدواء\n\nمرحباً ${patientName}،\n\nحان وقت أخذ دوائك:
💊 ${medication}\n📋 ${dosage}\n\nتمنياتنا لك بالشفاء العاجل! 🏥`

    const result = await this.sendTextMessage(phone, message)
    return { success: result.success }
  }

  // Send Appointment Reminder
  async sendAppointmentReminder(phone: string, patientName: string, doctorName: string, date: string, time: string, clinicAddress: string): Promise<{ success: boolean }> {
    const message = `📅 تذكير بموعد\n\nمرحباً ${patientName}،\n\nلديك موعد غداً:
👨‍⚕️ الدكتور: ${doctorName}\n📅 التاريخ: ${date}\n⏰ الوقت: ${time}\n📍 العنوان: ${clinicAddress}\n\nيرجى الحضور قبل 15 دقيقة`

    const result = await this.sendTextMessage(phone, message)
    return { success: result.success }
  }

  // Send Marketing Campaign
  async sendMarketingCampaign(phones: string[], message: string): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const phone of phones) {
      const result = await this.sendTextMessage(phone, message)
      if (result.success) {
        sent++
      } else {
        failed++
      }
    }

    return { sent, failed }
  }

  // Verify Webhook Signature
  verifyWebhookSignature(body: string, signature: string): boolean {
    // Implementation depends on Meta's webhook verification
    // This is a placeholder
    return true
  }

  // Parse Incoming Message
  parseIncomingMessage(payload: any): { from: string; message: string; type: string; timestamp: string } | null {
    try {
      const entry = payload.entry?.[0]
      const change = entry?.changes?.[0]
      const value = change?.value
      const message = value?.messages?.[0]

      if (!message) return null

      return {
        from: message.from,
        message: message.text?.body || message.interactive?.button_reply?.title || '',
        type: message.type,
        timestamp: new Date(message.timestamp * 1000).toISOString(),
      }
    } catch {
      return null
    }
  }

  private formatPhone(phone: string): string {
    // Remove non-numeric characters and ensure it starts with country code
    let cleaned = phone.replace(/\D/g, '')
    if (!cleaned.startsWith('967')) {
      cleaned = '967' + cleaned
    }
    return cleaned
  }
}

export const whatsappService = new WhatsAppService()
