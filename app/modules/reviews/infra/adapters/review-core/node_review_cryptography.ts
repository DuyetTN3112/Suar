import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'

export class NodeReviewCryptography implements ReviewCryptography {
  nextId(): string {
    return randomUUID()
  }

  digest(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  verifyHmac(secret: string, value: string, signature: string): boolean {
    const expected = Buffer.from(createHmac('sha256', secret).update(value).digest('hex'), 'utf8')
    const actual = Buffer.from(signature, 'utf8')
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
}
