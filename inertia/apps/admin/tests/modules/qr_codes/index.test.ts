import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/admin/shared/stores/translation.svelte')

import AdminQrCodesPage from '@/apps/admin/modules/qr_codes/index.svelte'

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn(() => Promise.resolve('<svg data-testid="qr-svg"></svg>')),
  },
}))

describe('AdminQrCodesPage', () => {
  it('renders subscription QR details with bank account and generated QR image', async () => {
    render(AdminQrCodesPage, {
      props: {
        paymentConfig: {
          bankName: 'VCB',
          bankCode: '970436',
          bankAccountNumber: '1234567890',
          bankAccountName: 'SUAR TEST',
          branch: 'Ho Chi Minh',
        },
        stats: {
          total: 8,
          active: 5,
          expiringSoon: 2,
          cancelled: 1,
          byPlan: { pro: 3 },
        },
        plans: [
          {
            id: 'pkg-pro',
            storagePlan: 'pro',
            name: 'Pro',
            shortName: 'PRO',
            price: 99000,
            priceLabel: '99.000 VND',
            paymentContentPrefix: 'SUAR PRO',
            features: ['Priority review', 'More storage'],
          },
        ],
      },
    })

    expect(screen.getByRole('heading', { name: 'QR for Pro and Pro Max plans' })).toBeInTheDocument()
    expect(screen.getAllByText('VCB')).not.toHaveLength(0)
    expect(screen.getAllByText('1234567890')).not.toHaveLength(0)
    expect(screen.getByText('3 active')).toBeInTheDocument()
    expect(screen.getByText('DB plan: pro')).toBeInTheDocument()
    expect(screen.getByText('Priority review')).toBeInTheDocument()
    expect(screen.getAllByText(/SUAR PRO PERSONAL PRO/)).not.toHaveLength(0)

    const qrImage = await screen.findByRole('img', { name: 'Payment QR for Pro' })
    expect(qrImage).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'))
    expect(screen.getByRole('button', { name: /Copy QR payload/i })).toBeInTheDocument()
  })
})
