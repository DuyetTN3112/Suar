import type { UserKey } from './types.js'

export interface UserSpec {
  username: string
  email: string
  system_role: 'superadmin' | 'registered_user'
  auth_method: 'google' | 'github'
  bio: string
  is_freelancer: boolean
  rating: number | null
  completedTasks: number
  headline: string
  preferredJobTypes: string[]
}

export const SEED_USERS_SPECS: Record<UserKey, UserSpec> = {
  owner: {
    username: 'Suar',
    email: 'tranngocduyet31@gmail.com',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Chủ organization A, có dự án đang quản lý và đồng thời là thành viên thường của organization B để test context switching.',
    is_freelancer: false,
    rating: 4.7,
    completedTasks: 3,
    headline: 'Organization owner testing multi-org workspace',
    preferredJobTypes: ['full-time', 'project-based'],
  },
  superadmin: {
    username: 'DuyetTN3112(edu)',
    email: 'td6622i@gre.ac.uk',
    system_role: 'superadmin',
    auth_method: 'google',
    bio: 'System superadmin account dùng để kiểm tra redirect vào admin và dữ liệu trang quản trị.',
    is_freelancer: false,
    rating: null,
    completedTasks: 0,
    headline: 'System administrator for redirect and admin dashboard checks',
    preferredJobTypes: ['admin'],
  },
  member: {
    username: 'duyetlaaithe',
    email: 'duyetlaaithe@gmail.com',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'User thường thuộc organization của Suar, đã có task đang làm, task hoàn thành, review, proof và profile snapshot.',
    is_freelancer: true,
    rating: 4.5,
    completedTasks: 3,
    headline: 'Contributor with completed work history and published profile proof',
    preferredJobTypes: ['contract', 'part-time'],
  },
  orgAdmin: {
    username: 'LinhPM',
    email: 'linh.pm@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Org admin của organization A, chịu trách nhiệm review và quản lý project.',
    is_freelancer: false,
    rating: 4.6,
    completedTasks: 1,
    headline: 'Organization admin and project manager',
    preferredJobTypes: ['full-time'],
  },
  peerReviewer: {
    username: 'HaQA',
    email: 'ha.qa@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Peer reviewer seed user để tạo review chéo và flagged review cho admin kiểm tra.',
    is_freelancer: false,
    rating: 4.2,
    completedTasks: 1,
    headline: 'Peer reviewer for quality and flagged review scenarios',
    preferredJobTypes: ['full-time'],
  },
  orgBOwner: {
    username: 'OpenEduOwner',
    email: 'owner.edu@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Chủ organization B, dùng để tạo case chuyển từ owner ở org A sang member ở org B.',
    is_freelancer: false,
    rating: 4.4,
    completedTasks: 1,
    headline: 'Owner of the secondary organization',
    preferredJobTypes: ['full-time'],
  },
  freelancerOne: {
    username: 'MaiFreelancer',
    email: 'mai.freelancer@suar.local',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Freelancer ứng tuyển task public để test marketplace và notification.',
    is_freelancer: true,
    rating: 4.8,
    completedTasks: 6,
    headline: 'External contributor for marketplace scenarios',
    preferredJobTypes: ['freelance', 'contract'],
  },
  freelancerTwo: {
    username: 'NamFreelancer',
    email: 'nam.freelancer@suar.local',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Freelancer phụ thứ hai để task application list có nhiều trạng thái hơn.',
    is_freelancer: true,
    rating: 4.3,
    completedTasks: 4,
    headline: 'Secondary marketplace applicant',
    preferredJobTypes: ['freelance'],
  },
}
