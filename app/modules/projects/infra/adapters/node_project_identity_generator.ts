import { randomUUID } from 'node:crypto'

import type { ProjectIdentityGenerator } from '#modules/projects/actions/ports/outbound/project_identity_generator'

export class NodeProjectIdentityGenerator implements ProjectIdentityGenerator {
  generate(): string {
    return randomUUID()
  }
}
