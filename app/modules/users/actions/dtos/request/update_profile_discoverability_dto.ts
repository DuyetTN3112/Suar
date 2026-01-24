import ValidationException from '#modules/errors/public_contracts/validation_exception'

export class UpdateProfileDiscoverabilityDTO {
  public readonly isSearchable: boolean

  constructor(isSearchable: unknown) {
    if (typeof isSearchable !== 'boolean') {
      throw ValidationException.field('is_searchable', 'Discoverability must be true or false')
    }
    this.isSearchable = isSearchable
  }
}
