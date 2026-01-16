export interface NotificationUnreadCountResult {
  count: number
  revision: number
  source: 'redis' | 'postgres'
}

export interface NotificationUnreadCountOptions {
  consistency?: 'eventual' | 'strong'
}

export interface NotificationUnreadCountReader {
  get(
    recipientId: string,
    options?: NotificationUnreadCountOptions
  ): Promise<NotificationUnreadCountResult>
}
