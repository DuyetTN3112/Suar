## Summary

- What changed:
- Why it changed:

## Testing Notes

- What contract or invariant does each added or changed test protect?
- If a test was removed, which remaining test now protects that contract?
- Are new integration tests going through the correct command/query entry point?
- Did this change add or update permission, state-transition, or persistence coverage where it matters?

## Test Checklist

- [ ] I can name the contract or invariant each added/changed test protects.
- [ ] I did not add low-signal tests that only mirror implementation details.
- [ ] Integration tests use command/query surfaces when the real use case lives there.
- [ ] I avoided asserting denormalized fields as primary ownership.
- [ ] If I touched task ownership logic, I respected the product truth: `organization -> project -> task`.
- [ ] I did not relax lint or TypeScript strictness to make tests pass.
- [ ] I did not add disable comments to silence test warnings or lint rules.
- [ ] If a test fails, the broken rule is obvious from the scenario name and assertions.

## Verification

- Commands run:
- Results:
