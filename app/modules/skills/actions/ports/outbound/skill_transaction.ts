export type SkillTransaction = object

export interface SkillTransactionRunner {
  run<T>(callback: (transaction: SkillTransaction) => Promise<T>): Promise<T>
}
