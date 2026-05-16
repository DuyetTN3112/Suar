# Result Contract Design

## Goal

Establish one safe application-level `Result<T, E>` contract while keeping each feature module's `BaseCommand` and `BaseQuery` local.

## Decisions

- `app/modules/errors/public_contracts/result.ts` owns the shared Result container.
- `app/modules/errors/public_contracts` owns error contracts; `Result` does not serialize HTTP responses.
- Feature actions may use `Result<T, E>` for expected, branchable failures.
- Unexpected exceptions remain thrown and continue to the existing HTTP exception boundary.
- Local `BaseCommand` and `BaseQuery` files remain duplicated by design.
- Adonis health-check `Result` remains independent.

## Contract

`Result` exposes `ok`, `fail`, `isSuccess`, `isFailure`, `data`, `error`, `getValue`, and `getError`. Success values preserve `undefined`; failure values preserve any typed error value. Accessors do not reinterpret typed failures as `Error` instances.

## Migration

All local action bases import the canonical Result. Their `executeAndWrap` helper remains as a compatibility API for existing callers, but only wraps the explicit outcome; it must not change the behavior of `handle` itself. Internal-only actions may continue using direct `handle` plus thrown application exceptions. Use Result when an expected failure crosses a module or delivery boundary and the caller must branch on it.

## Adopted boundaries

- Tasks application match score → Marketplace → HTTP.
- Projects project detail → HTTP.
- Projects member candidates → HTTP.
- Tasks task applications → Marketplace → HTTP.
- Tasks application commands (submit/decide/withdraw) → Marketplace → HTTP.
- Projects role staffing candidates → HTTP.
- Users profile snapshot reads (current/history/public) → HTTP.
- Projects add/remove/update-member, update-project, and delete mutations → HTTP.
- Users rotate profile snapshot share-link mutation → HTTP.
- Users update profile snapshot access mutation → HTTP.
- Users publish profile snapshot mutation → HTTP.
- Users profile skill add/remove/update mutations → HTTP.
- Users profile details/discoverability mutations → HTTP.
- Users recruiter bookmark list and mutations → HTTP.
- Users system-users authorization query → HTTP.
- Admin Users list/show/suspend/role boundaries → HTTP.
- Organizations access configuration and custom-role boundaries → HTTP.
- Organizations settings show/update boundaries → HTTP.
- Organizations member candidates and join-request list boundaries → HTTP.
- Organizations remove-member custom command → BaseCommand/HTTP Result boundary.
- Organizations update-member-role custom command → request-aware Result boundary.
- Organizations invite-member custom command → request-aware Result boundary.
- Organizations process join-request custom command → HTTP Result boundary.
- Organizations pending-member approval gateway → HTTP Result boundary.
- Organizations bulk-member-add mutation → HTTP Result boundary with partial-success data preserved.
- Organizations accept/reject invitation mutations → HTTP Result boundary.
- Organizations switch-organization mutation → HTTP Result boundary with typed success data.
- Organizations directory update/delete mutations → HTTP Result boundary.
- Organizations project/workflow-status creation mutations → HTTP Result boundary.
- Organizations task-detail query → HTTP Result boundary before legacy redirect.
- Organizations organization-detail and project-detail queries → HTTP Result boundaries.
- Organizations join-organization request → HTTP Result boundary with JSON/HTML compatibility.
- Organizations switch-and-redirect legacy/API entrypoints → shared HTTP Result boundary.
- Organizations invitation/member index pages → HTTP Result boundaries.
- Organizations creation mutation → HTTP Result boundary.
- Organizations show/index composite page queries → HTTP Result boundaries.
- Tasks submission show/save/submit/lock capability → HTTP Result boundaries.
- Tasks submission evidence index/store/delete capability → HTTP Result boundaries.
- Tasks comment list/create/update/delete capability → HTTP Result boundaries.
- Tasks attachment list/upload/create/delete capability → HTTP Result boundaries.
- Tasks lifecycle create/delete and detail API/page → HTTP Result boundaries.
- Tasks status CRUD, status-definition update, workflow list/replace, and batch status update → HTTP Result boundaries (canonical and v1).
- Tasks sort-order mutation → HTTP Result boundary.
- Tasks audit-log query → HTTP Result boundary.
- Tasks grouped-board and timeline queries → HTTP Result boundaries.
- Tasks index-page query → HTTP page Result boundary.
- Tasks time-tracking mutation → HTTP Result boundary.
- Tasks edit-page composite query → HTTP page Result boundary.
- Tasks update mutation → HTTP Result boundary through the local BaseCommand.
- Tasks create-permission query → HTTP Result boundary while preserving the PolicyResult payload.
- Tasks requirement creation → HTTP Result boundary after request validation.
- Tasks requirement update, version list, role prefill, and remove → HTTP Result boundaries.
- Skills project skills/roles workspace reads and rubric list/show reads → HTTP Result boundaries.
- Skills proficiency-scale and role-template reads → HTTP Result boundaries.
- Skills project-skill add/update/deactivate mutations → HTTP Result boundaries through workspace commands.
- Skills role create/deactivate and role-skill upsert mutations → HTTP Result boundaries through workspace commands.
- Projects create-page composite query → HTTP page Result boundary.
- Notifications feed query and read/delete HTTP mutations → Result boundaries (legacy and v1).
- Reviews dispute comments/evidences and admin case-file list/build → Result boundaries.
- Reviews dispute report/respond/resolve mutations → Result boundaries.
- Reviews classic dispute create and admin/org list/detail → Result boundaries.
- Reviews sprint reverse-review and task-review workflow mutations → Result boundaries.
- Reviews AI dispute evaluation list/start and callback → Result boundaries.
- Reviews sprint review package lifecycle and sprint-review dispute create/report → Result boundaries.
- Reviews task-review submit/accept and sprint-review dispute comments → Result boundaries.
- Reviews task/sprint boards, evidences, self-assessment and observation creation → Result boundaries.
- HTTP Redis cache set/clear/flush/get/list → Result boundaries.
- HTTP identity, organization-members and users-in-organization reads → Result boundaries.
- HTTP global search and search-discovery reads → Result boundaries (preserving diagnostic mapping).
- Auth landing, logout, session issue/refresh and social callback → Result boundaries.
- Users profile edit/show/view and invitations page → Result boundaries.
- Filtering criteria/saved-view/alert read boundaries → Result boundaries (preserving custom diagnostics).
- Sprint create/update/start/end, move-task and backlog-reorder → Result boundaries.
- Testing auth, authorization access and required-organization error page → Result boundaries; health/dev
  operational calls remain explicit non-application probes.

This is an explicit contract migration, not a blanket conversion of every action or every data projection named `*Result`.

The audit also normalizes raw production `Error` throws in filtering, search, and taxonomy to typed
exceptions owned by the errors module. Search public contracts keep their own filter-expression type so
the search surface does not import filtering domain internals; intentional duplication preserves module
independence.

## Verification

Add unit coverage for undefined success, typed failures, accessor narrowing, and base wrapper behavior. Run targeted tests, typecheck, exception-boundary checks, and public-contract checks.
