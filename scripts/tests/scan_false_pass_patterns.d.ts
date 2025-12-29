declare module '../../../scripts/tests/scan_false_pass_patterns.mjs' {
  export function scanFalsePassPatterns(
    policyPath: string
  ): Promise<Array<{ file: string; pattern: string }>>
}
