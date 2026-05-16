# Hierarchical Test Matrix Summary

> Generated from hierarchical atomic matrices. Counts are not coverage percentages.

| Metric | Count |
| --- | --- |
| Matrix files | 40 |
| Atomic rows | 319 |
| Rows with E2E status covered | 66 |
| Rows with E2E covered and Playwright file evidence | 66 |
| Covered rows with any verified file evidence | 116 |
| Covered rows fully verified by declared covered layers | 116 |
| Covered rows with evidence issues | 0 |
| Covered layer cells with evidence issues | 0 |

## Layer Status Totals

| Layer | covered | partial | weak | missing | N/A |
| --- | --- | --- | --- | --- | --- |
| Backend | 238 | 30 | 0 | 1 | 50 |
| Contract | 12 | 8 | 0 | 0 | 299 |
| Component | 40 | 68 | 0 | 0 | 211 |
| E2E | 66 | 90 | 0 | 26 | 137 |
| Test Strength | 116 | 203 | 0 | 0 | 0 |
| Overall | 116 | 203 | 0 | 0 | 0 |

## Verified Covered Evidence

| Layer | declared covered | verified covered | applicable rows | verified/applicable |
| --- | --- | --- | --- | --- |
| Backend | 238 | 238 | 269 | 88.5% |
| Contract | 12 | 12 | 20 | 60.0% |
| Component | 40 | 40 | 108 | 37.0% |
| E2E | 66 | 66 | 182 | 36.3% |
| Test Strength | 116 | 116 | 319 | 36.4% |
| Overall | 116 | 116 | 319 | 36.4% |

## Domain Summary

| Domain | Large flows | Subflows | Atomic rows | E2E covered |
| --- | --- | --- | --- | --- |
| Admin | 7 | 27 | 35 | 9 |
| Auth | 4 | 16 | 36 | 7 |
| Marketplace | 4 | 20 | 39 | 13 |
| Notifications | 1 | 4 | 7 | 3 |
| Organizations | 6 | 28 | 47 | 13 |
| Projects | 3 | 10 | 17 | 4 |
| Reviews | 6 | 29 | 54 | 9 |
| Search | 1 | 5 | 5 | 0 |
| Skills | 1 | 4 | 7 | 0 |
| Tasks | 8 | 38 | 60 | 6 |
| Users/Profile | 3 | 12 | 12 | 2 |

## Guidance

- `covered` in `Backend` is not `covered` in `E2E`.
- Declared coverage is not verified coverage. Verified coverage requires resolvable test files for the declared covered layer.
- Use this file to see shape and gaps, not to claim product-wide test coverage.
- Rows marked `missing`, `weak`, or `partial` remain audit findings.
