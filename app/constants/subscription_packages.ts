export interface SubscriptionPackageDefinition {
  id: 'pro' | 'promax'
  storagePlan: 'pro' | 'enterprise'
  name: string
  shortName: string
  price: number
  priceLabel: string
  paymentContentPrefix: string
  features: string[]
}

export interface SubscriptionPaymentConfig {
  bankName: string
  bankCode: string
  bankAccountNumber: string
  bankAccountName: string
  branch: string | null
}

export const SUBSCRIPTION_PACKAGE_CATALOG: SubscriptionPackageDefinition[] = [
  {
    id: 'pro',
    storagePlan: 'pro',
    name: 'Pro',
    shortName: 'PRO',
    price: 399_000,
    priceLabel: '399.000đ / tháng',
    paymentContentPrefix: 'SUAR PRO',
    features: ['Marketplace boost', 'Advanced profile proof', 'Priority support'],
  },
  {
    id: 'promax',
    storagePlan: 'enterprise',
    name: 'Pro Max',
    shortName: 'PROMAX',
    price: 799_000,
    priceLabel: '799.000đ / tháng',
    paymentContentPrefix: 'SUAR PROMAX',
    features: [
      'Everything in Pro',
      'Premium ranking priority',
      'Extended analytics',
      'Dedicated moderation queue',
    ],
  },
]

export const SUBSCRIPTION_PAYMENT_CONFIG: SubscriptionPaymentConfig = {
  bankName: process.env.SUBSCRIPTION_BANK_NAME ?? 'Vietcombank',
  bankCode: process.env.SUBSCRIPTION_BANK_CODE ?? '970436',
  bankAccountNumber: process.env.SUBSCRIPTION_BANK_ACCOUNT_NUMBER ?? '0123456789',
  bankAccountName: process.env.SUBSCRIPTION_BANK_ACCOUNT_NAME ?? 'SUAR PERSONAL SERVICES',
  branch: process.env.SUBSCRIPTION_BANK_BRANCH ?? 'Ho Chi Minh City',
}
