export const SEED_USER_WORK_HISTORY_ROWS = [
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/90',
        title: 'Hoàn thiện luồng chuyển organization theo role - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/35',
        title: 'Xuất profile proof và snapshot công khai - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/35',
        title: 'Chuẩn bị regression pack cho admin redirect - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/orgb-navigation-qa',
        title: 'Kiểm thử navigation sau khi quay lại từ admin mode - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/owner-profile-scoring-loop',
        title: 'Đồng bộ profile scoring sau khi review được xác nhận - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/owner-seed-governance',
        title: 'Điều phối seed data đa vai trò cho demo local - Pull Request',
      },
      {
        evidence_id: 'seed',
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
        evidence_id: 'seed',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar/demo/pull/orgc-marketplace-ranking',
        title: 'So sánh package Pro và ProMax trong ranking của marketplace - Pull Request',
      },
      {
        evidence_id: 'seed',
        evidence_type: 'demo_recording',
        url: 'https://demo.local/orgc-marketplace-ranking',
        title: 'So sánh package Pro và ProMax trong ranking của marketplace - Demo',
      },
    ],
  },
] as const
