export class EmailAdapter {
  private maxRetries: number

  constructor(options?: { maxRetries?: number }) {
    this.maxRetries = options?.maxRetries ?? 3
  }

  send(payload: { to: string; subject: string; body: string }): { success: boolean; error?: string } {
    if (!payload.to) {
      return { success: false, error: 'Recipient email is required' }
    }
    if (!payload.to.includes('@')) {
      return { success: false, error: 'Invalid email format' }
    }
    if (!payload.subject) {
      return { success: false, error: 'Subject is required' }
    }
    return { success: true }
  }

  async sendWithRetry(payload: { to: string; subject: string; body: string }): Promise<{ success: boolean; error?: string }> {
    let attempts = 0
    let lastResult: { success: boolean; error?: string } = { success: false, error: 'Unknown error' }
    while (attempts < this.maxRetries) {
      lastResult = await Promise.resolve(this.send(payload))
      if (lastResult.success) {
        return lastResult
      }
      attempts++
    }
    return lastResult
  }
}
