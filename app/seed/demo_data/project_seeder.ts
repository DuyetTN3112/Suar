import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { OrgKey, ProjectKey, SeededOrg, SeededProject, SeededUser, UserKey } from './types.js'

export async function seedProjects(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  organizations: Record<OrgKey, SeededOrg>
): Promise<Record<ProjectKey, SeededProject>> {
  const specs: Record<
    ProjectKey,
    {
      name: string
      description: string
      organization: OrgKey
      creator: UserKey
      owner: UserKey
      manager: UserKey
      status: 'in_progress' | 'completed'
      visibility: 'team' | 'private'
    }
  > = {
    orgAPlatform: {
      name: 'Nền tảng Đánh giá Năng lực',
      description:
        'Phát triển lõi nền tảng Suar: hồ sơ năng lực có chứng cứ, phân quyền đa tổ chức và luồng đánh giá kỹ năng sau mỗi lần bàn giao.',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgAOperations: {
      name: 'Vận hành Tin cậy và Tranh chấp',
      description:
        'Vận hành quy trình kiểm duyệt đánh giá và giải quyết tranh chấp: hồ sơ vụ việc, chứng cứ hai phía và quyết định của hội đồng.',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'owner',
      status: 'in_progress',
      visibility: 'private',
    },
    orgADesignSystem: {
      name: 'Hệ thống Thiết kế Suar',
      description:
        'Chuẩn hóa thành phần giao diện, ngôn ngữ hình ảnh và khả năng tiếp cận cho toàn bộ sản phẩm Suar.',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgAAnalytics: {
      name: 'Trung tâm Phân tích Chất lượng',
      description:
        'Xây dựng bảng chỉ số chất lượng bàn giao, độ tin cậy reviewer và xu hướng năng lực theo thời gian cho quản trị viên.',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'owner',
      status: 'in_progress',
      visibility: 'private',
    },
    orgBKnowledgeBase: {
      name: 'Thư viện Khung Năng lực Số',
      description:
        'Biên soạn khung năng lực số theo cấp độ, kèm tiêu chí đánh giá và ví dụ minh chứng cho từng kỹ năng.',
      organization: 'orgB',
      creator: 'orgBOwner',
      owner: 'orgBOwner',
      manager: 'orgBOwner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgBCurriculumOps: {
      name: 'Chương trình Kỹ năng Số Ứng dụng',
      description:
        'Vận hành chương trình học theo dự án: giao bài, chấm theo rubric và cấp chứng nhận dựa trên sản phẩm thực tế.',
      organization: 'orgB',
      creator: 'orgBOwner',
      owner: 'orgBOwner',
      manager: 'orgBOwner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgCMarketplaceLab: {
      name: 'Cổng Dự án Sáng tạo',
      description:
        'Kết nối dự án sáng tạo với cộng tác viên phù hợp dựa trên hồ sơ năng lực đã xác thực và lịch sử cộng tác.',
      organization: 'orgC',
      creator: 'peerReviewer',
      owner: 'peerReviewer',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgDTalentShowcase: {
      name: 'Hồ sơ Chuyên gia Việt',
      description:
        'Giới thiệu hồ sơ chuyên gia độc lập với kỹ năng, dự án tiêu biểu và đánh giá được xác thực trên nền tảng.',
      organization: 'orgD',
      creator: 'externalContributorOne',
      owner: 'externalContributorOne',
      manager: 'externalContributorOne',
      status: 'in_progress',
      visibility: 'team',
    },
    orgEDataOps: {
      name: 'Pipeline Chất lượng Dữ liệu',
      description:
        'Kiểm định chất lượng và truy vết nguồn gốc dữ liệu đầu vào cho các mô hình đánh giá của nền tảng.',
      organization: 'orgE',
      creator: 'externalContributorTwo',
      owner: 'externalContributorTwo',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgEInsightEngine: {
      name: 'Xưởng Phân tích Tác động',
      description:
        'Đo lường tác động của đánh giá năng lực tới cơ hội nghề nghiệp và chất lượng tuyển dụng của đối tác.',
      organization: 'orgE',
      creator: 'externalContributorTwo',
      owner: 'externalContributorTwo',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'private',
    },
    orgFReviewOps: {
      name: 'Xưởng Chất lượng Pull Request',
      description:
        'Chuẩn hóa review package, tiêu chí mô tả thay đổi và vòng phản hồi dựa trên các tín hiệu chất lượng của pull request.',
      organization: 'orgF',
      creator: 'backendSpecialist',
      owner: 'backendSpecialist',
      manager: 'qaAutomation',
      status: 'in_progress',
      visibility: 'team',
    },
    orgFDeveloperExperience: {
      name: 'Phòng thí nghiệm Trải nghiệm Nhà phát triển',
      description:
        'Giảm ma sát từ issue đến merge bằng template rõ ràng, môi trường tái hiện được và tài liệu quyết định có phiên bản.',
      organization: 'orgF',
      creator: 'backendSpecialist',
      owner: 'frontendSpecialist',
      manager: 'productResearcher',
      status: 'in_progress',
      visibility: 'team',
    },
    orgFReleaseReliability: {
      name: 'Chương trình Phát hành Tin cậy',
      description:
        'Kết nối CI, quan sát vận hành, cổng chất lượng và diễn tập rollback thành một chuỗi bằng chứng trước mỗi lần phát hành.',
      organization: 'orgF',
      creator: 'devopsEngineer',
      owner: 'devopsEngineer',
      manager: 'qaAutomation',
      status: 'in_progress',
      visibility: 'private',
    },
    orgGCitizenPortal: {
      name: 'Cổng Dịch vụ Người dân',
      description:
        'Thiết kế hành trình dịch vụ công rõ trạng thái, dễ tiếp cận và có phản hồi chủ động cho từng yêu cầu của người dân.',
      organization: 'orgG',
      creator: 'civicServiceLead',
      owner: 'civicServiceLead',
      manager: 'uxDesigner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgGComplaintResolution: {
      name: 'Điều phối Phản hồi Dịch vụ',
      description:
        'Phân loại phản hồi, xác định đơn vị chịu trách nhiệm và theo dõi cách khắc phục với lịch sử trao đổi minh bạch.',
      organization: 'orgG',
      creator: 'civicServiceLead',
      owner: 'civicServiceLead',
      manager: 'productResearcher',
      status: 'in_progress',
      visibility: 'private',
    },
    orgGAccessibilityAnalytics: {
      name: 'Bản đồ Tiếp cận Dịch vụ số',
      description:
        'Đo accessibility, tỷ lệ hoàn thành hành trình và điểm nghẽn hỗ trợ để ưu tiên cải tiến dựa trên bằng chứng.',
      organization: 'orgG',
      creator: 'dataAnalyst',
      owner: 'dataAnalyst',
      manager: 'uxDesigner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgHFarmOperations: {
      name: 'Nền tảng Điều phối Mùa vụ',
      description:
        'Số hóa kế hoạch mùa vụ, phân công hiện trường và bàn giao vật tư cho các nhóm nông hộ trong hợp tác xã.',
      organization: 'orgH',
      creator: 'agriProductOwner',
      owner: 'agriProductOwner',
      manager: 'productResearcher',
      status: 'in_progress',
      visibility: 'team',
    },
    orgHIotFieldMonitoring: {
      name: 'Giám sát Hiện trường và Cảm biến',
      description:
        'Theo dõi tín hiệu cảm biến, chất lượng đồng bộ ngoại tuyến và cảnh báo có ngữ cảnh cho người vận hành hiện trường.',
      organization: 'orgH',
      creator: 'mobileEngineer',
      owner: 'mobileEngineer',
      manager: 'devopsEngineer',
      status: 'in_progress',
      visibility: 'private',
    },
    orgHKnowledgeHub: {
      name: 'Thư viện Tri thức Hợp tác xã',
      description:
        'Chuẩn hóa quy trình canh tác, bài học mùa vụ và bằng chứng thực hành thành tài liệu có người duyệt và phiên bản.',
      organization: 'orgH',
      creator: 'agriProductOwner',
      owner: 'agriProductOwner',
      manager: 'technicalWriter',
      status: 'in_progress',
      visibility: 'team',
    },
    orgISecureDelivery: {
      name: 'Secure Delivery Workbench',
      description:
        'Đưa threat model, kiểm soát bảo mật và bằng chứng kiểm thử vào cùng vòng đời phát hành của đội sản phẩm.',
      organization: 'orgI',
      creator: 'securityOwner',
      owner: 'securityOwner',
      manager: 'securityEngineer',
      status: 'in_progress',
      visibility: 'private',
    },
    orgIIncidentReadiness: {
      name: 'Trung tâm Sẵn sàng Sự cố',
      description:
        'Xây runbook, tín hiệu phát hiện và bài diễn tập phục hồi có timeline để đội ngũ phản ứng nhất quán khi có sự cố.',
      organization: 'orgI',
      creator: 'securityOwner',
      owner: 'securityOwner',
      manager: 'devopsEngineer',
      status: 'in_progress',
      visibility: 'private',
    },
    orgIDependencyGovernance: {
      name: 'Quản trị Dependency và Supply Chain',
      description:
        'Theo dõi provenance, rủi ro phiên bản và quyết định nâng cấp dependency bằng hồ sơ đánh giá có thể kiểm toán.',
      organization: 'orgI',
      creator: 'securityEngineer',
      owner: 'securityEngineer',
      manager: 'backendSpecialist',
      status: 'in_progress',
      visibility: 'team',
    },
    orgJSustainableCommerce: {
      name: 'Marketplace Sản phẩm Bền vững',
      description:
        'Kết nối thương hiệu, nhà cung cấp và khách hàng bằng tiêu chí tuyển chọn minh bạch và bằng chứng tác động.',
      organization: 'orgJ',
      creator: 'commerceOwner',
      owner: 'commerceOwner',
      manager: 'communityManager',
      status: 'in_progress',
      visibility: 'team',
    },
    orgJCustomerInsight: {
      name: 'Phòng Nghiên cứu Trải nghiệm Khách hàng',
      description:
        'Tổng hợp phản hồi đa kênh, thử nghiệm hành trình và chỉ số giữ chân để ưu tiên cải tiến có căn cứ.',
      organization: 'orgJ',
      creator: 'productResearcher',
      owner: 'productResearcher',
      manager: 'dataAnalyst',
      status: 'in_progress',
      visibility: 'private',
    },
    orgJCreatorMarketplace: {
      name: 'Mạng lưới Creator Đồng hành',
      description:
        'Tuyển chọn, onboarding và nghiệm thu cộng tác viên sáng tạo dựa trên hồ sơ năng lực và cam kết bàn giao.',
      organization: 'orgJ',
      creator: 'communityManager',
      owner: 'communityManager',
      manager: 'commerceOwner',
      status: 'in_progress',
      visibility: 'team',
    },
  }

  const seeded: Partial<Record<ProjectKey, SeededProject>> = {}

  for (const [key, spec] of Object.entries(specs) as [ProjectKey, (typeof specs)[ProjectKey]][]) {
    const organizationId = organizations[spec.organization].id
    const existing = (await trx
      .from('projects')
      .where('organization_id', organizationId)
      .where('name', spec.name)
      .first()) as { id: string } | null
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      creator_id: users[spec.creator].id,
      name: spec.name,
      description: spec.description,
      organization_id: organizationId,
      start_date: runtime.isoDaysAgo(30),
      end_date: runtime.isoDaysAhead(45),
      status: spec.status,
      manager_id: users[spec.manager].id,
      owner_id: users[spec.owner].id,
      visibility: spec.visibility,
      allow_external_contributors: ['orgA', 'orgC', 'orgD', 'orgE', 'orgF', 'orgI', 'orgJ'].includes(
        spec.organization
      ),
      approval_required_for_members: true,
      tags: runtime.toJson(
        spec.organization === 'orgA' ? ['rbac', 'profile', 'admin'] : ['handbook', 'member-flow']
      ),
      custom_roles: runtime.toJson([]),
      created_at: runtime.isoDaysAgo(30),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('projects').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('projects')
        .insert({ id, ...payload })
    }

    seeded[key] = { id, name: spec.name, organizationId }
  }

  return seeded as Record<ProjectKey, SeededProject>
}

export async function seedProjectMembers(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>
): Promise<void> {
  const rows: { project: ProjectKey; user: UserKey; role: string }[] = [
    { project: 'orgAPlatform', user: 'owner', role: 'project_owner' },
    { project: 'orgAPlatform', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAPlatform', user: 'member', role: 'project_member' },
    { project: 'orgAPlatform', user: 'peerReviewer', role: 'project_member' },
    { project: 'orgAOperations', user: 'owner', role: 'project_owner' },
    { project: 'orgAOperations', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAOperations', user: 'member', role: 'project_viewer' },
    { project: 'orgADesignSystem', user: 'owner', role: 'project_owner' },
    { project: 'orgADesignSystem', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgADesignSystem', user: 'member', role: 'project_member' },
    { project: 'orgAAnalytics', user: 'owner', role: 'project_owner' },
    { project: 'orgAAnalytics', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAAnalytics', user: 'peerReviewer', role: 'project_member' },
    { project: 'orgBKnowledgeBase', user: 'orgBOwner', role: 'project_owner' },
    { project: 'orgBKnowledgeBase', user: 'owner', role: 'project_member' },
    { project: 'orgBKnowledgeBase', user: 'member', role: 'project_member' },
    { project: 'orgBCurriculumOps', user: 'orgBOwner', role: 'project_owner' },
    { project: 'orgBCurriculumOps', user: 'owner', role: 'project_member' },
    { project: 'orgCMarketplaceLab', user: 'peerReviewer', role: 'project_owner' },
    { project: 'orgCMarketplaceLab', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgDTalentShowcase', user: 'externalContributorOne', role: 'project_owner' },
    { project: 'orgDTalentShowcase', user: 'externalContributorTwo', role: 'project_member' },
    { project: 'orgEDataOps', user: 'externalContributorTwo', role: 'project_owner' },
    { project: 'orgEDataOps', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgEDataOps', user: 'member', role: 'project_member' },
    { project: 'orgEInsightEngine', user: 'externalContributorTwo', role: 'project_owner' },
    { project: 'orgEInsightEngine', user: 'orgAdmin', role: 'project_manager' },
  ]

  const expandedProjectTeams: Partial<
    Record<ProjectKey, { owner: UserKey; manager: UserKey; members: UserKey[] }>
  > = {
    orgFReviewOps: {
      owner: 'backendSpecialist',
      manager: 'qaAutomation',
      members: ['frontendSpecialist', 'technicalWriter', 'securityEngineer'],
    },
    orgFDeveloperExperience: {
      owner: 'frontendSpecialist',
      manager: 'productResearcher',
      members: ['backendSpecialist', 'qaAutomation', 'technicalWriter'],
    },
    orgFReleaseReliability: {
      owner: 'devopsEngineer',
      manager: 'qaAutomation',
      members: ['backendSpecialist', 'securityEngineer', 'technicalWriter'],
    },
    orgGCitizenPortal: {
      owner: 'civicServiceLead',
      manager: 'uxDesigner',
      members: ['productResearcher', 'qaAutomation', 'technicalWriter'],
    },
    orgGComplaintResolution: {
      owner: 'civicServiceLead',
      manager: 'productResearcher',
      members: ['communityManager', 'dataAnalyst', 'technicalWriter'],
    },
    orgGAccessibilityAnalytics: {
      owner: 'dataAnalyst',
      manager: 'uxDesigner',
      members: ['civicServiceLead', 'qaAutomation', 'productResearcher'],
    },
    orgHFarmOperations: {
      owner: 'agriProductOwner',
      manager: 'productResearcher',
      members: ['mobileEngineer', 'dataAnalyst', 'technicalWriter'],
    },
    orgHIotFieldMonitoring: {
      owner: 'mobileEngineer',
      manager: 'devopsEngineer',
      members: ['agriProductOwner', 'dataAnalyst', 'productResearcher'],
    },
    orgHKnowledgeHub: {
      owner: 'agriProductOwner',
      manager: 'technicalWriter',
      members: ['mobileEngineer', 'productResearcher', 'dataAnalyst'],
    },
    orgISecureDelivery: {
      owner: 'securityOwner',
      manager: 'securityEngineer',
      members: ['backendSpecialist', 'qaAutomation', 'devopsEngineer'],
    },
    orgIIncidentReadiness: {
      owner: 'securityOwner',
      manager: 'devopsEngineer',
      members: ['securityEngineer', 'qaAutomation', 'technicalWriter'],
    },
    orgIDependencyGovernance: {
      owner: 'securityEngineer',
      manager: 'backendSpecialist',
      members: ['securityOwner', 'devopsEngineer', 'mlEngineer'],
    },
    orgJSustainableCommerce: {
      owner: 'commerceOwner',
      manager: 'communityManager',
      members: ['uxDesigner', 'frontendSpecialist', 'dataAnalyst'],
    },
    orgJCustomerInsight: {
      owner: 'productResearcher',
      manager: 'dataAnalyst',
      members: ['commerceOwner', 'uxDesigner', 'communityManager'],
    },
    orgJCreatorMarketplace: {
      owner: 'communityManager',
      manager: 'commerceOwner',
      members: ['productResearcher', 'uxDesigner', 'technicalWriter'],
    },
  }

  for (const [project, team] of Object.entries(expandedProjectTeams) as [
    ProjectKey,
    NonNullable<(typeof expandedProjectTeams)[ProjectKey]>,
  ][]) {
    const teamRoles = new Map<UserKey, string>([
      [team.owner, 'project_owner'],
      [team.manager, team.manager === team.owner ? 'project_owner' : 'project_manager'],
    ])
    for (const member of team.members) {
      if (!teamRoles.has(member)) {
        teamRoles.set(member, 'project_member')
      }
    }
    for (const [user, role] of teamRoles) {
      rows.push({ project, user, role })
    }
  }

  for (const row of rows) {
    const where = {
      project_id: projects[row.project].id,
      user_id: users[row.user].id,
    }
    const existing = await findRow(trx, 'project_members', where)
    const payload = {
      project_role: row.role,
      created_at: runtime.isoDaysAgo(20),
    }

    if (existing) {
      await applyWhere(trx.from('project_members'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('project_members')
        .insert({ ...where, ...payload })
    }
  }
}
