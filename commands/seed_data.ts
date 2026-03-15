import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { randomUUID } from 'node:crypto'

/**
 * Seed realistic test data for UI development & testing.
 *
 * Creates ~100 records across all major tables with varied,
 * realistic Vietnamese/English content. No field left empty.
 *
 * Usage:
 *   node ace seed:data
 *   node ace seed:data --fresh   # truncate all tables first
 */
export default class SeedData extends BaseCommand {
  static override commandName = 'seed:data'
  static override description = 'Seed database with realistic test data for UI development'

  static override options: CommandOptions = {
    startApp: true,
    staysAlive: false,
  }

  override async run() {
    const fresh = Boolean(this.parsed.flags?.fresh)
    this.logger.info('🌱 Starting seed data generation...')

    if (fresh) {
      this.logger.warning('🗑️  Truncating all tables...')
      await this.truncateAll()
    }

    const trx = await db.transaction()

    try {
      // 1. Skills (25)
      const skillIds = await this.seedSkills(trx)
      this.logger.success(`✅ Skills: ${skillIds.length}`)

      // 2. Users (30) — first one is superadmin
      const userIds = await this.seedUsers(trx)
      this.logger.success(`✅ Users: ${userIds.length}`)

      // 3. User OAuth Providers (20)
      const oauthCount = await this.seedUserOAuthProviders(trx, userIds)
      this.logger.success(`✅ OAuth Providers: ${oauthCount}`)

      // 4. Organizations (10)
      const orgData = await this.seedOrganizations(trx, userIds)
      this.logger.success(`✅ Organizations: ${orgData.length}`)

      // 5. Organization Users (60+)
      const orgUserCount = await this.seedOrganizationUsers(trx, orgData, userIds)
      this.logger.success(`✅ Organization Users: ${orgUserCount}`)

      // 6. Projects (15)
      const projectData = await this.seedProjects(trx, orgData, userIds)
      this.logger.success(`✅ Projects: ${projectData.length}`)

      // 7. Project Members (40+)
      const pmCount = await this.seedProjectMembers(trx, projectData, orgData, userIds)
      this.logger.success(`✅ Project Members: ${pmCount}`)

      // 8. Project Attachments (20)
      const paCount = await this.seedProjectAttachments(trx, projectData, userIds)
      this.logger.success(`✅ Project Attachments: ${paCount}`)

      // 9. Task Statuses + Workflow Transitions (per org)
      const taskStatusMap = await this.seedTaskStatuses(trx, orgData)
      this.logger.success(`✅ Task Statuses & Workflow Transitions seeded`)

      // 10. Tasks (30)
      const taskData = await this.seedTasks(trx, orgData, projectData, userIds, taskStatusMap)
      this.logger.success(`✅ Tasks: ${taskData.length}`)

      // 11. Task Versions (20)
      const tvCount = await this.seedTaskVersions(trx, taskData, userIds)
      this.logger.success(`✅ Task Versions: ${tvCount}`)

      // 12. Task Applications (15)
      const taCount = await this.seedTaskApplications(trx, taskData, userIds)
      this.logger.success(`✅ Task Applications: ${taCount}`)

      // 13. Task Assignments (20)
      const tassData = await this.seedTaskAssignments(trx, taskData, userIds)
      this.logger.success(`✅ Task Assignments: ${tassData.length}`)

      // 14. Task Required Skills (25)
      const trsCount = await this.seedTaskRequiredSkills(trx, taskData, skillIds)
      this.logger.success(`✅ Task Required Skills: ${trsCount}`)

      // 15. Conversations (10)
      const convData = await this.seedConversations(trx, orgData, taskData)
      this.logger.success(`✅ Conversations: ${convData.length}`)

      // 16. Conversation Participants (25)
      const cpCount = await this.seedConversationParticipants(trx, convData, userIds)
      this.logger.success(`✅ Conversation Participants: ${cpCount}`)

      // 17. Messages (50)
      const msgCount = await this.seedMessages(trx, convData, userIds)
      this.logger.success(`✅ Messages: ${msgCount}`)

      // 18. Review Sessions (10)
      const rsData = await this.seedReviewSessions(trx, tassData, userIds)
      this.logger.success(`✅ Review Sessions: ${rsData.length}`)

      // 19. Skill Reviews (20)
      const srData = await this.seedSkillReviews(trx, rsData, skillIds, userIds)
      this.logger.success(`✅ Skill Reviews: ${srData.length}`)

      // 20. Reverse Reviews (10)
      const rrCount = await this.seedReverseReviews(trx, rsData, userIds)
      this.logger.success(`✅ Reverse Reviews: ${rrCount}`)

      // 21. Flagged Reviews (5)
      const frCount = await this.seedFlaggedReviews(trx, srData, userIds)
      this.logger.success(`✅ Flagged Reviews: ${frCount}`)

      // 22. User Skills (40)
      const usCount = await this.seedUserSkills(trx, userIds, skillIds)
      this.logger.success(`✅ User Skills: ${usCount}`)

      // 23. Recruiter Bookmarks (10)
      const rbCount = await this.seedRecruiterBookmarks(trx, userIds)
      this.logger.success(`✅ Recruiter Bookmarks: ${rbCount}`)

      // 24. User Subscriptions (10)
      const subCount = await this.seedUserSubscriptions(trx, userIds)
      this.logger.success(`✅ User Subscriptions: ${subCount}`)

      await trx.commit()
      this.logger.success('🎉 All seed data inserted successfully!')
      this.logger.info('Total records: ~460+')
    } catch (error) {
      await trx.rollback()
      this.logger.error(`❌ Seed failed: ${error}`)
      throw error
    }
  }

  // ── Helpers ────────────────────────────────────────────────────
  private uuid(): string {
    return randomUUID()
  }

  private pick<T>(arr: readonly T[] | T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!
  }

  private pickN<T>(arr: readonly T[] | T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n)
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private randomDecimal(min: number, max: number, decimals = 2): number {
    return Number((Math.random() * (max - min) + min).toFixed(decimals))
  }

  private randomDate(daysAgo = 365): string {
    const d = new Date()
    d.setDate(d.getDate() - this.randomInt(0, daysAgo))
    d.setHours(this.randomInt(0, 23), this.randomInt(0, 59), 0, 0)
    return d.toISOString()
  }

  private futureDate(daysAhead = 90): string {
    const d = new Date()
    d.setDate(d.getDate() + this.randomInt(1, daysAhead))
    d.setHours(this.randomInt(9, 18), 0, 0, 0)
    return d.toISOString()
  }

  // ── Data pools ────────────────────────────────────────────────
  private readonly FIRST_NAMES = [
    'Minh',
    'Hương',
    'Tuấn',
    'Linh',
    'Đức',
    'Thảo',
    'Phúc',
    'Mai',
    'Khoa',
    'Ngọc',
    'Bảo',
    'Trang',
    'Hải',
    'Yến',
    'Long',
    'Hà',
    'Quang',
    'Lan',
    'Thành',
    'Nhung',
    'An',
    'Dung',
    'Hoàng',
    'Thúy',
    'Việt',
    'Tâm',
    'Khánh',
    'Phương',
    'Nam',
    'Thu',
  ]

  private readonly LAST_NAMES = [
    'Nguyễn',
    'Trần',
    'Lê',
    'Phạm',
    'Hoàng',
    'Huỳnh',
    'Phan',
    'Vũ',
    'Võ',
    'Đặng',
    'Bùi',
    'Đỗ',
    'Hồ',
    'Ngô',
    'Dương',
  ]

  private readonly ORG_NAMES = [
    'TechViet Solutions',
    'Saigon Digital Lab',
    'Hanoi Innovation Hub',
    'MekongSoft',
    'Dragon Tech Corp',
    'BamBoo Studio',
    'Phoenix Systems',
    'Lotus Cloud Services',
    'VietCode Academy',
    'StarFish Consulting',
  ]

  private readonly PROJECT_NAMES = [
    'Hệ thống quản lý nhân sự v2',
    'Mobile Banking App',
    'E-commerce Platform',
    'AI Chatbot Framework',
    'Dashboard Analytics',
    'Inventory Management',
    'Social Media Scheduler',
    'CRM Integration Module',
    'Payment Gateway',
    'Learning Management System',
    'Real-time Notification Service',
    'CI/CD Pipeline Automation',
    'Data Warehouse Migration',
    'Customer Portal Redesign',
    'API Gateway v3',
  ]

  private readonly TASK_TITLES = [
    'Thiết kế wireframe trang chủ',
    'Implement user authentication flow',
    'Optimize database queries for dashboard',
    'Write unit tests for payment module',
    'Setup CI/CD pipeline with GitHub Actions',
    'Refactor legacy API endpoints',
    'Design system component library',
    'Migrate from REST to GraphQL',
    'Performance audit & optimization',
    'Setup monitoring with Grafana',
    'Implement real-time notifications',
    'Database migration v2 to v3',
    'Fix critical security vulnerability',
    'API rate limiting implementation',
    'User onboarding flow redesign',
    'Multi-language support (i18n)',
    'Docker containerization',
    'Load testing with k6',
    'Implement caching layer with Redis',
    'OAuth2 social login integration',
    'File upload service with S3',
    'Search functionality with Elasticsearch',
    'Automated email notification system',
    'Role-based access control (RBAC)',
    'Data export to CSV/Excel',
    'Webhook integration for third-party',
    'Mobile responsive layout fixes',
    'Dark mode implementation',
    'Implement audit logging',
    'Setup error tracking with Sentry',
  ]

  private readonly TASK_DESCRIPTIONS = [
    'Cần hoàn thành trước sprint review. Đã có mockup từ design team, cần implement chính xác theo Figma.',
    'High priority - khách hàng yêu cầu feature này cho Q2. Cần coordinate với team backend.',
    'Technical debt cần xử lý. Query hiện tại chạy >3s, target < 500ms. Cần thêm index và optimize JOIN.',
    'Coverage hiện tại 45%, target 80%. Focus vào edge cases và error handling paths.',
    'Sử dụng GitHub Actions. Cần auto-deploy staging khi merge PR, production khi tag release.',
    'Legacy code từ v1. Cần maintain backward compatibility. Breaking changes phải có migration guide.',
    'Dùng Tailwind CSS + Headless UI. Tham khảo Radix UI patterns. Cần Storybook documentation.',
    'Migration plan đã approved. Phase 1: dual-write, Phase 2: read from GraphQL, Phase 3: sunset REST.',
    'Lighthouse score hiện tại 45. Target > 90. Focus: code splitting, lazy loading, image optimization.',
    'Setup Prometheus + Grafana stack. Alert rules cho CPU > 80%, Memory > 90%, Error rate > 1%.',
  ]

  private readonly SKILL_NAMES: Array<{ code: string; name: string; category: string }> = [
    { code: 'typescript', name: 'TypeScript', category: 'technical' },
    { code: 'react', name: 'React.js', category: 'technical' },
    { code: 'nodejs', name: 'Node.js', category: 'technical' },
    { code: 'python', name: 'Python', category: 'technical' },
    { code: 'postgresql', name: 'PostgreSQL', category: 'technical' },
    { code: 'docker', name: 'Docker', category: 'technical' },
    { code: 'aws', name: 'Amazon Web Services', category: 'technical' },
    { code: 'graphql', name: 'GraphQL', category: 'technical' },
    { code: 'redis', name: 'Redis', category: 'technical' },
    { code: 'kubernetes', name: 'Kubernetes', category: 'technical' },
    { code: 'svelte', name: 'Svelte', category: 'technical' },
    { code: 'go', name: 'Golang', category: 'technical' },
    { code: 'rust', name: 'Rust', category: 'technical' },
    { code: 'mongodb', name: 'MongoDB', category: 'technical' },
    { code: 'communication', name: 'Communication', category: 'soft_skill' },
    { code: 'teamwork', name: 'Teamwork', category: 'soft_skill' },
    { code: 'leadership', name: 'Leadership', category: 'soft_skill' },
    { code: 'problem_solving', name: 'Problem Solving', category: 'soft_skill' },
    { code: 'time_management', name: 'Time Management', category: 'soft_skill' },
    { code: 'critical_thinking', name: 'Critical Thinking', category: 'soft_skill' },
    { code: 'agile_scrum', name: 'Agile/Scrum', category: 'delivery' },
    { code: 'ci_cd', name: 'CI/CD', category: 'delivery' },
    { code: 'devops', name: 'DevOps', category: 'delivery' },
    { code: 'testing', name: 'Testing & QA', category: 'delivery' },
    { code: 'code_review', name: 'Code Review', category: 'delivery' },
  ]

  private readonly CONVERSATION_TITLES = [
    'Sprint Planning - Sprint 14',
    'Bug Report: Login fails on Safari',
    'Design Review - Homepage v2',
    'Technical Discussion: Caching Strategy',
    'Onboarding Q&A',
    'API Design Review',
    'Performance Issues Discussion',
    'Release Planning Q3',
    'Security Audit Findings',
    'Team Standup Notes',
  ]

  private readonly MESSAGES = [
    'Mình đã xong phần authentication rồi, anh review giúp nhé.',
    'OK, để mình check lại rồi approve PR.',
    'Có issue với phần pagination, page 2 đang trả duplicate items.',
    'Bug này reproduce được trên Chrome nhưng Firefox thì OK. Lạ thật.',
    'Deploy staging thành công, team test giúp mình nhé!',
    'Figma mới update, check lại spacing cho header section.',
    'Database migration đã chạy production. Monitoring bình thường.',
    'Cần thêm index cho bảng tasks, query đang chậm lắm.',
    'Sprint review lúc 3pm nhé mọi người.',
    'Mình đã viết doc cho API mới, anh em xem ở Notion.',
    'Performance test xong rồi, P99 latency < 200ms.',
    'Có ai rảnh review PR #234 không? Urgent fix.',
    'QA report 3 bugs mới, mình đã assign vào sprint này.',
    'Cảm ơn team đã effort tuần này, sprint goal đạt 100%!',
    'Meeting với client postpone sang thứ 5.',
    'Docs cho webhook integration đã update trên Confluence.',
    'CI pipeline lại fail, hình như do flaky test.',
    'Refactor xong module payment, code gọn hơn nhiều.',
    'Cần discuss architecture cho feature mới, book meeting nhé.',
    'Hotfix đã deploy, issue đã resolved. Monitoring OK.',
  ]

  private readonly BIOS = [
    'Senior Software Engineer với 5+ năm kinh nghiệm về TypeScript/React. Đam mê clean code và system design.',
    'Full-stack developer, yêu thích open source. Contributor của nhiều dự án trên GitHub.',
    'DevOps engineer chuyên về cloud infrastructure và CI/CD automation.',
    'Frontend specialist, expertise về performance optimization và accessibility.',
    'Backend engineer với deep knowledge về distributed systems và microservices.',
    'Mobile developer cross-platform (React Native/Flutter). Đã ship 10+ apps.',
    'Tech lead với passion về mentoring và team building. 8 năm kinh nghiệm.',
    'Data engineer chuyên ETL pipelines và real-time data processing.',
    'QA engineer tự động hóa testing. Expert về Cypress, Playwright, và k6.',
    'Product-minded engineer, thích giải quyết business problems bằng technology.',
  ]

  // ── Truncate ──────────────────────────────────────────────────
  private async truncateAll() {
    const tables = [
      'remember_me_tokens',
      'user_subscriptions',
      'recruiter_bookmarks',
      'user_skills',
      'flagged_reviews',
      'reverse_reviews',
      'skill_reviews',
      'review_sessions',
      'messages',
      'conversation_participants',
      'conversations',
      'task_required_skills',
      'task_workflow_transitions',
      'task_statuses',
      'task_assignments',
      'task_applications',
      'task_versions',
      'tasks',
      'project_attachments',
      'project_members',
      'projects',
      'organization_users',
      'organizations',
      'user_oauth_providers',
      'users',
      'skills',
    ]
    for (const t of tables) {
      await db.rawQuery(`TRUNCATE TABLE "${t}" CASCADE`)
    }
  }

  // ── 1. Skills ────────────────────────────────────────────────
  private async seedSkills(trx: any): Promise<string[]> {
    const ids: string[] = []
    for (let i = 0; i < this.SKILL_NAMES.length; i++) {
      const s = this.SKILL_NAMES[i]!
      const id = this.uuid()
      ids.push(id)
      await trx
        .insertQuery()
        .table('skills')
        .insert({
          id,
          category_code: s.category,
          display_type: s.category === 'technical' ? 'spider_chart' : 'list',
          skill_code: s.code,
          skill_name: s.name,
          description: `Kỹ năng ${s.name} — ${s.category === 'technical' ? 'Kỹ thuật lập trình' : s.category === 'soft_skill' ? 'Kỹ năng mềm' : 'Delivery & Process'}`,
          icon_url: `https://cdn.example.com/icons/${s.code}.svg`,
          is_active: true,
          sort_order: i,
          created_at: this.randomDate(180),
          updated_at: new Date().toISOString(),
        })
    }
    return ids
  }

  // ── 2. Users ─────────────────────────────────────────────────
  private async seedUsers(trx: any): Promise<string[]> {
    const ids: string[] = []
    const timezones = [
      'Asia/Ho_Chi_Minh',
      'Asia/Bangkok',
      'UTC',
      'America/New_York',
      'Europe/London',
    ]
    const langs = ['vi', 'en', 'ja']

    for (let i = 0; i < 30; i++) {
      const id = this.uuid()
      ids.push(id)
      const first = this.pick(this.FIRST_NAMES)
      const last = this.pick(this.LAST_NAMES)
      const username = `${first.toLowerCase().replace(/[^a-z]/g, '')}${last.toLowerCase().replace(/[^a-z]/g, '')}_${i}`

      let systemRole = 'registered_user'
      if (i === 0) systemRole = 'superadmin'
      else if (i === 1) systemRole = 'system_admin'

      await trx
        .insertQuery()
        .table('users')
        .insert({
          id,
          username,
          email: `${username}@suar-test.vn`,
          status: i < 28 ? 'active' : this.pick(['inactive', 'suspended']),
          system_role: systemRole,
          current_organization_id: null,
          auth_method: this.pick(['email', 'google', 'github']),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          bio: this.pick(this.BIOS),
          phone: `+84${this.randomInt(900000000, 999999999)}`,
          address: `${this.randomInt(1, 200)} ${this.pick(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Hai Bà Trưng', 'Điện Biên Phủ', 'Phạm Ngũ Lão'])}, ${this.pick(['Q.1', 'Q.3', 'Q.7', 'Tân Bình', 'Bình Thạnh', 'Thủ Đức'])}, TP.HCM`,
          timezone: this.pick(timezones),
          language: this.pick(langs),
          is_freelancer: i >= 20,
          freelancer_rating: i >= 20 ? this.randomDecimal(3.0, 5.0) : null,
          freelancer_completed_tasks_count: i >= 20 ? this.randomInt(5, 50) : 0,
          ranking_priority: this.randomInt(1, 5),
          is_verified_badge: i < 5,
          profile_settings: JSON.stringify({
            is_searchable: i >= 20,
            show_contact_info: Math.random() > 0.5,
            show_organizations: true,
            show_projects: true,
            show_spider_chart: true,
            show_technical_skills: true,
            custom_headline:
              i >= 20
                ? `Freelancer ${this.pick(['TypeScript', 'React', 'Node.js', 'Python', 'Full-stack'])} Developer`
                : null,
            preferred_job_types:
              i >= 20 ? this.pickN(['full-time', 'part-time', 'contract', 'freelance'], 2) : [],
            preferred_locations: [this.pick(['remote', 'Ho Chi Minh', 'Hanoi', 'Da Nang'])],
            min_salary_expectation: i >= 20 ? this.randomInt(15, 60) * 1000000 : null,
            salary_currency: 'VND',
            available_from: i >= 20 ? this.futureDate(30) : null,
          }),
          trust_data: JSON.stringify({
            current_tier_code: this.pick([null, 'community', 'organization', 'partner']),
            calculated_score: this.randomInt(0, 100),
            raw_score: this.randomInt(0, 150),
            total_verified_reviews: this.randomInt(0, 30),
            last_calculated_at: this.randomDate(30),
          }),
          credibility_data: JSON.stringify({
            credibility_score: this.randomInt(30, 100),
            total_reviews_given: this.randomInt(0, 50),
            accurate_reviews: this.randomInt(0, 40),
            disputed_reviews: this.randomInt(0, 5),
            last_calculated_at: this.randomDate(14),
          }),
          created_at: this.randomDate(365),
          updated_at: this.randomDate(30),
        })
    }
    return ids
  }

  // ── 3. User OAuth Providers ──────────────────────────────────
  private async seedUserOAuthProviders(trx: any, userIds: string[]): Promise<number> {
    let count = 0
    for (let i = 0; i < 20; i++) {
      const provider = this.pick(['google', 'github'])
      await trx
        .insertQuery()
        .table('user_oauth_providers')
        .insert({
          id: this.uuid(),
          user_id: userIds[i]!,
          provider,
          provider_id: `${provider}_${this.randomInt(100000, 999999)}`,
          email: `oauth_${i}@${provider}.com`,
          access_token: `tok_${this.uuid().slice(0, 20)}`,
          refresh_token: `ref_${this.uuid().slice(0, 20)}`,
          created_at: this.randomDate(180),
          updated_at: this.randomDate(30),
        })
      count++
    }
    return count
  }

  // ── 4. Organizations ─────────────────────────────────────────
  private async seedOrganizations(
    trx: any,
    userIds: string[]
  ): Promise<Array<{ id: string; ownerId: string }>> {
    const orgs: Array<{ id: string; ownerId: string }> = []
    const plans = ['free', 'starter', 'professional', 'enterprise'] as const
    const partnerTypes = [null, 'gold', 'silver', 'bronze'] as const

    for (let i = 0; i < this.ORG_NAMES.length; i++) {
      const id = this.uuid()
      const ownerId = userIds[i % 5]!
      orgs.push({ id, ownerId })

      const slug = this.ORG_NAMES[i]!.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const partnerType = this.pick(partnerTypes)

      await trx
        .insertQuery()
        .table('organizations')
        .insert({
          id,
          name: this.ORG_NAMES[i],
          slug: `${slug}-${i}`,
          description: `${this.ORG_NAMES[i]} là công ty công nghệ chuyên về phát triển phần mềm, cung cấp giải pháp số hóa cho doanh nghiệp Việt Nam.`,
          logo: `https://api.dicebear.com/7.x/identicon/svg?seed=${slug}`,
          website: `https://${slug}.vn`,
          plan: plans[i % plans.length],
          owner_id: ownerId,
          custom_roles: JSON.stringify([
            {
              name: 'tech_lead',
              permissions: ['manage_tasks', 'manage_projects', 'review_code'],
              description: 'Technical Lead',
            },
            {
              name: 'qa_lead',
              permissions: ['manage_tasks', 'review_code'],
              description: 'QA Lead',
            },
          ]),
          partner_type: partnerType,
          partner_verified_at: partnerType ? this.randomDate(90) : null,
          partner_verified_by: partnerType ? userIds[0] : null,
          partner_verification_proof: partnerType
            ? `Verified via business registration certificate #${this.randomInt(10000, 99999)}`
            : null,
          partner_expires_at: partnerType ? this.futureDate(365) : null,
          partner_is_active: !!partnerType,
          created_at: this.randomDate(365),
          updated_at: this.randomDate(30),
        })

      // Update owner's current_organization_id
      await trx.from('users').where('id', ownerId).update({ current_organization_id: id })
    }
    return orgs
  }

  // ── 5. Organization Users ────────────────────────────────────
  private async seedOrganizationUsers(
    trx: any,
    orgData: Array<{ id: string; ownerId: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const added = new Set<string>()

    for (const org of orgData) {
      // Owner
      const key = `${org.id}:${org.ownerId}`
      if (!added.has(key)) {
        await trx
          .insertQuery()
          .table('organization_users')
          .insert({
            organization_id: org.id,
            user_id: org.ownerId,
            org_role: 'org_owner',
            status: 'approved',
            created_at: this.randomDate(365),
            updated_at: this.randomDate(30),
          })
        added.add(key)
        count++
      }

      // Add 5-8 members per org
      const memberCount = this.randomInt(5, 8)
      const candidates = userIds.filter((uid) => uid !== org.ownerId)
      const members = this.pickN(candidates, memberCount)

      for (const uid of members) {
        const k = `${org.id}:${uid}`
        if (added.has(k)) continue
        added.add(k)

        const role = this.pick(['org_admin', 'org_member', 'org_member', 'org_member'])
        const status = this.pick(['approved', 'approved', 'approved', 'pending'])

        await trx
          .insertQuery()
          .table('organization_users')
          .insert({
            organization_id: org.id,
            user_id: uid,
            org_role: role,
            status,
            invited_by: org.ownerId,
            created_at: this.randomDate(180),
            updated_at: this.randomDate(30),
          })
        count++
      }
    }
    return count
  }

  // ── 6. Projects ──────────────────────────────────────────────
  private async seedProjects(
    trx: any,
    orgData: Array<{ id: string; ownerId: string }>,
    userIds: string[]
  ): Promise<Array<{ id: string; orgId: string; creatorId: string }>> {
    const projects: Array<{ id: string; orgId: string; creatorId: string }> = []
    const statuses = [
      'pending',
      'in_progress',
      'in_progress',
      'in_progress',
      'completed',
      'cancelled',
    ] as const
    const visibilities = ['public', 'private', 'team'] as const

    for (let i = 0; i < this.PROJECT_NAMES.length; i++) {
      const id = this.uuid()
      const org = orgData[i % orgData.length]!
      const creatorId = org.ownerId
      projects.push({ id, orgId: org.id, creatorId })

      const startDate = this.randomDate(180)
      const endDate = this.futureDate(120)
      const tags = this.pickN(
        ['frontend', 'backend', 'devops', 'mobile', 'ai', 'data', 'security', 'ux'],
        3
      )

      await trx
        .insertQuery()
        .table('projects')
        .insert({
          id,
          creator_id: creatorId,
          name: this.PROJECT_NAMES[i],
          description: `Dự án ${this.PROJECT_NAMES[i]} nhằm nâng cao hiệu suất và trải nghiệm người dùng. Thời gian dự kiến ${this.randomInt(2, 12)} tháng.`,
          organization_id: org.id,
          start_date: startDate,
          end_date: endDate,
          status: this.pick(statuses),
          budget: this.randomDecimal(10000000, 500000000),
          manager_id: this.pick(userIds.slice(0, 10)),
          owner_id: creatorId,
          visibility: this.pick(visibilities),
          allow_freelancer: Math.random() > 0.3,
          approval_required_for_members: Math.random() > 0.7,
          tags: JSON.stringify(tags),
          custom_roles: JSON.stringify([]),
          created_at: startDate,
          updated_at: this.randomDate(14),
        })
    }
    return projects
  }

  // ── 7. Project Members ───────────────────────────────────────
  private async seedProjectMembers(
    trx: any,
    projectData: Array<{ id: string; orgId: string; creatorId: string }>,
    _orgData: Array<{ id: string; ownerId: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const added = new Set<string>()
    const roles = [
      'project_owner',
      'project_manager',
      'project_member',
      'project_member',
      'project_viewer',
    ] as const

    for (const p of projectData) {
      // Owner
      const ownerKey = `${p.id}:${p.creatorId}`
      if (!added.has(ownerKey)) {
        await trx
          .insertQuery()
          .table('project_members')
          .insert({
            project_id: p.id,
            user_id: p.creatorId,
            project_role: 'project_owner',
            created_at: this.randomDate(180),
          })
        added.add(ownerKey)
        count++
      }

      // 2-5 members
      const members = this.pickN(
        userIds.filter((u) => u !== p.creatorId),
        this.randomInt(2, 5)
      )
      for (const uid of members) {
        const k = `${p.id}:${uid}`
        if (added.has(k)) continue
        added.add(k)

        await trx
          .insertQuery()
          .table('project_members')
          .insert({
            project_id: p.id,
            user_id: uid,
            project_role: this.pick(roles),
            created_at: this.randomDate(90),
          })
        count++
      }
    }
    return count
  }

  // ── 8. Project Attachments ───────────────────────────────────
  private async seedProjectAttachments(
    trx: any,
    projectData: Array<{ id: string; creatorId: string }>,
    userIds: string[]
  ): Promise<number> {
    const fileNames = [
      'requirements_v2.pdf',
      'wireframe_homepage.fig',
      'api_spec.yaml',
      'database_schema.sql',
      'design_system.sketch',
      'meeting_notes_q2.docx',
      'test_report_final.xlsx',
      'deployment_guide.md',
      'performance_audit.pdf',
      'architecture_diagram.drawio',
      'sprint_burndown.png',
      'user_flow.pdf',
      'contract_amendment.pdf',
      'budget_overview.xlsx',
      'timeline_gantt.mpp',
      'competitor_analysis.pptx',
      'security_report.pdf',
      'brand_guidelines.ai',
      'release_notes_v3.md',
      'client_feedback.docx',
    ]
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      fig: 'application/figma',
      yaml: 'text/yaml',
      sql: 'text/plain',
      sketch: 'application/sketch',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      md: 'text/markdown',
      drawio: 'application/xml',
      png: 'image/png',
      mpp: 'application/vnd.ms-project',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ai: 'application/postscript',
    }

    let count = 0
    for (let i = 0; i < 20; i++) {
      const project = this.pick(projectData)
      const fileName = fileNames[i % fileNames.length]!
      const ext = fileName.split('.').pop()!

      await trx
        .insertQuery()
        .table('project_attachments')
        .insert({
          id: this.uuid(),
          project_id: project.id,
          file_name: fileName,
          file_path: `/uploads/projects/${project.id}/${fileName}`,
          file_size: this.randomInt(10240, 52428800),
          mime_type: mimeTypes[ext] || 'application/octet-stream',
          uploaded_by: this.pick(userIds.slice(0, 15)),
          created_at: this.randomDate(90),
          updated_at: this.randomDate(30),
        })
      count++
    }
    return count
  }

  // ── 9. Task Statuses + Workflow ──────────────────────────────
  private async seedTaskStatuses(
    trx: any,
    orgData: Array<{ id: string }>
  ): Promise<Map<string, Map<string, string>>> {
    // Map<orgId, Map<slug, statusId>>
    const result = new Map<string, Map<string, string>>()

    const defaults = [
      {
        name: 'TODO',
        slug: 'todo',
        category: 'todo',
        color: '#6B7280',
        sort_order: 0,
        is_default: true,
      },
      {
        name: 'IN_PROGRESS',
        slug: 'in_progress',
        category: 'in_progress',
        color: '#3B82F6',
        sort_order: 1,
        is_default: false,
      },
      {
        name: 'DONE_DEV',
        slug: 'done_dev',
        category: 'in_progress',
        color: '#8B5CF6',
        sort_order: 2,
        is_default: false,
      },
      {
        name: 'IN_TESTING',
        slug: 'in_testing',
        category: 'in_progress',
        color: '#F59E0B',
        sort_order: 3,
        is_default: false,
      },
      {
        name: 'REJECTED',
        slug: 'rejected',
        category: 'in_progress',
        color: '#EF4444',
        sort_order: 4,
        is_default: false,
      },
      {
        name: 'DONE',
        slug: 'done',
        category: 'done',
        color: '#10B981',
        sort_order: 5,
        is_default: false,
      },
      {
        name: 'CANCELLED',
        slug: 'cancelled',
        category: 'cancelled',
        color: '#9CA3AF',
        sort_order: 6,
        is_default: false,
      },
    ]

    const transitions = [
      ['todo', 'in_progress'],
      ['todo', 'cancelled'],
      ['in_progress', 'done_dev'],
      ['in_progress', 'todo'],
      ['in_progress', 'cancelled'],
      ['done_dev', 'in_testing'],
      ['done_dev', 'in_progress'],
      ['done_dev', 'cancelled'],
      ['in_testing', 'done'],
      ['in_testing', 'rejected'],
      ['in_testing', 'cancelled'],
      ['rejected', 'in_progress'],
      ['rejected', 'cancelled'],
      ['cancelled', 'todo'],
    ]

    for (const org of orgData) {
      const slugMap = new Map<string, string>()

      // Check existing
      const existing = await trx
        .from('task_statuses')
        .where('organization_id', org.id)
        .select('id', 'slug')
      if (existing.length > 0) {
        for (const row of existing) {
          slugMap.set(row.slug, row.id)
        }
        result.set(org.id, slugMap)
        continue
      }

      for (const s of defaults) {
        const statusId = this.uuid()
        slugMap.set(s.slug, statusId)
        await trx
          .insertQuery()
          .table('task_statuses')
          .insert({
            id: statusId,
            organization_id: org.id,
            name: s.name,
            slug: s.slug,
            category: s.category,
            color: s.color,
            sort_order: s.sort_order,
            is_default: s.is_default,
            is_system: true,
            created_at: this.randomDate(90),
            updated_at: new Date().toISOString(),
          })
      }

      for (const [from, to] of transitions) {
        const fromId = slugMap.get(from!)
        const toId = slugMap.get(to!)
        if (!fromId || !toId) continue
        await trx
          .insertQuery()
          .table('task_workflow_transitions')
          .insert({
            id: this.uuid(),
            organization_id: org.id,
            from_status_id: fromId,
            to_status_id: toId,
            conditions: JSON.stringify(
              from === 'todo' && to === 'in_progress' ? { requires_assignee: true } : {}
            ),
            created_at: new Date().toISOString(),
          })
      }

      result.set(org.id, slugMap)
    }
    return result
  }

  // ── 10. Tasks ────────────────────────────────────────────────
  private async seedTasks(
    trx: any,
    orgData: Array<{ id: string; ownerId: string }>,
    projectData: Array<{ id: string; orgId: string }>,
    userIds: string[],
    taskStatusMap: Map<string, Map<string, string>>
  ): Promise<Array<{ id: string; orgId: string; creatorId: string; assignedTo: string | null }>> {
    const tasks: Array<{
      id: string
      orgId: string
      creatorId: string
      assignedTo: string | null
    }> = []
    const statuses = ['todo', 'in_progress', 'done', 'cancelled', 'in_review'] as const
    const labels = ['bug', 'feature', 'enhancement', 'documentation'] as const
    const priorities = ['low', 'medium', 'high', 'urgent'] as const
    const difficulties = ['easy', 'medium', 'hard', 'expert'] as const
    const visibilities = ['internal', 'external', 'all'] as const

    for (let i = 0; i < 30; i++) {
      const id = this.uuid()
      const org = orgData[i % orgData.length]!
      const creatorId = this.pick(userIds.slice(0, 15))
      const assignedTo = Math.random() > 0.2 ? this.pick(userIds) : null
      tasks.push({ id, orgId: org.id, creatorId, assignedTo })

      const project = projectData.find((p) => p.orgId === org.id) || null
      const status = this.pick(statuses)
      const slugMap = taskStatusMap.get(org.id)
      const taskStatusId = slugMap?.get(status === 'in_review' ? 'in_progress' : status) || null

      await trx
        .insertQuery()
        .table('tasks')
        .insert({
          id,
          title: this.TASK_TITLES[i % this.TASK_TITLES.length],
          description: this.pick(this.TASK_DESCRIPTIONS),
          status,
          label: this.pick(labels),
          priority: this.pick(priorities),
          difficulty: this.pick(difficulties),
          assigned_to: assignedTo,
          creator_id: creatorId,
          updated_by: this.pick(userIds.slice(0, 10)),
          due_date: Math.random() > 0.3 ? this.futureDate(60) : null,
          parent_task_id: null,
          estimated_time: this.randomDecimal(1, 40),
          actual_time: status === 'done' ? this.randomDecimal(1, 50) : this.randomDecimal(0, 20),
          organization_id: org.id,
          project_id: project ? project.id : null,
          task_visibility: this.pick(visibilities),
          application_deadline: this.pick(visibilities) !== 'internal' ? this.futureDate(30) : null,
          estimated_budget: this.randomDecimal(500000, 20000000),
          external_applications_count: this.randomInt(0, 15),
          sort_order: i,
          task_status_id: taskStatusId,
          created_at: this.randomDate(120),
          updated_at: this.randomDate(14),
        })
    }

    // Set some parent_task_id for subtask relations
    for (let i = 25; i < 30; i++) {
      const child = tasks[i]!
      const parent = tasks.find((t) => t.orgId === child.orgId && t.id !== child.id)
      if (parent) {
        await trx.from('tasks').where('id', child.id).update({ parent_task_id: parent.id })
      }
    }

    return tasks
  }

  // ── 11. Task Versions ────────────────────────────────────────
  private async seedTaskVersions(
    trx: any,
    taskData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    for (let i = 0; i < 20; i++) {
      const task = taskData[i % taskData.length]!
      await trx
        .insertQuery()
        .table('task_versions')
        .insert({
          id: this.uuid(),
          task_id: task.id,
          title: `${this.pick(this.TASK_TITLES)} (revision ${i + 1})`,
          description: this.pick(this.TASK_DESCRIPTIONS),
          status: this.pick(['todo', 'in_progress', 'done']),
          label: this.pick(['bug', 'feature', 'enhancement', 'documentation']),
          priority: this.pick(['low', 'medium', 'high', 'urgent']),
          difficulty: this.pick(['easy', 'medium', 'hard', 'expert']),
          assigned_to: this.pick(userIds),
          changed_by: this.pick(userIds.slice(0, 10)),
          changed_at: this.randomDate(60),
        })
      count++
    }
    return count
  }

  // ── 12. Task Applications ────────────────────────────────────
  private async seedTaskApplications(
    trx: any,
    taskData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const added = new Set<string>()

    for (let i = 0; i < 15; i++) {
      const task = taskData[i % taskData.length]!
      const applicantId = userIds[20 + (i % 10)]! // freelancers
      const key = `${task.id}:${applicantId}`
      if (added.has(key)) continue
      added.add(key)

      const appStatus = this.pick(['pending', 'approved', 'rejected', 'withdrawn'])

      await trx
        .insertQuery()
        .table('task_applications')
        .insert({
          id: this.uuid(),
          task_id: task.id,
          applicant_id: applicantId,
          application_status: appStatus,
          application_source: this.pick(['public_listing', 'invitation', 'referral']),
          message: `Tôi có ${this.randomInt(2, 8)} năm kinh nghiệm với ${this.pick(['TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL'])}. Mong được hợp tác!`,
          expected_rate: this.randomDecimal(200000, 2000000),
          portfolio_links: JSON.stringify([
            `https://github.com/user${i}`,
            `https://portfolio-user${i}.vercel.app`,
          ]),
          applied_at: this.randomDate(30),
          reviewed_by: appStatus !== 'pending' ? this.pick(userIds.slice(0, 5)) : null,
          reviewed_at: appStatus !== 'pending' ? this.randomDate(14) : null,
          rejection_reason:
            appStatus === 'rejected' ? 'Yêu cầu kỹ năng không phù hợp với task này.' : null,
        })
      count++
    }
    return count
  }

  // ── 13. Task Assignments ─────────────────────────────────────
  private async seedTaskAssignments(
    trx: any,
    taskData: Array<{ id: string; creatorId: string; assignedTo: string | null }>,
    userIds: string[]
  ): Promise<Array<{ id: string; taskId: string; assigneeId: string }>> {
    const assignments: Array<{ id: string; taskId: string; assigneeId: string }> = []

    for (let i = 0; i < 20; i++) {
      const task = taskData[i % taskData.length]!
      const assigneeId = task.assignedTo || this.pick(userIds)
      const id = this.uuid()
      const assStatus = this.pick(['active', 'active', 'active', 'completed', 'cancelled'])
      assignments.push({ id, taskId: task.id, assigneeId })

      await trx
        .insertQuery()
        .table('task_assignments')
        .insert({
          id,
          task_id: task.id,
          assignee_id: assigneeId,
          assigned_by: task.creatorId,
          assignment_type: this.pick(['member', 'freelancer', 'volunteer']),
          assignment_status: assStatus,
          estimated_hours: this.randomDecimal(4, 80),
          actual_hours:
            assStatus === 'completed' ? this.randomDecimal(4, 100) : this.randomDecimal(0, 40),
          progress_percentage: assStatus === 'completed' ? 100 : this.randomInt(0, 95),
          completion_notes:
            assStatus === 'completed' ? 'Task hoàn thành đúng deadline, đã pass QA review.' : null,
          verified_by: assStatus === 'completed' ? this.pick(userIds.slice(0, 5)) : null,
          verified_at: assStatus === 'completed' ? this.randomDate(7) : null,
          assigned_at: this.randomDate(60),
          completed_at: assStatus === 'completed' ? this.randomDate(14) : null,
        })
    }
    return assignments
  }

  // ── 14. Task Required Skills ─────────────────────────────────
  private async seedTaskRequiredSkills(
    trx: any,
    taskData: Array<{ id: string }>,
    skillIds: string[]
  ): Promise<number> {
    let count = 0
    const added = new Set<string>()
    const levels = ['beginner', 'elementary', 'junior', 'middle', 'senior', 'lead'] as const

    for (let i = 0; i < 25; i++) {
      const task = taskData[i % taskData.length]!
      const skillId = this.pick(skillIds)
      const key = `${task.id}:${skillId}`
      if (added.has(key)) continue
      added.add(key)

      await trx
        .insertQuery()
        .table('task_required_skills')
        .insert({
          id: this.uuid(),
          task_id: task.id,
          skill_id: skillId,
          required_level_code: this.pick(levels),
          is_mandatory: Math.random() > 0.3,
          created_at: this.randomDate(60),
        })
      count++
    }
    return count
  }

  // ── 15. Conversations ────────────────────────────────────────
  private async seedConversations(
    trx: any,
    orgData: Array<{ id: string }>,
    taskData: Array<{ id: string; orgId: string }>
  ): Promise<Array<{ id: string; orgId: string }>> {
    const convs: Array<{ id: string; orgId: string }> = []

    for (let i = 0; i < 10; i++) {
      const id = this.uuid()
      const org = orgData[i % orgData.length]!
      const linkedTask = i < 5 ? taskData.find((t) => t.orgId === org.id) : null
      convs.push({ id, orgId: org.id })

      await trx
        .insertQuery()
        .table('conversations')
        .insert({
          id,
          title: this.CONVERSATION_TITLES[i % this.CONVERSATION_TITLES.length],
          organization_id: org.id,
          task_id: linkedTask?.id || null,
          last_message_at: this.randomDate(7),
          created_at: this.randomDate(90),
          updated_at: this.randomDate(7),
        })
    }
    return convs
  }

  // ── 16. Conversation Participants ────────────────────────────
  private async seedConversationParticipants(
    trx: any,
    convData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const added = new Set<string>()

    for (const conv of convData) {
      const participants = this.pickN(userIds, this.randomInt(2, 5))
      for (const uid of participants) {
        const key = `${conv.id}:${uid}`
        if (added.has(key)) continue
        added.add(key)

        await trx
          .insertQuery()
          .table('conversation_participants')
          .insert({
            id: this.uuid(),
            conversation_id: conv.id,
            user_id: uid,
            last_read_at: Math.random() > 0.3 ? this.randomDate(3) : null,
            created_at: this.randomDate(90),
          })
        count++
      }
    }
    return count
  }

  // ── 17. Messages ─────────────────────────────────────────────
  private async seedMessages(
    trx: any,
    convData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0

    for (let i = 0; i < 50; i++) {
      const conv = convData[i % convData.length]!
      const isRecalled = Math.random() < 0.05

      await trx
        .insertQuery()
        .table('messages')
        .insert({
          id: this.uuid(),
          conversation_id: conv.id,
          sender_id: this.pick(userIds.slice(0, 15)),
          message: this.pick(this.MESSAGES),
          send_status: this.pick(['sent', 'sent', 'sent', 'sending', 'failed']),
          is_recalled: isRecalled,
          recalled_at: isRecalled ? this.randomDate(3) : null,
          recall_scope: isRecalled ? this.pick(['self', 'all']) : null,
          read_at: Math.random() > 0.3 ? this.randomDate(3) : null,
          created_at: this.randomDate(30),
          updated_at: this.randomDate(7),
        })
      count++
    }
    return count
  }

  // ── 18. Review Sessions ──────────────────────────────────────
  private async seedReviewSessions(
    trx: any,
    tassData: Array<{ id: string; assigneeId: string }>,
    userIds: string[]
  ): Promise<Array<{ id: string; taskAssignmentId: string; revieweeId: string }>> {
    const sessions: Array<{ id: string; taskAssignmentId: string; revieweeId: string }> = []
    const statuses = ['pending', 'in_progress', 'completed', 'disputed'] as const

    for (let i = 0; i < 10; i++) {
      const tass = tassData[i % tassData.length]!
      const id = this.uuid()
      const status = this.pick(statuses)
      sessions.push({ id, taskAssignmentId: tass.id, revieweeId: tass.assigneeId })

      await trx
        .insertQuery()
        .table('review_sessions')
        .insert({
          id,
          task_assignment_id: tass.id,
          reviewee_id: tass.assigneeId,
          status,
          manager_review_completed: status === 'completed',
          peer_reviews_count: status === 'completed' ? 2 : this.randomInt(0, 2),
          required_peer_reviews: 2,
          completed_at: status === 'completed' ? this.randomDate(14) : null,
          deadline: this.futureDate(30),
          confirmations: JSON.stringify(
            status === 'completed'
              ? [
                  {
                    user_id: tass.assigneeId,
                    action: 'confirmed',
                    dispute_reason: null,
                    created_at: this.randomDate(7),
                  },
                ]
              : status === 'disputed'
                ? [
                    {
                      user_id: tass.assigneeId,
                      action: 'disputed',
                      dispute_reason: 'Đánh giá không phản ánh đúng contribution thực tế.',
                      created_at: this.randomDate(7),
                    },
                  ]
                : []
          ),
          created_at: this.randomDate(60),
          updated_at: this.randomDate(7),
        })
    }
    return sessions
  }

  // ── 19. Skill Reviews ────────────────────────────────────────
  private async seedSkillReviews(
    trx: any,
    rsData: Array<{ id: string }>,
    skillIds: string[],
    userIds: string[]
  ): Promise<Array<{ id: string }>> {
    const reviews: Array<{ id: string }> = []
    const levels = [
      'beginner',
      'elementary',
      'junior',
      'middle',
      'senior',
      'lead',
      'principal',
    ] as const
    const comments = [
      'Khả năng tốt, cần improve thêm error handling.',
      'Rất xuất sắc, code clean và có test coverage cao.',
      'Cần mentoring thêm, nhưng tiến bộ nhanh.',
      'Performance optimization skills rất ấn tượng.',
      'Team player, luôn hỗ trợ đồng nghiệp.',
      'Cần chú ý hơn đến code review feedback.',
    ]

    for (let i = 0; i < 20; i++) {
      const rs = rsData[i % rsData.length]!
      const id = this.uuid()
      reviews.push({ id })

      await trx
        .insertQuery()
        .table('skill_reviews')
        .insert({
          id,
          review_session_id: rs.id,
          reviewer_id: this.pick(userIds.slice(0, 15)),
          reviewer_type: this.pick(['manager', 'peer', 'peer']),
          skill_id: this.pick(skillIds),
          assigned_level_code: this.pick(levels),
          comment: this.pick(comments),
          created_at: this.randomDate(30),
          updated_at: this.randomDate(7),
        })
    }
    return reviews
  }

  // ── 20. Reverse Reviews ──────────────────────────────────────
  private async seedReverseReviews(
    trx: any,
    rsData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const targetTypes = ['peer', 'manager', 'project', 'organization'] as const
    const comments = [
      'Manager rất supportive, luôn giúp unblock issues.',
      'Team lead cần improve communication skills.',
      'Dự án quản lý tốt, timeline hợp lý.',
      'Tổ chức có culture rất tốt, thân thiện.',
      'Peer review chất lượng cao, feedback constructive.',
    ]

    for (let i = 0; i < 10; i++) {
      const rs = rsData[i % rsData.length]!

      await trx
        .insertQuery()
        .table('reverse_reviews')
        .insert({
          id: this.uuid(),
          review_session_id: rs.id,
          reviewer_id: this.pick(userIds.slice(0, 15)),
          target_type: this.pick(targetTypes),
          target_id: this.pick(userIds),
          rating: this.randomInt(1, 5),
          comment: this.pick(comments),
          is_anonymous: Math.random() > 0.7,
          created_at: this.randomDate(30),
        })
      count++
    }
    return count
  }

  // ── 21. Flagged Reviews ──────────────────────────────────────
  private async seedFlaggedReviews(
    trx: any,
    srData: Array<{ id: string }>,
    userIds: string[]
  ): Promise<number> {
    let count = 0
    const flagTypes = [
      'sudden_spike',
      'mutual_high',
      'bulk_same_level',
      'frequency_anomaly',
      'new_account_high',
    ] as const
    const severities = ['low', 'medium', 'high', 'critical'] as const
    const statuses = ['pending', 'reviewed', 'dismissed', 'confirmed'] as const

    for (let i = 0; i < 5; i++) {
      const sr = srData[i % srData.length]!
      const status = this.pick(statuses)

      await trx
        .insertQuery()
        .table('flagged_reviews')
        .insert({
          id: this.uuid(),
          skill_review_id: sr.id,
          flag_type: this.pick(flagTypes),
          severity: this.pick(severities),
          detected_at: this.randomDate(14),
          status,
          reviewed_by: status !== 'pending' ? this.pick(userIds.slice(0, 3)) : null,
          reviewed_at: status !== 'pending' ? this.randomDate(7) : null,
          notes:
            status !== 'pending'
              ? `Review kết quả: ${this.pick(['False positive', 'Confirmed anomaly, warned user', 'Dismissed — legitimate activity'])}`
              : null,
          created_at: this.randomDate(14),
          updated_at: this.randomDate(7),
        })
      count++
    }
    return count
  }

  // ── 22. User Skills ──────────────────────────────────────────
  private async seedUserSkills(trx: any, userIds: string[], skillIds: string[]): Promise<number> {
    let count = 0
    const added = new Set<string>()
    const levels = [
      'beginner',
      'elementary',
      'junior',
      'middle',
      'senior',
      'lead',
      'principal',
      'master',
    ] as const

    for (let i = 0; i < 40; i++) {
      const userId = this.pick(userIds)
      const skillId = this.pick(skillIds)
      const key = `${userId}:${skillId}`
      if (added.has(key)) continue
      added.add(key)

      await trx
        .insertQuery()
        .table('user_skills')
        .insert({
          id: this.uuid(),
          user_id: userId,
          skill_id: skillId,
          level_code: this.pick(levels),
          total_reviews: this.randomInt(0, 20),
          avg_score: this.randomDecimal(1, 5),
          last_reviewed_at: Math.random() > 0.3 ? this.randomDate(60) : null,
          avg_percentage: this.randomDecimal(10, 100),
          last_calculated_at: this.randomDate(30),
          source: this.pick(['imported', 'reviewed']),
          created_at: this.randomDate(180),
          updated_at: this.randomDate(14),
        })
      count++
    }
    return count
  }

  // ── 23. Recruiter Bookmarks ──────────────────────────────────
  private async seedRecruiterBookmarks(trx: any, userIds: string[]): Promise<number> {
    let count = 0
    const added = new Set<string>()
    const folders = [
      'General',
      'Top Candidates',
      'Frontend',
      'Backend',
      'Fullstack',
      'Interview Pool',
    ]
    const notes = [
      'Ứng viên tiềm năng cho vị trí Senior Frontend',
      'Đã phỏng vấn round 1, ấn tượng tốt',
      'Cần follow-up sau khi project hiện tại kết thúc',
      'Referral từ team lead, nên ưu tiên',
      'Portfolio rất ấn tượng, open source contributor',
    ]

    for (let i = 0; i < 10; i++) {
      const recruiterId = userIds[i % 5]!
      const talentId = userIds[20 + (i % 10)]!
      const key = `${recruiterId}:${talentId}`
      if (added.has(key)) continue
      added.add(key)

      await trx
        .insertQuery()
        .table('recruiter_bookmarks')
        .insert({
          id: this.uuid(),
          recruiter_user_id: recruiterId,
          talent_user_id: talentId,
          notes: this.pick(notes),
          folder: this.pick(folders),
          rating: this.randomInt(1, 5),
          created_at: this.randomDate(60),
          updated_at: this.randomDate(14),
        })
      count++
    }
    return count
  }

  // ── 24. User Subscriptions ───────────────────────────────────
  private async seedUserSubscriptions(trx: any, userIds: string[]): Promise<number> {
    let count = 0

    for (let i = 0; i < 10; i++) {
      const userId = userIds[20 + (i % 10)]! // freelancers
      const plan = this.pick(['free', 'pro', 'enterprise'])
      const status = this.pick(['active', 'active', 'expired', 'cancelled'])

      await trx
        .insertQuery()
        .table('user_subscriptions')
        .insert({
          id: this.uuid(),
          user_id: userId,
          plan,
          status,
          started_at: this.randomDate(180),
          expires_at: status === 'expired' ? this.randomDate(30) : this.futureDate(365),
          auto_renew: Math.random() > 0.5,
          created_at: this.randomDate(180),
          updated_at: this.randomDate(14),
        })
      count++
    }
    return count
  }
}
