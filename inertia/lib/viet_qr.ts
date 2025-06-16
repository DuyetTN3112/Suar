function crc16(data: string): string {
  let crc = 0xffff

  for (let i = 0; i < data.length; i += 1) {
    const byte = data.charCodeAt(i)
    crc ^= byte << 8

    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
    }
  }

  return `0000${(crc & 0xffff).toString(16)}`.slice(-4).toUpperCase()
}

export function buildSubscriptionTransferContent(prefix: string, reference: string): string {
  return `${prefix} ${reference}`.replace(/\s+/g, ' ').trim().slice(0, 40).toUpperCase()
}

export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export function generateBankQrString(
  bankCode: string,
  bankAccountNumber: string,
  amount: string = '',
  content: string = ''
): string {
  const fixedAccountType = 'QRIBFTTA'
  const initMode = '000201'
  const version = '010212'
  const providerId = '0010A000000727'

  const bank = `${bankCode.length.toString().padStart(2, '0')}${bankCode}`
  const accountNumber = `${bankAccountNumber.length.toString().padStart(2, '0')}${bankAccountNumber}`
  const accountType = `${fixedAccountType.length.toString().padStart(2, '0')}${fixedAccountType}`

  let accountInfo = `00${bank}01${accountNumber}`
  accountInfo = `01${accountInfo.length.toString().padStart(2, '0')}${accountInfo}`
  accountInfo = `${providerId}${accountInfo}02${accountType}`

  const merchantAccountInfo = `38${accountInfo.length}${accountInfo}`
  const currencyCode = '5303704'
  const countryCode = '5802VN'

  const amountSegment =
    amount.length > 0 ? `54${amount.length.toString().padStart(2, '0')}${amount}` : ''
  const contentSegment =
    content.length > 0 ? `08${content.length.toString().padStart(2, '0')}${content}` : ''
  const additionalData =
    contentSegment.length > 0
      ? `62${contentSegment.length.toString().padStart(2, '0')}${contentSegment}`
      : ''

  const payload = `${initMode}${version}${merchantAccountInfo}${currencyCode}${amountSegment}${countryCode}${additionalData}6304`
  return `${payload}${crc16(payload)}`
}
