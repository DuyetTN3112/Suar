import axios from 'axios'

import type { NotificationCenterTransport } from './notification_center_types.js'

const browser = typeof window !== 'undefined'

export function headers() {
  const csrfToken = browser
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
    : ''

  return {
    'X-CSRF-TOKEN': csrfToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

export const axiosTransport: NotificationCenterTransport = {
  async getLatest(limit) {
    const response = await axios.get<unknown>('/notifications/latest', {
      params: { limit },
      headers: headers(),
    })
    return response.data
  },
  async markAsRead(id) {
    await axios.post(`/notifications/${encodeURIComponent(id)}/mark-as-read`, {}, { headers: headers() })
  },
  async markAllAsRead() {
    await axios.post('/notifications/mark-all-as-read', {}, { headers: headers() })
  },
  async delete(id) {
    await axios.delete(`/notifications/${encodeURIComponent(id)}`, { headers: headers() })
  },
}
