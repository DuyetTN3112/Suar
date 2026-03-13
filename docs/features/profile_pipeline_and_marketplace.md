# Profile Pipeline & Marketplace

Verified: 2026-06-18.

The Profile Pipeline automates the aggregation and computation of user reputation, skill proficiencies, and credibility metrics. These metrics feed into the Marketplace to rank freelancers and match candidates to open tasks.

## Reputation & Profile Pipeline

The pipeline updates three core areas of a user's profile:

### 1. User Skills
Computed based on historical skill reviews:
- Uses a weighted average of peer and manager reviews.
- Factors in task difficulty and overall quality scores.

### 2. Trust Score
Measures overall performance reliability:
- Calculated from completed reviews, average quality ratings, and timely delivery.
- Dispute resolutions can adjust the trust score (e.g. restoration of score after a successful dispute).

### 3. Reviewer Credibility Score
Measures a user's capability and fairness as a reviewer:
- Initialized at baseline and updated as they complete reviews.
- If a review they wrote gets successfully disputed and marked as biased, their reviewer credibility score is degraded.

### Gates

- Profile recalculation runs after review confirmation.
- Active dispute blocks normal profile update.
- Dispute resolution can trigger skill, trust, performance, and reviewer credibility recalculation.
- Public profile snapshots freeze shareable profile data and protect private access with token/private visibility rules.

---

## Talent Search & Bookmarking

Recruiters and organization managers can source talent from the public freelancer directory:
- **Search & Filters**: Search by keyword (skills, bio, username) and filter by task context for match ranking.
- **Bookmarking**: Save candidates to custom folders, add recruiter-only notes, edit/delete bookmarks.

Current UI coverage:
- Talent directory (`inertia/pages/marketplace/talents.svelte`) exposes search, filters, match scores, and bookmark state.
- Bookmark workspace (`inertia/pages/marketplace/bookmarks.svelte`) provides full CRUD (create, read, update, delete) for recruiter bookmarks.
- Organizer task applications page (`inertia/pages/tasks/applications.svelte`) renders applicant match scores from ranking APIs.

---

## Marketplace Matching & Ranking

When freelancers apply to a task on the Marketplace, the system computes a **Match Score** and ranks applicants for the organizer.

### Match Score Formula
Compatibility is calculated by combining:
1. **Skill Match**: The overlap between the user's validated skills and the task's required skills.
2. **Skill Source Trust**: Reviewed skills rank higher than imported/self-declared skills.
3. **Quality Rating Match**: The applicant's average quality score from completed tasks.
4. **Delivery Reliability**: On-time delivery and performance stats.
5. **Domain Match**: Work history/business domain overlap.

Organizer-facing APIs expose both a per-application score lookup and a ranked list for the full applicant pool.

---

## My Applications

Freelancers can track their submitted applications:
- `inertia/pages/applications/my-applications.svelte` — paginated list with status filters, withdraw action, lifecycle timeline.
- Withdraw only allowed for own pending applications.
- Withdrawn applications visible in history, hidden from active tab.

---

## API Endpoints

- `GET /api/talents/search` - Search the talent directory.
- `GET /api/org/talents/search` - Organization-scoped alias for talent search.
- `GET /api/org/talents/:userId` - Organization talent detail API.
- `GET /api/recruiter-bookmarks` - List recruiter bookmarks.
- `POST /api/recruiter-bookmarks` - Bookmark a talent.
- `PATCH /api/recruiter-bookmarks/:id` - Update bookmark notes/folder/rating.
- `DELETE /api/recruiter-bookmarks/:id` - Remove bookmark.
- `POST /api/org/talents/:userId/bookmarks` - Create bookmark from org talent context.
- `DELETE /api/org/talents/:userId/bookmarks` - Delete bookmark by recruiter/talent pair.
- `GET /api/tasks/:id/applications/ranking` - Ranked applicant list for a task.
- `GET /api/tasks/:taskId/applications/:applicationId/match` - Match score for one applicant.
- `GET /api/me/reverse-reviews` - List own reverse reviews.
- `GET /api/org/reverse-reviews` - Org-scoped reverse reviews (owner/admin/manager only).
- `GET /api/admin/reverse-reviews` - Admin-scoped reverse reviews (system admin only).

## Test Evidence

Integration tests (verified on disk):
- `tests/integration/marketplace/talent_search.spec.ts`
- `tests/integration/marketplace/talent_directory_access_and_filters.spec.ts`
- `tests/integration/marketplace/recruiter_bookmarks_workspace.spec.ts`
- `tests/integration/tasks/task_application_access.spec.ts`
- `tests/integration/tasks/my_applications_flow.spec.ts`
- `tests/integration/tasks/application_match_score.spec.ts`
- `tests/integration/reviews/reverse_review_access.spec.ts`
- `tests/integration/reviews/reverse_review_page_contract.spec.ts`
- `tests/integration/reviews/reverse_review_reads.spec.ts`
- `tests/integration/reviews/reverse_review_target_guards.spec.ts`

E2E tests (verified on disk):
- `tests/e2e/task-application-triage.spec.ts`
- `tests/e2e/staffing-flow.spec.ts`
- `tests/e2e/project-member-management.spec.ts`
- `tests/e2e/task-create-role-prefill.spec.ts`
- `tests/e2e/meta/no-conditional-critical-paths.spec.ts`

> Note: docs/TEST_CASE_MATRIX.md and tests/TEST_CASE_MATRIX.md are authoritative.
> Filesystem is the source of truth for test existence. Phantom references removed 2026-06-18.
