import { createHash, randomUUID } from 'node:crypto'

import type { SkillCryptography } from '#modules/skills/actions/ports/outbound/skill_cryptography'

export class NodeSkillCryptography implements SkillCryptography {
  digest(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
  }

  nextId(): string {
    return randomUUID()
  }
}
