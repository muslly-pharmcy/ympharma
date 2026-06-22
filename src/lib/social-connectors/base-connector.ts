// Shared types and base class for outbound social-channel connectors.
export type SendMessageOptions = {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export type SendResult = {
  success: boolean;
  externalId?: string;
  error?: string;
};

export interface IChannelConnector {
  send(options: SendMessageOptions): Promise<SendResult>;
  validateHandle(handle: string): boolean;
  getPlatformName(): string;
}

export abstract class BaseChannelConnector implements IChannelConnector {
  abstract send(options: SendMessageOptions): Promise<SendResult>;
  abstract validateHandle(handle: string): boolean;
  abstract getPlatformName(): string;

  protected log(platform: string, message: string, data?: unknown) {
    console.log(`[${platform} Connector] ${message}`, data ?? "");
  }
}
