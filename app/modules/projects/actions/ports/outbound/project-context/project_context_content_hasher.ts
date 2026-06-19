import type {
  TvaJsonObject,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export interface ProjectContextContentHasher {
  hash(value: TvaJsonObject): TvaSha256
}
