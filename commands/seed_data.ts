    }
  }

  private async seedUserSkills(
    trx: TransactionClientContract,
    users: Record<UserKey, SeededUser>,
    skills: Record<string, string>
  ): Promise<void> {
    const rows: Array<{
      user: UserKey
      skill: string
      level: string
      totalReviews: number
      avgPercentage: number
      source: 'reviewed' | 'imported'
    }> = [
      {
        user: 'member',
        skill: 'typescript',
        level: 'senior',
        totalReviews: 4,
        avgPercentage: 91,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'postgresql',
        level: 'middle',
        totalReviews: 3,
        avgPercentage: 84,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'testing',
        level: 'middle',
        totalReviews: 3,
        avgPercentage: 82,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'communication',
        level: 'senior',
        totalReviews: 4,
        avgPercentage: 88,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'problem_solving',
        level: 'senior',
        totalReviews: 3,
        avgPercentage: 90,
        source: 'reviewed',
      },
      {
        user: 'member',
        skill: 'svelte',
        level: 'middle',
        totalReviews: 2,
        avgPercentage: 79,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'testing',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 88,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'communication',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 86,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'postgresql',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 86,
        source: 'reviewed',
      },
      {
        user: 'owner',
        skill: 'problem_solving',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 84,
        source: 'reviewed',
      },
      {
        user: 'orgAdmin',
        skill: 'testing',
        level: 'senior',
        totalReviews: 2,
        avgPercentage: 87,
        source: 'reviewed',
      },
      {
        user: 'orgAdmin',
        skill: 'leadership',
        level: 'lead',
        totalReviews: 2,
        avgPercentage: 85,
        source: 'reviewed',
      },
      {
        user: 'peerReviewer',
        skill: 'testing',
        level: 'senior',
        totalReviews: 1,
        avgPercentage: 83,
        source: 'reviewed',
      },
      {
        user: 'superadmin',
        skill: 'leadership',
        level: 'lead',
        totalReviews: 1,
        avgPercentage: 92,
        source: 'imported',
      },
      {
        user: 'superadmin',
        skill: 'communication',
        level: 'senior',
        totalReviews: 1,
        avgPercentage: 90,
        source: 'imported',
      },
    ]

    for (const row of rows) {
      const skillId = this.requireValue(skills[row.skill], `user-skill:${row.skill}`)
      const where = {
        user_id: users[row.user].id,
        skill_id: skillId,
      }
      const existing = await this.findRow(trx, 'user_skills', where)
      const payload = {
        level_code: row.level,
        total_reviews: row.totalReviews,
        avg_score: Math.min(5, Math.round((row.avgPercentage / 20) * 100) / 100),
        last_reviewed_at: row.source === 'reviewed' ? this.isoDaysAgo(1) : null,
        avg_percentage: row.avgPercentage,
        last_calculated_at: this.isoDaysAgo(1),
        source: row.source,
        created_at: this.isoDaysAgo(40),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('user_skills'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('user_skills')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedUserSubscriptions(
    trx: TransactionClientContract,
    users: Record<UserKey, SeededUser>
  ): Promise<void> {
    const rows = [
      {
        user: 'owner' as UserKey,
        plan: 'pro',
        status: 'active',
        startedAt: this.isoDaysAgo(25),
        expiresAt: this.isoDaysAhead(30),
        autoRenew: true,
      },
      {
        user: 'member' as UserKey,
        plan: 'pro',
        status: 'active',
        startedAt: this.isoDaysAgo(18),
        expiresAt: this.isoDaysAhead(30),
        autoRenew: true,
      },
      {
        user: 'freelancerOne' as UserKey,
        plan: 'enterprise',
        status: 'active',
        startedAt: this.isoDaysAgo(7),
        expiresAt: this.isoDaysAhead(358),
        autoRenew: false,
      },
      {
        user: 'freelancerTwo' as UserKey,
        plan: 'pro',
        status: 'cancelled',
        startedAt: this.isoDaysAgo(60),
        expiresAt: this.isoDaysAhead(5),
        autoRenew: false,
      },
    ] as const

    for (const row of rows) {
      const where = { user_id: users[row.user].id }
      const existing = await this.findRow(trx, 'user_subscriptions', where)
      const payload = {
        plan: row.plan,
        status: row.status,
        started_at: row.startedAt,
        expires_at: row.expiresAt,
        auto_renew: row.autoRenew,
        created_at: this.isoDaysAgo(20),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('user_subscriptions'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('user_subscriptions')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async seedProjectAttachments(
    trx: TransactionClientContract,
    users: Record<UserKey, SeededUser>,
    projects: Record<ProjectKey, SeededProject>
  ): Promise<void> {
    const rows = [
      {
        project: 'orgAPlatform' as ProjectKey,
        file_name: 'org-context-role-matrix.pdf',
        mime_type: 'application/pdf',
      },
      {
        project: 'orgAOperations' as ProjectKey,
        file_name: 'admin-redirect-regression.md',
        mime_type: 'text/markdown',
      },
    ]

    for (const row of rows) {
      const where = {
        project_id: projects[row.project].id,
        file_name: row.file_name,
      }
      const existing = await this.findRow(trx, 'project_attachments', where)
      const payload = {
        file_path: `/uploads/projects/${projects[row.project].id}/${row.file_name}`,
        file_size: 4096,
        mime_type: row.mime_type,
        uploaded_by: users.owner.id,
        created_at: this.isoDaysAgo(5),
        updated_at: this.isoDaysAgo(1),
      }

      if (existing) {
        await this.applyWhere(trx.from('project_attachments'), where).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('project_attachments')
          .insert({ id: this.uuid(), ...where, ...payload })
      }
    }
  }

  private async updateCurrentOrganizations(
    trx: TransactionClientContract,
    users: Record<UserKey, SeededUser>,
    organizations: Record<OrgKey, SeededOrg>
  ): Promise<void> {
    const updates: Array<[UserKey, string | null]> = [
      ['owner', organizations.orgA.id],
      ['member', organizations.orgA.id],
      ['orgAdmin', organizations.orgA.id],
      ['peerReviewer', organizations.orgA.id],
      ['orgBOwner', organizations.orgB.id],
      ['superadmin', null],
      ['freelancerOne', null],
      ['freelancerTwo', organizations.orgE.id],
    ]

    for (const [userKey, currentOrgId] of updates) {
      await trx
        .from('users')
        .where('id', users[userKey].id)
        .update({
          current_organization_id: currentOrgId,
          updated_at: this.isoDaysAgo(1),
        })
    }
  }

  private async seedProfileAggregates(context: SeedContext): Promise<SeedContext> {
    await this.resetProfileAggregateScope([context.users.member.id, context.users.owner.id])
    await this.seedUserWorkHistory(context)
    await this.seedUserPerformanceStats(context)
    await this.seedUserDomainExpertise(context)

    await this.createProfileSnapshot(context.users.member.id, 'duyetlaaithe draft snapshot', false)
    context.snapshots.member = await this.createProfileSnapshot(
      context.users.member.id,
      'duyetlaaithe profile proof',
      true
    )
    context.snapshots.owner = await this.createProfileSnapshot(
      context.users.owner.id,
      'organization-owner profile snapshot',
      true
    )

    return context
  }

  private async resetProfileAggregateScope(userIds: string[]): Promise<void> {
    for (const table of [
      'user_profile_snapshots',
      'user_work_history',
      'user_domain_expertise',
      'user_performance_stats',
    ]) {
      await db.from(table).whereIn('user_id', userIds).delete()
    }
  }

  private async seedUserWorkHistory(context: SeedContext): Promise<void> {
    const rows = [
      {
        user: 'member',
        taskKey: 'member-org-switch',
        overallQualityScore: 5,
        daysEarlyOrLate: 2,
        skillScores: [
          {
            skillCode: 'typescript',
            skillName: 'TypeScript',
            reviewerType: 'manager',
            assignedLevelCode: 'senior',
            comment: 'Xử lý state và typing tốt, không để lọt case role mismatch.',
          },
          {
            skillCode: 'communication',
            skillName: 'Communication',
            reviewerType: 'peer',
            assignedLevelCode: 'middle',
            comment: 'Trao đổi rõ các case edge và báo tiến độ đều.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Nắm rất nhanh logic quyền theo organization và chủ động đề xuất checklist test.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Có thể bổ sung thêm automation coverage cho đường dẫn redirect.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/90',
            title: 'Hoàn thiện luồng chuyển organization theo role - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-org-switch',
            title: 'Hoàn thiện luồng chuyển organization theo role - Demo',
          },
        ],
      },
      {
        user: 'member',
        taskKey: 'member-profile-proof',
        overallQualityScore: 5,
        daysEarlyOrLate: 2,
        skillScores: [
          {
            skillCode: 'postgresql',
            skillName: 'PostgreSQL',
            reviewerType: 'manager',
            assignedLevelCode: 'middle',
            comment: 'Dựng dữ liệu profile aggregate chắc tay, nắm rõ bảng review và snapshot.',
          },
          {
            skillCode: 'problem_solving',
            skillName: 'Problem Solving',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Biết lần theo dependency dữ liệu khi UI hiển thị tĩnh.',
          },
          {
            skillCode: 'testing',
            skillName: 'Testing & QA',
            reviewerType: 'peer',
            assignedLevelCode: 'middle',
            comment: 'Có checklist verify profile proof và share link.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Kết nối tốt dữ liệu từ review sang profile snapshot và tổng hợp đúng các proof cần hiển thị.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Cần tinh gọn thêm luồng invalidate cache profile.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/35',
            title: 'Xuất profile proof và snapshot công khai - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-profile-proof',
            title: 'Xuất profile proof và snapshot công khai - Demo',
          },
        ],
      },
      {
        user: 'member',
        taskKey: 'member-admin-regression',
        overallQualityScore: 4,
        daysEarlyOrLate: 1,
        skillScores: [
          {
            skillCode: 'testing',
            skillName: 'Testing & QA',
            reviewerType: 'manager',
            assignedLevelCode: 'middle',
            comment: 'Checklist hợp lý và bám sát bug report.',
          },
          {
            skillCode: 'communication',
            skillName: 'Communication',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Tài liệu rõ và có giải thích được tình huống back button.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content: 'Tài liệu kiểm thử rõ ràng, dễ dùng cho admin redirect regression.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Nên thêm một case cho current_organization_id null.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/35',
            title: 'Chuẩn bị regression pack cho admin redirect - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/member-admin-regression',
            title: 'Chuẩn bị regression pack cho admin redirect - Demo',
          },
        ],
      },
      {
        user: 'owner',
        taskKey: 'orgb-navigation-qa',
        overallQualityScore: 4,
        daysEarlyOrLate: 0,
        wasOnTime: true,
        skillScores: [
          {
            skillCode: 'testing',
            skillName: 'Testing & QA',
            reviewerType: 'manager',
            assignedLevelCode: 'senior',
            comment:
              'Giữ được browser history và current organization ổn định sau khi chuyển admin mode.',
          },
          {
            skillCode: 'communication',
            skillName: 'Communication',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Mô tả rõ được các case context owner/member ở org B cho team cùng verify.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Giữ được browser history và current organization ổn định trong case member-only của org B.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Cần thêm automation cho browser back/forward để khóa regression navigation.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/orgb-navigation-qa',
            title: 'Kiểm thử navigation sau khi quay lại từ admin mode - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/orgb-navigation-qa',
            title: 'Kiểm thử navigation sau khi quay lại từ admin mode - Demo',
          },
        ],
      },
      {
        user: 'owner',
        taskKey: 'owner-profile-scoring-loop',
        overallQualityScore: 5,
        daysEarlyOrLate: 1,
        wasOnTime: true,
        skillScores: [
          {
            skillCode: 'postgresql',
            skillName: 'PostgreSQL',
            reviewerType: 'manager',
            assignedLevelCode: 'senior',
            comment: 'Thiết kế truy vấn aggregate ổn định và giữ đúng transaction boundary.',
          },
          {
            skillCode: 'problem_solving',
            skillName: 'Problem Solving',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment: 'Bóc tách nguyên nhân chậm score refresh rõ ràng và có hướng xử lý cụ thể.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Đóng vòng đầy đủ review-confirmed -> aggregate refresh -> snapshot update cho owner profile.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Cần thêm monitor cho cache miss spikes khi traffic tăng.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/owner-profile-scoring-loop',
            title: 'Đồng bộ profile scoring sau khi review được xác nhận - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/owner-profile-scoring-loop',
            title: 'Đồng bộ profile scoring sau khi review được xác nhận - Demo',
          },
        ],
      },
      {
        user: 'owner',
        taskKey: 'owner-seed-governance',
        overallQualityScore: 4,
        daysEarlyOrLate: 0,
        wasOnTime: true,
        skillScores: [
          {
            skillCode: 'leadership',
            skillName: 'Leadership',
            reviewerType: 'manager',
            assignedLevelCode: 'lead',
            comment: 'Điều phối tốt phạm vi seed dữ liệu nhiều role và nhiều organization.',
          },
          {
            skillCode: 'code_review',
            skillName: 'Code Review',
            reviewerType: 'peer',
            assignedLevelCode: 'middle',
            comment: 'Checklist review seed command rõ ràng và dễ verify lại trên UI.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Điều phối được seed data đa vai trò đủ cho owner, member và superadmin cùng dùng.',
          },
          {
            type: 'retrospective_improvement',
            content: 'Cần thêm automation cho reset/sync datastore để full verify ổn định hơn.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/owner-seed-governance',
            title: 'Điều phối seed data đa vai trò cho demo local - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/owner-seed-governance',
            title: 'Điều phối seed data đa vai trò cho demo local - Demo',
          },
        ],
      },
      {
        user: 'owner',
        taskKey: 'orgc-marketplace-ranking',
        overallQualityScore: 4,
        daysEarlyOrLate: -1,
        wasOnTime: false,
        skillScores: [
          {
            skillCode: 'postgresql',
            skillName: 'PostgreSQL',
            reviewerType: 'manager',
            assignedLevelCode: 'senior',
            comment:
              'Điều phối tốt dữ liệu package analytics và giữ được logic so sánh adoption theo gói.',
          },
          {
            skillCode: 'problem_solving',
            skillName: 'Problem Solving',
            reviewerType: 'peer',
            assignedLevelCode: 'senior',
            comment:
              'Xử lý tốt bài toán package ranking dù phiên review đi vào trạng thái disputed.',
          },
        ],
        knowledgeArtifacts: [
          {
            type: 'retrospective_success',
            content:
              'Mở rộng được dataset package adoption và ranking cho admin dashboard đa organization.',
          },
          {
            type: 'retrospective_improvement',
            content:
              'Cần chốt rubric review cho package analytics sớm hơn để tránh dispute ở vòng xác nhận.',
          },
        ],
        evidenceLinks: [
          {
            evidence_id: this.uuid(),
            evidence_type: 'pull_request',
            url: 'https://github.com/suar/demo/pull/orgc-marketplace-ranking',
            title: 'So sánh package Pro và ProMax trong ranking của marketplace - Pull Request',
          },
          {
            evidence_id: this.uuid(),
            evidence_type: 'demo_recording',
            url: 'https://demo.local/orgc-marketplace-ranking',
            title: 'So sánh package Pro và ProMax trong ranking của marketplace - Demo',
          },
        ],
      },
    ] as const

    for (const row of rows) {
      const spec = this.getTaskSpec(row.taskKey)
      const task = this.requireValue(context.tasks[row.taskKey], `work-history-task:${row.taskKey}`)
      const assignment = this.requireValue(
        context.assignments[row.taskKey],
        `work-history-assignment:${row.taskKey}`
      )

      await db
        .insertQuery()
        .table('user_work_history')
        .insert({
          id: this.uuid(),
          user_id: context.users[row.user].id,
          task_id: task.id,
          task_assignment_id: assignment.id,
          organization_id: task.organizationId,
          project_id: task.projectId,
          task_title: task.title,
          task_type: spec.taskType,
          business_domain: spec.businessDomain,
          problem_category: spec.problemCategory,
          role_in_task: spec.roleInTask,
          autonomy_level: spec.autonomyLevel,
          collaboration_type: spec.collaborationType,
          tech_stack: this.toJson(spec.techStack),
          domain_tags: this.toJson(spec.domainTags),
          difficulty: spec.difficulty,
          estimated_hours: spec.assignmentEstimatedHours ?? null,
          actual_hours: spec.assignmentActualHours ?? null,
          was_on_time: 'wasOnTime' in row ? row.wasOnTime : false,
          days_early_or_late: row.daysEarlyOrLate,
          measurable_outcomes: this.toJson(spec.measurableOutcomes),
          estimated_business_value: spec.impactScope,
          knowledge_artifacts: this.toJson(row.knowledgeArtifacts),
          overall_quality_score: row.overallQualityScore,
          skill_scores: this.toJson(
            row.skillScores.map((skill) => ({
              skill_id: this.requireValue(
                context.skills[skill.skillCode],
                `skill:${skill.skillCode}`
              ),
              skill_name: skill.skillName,
              reviewer_type: skill.reviewerType,
              assigned_level_code: skill.assignedLevelCode,
              comment: skill.comment,
            }))
          ),
          evidence_links: this.toJson(row.evidenceLinks),
          is_featured: false,
          is_public: false,
          completed_at: this.isoDaysAgo(spec.assignmentCompletedDaysAgo ?? 0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async seedUserPerformanceStats(context: SeedContext): Promise<void> {
    const rows = [
      {
        userId: context.users.owner.id,
        totalTasksCompleted: 3,
        totalHoursWorked: 35,
        avgQualityScore: 4,
        onTimeDeliveryRate: 66.67,
        avgDaysEarlyOrLate: -0.33,
        tasksByType: { feature_development: 2, qa_testing: 1 },
        tasksByDifficulty: { medium: 2, hard: 1 },
        tasksByDomain: { edtech: 1, internal_tooling: 1, saas: 1 },
        tasksAsLead: 1,
        tasksAsSoleContributor: 0,
        tasksMentoringOthers: 0,
        longestOnTimeStreak: 2,
        currentOnTimeStreak: 0,
        selfAssessmentAccuracy: 86.33,
        performanceScore: 86.5,
      },
      {
        userId: context.users.member.id,
        totalTasksCompleted: 3,
        totalHoursWorked: 49,
        avgQualityScore: 4.67,
        onTimeDeliveryRate: 0,
        avgDaysEarlyOrLate: 1.67,
        tasksByType: { technical_writing: 1, feature_development: 2 },
        tasksByDifficulty: { hard: 1, medium: 2 },
        tasksByDomain: { saas: 2, internal_tooling: 1 },
        tasksAsLead: 0,
        tasksAsSoleContributor: 0,
        tasksMentoringOthers: 0,
        longestOnTimeStreak: 0,
        currentOnTimeStreak: 0,
        selfAssessmentAccuracy: 91.67,
        performanceScore: 81.75,
      },
    ] as const

    for (const row of rows) {
      await db
        .insertQuery()
        .table('user_performance_stats')
        .insert({
          id: this.uuid(),
          user_id: row.userId,
          period_start: null,
          period_end: null,
          total_tasks_completed: row.totalTasksCompleted,
          total_hours_worked: row.totalHoursWorked,
          avg_quality_score: row.avgQualityScore,
          on_time_delivery_rate: row.onTimeDeliveryRate,
          avg_days_early_or_late: row.avgDaysEarlyOrLate,
          performance_score: row.performanceScore,
          tasks_by_type: this.toJson(row.tasksByType),
          tasks_by_difficulty: this.toJson(row.tasksByDifficulty),
          tasks_by_domain: this.toJson(row.tasksByDomain),
          tasks_as_lead: row.tasksAsLead,
          tasks_as_sole_contributor: row.tasksAsSoleContributor,
          tasks_mentoring_others: row.tasksMentoringOthers,
          longest_on_time_streak: row.longestOnTimeStreak,
          current_on_time_streak: row.currentOnTimeStreak,
          self_assessment_accuracy: row.selfAssessmentAccuracy,
          calculated_at: this.isoDaysAgo(0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async seedUserDomainExpertise(context: SeedContext): Promise<void> {
    const rows = [
      {
        userId: context.users.owner.id,
        techStackFrequency: {
          AdonisJS: 1,
          Browser: 1,
          MongoDB: 1,
          PostgreSQL: 2,
          Svelte: 2,
          TypeScript: 1,
        },
        domainFrequency: {
          edtech: 1,
          internal_tooling: 1,
          saas: 1,
          navigation: 1,
          marketplace: 1,
          subscription: 1,
          admin: 1,
          seed: 1,
          session: 1,
        },
        problemCategoryFrequency: {
          automation: 1,
          maintainability: 1,
          new_capability: 1,
        },
        topSkills: [
          { skill_name: 'Leadership', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'Code Review', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'Testing & QA', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'Communication', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'PostgreSQL', weighted_score: 1, review_mentions: 1 },
        ],
      },
      {
        userId: context.users.member.id,
        techStackFrequency: {
          Svelte: 3,
          MongoDB: 1,
          AdonisJS: 1,
          PostgreSQL: 2,
          Documentation: 1,
        },
        domainFrequency: {
          qa: 1,
          rbac: 1,
          saas: 2,
          admin: 1,
          proof: 1,
          review: 1,
          profile: 1,
          redirect: 1,
          navigation: 1,
          organization: 1,
          internal_tooling: 1,
        },
        problemCategoryFrequency: {
          new_capability: 2,
          maintainability: 1,
        },
        topSkills: [
          { skill_name: 'Testing & QA', weighted_score: 1, review_mentions: 2 },
          { skill_name: 'Communication', weighted_score: 1, review_mentions: 2 },
          { skill_name: 'TypeScript', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'PostgreSQL', weighted_score: 1, review_mentions: 1 },
          { skill_name: 'Problem Solving', weighted_score: 1, review_mentions: 1 },
        ],
      },
    ] as const

    for (const row of rows) {
      await db
        .insertQuery()
        .table('user_domain_expertise')
        .insert({
          id: this.uuid(),
          user_id: row.userId,
          tech_stack_frequency: this.toJson(row.techStackFrequency),
          domain_frequency: this.toJson(row.domainFrequency),
          problem_category_frequency: this.toJson(row.problemCategoryFrequency),
          top_skills: this.toJson(row.topSkills),
          calculated_at: this.isoDaysAgo(0),
          created_at: this.isoDaysAgo(0),
          updated_at: this.isoDaysAgo(0),
        })
    }
  }

  private async createProfileSnapshot(
    userId: string,
    snapshotName: string,
    isPublic: boolean
  ): Promise<string> {
    const user = (await db.from('users').where('id', userId).first()) as {
      username?: unknown
      trust_data?: unknown
    } | null
    if (!user) {
      throw new Error(`User ${userId} not found for snapshot seed`)
    }

    const lastSnapshot = (await db
      .from('user_profile_snapshots')
      .where('user_id', userId)
      .orderBy('version', 'desc')
      .first()) as { version?: string | number } | null

    const nextVersion = Number(lastSnapshot?.version ?? 0) + 1
    const username = this.readNonEmptyString(user.username, userId)
    const slugBase = username.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const versionLabel = String(nextVersion)
    const shareableSlug = isPublic ? `${slugBase}-v${versionLabel}` : null
    const shareableToken = isPublic ? `${slugBase.replace(/-/g, '')}${versionLabel}` : null

    const skills = (await db
      .from('user_skills as us')
      .join('skills as s', 's.id', 'us.skill_id')
      .where('us.user_id', userId)
      .orderBy('us.total_reviews', 'desc')
      .select(
        'us.skill_id',
        's.skill_name',
        'us.level_code',
        'us.total_reviews',
        'us.avg_percentage',
        'us.avg_score',
        'us.last_reviewed_at'
      )) as Array<{
      skill_id: string
      skill_name: string
      level_code: string
      total_reviews: string | number | null
      avg_percentage: string | number | null
      avg_score: string | number | null
      last_reviewed_at: string | null
    }>

    const performance = (await db
      .from('user_performance_stats')
      .where('user_id', userId)
      .whereNull('period_start')
      .whereNull('period_end')
      .orderBy('calculated_at', 'desc')
      .first()) as {
      total_tasks_completed?: string | number | null
      total_hours_worked?: string | number | null
      avg_quality_score?: string | number | null
      on_time_delivery_rate?: string | number | null
      performance_score?: string | number | null
      tasks_by_type?: Record<string, unknown>
      tasks_by_domain?: Record<string, unknown>
      tasks_by_difficulty?: Record<string, unknown>
    } | null

    const domainExpertise = (await db
      .from('user_domain_expertise')
      .where('user_id', userId)
      .first()) as {
      tech_stack_frequency?: Record<string, unknown>
      domain_frequency?: Record<string, unknown>
      problem_category_frequency?: Record<string, unknown>
      top_skills?: Array<Record<string, unknown>>
    } | null

    const highlights = (await db
      .from('user_work_history')
      .where('user_id', userId)
      .orderBy('completed_at', 'desc')
      .limit(6)) as Array<Record<string, unknown>>

    await db
      .from('user_profile_snapshots')
      .where('user_id', userId)
      .where('is_current', true)
      .update({ is_current: false, updated_at: this.isoDaysAgo(0) })

    const trustData =
      typeof user.trust_data === 'string'
        ? this.parseJsonRecord(user.trust_data)
        : this.toRecord(user.trust_data)

    const verifiedSkills = skills
      .filter((skill) => Number(skill.total_reviews ?? 0) > 0)
      .map((skill) => ({
        skill_id: skill.skill_id,
        skill_name: skill.skill_name,
        level_code: skill.level_code,
        total_reviews: Number(skill.total_reviews ?? 0),
        avg_percentage: Number(skill.avg_percentage ?? 0),
        avg_score: Number(skill.avg_score ?? 0),
        last_reviewed_at: skill.last_reviewed_at,
      }))

    const summary = {
      user_id: userId,
      username,
      total_verified_skills: verifiedSkills.length,
      total_tasks_completed: Number(performance?.total_tasks_completed ?? highlights.length),
      trust_score: Number(trustData.calculated_score ?? 0),
      trust_tier: trustData.current_tier_code ?? null,
      generated_at: new Date().toISOString(),
    }

    const performanceMetrics = {
      total_tasks_completed: Number(performance?.total_tasks_completed ?? 0),
      total_hours_worked: Number(performance?.total_hours_worked ?? 0),
      avg_quality_score:
        performance?.avg_quality_score !== null && performance?.avg_quality_score !== undefined
          ? Number(performance.avg_quality_score)
          : null,
      on_time_delivery_rate:
        performance?.on_time_delivery_rate !== null &&
        performance?.on_time_delivery_rate !== undefined
          ? Number(performance.on_time_delivery_rate)
          : null,
      performance_score:
        performance?.performance_score !== null && performance?.performance_score !== undefined
          ? Number(performance.performance_score)
          : null,
      tasks_by_type: performance?.tasks_by_type ?? {},
      tasks_by_domain: performance?.tasks_by_domain ?? {},
      tasks_by_difficulty: performance?.tasks_by_difficulty ?? {},
    }

    const trustMetrics = {
      trust_data: trustData,
      domain_expertise: {
        tech_stack_frequency: domainExpertise?.tech_stack_frequency ?? {},
        domain_frequency: domainExpertise?.domain_frequency ?? {},
        problem_category_frequency: domainExpertise?.problem_category_frequency ?? {},
        top_skills: domainExpertise?.top_skills ?? [],
      },
    }

    const snapshotId = this.uuid()
    await db
      .insertQuery()
      .table('user_profile_snapshots')
      .insert({
        id: snapshotId,
        user_id: userId,
        version: nextVersion,
        snapshot_name: snapshotName,
        is_current: true,
        is_public: isPublic,
        shareable_slug: shareableSlug,
        shareable_token: shareableToken,
        summary: this.toJson(summary),
        skills_verified: this.toJson(verifiedSkills),
        work_highlights: this.toJson(highlights),
        performance_metrics: this.toJson(performanceMetrics),
        trust_metrics: this.toJson(trustMetrics),
        scoring_version: 'seed-v1',
        created_at: this.isoDaysAgo(0),
        updated_at: this.isoDaysAgo(0),
      })

    return snapshotId
  }

  private async seedMongo(context: SeedContext): Promise<void> {
    if (!env.get('MONGODB_URL', '')) {
      return
    }

    const userIds = Object.values(context.users).map((user) => user.id)
    const entityIds = [
      ...Object.values(context.organizations).map((org) => org.id),
      ...Object.values(context.projects).map((project) => project.id),
      ...Object.values(context.tasks).map((task) => task.id),
      ...Object.values(context.snapshots),
    ]

    if (!this.fresh) {
      await Promise.all([
        MongoNotification.deleteMany({ user_id: { $in: userIds } }),
        MongoUserActivityLog.deleteMany({ user_id: { $in: userIds } }),
        MongoAuditLogModel.deleteMany({
          $or: [{ user_id: { $in: userIds } }, { entity_id: { $in: entityIds } }],
        }),
      ])
    }

    const marketplaceTask = this.requireValue(
      context.tasks['marketplace-content-pass'],
      'mongo-task:marketplace-content-pass'
    )

    await MongoNotification.insertMany([
      {
        user_id: context.users.owner.id,
        title: 'Đã có ứng viên mới cho task marketplace',
        message: 'MaiFreelancer vừa apply vào task public của organization A.',
        type: 'task_application_submitted',
        related_entity_type: 'task',
        related_entity_id: marketplaceTask.id,
        metadata: { applicant: context.users.freelancerOne.username },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        title: 'Đã chuyển context mặc định về organization owner',
        message:
          'Tài khoản của bạn sẽ vào Suar Workspace Lab trước để test giao diện owner rõ hơn.',
        type: 'organization_context_updated',
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgA.id,
        metadata: { role: 'org_owner' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.owner.id,
        title: 'Org B đã giao thêm task cho bạn',
        message: 'Bạn hiện có dữ liệu task khi chuyển sang org B với vai trò member.',
        type: 'task_assigned',
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgB.id,
        metadata: { role: 'org_member' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.member.id,
        title: 'Snapshot hồ sơ đã được publish',
        message: 'Profile proof mới nhất của bạn đã có share link và lịch sử snapshot.',
        type: 'profile_snapshot_published',
        related_entity_type: 'user_profile_snapshot',
        related_entity_id: context.snapshots.member,
        metadata: { visibility: 'public' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        title: 'Bạn có task đang review',
        message:
          'Luồng profile động đang có một task ở trạng thái in_review để test widget realtime.',
        type: 'task_review_pending',
        related_entity_type: 'task',
        related_entity_id: this.requireValue(
          context.tasks['member-profile-live'],
          'mongo-task:member-profile-live'
        ).id,
        metadata: { project: context.projects.orgAPlatform.name },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.superadmin.id,
        title: 'Có review bị flag cần kiểm tra',
        message: 'Trang admin hiện có 1 flagged review ở trạng thái pending.',
        type: 'flagged_review_pending',
        related_entity_type: 'flagged_review',
        related_entity_id: null,
        metadata: { source: 'seed:data' },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(1)),
        updated_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        title: 'Package usage đã được cập nhật',
        message: 'Dashboard có dữ liệu gói Pro và ProMax để kiểm tra admin package management.',
        type: 'subscription_metrics_ready',
        related_entity_type: 'user_subscription',
        related_entity_id: null,
        metadata: { packages: ['pro', 'promax'] },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
      {
        user_id: context.users.orgAdmin.id,
        title: 'Design system role states cần review',
        message:
          'Có task mới trong Workspace Design System để kiểm tra owner/member visual states.',
        type: 'task_assigned',
        related_entity_type: 'project',
        related_entity_id: context.projects.orgADesignSystem.id,
        metadata: {
          task: this.requireValue(
            context.tasks['orga-design-refresh'],
            'mongo-task:orga-design-refresh'
          ).id,
        },
        is_read: false,
        created_at: new Date(this.isoDaysAgo(0)),
        updated_at: new Date(this.isoDaysAgo(0)),
      },
    ])

    await MongoAuditLogModel.insertMany([
      {
        user_id: context.users.owner.id,
        action: 'seed_org_owner_workspace',
        entity_type: 'organization',
        entity_id: context.organizations.orgA.id,
        old_values: null,
        new_values: {
          current_org: context.organizations.orgA.slug,
          secondary_membership: context.organizations.orgB.slug,
        },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        action: 'seed_admin_dashboard',
        entity_type: 'user',
        entity_id: context.users.superadmin.id,
        old_values: { system_role: 'registered_user' },
        new_values: { system_role: 'superadmin', redirect_target: '/admin' },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        action: 'publish_profile_snapshot',
        entity_type: 'user_profile_snapshot',
        entity_id: context.snapshots.member,
        old_values: null,
        new_values: { is_public: true, user_id: context.users.member.id },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        action: 'create_project',
        entity_type: 'project',
        entity_id: context.projects.orgAPlatform.id,
        old_values: null,
        new_values: { organization_id: context.organizations.orgA.id },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(5)),
      },
      {
        user_id: context.users.superadmin.id,
        action: 'seed_package_catalog',
        entity_type: 'user_subscription',
        entity_id: null,
        old_values: null,
        new_values: { packages: ['pro', 'promax'], active_subscriptions: 3 },
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(0)),
      },
    ])

    await MongoUserActivityLog.insertMany([
      {
        user_id: context.users.owner.id,
        action_type: 'switch_organization',
        action_data: {
          from: context.organizations.orgA.slug,
          to: context.organizations.orgB.slug,
          expected_role: 'org_member',
        },
        related_entity_type: 'organization',
        related_entity_id: context.organizations.orgB.id,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.member.id,
        action_type: 'profile_snapshot_published',
        action_data: {
          snapshot_id: context.snapshots.member,
          total_completed_assignments: 3,
        },
        related_entity_type: 'user_profile_snapshot',
        related_entity_id: context.snapshots.member,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.superadmin.id,
        action_type: 'admin_login',
        action_data: {
          redirect_to: '/admin',
          current_organization_id: null,
        },
        related_entity_type: 'user',
        related_entity_id: context.users.superadmin.id,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(1)),
      },
      {
        user_id: context.users.owner.id,
        action_type: 'package_metrics_viewed',
        action_data: {
          packages: ['pro', 'promax'],
          active_orgs: Object.keys(context.organizations).length,
        },
        related_entity_type: 'user_subscription',
        related_entity_id: null,
        ip_address: '127.0.0.1',
        user_agent: 'seed:data',
        created_at: new Date(this.isoDaysAgo(0)),
      },
    ])
  }

  private async logSummary(context: SeedContext): Promise<void> {
    const count = async (table: string) => {
      const row = (await db.from(table).count('* as total').first()) as {
        total?: string | number
      } | null
      return Number(row?.total ?? 0)
    }

    const [
      userCount,
      orgCount,
      projectCount,
      taskCount,
      reviewCount,
      subscriptionCount,
      notificationCount,
      auditLogCount,
      userActivityCount,
    ] = await Promise.all([
      count('users'),
      count('organizations'),
      count('projects'),
      count('tasks'),
      count('review_sessions'),
      count('user_subscriptions'),
      env.get('MONGODB_URL', '') ? MongoNotification.countDocuments({}) : Promise.resolve(0),
      env.get('MONGODB_URL', '') ? MongoAuditLogModel.countDocuments({}) : Promise.resolve(0),
      env.get('MONGODB_URL', '') ? MongoUserActivityLog.countDocuments({}) : Promise.resolve(0),
    ])

    this.logger.info(
      `Users=${userCount}, organizations=${orgCount}, projects=${projectCount}, tasks=${taskCount}, review_sessions=${reviewCount}, user_subscriptions=${subscriptionCount}, mongo_notifications=${notificationCount}, mongo_audit_logs=${auditLogCount}, mongo_user_activity_logs=${userActivityCount}`
    )

    const taskCountRows = (await db
      .from('tasks as t')
      .join('organizations as o', 'o.id', 't.organization_id')
      .select('o.slug')
      .count('* as total')
      .groupBy('o.slug')
      .orderBy('o.slug')) as Array<{ slug: string; total: string | number }>

    this.logger.info(
      `Task counts by org: ${taskCountRows.map((row) => `${row.slug}=${Number(row.total)}`).join(', ')}`
    )

    const projectTaskCountRows = (await db
      .from('tasks as t')
      .join('projects as p', 'p.id', 't.project_id')
      .join('organizations as o', 'o.id', 'p.organization_id')
      .select('o.slug', 'p.name')
      .count('* as total')
      .groupBy('o.slug', 'p.name')
      .orderBy('o.slug')
      .orderBy('p.name')) as Array<{ slug: string; name: string; total: string | number }>

    this.logger.info(
      `Task counts by project: ${projectTaskCountRows.map((row) => `${row.slug}/${row.name}=${Number(row.total)}`).join(', ')}`
    )
    this.logger.info(
      `Owner account: ${context.users.owner.email} | Superadmin: ${context.users.superadmin.username} | Member account: ${context.users.member.username}`
    )
  }
}
