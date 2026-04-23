import { LucidProjectDetailProjectionReader } from '#modules/projects/infra/adapters/project-context/lucid_project_detail_projection_reader'
import { LucidProjectLifecycleRepository } from '#modules/projects/infra/adapters/project-context/lucid_project_lifecycle_repository'
import { LucidProjectListRepository } from '#modules/projects/infra/adapters/project-context/lucid_project_list_repository'
import { LucidProjectMemberCandidateReader } from '#modules/projects/infra/adapters/project-members/lucid_project_member_candidate_reader'
import { LucidProjectMembershipRepository } from '#modules/projects/infra/adapters/project-members/lucid_project_membership_repository'
import { LucidProjectTransactionRunner } from '#modules/projects/infra/adapters/project-context/lucid_project_transaction_runner'
import { NodeProjectIdentityGenerator } from '#modules/projects/infra/adapters/project-context/node_project_identity_generator'

export const projectTransactionRunner = new LucidProjectTransactionRunner()
export const projectLifecycleRepository = new LucidProjectLifecycleRepository()
export const projectMembershipRepository = new LucidProjectMembershipRepository()
export const projectListRepository = new LucidProjectListRepository()
export const projectDetailProjectionReader = new LucidProjectDetailProjectionReader()
export const projectMemberCandidateReader = new LucidProjectMemberCandidateReader()
export const projectIdentityGenerator = new NodeProjectIdentityGenerator()
