import { randomUUID } from 'node:crypto'

import {
  AdminMutationIdentityGenerator,
  type AdminMutationIdentity,
} from '#modules/admin/users/actions/ports/outbound/users/admin_mutation_identity_generator'

export class SystemAdminMutationIdentityGeneratorAdapter extends AdminMutationIdentityGenerator {
  next(): AdminMutationIdentity {
    return {
      mutationId: randomUUID(),
      occurredAt: new Date().toISOString(),
    }
  }
}
