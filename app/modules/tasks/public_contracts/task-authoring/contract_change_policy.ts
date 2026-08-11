export const TVA_CONTRACT_CHANGE_POLICY = Object.freeze({
  policyVersion: 'suar.task_to_accomplishment.contract_change_policy.v1',
  additiveSameVersionChanges: Object.freeze([
    'optional_field_with_documented_default',
    'optional_nullable_field_with_unchanged_null_semantics',
    'unknown_field_preserved_or_ignored',
    'new_fixture_case_without_existing_fixture_mutation',
  ] as const),
  versionBumpRequiredChanges: Object.freeze([
    'required_field_added',
    'field_removed_or_renamed',
    'field_type_or_unit_changed',
    'closed_enum_or_meaning_changed',
    'null_or_absent_semantics_changed',
    'identity_timestamp_or_hash_convention_changed',
    'privacy_or_provenance_weakened',
    'canonical_array_or_duplicate_semantics_changed',
  ] as const),
  readerBehavior: Object.freeze({
    additiveUnknownFields: 'preserve_or_ignore',
    unknownSchemaVersion: 'reject',
    unknownClosedEnumValue: 'reject',
    invalidLegacyPayload: 'quarantine_without_native_verified_projection',
  } as const),
  deprecationWindow: Object.freeze({
    minimumReleaseCount: 2,
    minimumCalendarDays: 30,
    dualReadRequired: true,
    removalRequiresUsageEvidence: true,
  }),
  fixtureOwnership: Object.freeze({
    owner: 'WP-01 coordinator',
    consumersMayCopy: false,
    sameChangeRequired: true,
    requiredEvidence: Object.freeze([
      'old_fixture_still_parses_during_deprecation',
      'new_fixture_parses_only_with_declared_version',
      'requirement_payload_never_parses_as_verified_result',
      'privacy_and_provenance_negative_cases_pass',
    ] as const),
  }),
} as const)
