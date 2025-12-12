import type { OrgKey, UserKey } from './types.js'

export interface OrgSpec {
  name: string
  slug: string
  owner: UserKey
  plan: 'starter' | 'professional'
  description: string
}

export const SEED_ORGANIZATIONS_SPECS: Record<OrgKey, OrgSpec> = {
  orgA: {
    name: 'Suar Workspace Lab',
    slug: 'suar-workspace-lab',
    owner: 'owner',
    plan: 'professional',
    description:
      'Organization chính dùng để test giao diện owner/admin và dữ liệu project/task cho tài khoản tranngocduyet31@gmail.com.',
  },
  orgB: {
    name: 'Open Education Guild',
    slug: 'open-education-guild',
    owner: 'orgBOwner',
    plan: 'starter',
    description:
      'Organization phụ để kiểm tra case user đổi context từ org_owner sang org_member.',
  },
  orgC: {
    name: 'Creator Circle Studio',
    slug: 'creator-circle-studio',
    owner: 'peerReviewer',
    plan: 'starter',
    description:
      'Organization thứ ba để kiểm tra thêm case user là member ở nhiều org và admin dashboard có nhiều tenants hơn.',
  },
  orgD: {
    name: 'Remote Talent Pool',
    slug: 'remote-talent-pool',
    owner: 'freelancerOne',
    plan: 'professional',
    description:
      'Organization thiên về external contributors, dùng để seed package adoption và public task nhiều hơn.',
  },
  orgE: {
    name: 'Data Ops Research Guild',
    slug: 'data-ops-research-guild',
    owner: 'freelancerTwo',
    plan: 'professional',
    description:
      'Organization thứ năm để tăng mật độ dữ liệu đa tenant, tập trung vào data ops, analytics và insight workflow.',
  },
}
