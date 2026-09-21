"""Run a real Suar -> Clawagent -> signed callback rehearsal on a test database."""

from __future__ import annotations

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("SUAR_REHEARSAL_BASE_URL", "http://127.0.0.1:3333")
DISPUTE_ID = os.environ["SUAR_REHEARSAL_DISPUTE_ID"]
EXPECTED_TITLE = os.environ["SUAR_REHEARSAL_EXPECTED_TITLE"]
OUTPUT_DIR = Path(
    os.environ.get("SUAR_REHEARSAL_OUTPUT", "tmp/clawagent-dispute-rehearsal")
)
ADMIN_EMAIL = "td6622i@gre.ac.uk"
ALLOWED_RECOMMENDATIONS = {
    "uphold_review",
    "adjust_score",
    "request_re_review",
    "dismiss_dispute",
    "partially_accept",
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000})
        page = context.new_page()
        browser_errors: list[str] = []
        page.on(
            "console",
            lambda message: (
                browser_errors.append(message.text) if message.type == "error" else None
            ),
        )

        login_response = page.request.post(
            f"{BASE_URL}/api/testing/login",
            form={
                "email": ADMIN_EMAIL,
                "provider": "google",
                "system_role": "superadmin",
            },
        )
        if not login_response.ok:
            raise AssertionError(
                f"Admin login failed: HTTP {login_response.status} "
                f"{login_response.text()[:300]}"
            )

        page.goto(f"{BASE_URL}/admin/disputes", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        csrf_token = page.locator('meta[name="csrf-token"]').get_attribute("content")
        if not csrf_token:
            raise AssertionError("Admin page did not expose a CSRF token")

        evaluation_id = os.environ.get("SUAR_REHEARSAL_EVALUATION_ID")
        if not evaluation_id:
            start_response = page.request.post(
                f"{BASE_URL}/api/admin/reviews/disputes/{DISPUTE_ID}/ai-evaluations",
                data={"provider": "clawagent"},
                headers={"X-CSRF-TOKEN": csrf_token},
            )
            if start_response.status != 201:
                raise AssertionError(
                    f"AI evaluation start failed: HTTP {start_response.status} "
                    f"{start_response.text()[:500]}"
                )
            started = start_response.json().get("data", {})
            evaluation_id = started.get("id")
            if not evaluation_id:
                raise AssertionError("Suar did not return an AI evaluation ID")
            if started.get("status") not in {"queued", "processing", "completed"}:
                raise AssertionError(f"Unexpected initial evaluation status: {started}")

        completed: dict[str, object] | None = None
        timeout_seconds = int(os.environ.get("SUAR_REHEARSAL_TIMEOUT_SECONDS", "600"))
        for _ in range(max(1, timeout_seconds // 2)):
            list_response = page.request.get(
                f"{BASE_URL}/api/admin/reviews/disputes/{DISPUTE_ID}/ai-evaluations"
            )
            if not list_response.ok:
                raise AssertionError(
                    f"AI evaluation poll failed: HTTP {list_response.status}"
                )
            evaluations = list_response.json().get("data", [])
            current = next(
                (row for row in evaluations if row.get("id") == evaluation_id),
                None,
            )
            if current and current.get("status") == "completed":
                completed = current
                break
            if current and current.get("status") == "failed":
                raise AssertionError(
                    f"Clawagent evaluation failed: "
                    f"{current.get('errorMessage') or current.get('error_message')}"
                )
            page.wait_for_timeout(2_000)

        if not completed:
            raise AssertionError("Timed out waiting for the signed Clawagent callback")
        recommendation = completed.get("recommendation")
        if recommendation not in ALLOWED_RECOMMENDATIONS:
            raise AssertionError(
                f"Callback returned an invalid recommendation: {recommendation}"
            )
        expected_recommendations = {
            value.strip()
            for value in os.environ.get(
                "SUAR_REHEARSAL_EXPECTED_RECOMMENDATIONS", ""
            ).split(",")
            if value.strip()
        }
        if expected_recommendations and recommendation not in expected_recommendations:
            raise AssertionError(
                f"Recommendation {recommendation} contradicts this demo scenario; "
                f"expected one of {sorted(expected_recommendations)}"
            )
        response_payload = completed.get("responsePayload") or completed.get(
            "response_payload"
        )
        if not completed.get("summary") or not response_payload:
            raise AssertionError("Completed evaluation is missing AI reasoning payload")

        artifact_metrics: dict[str, object] = {}
        artifact_root = os.environ.get("CLAWAGENT_ARTIFACT_ROOT")
        if artifact_root:
            artifact_dir = Path(artifact_root) / str(evaluation_id)
            trace_path = artifact_dir / "debate-trace.jsonl"
            transcript_path = artifact_dir / "verdict-transcript.md"
            if not trace_path.is_file() or not transcript_path.is_file():
                raise AssertionError("Clawagent did not persist its debate artifacts")
            trace = [
                json.loads(line)
                for line in trace_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
            evidence = next(
                (row for row in trace if row.get("fromRole") == "Evidence Analyst"),
                None,
            )
            advocates = [
                row
                for row in trace
                if row.get("fromRole") in {"Claimant Advocate", "Respondent Advocate"}
            ]
            if not evidence or len(str(evidence.get("evidence", ""))) < 500:
                raise AssertionError("Clawagent persisted a truncated evidence packet")
            if len(advocates) != 2 or any(
                len(str(row.get("evidence", ""))) < 500 for row in advocates
            ):
                raise AssertionError(
                    "Clawagent persisted an incomplete advocate debate"
                )
            if not any(row.get("type") == "decision" for row in trace):
                raise AssertionError("Clawagent trace is missing the mediator decision")
            artifact_metrics = {
                "trace_events": len(trace),
                "evidence_chars": len(str(evidence.get("evidence", ""))),
                "advocate_chars": [
                    len(str(row.get("evidence", ""))) for row in advocates
                ],
                "transcript_bytes": transcript_path.stat().st_size,
            }

        response = page.goto(
            f"{BASE_URL}/admin/disputes/{DISPUTE_ID}",
            wait_until="domcontentloaded",
        )
        page.wait_for_load_state("networkidle")
        if not response or response.status >= 400:
            raise AssertionError(
                f"Admin dispute detail returned HTTP {response.status if response else None}"
            )
        overview_body = page.locator("body").inner_text()
        if EXPECTED_TITLE not in overview_body:
            raise AssertionError(
                f"Admin dispute detail is missing task title: {EXPECTED_TITLE}"
            )
        if "admin_reviewing" not in overview_body.lower():
            raise AssertionError(
                "AI result did not remain pending for an admin decision"
            )

        resolve_tab = page.get_by_role("tab", name="Resolve", exact=True)
        if resolve_tab.count() != 1:
            raise AssertionError("Admin dispute detail is missing the Resolve tab")
        resolve_tab.click()
        page.wait_for_timeout(300)
        page.screenshot(
            path=OUTPUT_DIR / "admin-dispute-after-clawagent.png",
            full_page=True,
        )
        body = page.locator("body").inner_text()
        if (
            "clawagent" not in body.lower()
            or str(recommendation).lower() not in body.lower()
        ):
            raise AssertionError(
                "Admin dispute detail does not expose the Clawagent recommendation"
            )

        actionable_errors = [
            message
            for message in browser_errors
            if "favicon" not in message.lower()
            and "websocket" not in message.lower()
            and "devtools" not in message.lower()
        ]
        if actionable_errors:
            raise AssertionError(f"Browser console errors: {actionable_errors}")

        report = {
            "status": "PASS",
            "dispute_id": DISPUTE_ID,
            "evaluation_id": evaluation_id,
            "evaluation_status": completed.get("status"),
            "recommendation": recommendation,
            "confidence_score": completed.get("confidenceScore")
            or completed.get("confidence_score"),
            "admin_url": page.url,
            "browser_errors": actionable_errors,
            "artifacts": artifact_metrics,
        }
        (OUTPUT_DIR / "report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(json.dumps(report, ensure_ascii=False, indent=2))
        context.close()
        browser.close()


if __name__ == "__main__":
    main()
