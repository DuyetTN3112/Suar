import db from '@adonisjs/lucid/services/db'

import type {
  SkillTransaction,
  SkillTransactionRunner,
} from '#modules/skills/actions/ports/outbound/skill_transaction'

export class LucidSkillTransactionRunner implements SkillTransactionRunner {
  run<T>(callback: (transaction: SkillTransaction) => Promise<T>): Promise<T> {
    return db.transaction((transaction) => callback(transaction))
  }
}
