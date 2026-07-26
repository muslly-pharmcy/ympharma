/**
 * Server Logger with Automatic Sensitive Data Redaction
 * Redacts 20 sensitive fields automatically before logging
 */

// Fields to auto-redact
const SENSITIVE_FIELDS = new Set([
  'authorization', 'cookie', 'set-cookie',
  'password', 'passwd', 'pwd',
  'token', 'access_token', 'refresh_token', 'jwt',
  'api_key', 'apikey', 'api-key', 'secret',
  'medical_notes', 'patient_notes', 'diagnosis',
  'ssn', 'social_security', 'socialsecurity',
  'credit_card', 'creditcard', 'card_number', 'cvv',
  'iban', 'passport', 'passport_number',
  'national_id', 'nationalid', 'nid',
  'mrn', 'medical_record_number',
  'dob', 'date_of_birth', 'dateofbirth',
  'pin', 'pincode', 'otp',
]);

// Case-insensitive check
function isSensitiveField(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_FIELDS.has(normalized) || SENSITIVE_FIELDS.has(key.toLowerCase());
}

/**
 * Recursively redact sensitive fields from any object
 */
export function redactSensitive<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if the string itself looks like a sensitive token
    if (data.startsWith('Bearer ') && data.length > 20) {
      return '[REDACTED_BEARER]' as unknown as T;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitive(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveField(key)) {
      // Preserve null/undefined so callers can distinguish "unset" from "hidden".
      result[key] = value === null || value === undefined ? value : '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Safe log function - redacts before logging
 */
export function safeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? redactSensitive(meta) : undefined;
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...redactedMeta,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'debug':
      console.debug(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

/**
 * Logger factory with context
 */
export function createLogger(context: { service: string; component?: string }) {
  const baseMeta = {
    service: context.service,
    component: context.component,
  };

  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      safeLog('info', message, { ...baseMeta, ...meta }),
    warn: (message: string, meta?: Record<string, unknown>) =>
      safeLog('warn', message, { ...baseMeta, ...meta }),
    error: (message: string, meta?: Record<string, unknown>) =>
      safeLog('error', message, { ...baseMeta, ...meta }),
    debug: (message: string, meta?: Record<string, unknown>) =>
      safeLog('debug', message, { ...baseMeta, ...meta }),
  };
}

export { SENSITIVE_FIELDS };
