import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

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
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Xử lý state và typing tốt, không để lọt case role mismatch.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Trao đổi rõ các case edge và báo tiến độ đều.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Nắm nhanh mô hình phân quyền đa tổ chức và chủ động đề xuất ma trận kiểm định.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Có thể bổ sung giám sát tự động cho các nhánh điều hướng quan trọng.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-org-switch',
        title: 'Phân quyền theo không gian làm việc đa tổ chức - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-org-switch/walkthrough',
        title: 'Phân quyền theo không gian làm việc đa tổ chức - Video nghiệm thu',
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
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Dựng dữ liệu profile aggregate chắc tay, nắm rõ bảng review và snapshot.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Biết lần theo dependency dữ liệu khi UI hiển thị tĩnh.',
      },
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Có ma trận nghiệm thu đầy đủ cho hồ sơ năng lực và liên kết chia sẻ.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Kết nối tốt dữ liệu đánh giá với hồ sơ năng lực và tổng hợp đúng các chứng cứ cần công bố.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần tinh gọn thêm luồng invalidate cache profile.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-profile-proof',
        title: 'Xuất bản hồ sơ năng lực có chứng cứ - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-profile-proof/walkthrough',
        title: 'Xuất bản hồ sơ năng lực có chứng cứ - Video nghiệm thu',
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
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Checklist hợp lý và bám sát bug report.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Tài liệu rõ và có giải thích được tình huống back button.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content: 'Tài liệu nghiệm thu rõ ràng, dễ sử dụng cho các thay đổi điều hướng quản trị.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Nên bổ sung tình huống người dùng chưa chọn tổ chức mặc định.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/member-admin-regression',
        title: 'Kiểm định điều hướng theo vai trò quản trị - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/member-admin-regression/walkthrough',
        title: 'Kiểm định điều hướng theo vai trò quản trị - Video nghiệm thu',
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
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Giữ được lịch sử điều hướng và tổ chức hiện tại ổn định sau khi chuyển vai trò.',
      },
      {
        skillCode: 'communication',
        skillName: 'Communication',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Mô tả rõ các tình huống chủ sở hữu và thành viên để đội ngũ cùng đối soát.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Giữ được lịch sử điều hướng và tổ chức hiện tại ổn định trong vai trò thành viên.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm giám sát tự động cho thao tác quay lại và tiến tới trên trình duyệt.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgb-navigation-qa',
        title: 'Chuẩn hóa hành trình học viên giữa các học viện - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgb-navigation-qa/walkthrough',
        title: 'Chuẩn hóa hành trình học viên giữa các học viện - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-profile-scoring-loop',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Thiết kế truy vấn aggregate ổn định và giữ đúng transaction boundary.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Bóc tách nguyên nhân chậm score refresh rõ ràng và có hướng xử lý cụ thể.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Hoàn thiện vòng xác nhận đánh giá, cập nhật chỉ số tổng hợp và xuất bản hồ sơ năng lực.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thêm monitor cho cache miss spikes khi traffic tăng.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-profile-scoring-loop',
        title: 'Đồng bộ điểm năng lực sau phiên đánh giá - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-profile-scoring-loop/walkthrough',
        title: 'Đồng bộ điểm năng lực sau phiên đánh giá - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-data-governance',
    isPublic: true,
    isFeatured: false,
    overallQualityScore: 4,
    daysEarlyOrLate: 0,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'leadership',
        skillName: 'Leadership',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Điều phối tốt phạm vi dữ liệu vận hành qua nhiều vai trò và tổ chức.',
      },
      {
        skillCode: 'code_review',
        skillName: 'Code Review',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Quy trình rà soát dữ liệu quản trị rõ ràng và dễ đối chiếu trên sản phẩm.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Điều phối được dữ liệu vận hành phù hợp cho chủ sở hữu, thành viên và quản trị hệ thống.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần tăng cường giám sát đồng bộ dữ liệu để quá trình đối soát ổn định hơn.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-data-governance',
        title: 'Xây dựng quy chuẩn quản trị dữ liệu đánh giá - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/owner-data-governance/walkthrough',
        title: 'Xây dựng quy chuẩn quản trị dữ liệu đánh giá - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-evidence-architecture',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'system_design',
        skillName: 'System Design',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Kiến trúc rõ ràng, có khả năng mở rộng và truy vết tốt qua nhiều mô-đun.',
      },
      {
        skillCode: 'leadership',
        skillName: 'Leadership',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Điều phối hiệu quả giữa nhóm sản phẩm, dữ liệu và đảm bảo chất lượng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'architecture_decision',
        content:
          'Chuỗi chứng cứ sử dụng task assignment làm điểm neo để giữ quan hệ nhất quán giữa bàn giao, đánh giá và hồ sơ.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Bổ sung sơ đồ lineage tự động khi có thay đổi schema.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/owner-evidence-architecture',
        title: 'Thiết kế kiến trúc hồ sơ chứng cứ liên mô-đun - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'architecture_record',
        url: 'https://workbench.suar.dev/owner-evidence-architecture/decision-record',
        title: 'Biên bản quyết định kiến trúc hồ sơ chứng cứ',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-release-governance',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'risk_tracking',
        skillName: 'Risk Tracking',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Ma trận rủi ro thực tế và liên kết tốt với quyết định go/no-go.',
      },
      {
        skillCode: 'release_management',
        skillName: 'Release Management',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Quy trình phát hành cân bằng tốt giữa tốc độ và chất lượng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'release_playbook',
        content:
          'Cổng phát hành gồm tiêu chí chất lượng, chủ sở hữu tín hiệu, ngưỡng rủi ro và phương án rollback.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'release_report',
        url: 'https://workbench.suar.dev/owner-release-governance/release-gate',
        title: 'Biên bản cổng quản trị chất lượng phát hành',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-impact-analytics',
    isPublic: true,
    isFeatured: true,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Mô hình tổng hợp tối ưu, dễ kiểm toán và giữ được nguồn gốc chỉ số.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Chọn đúng chỉ số để phản ánh tác động thay vì chỉ mô tả hoạt động.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'metric_dictionary',
        content:
          'Từ điển chỉ số mô tả công thức, nguồn dữ liệu, tần suất cập nhật và giới hạn diễn giải.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'analytics_report',
        url: 'https://workbench.suar.dev/owner-impact-analytics/metric-dictionary',
        title: 'Từ điển chỉ số tác động và độ tin cậy',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-profile-api-contract',
    isPublic: true,
    isFeatured: false,
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    wasOnTime: true,
    skillScores: [
      {
        skillCode: 'api_design',
        skillName: 'API Design',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L12,
        comment: 'Thiết kế API nhất quán, có phân quyền và chiến lược deprecation rõ ràng.',
      },
      {
        skillCode: 'documentation',
        skillName: 'Documentation',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Tài liệu giúp đội tích hợp hiểu nhanh mô hình dữ liệu và trường hợp lỗi.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'api_contract',
        content:
          'Hợp đồng API tách dữ liệu công khai, dữ liệu riêng tư và metadata phục vụ kiểm toán.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'api_specification',
        url: 'https://workbench.suar.dev/owner-profile-api-contract/openapi',
        title: 'Đặc tả API hồ sơ năng lực',
      },
    ],
  },
  {
    user: 'owner',
    taskKey: 'owner-review-dispute-case',
    overallQualityScore: 3,
    daysEarlyOrLate: 1,
    wasOnTime: false,
    skillScores: [
      {
        skillCode: 'testing',
        skillName: 'Testing & QA',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L7,
        comment: 'Chứng cứ đầy đủ nhưng điểm đánh giá chưa phản ánh trọn vẹn phạm vi nghiệm thu.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Trình bày yêu cầu đối soát có cấu trúc và đề xuất hành động tiếp theo rõ ràng.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_improvement',
        content: 'Cần làm rõ rubric chấm điểm để giảm khác biệt diễn giải trong các kỳ tiếp theo.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'test_report',
        url: 'https://workbench.suar.dev/owner-review-dispute-case/report',
        title: 'Báo cáo đối soát bộ tiêu chí kiểm định chất lượng dữ liệu',
      },
    ],
  },
  {
    user: 'orgAdmin',
    taskKey: 'orgc-marketplace-ranking',
    overallQualityScore: 4,
    daysEarlyOrLate: -1,
    wasOnTime: false,
    skillScores: [
      {
        skillCode: 'postgresql',
        skillName: 'PostgreSQL',
        reviewerType: 'manager',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment:
          'Điều phối tốt dữ liệu năng lực và giữ được logic so sánh mức độ phù hợp theo yêu cầu dự án.',
      },
      {
        skillCode: 'problem_solving',
        skillName: 'Problem Solving',
        reviewerType: 'peer',
        assignedLevelCode: CanonicalProficiencyLevelCode.L10,
        comment: 'Xử lý tốt bài toán xếp hạng dù các bên chưa thống nhất trọng số đánh giá.',
      },
    ],
    knowledgeArtifacts: [
      {
        type: 'retrospective_success',
        content:
          'Mở rộng được tập chỉ số ghép nối năng lực và xếp hạng cho danh mục dự án liên tổ chức.',
      },
      {
        type: 'retrospective_improvement',
        content: 'Cần thống nhất rubric cho mô hình xếp hạng sớm hơn trước vòng xác nhận.',
      },
    ],
    evidenceLinks: [
      {
        evidence_id: 'work-proof',
        evidence_type: 'pull_request',
        url: 'https://github.com/suar-labs/trust-review-workbench/pull/orgc-marketplace-ranking',
        title: 'Xây dựng mô hình xếp hạng đề xuất cộng tác - Pull Request',
      },
      {
        evidence_id: 'work-proof',
        evidence_type: 'demo_recording',
        url: 'https://workbench.suar.dev/orgc-marketplace-ranking/walkthrough',
        title: 'Xây dựng mô hình xếp hạng đề xuất cộng tác - Video nghiệm thu',
      },
    ],
  },
  {
    user: 'orgAdmin',
    taskKey: 'orgCMarketplaceLab-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [{
      skillCode: 'planning',
      skillName: 'Planning',
      reviewerType: 'manager',
      assignedLevelCode: CanonicalProficiencyLevelCode.L10,
      comment: 'Điều phối phiên hỏi đáp, mốc phản hồi và trách nhiệm công bố rất rõ ràng.',
    }],
    knowledgeArtifacts: [{
      type: 'retrospective_success',
      content: 'Một lịch điều phối công khai giúp ứng viên và hội đồng cùng nhìn thấy kỳ vọng.',
    }],
    evidenceLinks: [{
      evidence_id: 'orgc-qa-session',
      evidence_type: 'demo_recording',
      url: 'https://workbench.suar.dev/orgc-marketplace/qa-session',
      title: 'Phiên hỏi đáp công khai với ứng viên',
    }],
  },
  {
    user: 'peerReviewer',
    taskKey: 'orgCMarketplaceLab-bulk-12',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [{
      skillCode: 'code_review',
      skillName: 'Code Review',
      reviewerType: 'peer',
      assignedLevelCode: CanonicalProficiencyLevelCode.L12,
      comment: 'Rà soát đầy đủ quyền sử dụng và truy vết từng tài sản sáng tạo về nguồn.',
    }],
    knowledgeArtifacts: [{
      type: 'retrospective_success',
      content: 'Checklist quyền sử dụng được đưa vào cổng nghiệm thu thay vì kiểm tra thủ công cuối kỳ.',
    }],
    evidenceLinks: [{
      evidence_id: 'orgc-rights-audit',
      evidence_type: 'test_report',
      url: 'https://workbench.suar.dev/orgc-marketplace/rights-audit',
      title: 'Báo cáo quyền sử dụng tài sản sáng tạo',
    }],
  },
  {
    user: 'orgBOwner',
    taskKey: 'orgBKnowledgeBase-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [{
      skillCode: 'documentation',
      skillName: 'Documentation',
      reviewerType: 'manager',
      assignedLevelCode: CanonicalProficiencyLevelCode.L12,
      comment: 'Lộ trình học liên kết rõ khoảng trống năng lực, bài thực hành và rubric đầu ra.',
    }],
    knowledgeArtifacts: [{
      type: 'retrospective_success',
      content: 'Người học hiểu vì sao từng bài tập xuất hiện trong lộ trình cá nhân.',
    }],
    evidenceLinks: [{
      evidence_id: 'orgb-learning-path',
      evidence_type: 'api_specification',
      url: 'https://workbench.suar.dev/openlearning/learning-path',
      title: 'Đặc tả lộ trình học từ khoảng trống năng lực',
    }],
  },
  {
    user: 'externalContributorOne',
    taskKey: 'orgDTalentShowcase-bulk-11',
    overallQualityScore: 5,
    daysEarlyOrLate: 2,
    skillScores: [{
      skillCode: 'communication',
      skillName: 'Communication',
      reviewerType: 'manager',
      assignedLevelCode: CanonicalProficiencyLevelCode.L12,
      comment: 'Lời chứng thực giữ đúng ngữ cảnh và có xác nhận của khách hàng.',
    }],
    knowledgeArtifacts: [{
      type: 'retrospective_success',
      content: 'Phỏng vấn theo mốc tác động tạo lời chứng thực cụ thể hơn lời khen chung chung.',
    }],
    evidenceLinks: [{
      evidence_id: 'orgd-testimonial',
      evidence_type: 'demo_recording',
      url: 'https://workbench.suar.dev/talent/testimonial-interview',
      title: 'Biên bản phỏng vấn xác thực lời chứng thực',
    }],
  },
  {
    user: 'externalContributorTwo',
    taskKey: 'orgEDataOps-bulk-05',
    overallQualityScore: 5,
    daysEarlyOrLate: 1,
    skillScores: [{
      skillCode: 'postgresql',
      skillName: 'PostgreSQL',
      reviewerType: 'peer',
      assignedLevelCode: CanonicalProficiencyLevelCode.L12,
      comment: 'Quy tắc phát hiện review trùng cân bằng tốt giữa uniqueness và khả năng replay.',
    }],
    knowledgeArtifacts: [{
      type: 'retrospective_success',
      content: 'Fingerprint theo aggregate giúp loại trùng mà vẫn giữ provenance cho audit.',
    }],
    evidenceLinks: [{
      evidence_id: 'orge-review-dedupe',
      evidence_type: 'test_report',
      url: 'https://workbench.suar.dev/dataops/review-deduplication',
      title: 'Báo cáo kiểm định review trùng lặp',
    }],
  },
] as const
