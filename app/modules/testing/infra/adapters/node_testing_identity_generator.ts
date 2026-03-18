import { randomUUID } from 'node:crypto'

import { TestingIdentityGenerator } from '#modules/testing/actions/ports/outbound/testing_identity_generator'

export class NodeTestingIdentityGenerator extends TestingIdentityGenerator {
  newId(): string {
    return randomUUID()
  }
}
