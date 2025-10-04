function mapOrganizationMemberPreview(
  member: Record<string, unknown>
): Record<string, unknown> {
  const rest = { ...member }
  const orgRole = rest['org_role']
  const joinedAt = rest['joined_at']
  delete rest['org_role']
  delete rest['joined_at']

  return {
    ...rest,
    orgRole,
    joinedAt,
  }
}

function mapOrganizationStats(stats: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...stats }
  const memberCount = rest['member_count']
  const projectCount = rest['project_count']
  const taskCount = rest['task_count']
  delete rest['member_count']
  delete rest['project_count']
  delete rest['task_count']

  return {
    ...rest,
    memberCount,
    projectCount,
    taskCount,
  }
}

function mapOrganizationRecord(data: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...data }
  const ownerId = rest['owner_id']
  const customRoles = rest['custom_roles']
  const partnerType = rest['partner_type']
  const partnerVerifiedAt = rest['partner_verified_at']
  const partnerVerifiedBy = rest['partner_verified_by']
  const partnerVerificationProof = rest['partner_verification_proof']
  const partnerExpiresAt = rest['partner_expires_at']
  const partnerIsActive = rest['partner_is_active']
  const deletedAt = rest['deleted_at']
  const createdAt = rest['created_at']
  const updatedAt = rest['updated_at']
  const membersPreview = rest['members_preview']

  delete rest['owner_id']
  delete rest['custom_roles']
  delete rest['partner_type']
  delete rest['partner_verified_at']
  delete rest['partner_verified_by']
  delete rest['partner_verification_proof']
  delete rest['partner_expires_at']
  delete rest['partner_is_active']
  delete rest['deleted_at']
  delete rest['created_at']
  delete rest['updated_at']
  delete rest['members_preview']

  return {
    ...rest,
    ownerId,
    customRoles,
    partnerType,
    partnerVerifiedAt,
    partnerVerifiedBy,
    partnerVerificationProof,
    partnerExpiresAt,
    partnerIsActive,
    ...(deletedAt !== undefined ? { deletedAt } : {}),
    createdAt,
    updatedAt,
    ...(Array.isArray(membersPreview)
      ? {
          membersPreview: membersPreview.map((member) =>
            mapOrganizationMemberPreview(member as Record<string, unknown>)
          ),
        }
      : {}),
  }
}

export function mapOrganizationMutationApiBody(data: Record<string, unknown>) {
  return {
    data: mapOrganizationRecord(data),
  }
}

export function mapOrganizationSuccessApiBody(
  message: string,
  extra: Record<string, unknown> = {}
) {
  return {
    data: {
      message,
      ...extra,
    },
  }
}

export function mapOrganizationDetailApiBody<T extends object>(data: T) {
  const detail = mapOrganizationRecord(data as Record<string, unknown>)

  if (typeof detail['stats'] === 'object' && detail['stats'] !== null) {
    detail['stats'] = mapOrganizationStats(detail['stats'] as Record<string, unknown>)
  }

  return {
    data: detail,
  }
}
