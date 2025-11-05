# Review AI Evaluation Callback Hierarchical Test-Case Matrix

| Field           | Value                             |
| --------------- | --------------------------------- |
| Status          | Active hierarchical matrix        |
| L0 Domain       | Reviews                           |
| L1 Large Flow   | AI dispute evaluation             |
| Source evidence | `../review-dispute-governance.md` |
| Last Reviewed   | 2026-07-14                        |

## Tree

```text
REV-L05 AI dispute evaluation
├── REV-S23 Start evaluation
├── REV-S24 Public callback authentication
├── REV-S25 Callback target state
└── REV-S26 Callback payload validation
```

## Atomic Cases

| Domain  | Large Flow            | Subflow            | Scenario ID                             | Test Case ID | Actor               | Preconditions                          | Resource State        | Input Class              | Specific Input                   | Trigger         | Expected API               | Expected DB/State                         | Expected UI                           | Side effects                      | Backend | Contract | Component | E2E | Evidence                                                                    | Test Strength | Overall |
| ------- | --------------------- | ------------------ | --------------------------------------- | ------------ | ------------------- | -------------------------------------- | --------------------- | ------------------------ | -------------------------------- | --------------- | -------------------------- | ----------------------------------------- | ------------------------------------- | --------------------------------- | ------- | -------- | --------- | --- | --------------------------------------------------------------------------- | ------------- | ------- |
| Reviews | AI dispute evaluation | Callback auth      | REV-AI-SC01 valid callback              | REV-AI-TC001 | External AI service | Evaluation queued                      | Queued evaluation     | valid signed callback    | Valid credential/timestamp/signature | Public callback | Success                    | Evaluation updated from queued            | Admin AI page eventually shows result | Audit/workflow event              | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Callback auth      | REV-AI-SC02 missing credential              | REV-AI-TC002 | External caller     | Callback credential configured or required | Queued evaluation     | missing credential       | No signature/credential              | Public callback | Reject unauthorized        | Evaluation unchanged                      | No UI change                          | Security log if defined           | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Callback auth      | REV-AI-SC03 wrong signature             | REV-AI-TC003 | External caller     | Evaluation queued                      | Queued evaluation     | invalid signature        | Bad signed-request/signature               | Public callback | Reject unauthorized        | Evaluation unchanged                      | No UI change                          | Security log if defined           | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Callback auth      | REV-AI-SC04 expired timestamp           | REV-AI-TC004 | External caller     | Evaluation queued                      | Queued evaluation     | expired signature window | Old timestamp                    | Public callback | Reject unauthorized        | Evaluation unchanged                      | No UI change                          | Security log if defined           | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Target state       | REV-AI-SC05 unknown evaluation          | REV-AI-TC005 | External AI service | No evaluation row                      | Missing evaluation    | unknown resource         | Unknown evaluation id            | Public callback | Not found/controlled error | No row created unless rule says otherwise | No UI change                          | None                              | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Target state       | REV-AI-SC06 queued evaluation           | REV-AI-TC006 | External AI service | Evaluation queued                      | Queued evaluation     | valid state              | Result payload                   | Public callback | Success                    | Evaluation completed/failed per payload   | Admin result visible                  | Audit/workflow event              | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Target state       | REV-AI-SC07 processing evaluation       | REV-AI-TC007 | External AI service | Evaluation processing                  | Processing evaluation | valid state              | Result payload                   | Public callback | Success                    | Evaluation completed/failed per payload   | Admin result visible                  | Audit/workflow event              | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Target state       | REV-AI-SC08 completed evaluation replay | REV-AI-TC008 | External AI service | Evaluation completed                   | Completed evaluation  | replay                   | Same callback twice              | Public callback | Reject/idempotent per rule | Completed result unchanged                | No duplicate UI event                 | No duplicate audit unless defined | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |
| Reviews | AI dispute evaluation | Payload validation | REV-AI-SC09 malformed schema            | REV-AI-TC009 | External AI service | Evaluation queued                      | Queued evaluation     | malformed payload        | Missing required result fields   | Public callback | Validation error           | Evaluation unchanged or failed per rule   | Error not user-facing                 | Audit/error event if defined      | covered | N/A      | N/A       | N/A | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts` | covered       | covered |

## Notes

- This file directly splits old `REV-041`.
- Callback coverage is backend-only here; E2E is not applicable for the public service callback rows.
