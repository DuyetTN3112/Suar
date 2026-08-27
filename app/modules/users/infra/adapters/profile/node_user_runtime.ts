import { randomBytes, randomUUID } from 'node:crypto'

import type { UserRuntime } from '#modules/users/actions/ports/outbound/user_runtime'

export class NodeUserRuntime implements UserRuntime {
  createId(): string {
    return randomUUID()
  }

  createToken(byteLength: number): string {
    return randomBytes(byteLength).toString('hex')
  }
}
