import OrganizationRepository from '../../repositories/read/directory/organization_repository.js'

import { OrganizationInfraMapper } from './organization_infra_mapper.js'
import { asLucidTransaction } from './persistence_helpers.js'

import type {
  OrganizationReader,
  OrganizationRecord,
} from '#modules/organizations/actions/ports/outbound/directory/organization_persistence'
import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'

export class LucidOrganizationReader implements OrganizationReader {
  async findActiveOrFail(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord> {
    return OrganizationRepository.findActiveOrFailRecord(
      organizationId,
      asLucidTransaction(transaction)
    )
  }

  existsActive(organizationId: string, transaction?: OrganizationTransaction): Promise<boolean> {
    return OrganizationRepository.existsActive(organizationId, asLucidTransaction(transaction))
  }

  slugExists(slug: string, transaction?: OrganizationTransaction): Promise<boolean> {
    return OrganizationRepository.slugExists(slug, asLucidTransaction(transaction))
  }

  async findById(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord | null> {
    const organization = await OrganizationRepository.findById(
      organizationId,
      asLucidTransaction(transaction)
    )
    return organization ? OrganizationInfraMapper.toRecord(organization) : null
  }

  async findBasicInfo(
    organizationId: string,
    transaction?: OrganizationTransaction
  ): Promise<{ id: string; name: string } | null> {
    const organization = await OrganizationRepository.findBasicInfo(
      organizationId,
      asLucidTransaction(transaction)
    )
    return organization ? { id: organization.id, name: organization.name } : null
  }

  async findAllActive(transaction?: OrganizationTransaction): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findAllActive(
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findAllActiveBasicList(
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findAllActiveBasicList(
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findActiveBasicListByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findActiveBasicListByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async searchActiveBasicList(
    keyword: string,
    limit?: number,
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.searchActiveBasicList(
      keyword,
      limit,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  async findActiveByIds(
    organizationIds: string[],
    columns?: string[],
    transaction?: OrganizationTransaction
  ): Promise<OrganizationRecord[]> {
    const organizations = await OrganizationRepository.findActiveByIds(
      organizationIds,
      columns,
      asLucidTransaction(transaction)
    )
    return organizations.map((organization) => OrganizationInfraMapper.toRecord(organization))
  }

  hasAnyActivePartnerByIds(
    organizationIds: string[],
    transaction?: OrganizationTransaction
  ): Promise<boolean> {
    return OrganizationRepository.hasAnyActivePartnerByIds(
      organizationIds,
      asLucidTransaction(transaction)
    )
  }

  async paginateActiveBasicList(
    options: Parameters<OrganizationReader['paginateActiveBasicList']>[0],
    transaction?: OrganizationTransaction
  ) {
    const result = await OrganizationRepository.paginateActiveBasicList(
      options,
      asLucidTransaction(transaction)
    )
    return {
      organizations: result.organizations.map((organization) =>
        OrganizationInfraMapper.toRecord(organization)
      ),
      total: result.total,
    }
  }

  paginateByUser(
    userId: string,
    options: Parameters<OrganizationReader['paginateByUser']>[1],
    transaction?: OrganizationTransaction
  ) {
    return OrganizationRepository.paginateByUser(userId, options, asLucidTransaction(transaction))
  }
}
