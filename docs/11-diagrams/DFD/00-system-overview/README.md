# 00-system-overview DFD hierarchy

`dfd_00_context` is the formal Level 0 context model: `P0` is the Suar system boundary and `E#`
nodes are external entities/services. The four complementary frames `dfd_01a`--`dfd_01d` are the
formal Level 1 decomposition of `P0`. Together they contain `P1`--`P7`, preserve every Level 0
boundary flow, and make every cross-frame relation explicit: D2 carries durable delivery context,
H1 carries the P3-to-P5 completion/review handoff, and H2 carries P5 outcome events into P7. H1 and
H2 are off-page data-flow continuations, not additional process, entity, or store symbols. The direct
child shown here, `dfd_01a_identity_access`, refines `P1`; its header names the parent process and the
data-flow balance.

| Reading order | Formal question answered | Explicit handoff and outcome |
| --- | --- | --- |
| `dfd_01a_identity_organisation_delivery_context` | How is an authenticated member converted into governed organisation and delivery context? | P2 writes D2 project/sprint/task context, which the next frame reads. |
| `dfd_01b_task_discovery_submission` | How does an external contributor discover work and submit a completion package? | P3 writes D3 and passes H1, the named completion/review handoff, to P5. |
| `dfd_01c_review_profile_advisory` | How does review turn that handoff into review/profile outcomes and an optional advisory exchange? | P5 writes D4 and passes H2 governed outcome events to P7. |
| `dfd_01d_platform_support` | How does platform support make those governed outcomes auditable and deliver notifications? | P7 writes D5 and returns the support/governance or notification result to its external recipient. |

These are complementary frames rather than arbitrary ``parts'': D2, H1, and H2 are the actual
data-flow boundaries between their questions. The separation removes connector crossings and keeps
the formal notation readable on one portrait A4 page without hiding a process-to-process handoff.

## overview

- [dfd_00_context](overview/dfd_00_context.mmd)

## high-level

- [dfd_01a_identity_organisation_delivery_context](high-level/dfd_01a_identity_organisation_delivery_context.mmd)
- [dfd_01b_task_discovery_submission](high-level/dfd_01b_task_discovery_submission.mmd)
- [dfd_01c_review_profile_advisory](high-level/dfd_01c_review_profile_advisory.mmd)
- [dfd_01d_platform_support](high-level/dfd_01d_platform_support.mmd)

## low-level

- [dfd_01a_identity_access](low-level/dfd_01a_identity_access.mmd)

Read `P0` → `P1`--`P7` → the chosen numbered child process. A lower-level file answers one data
transformation question and retains the parent process number in its own process IDs.
