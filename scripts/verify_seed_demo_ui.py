"""Visual smoke check for the graduation-demo seed pack.

Run against a dedicated test database with testing routes enabled. The script
never targets the main development database.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

BASE_URL = os.environ.get("SEED_DEMO_BASE_URL", "http://127.0.0.1:3335")
OUTPUT_DIR = Path(os.environ.get("SEED_DEMO_UI_OUTPUT", "tmp/seed-demo-ui"))
CENTRAL_EMAIL = "tranngocduyet31@gmail.com"
ADMIN_EMAIL = "td6622i@gre.ac.uk"


def login(
    page: Page, email: str, provider: str, system_role: str | None = None
) -> None:
    form = {"email": email, "provider": provider}
    if system_role:
        form["system_role"] = system_role
    response = page.request.post(f"{BASE_URL}/api/testing/login", form=form)
    if not response.ok:
        raise AssertionError(
            f"Login failed for {email}: HTTP {response.status} {response.text()[:300]}"
        )


def visit(
    page: Page,
    name: str,
    path: str,
    expected_text: tuple[str, ...],
) -> dict[str, object]:
    response = page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    page.screenshot(path=OUTPUT_DIR / f"{name}.png", full_page=True)
    body = page.locator("body").inner_text()
    headings = page.locator("h1, h2").all_inner_texts()
    status = response.status if response else None

    if status is None or status >= 400:
        raise AssertionError(f"{path} returned HTTP {status}")
    for text in expected_text:
        if text not in body:
            raise AssertionError(f"{path} is missing expected text: {text}")

    banned = re.search(
        r"(?i)\b(seed(?:ed|ing)?|demo-only|org [a-e]|owner-[a-z0-9-]+|member-[a-z0-9-]+)\b",
        body,
    )
    if banned:
        raise AssertionError(f"{path} exposes internal seed copy: {banned.group(0)}")

    return {
        "path": path,
        "final_url": page.url,
        "status": status,
        "headings": headings[:8],
        "body_excerpt": body[:500],
    }


def switch_to_member_workspace(page: Page) -> dict[str, object]:
    organization_switcher = (
        page.locator("details")
        .filter(has_text=re.compile(r"Suar Product Studio"))
        .first
    )
    organization_switcher.locator("summary").click()
    with page.expect_response(
        lambda response: (
            response.url.endswith("/switch-organization")
            and response.request.method == "POST"
        )
    ) as response_info:
        organization_switcher.get_by_role(
            "button", name=re.compile(r"Học viện Kỹ năng Số Mở")
        ).click()
    switch_response = response_info.value
    if not switch_response.ok:
        raise AssertionError(
            f"Organization switch failed with HTTP {switch_response.status}"
        )
    switch_payload = switch_response.json()
    switched_organization = switch_payload.get("data", {}).get("organization", {})
    if switched_organization.get("name") != "Học viện Kỹ năng Số Mở":
        raise AssertionError("Organization switch returned the wrong organization")

    page.wait_for_load_state("networkidle")

    page.goto(f"{BASE_URL}/org", wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    if not re.search(r"/(?:tasks|dashboard)(?:\?.*)?$", page.url):
        raise AssertionError(
            f"Member retained access to owner workspace instead of redirecting: {page.url}"
        )

    result = visit(
        page,
        "07-member-workspace",
        "/tasks",
        (
            "Học viện Kỹ năng Số Mở",
            "USER MODE",
            "Track work, profile, and reviews",
        ),
    )
    body = page.locator("body").inner_text()
    if "ORGANIZATION MANAGEMENT" in body or "People & access" in body:
        raise AssertionError("Member organization exposes owner management navigation")
    return result


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []
    browser_errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        central_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        central_page = central_context.new_page()
        central_page.on(
            "console",
            lambda message: (
                browser_errors.append(message.text) if message.type == "error" else None
            ),
        )
        login(central_page, CENTRAL_EMAIL, "github")
        results.extend(
            [
                visit(
                    central_page,
                    "01-owner-workspace",
                    "/org",
                    ("Suar Product Studio",),
                ),
                visit(
                    central_page,
                    "02-owner-profile",
                    "/profile",
                    (
                        "Trần Ngọc Duyệt",
                        "System Design",
                        "API Design",
                        "Leadership",
                        "89.0%",
                        "OWNER",
                        "MEMBER",
                    ),
                ),
                visit(
                    central_page,
                    "03-owner-projects",
                    "/org/projects",
                    (
                        "Nền tảng Đánh giá Năng lực",
                        "Vận hành Tin cậy và Tranh chấp",
                    ),
                ),
                visit(
                    central_page,
                    "04-owner-disputes",
                    "/org/disputes",
                    ("Đối soát bộ tiêu chí kiểm định chất lượng dữ liệu",),
                ),
                visit(
                    central_page,
                    "05-owner-notifications",
                    "/notifications",
                    ("Hồ sơ năng lực đã cập nhật",),
                ),
                visit(
                    central_page,
                    "06-owner-applications",
                    "/my-applications",
                    ("Kiểm định pipeline chất lượng dữ liệu",),
                ),
            ]
        )
        results.append(switch_to_member_workspace(central_page))
        central_context.close()

        admin_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        admin_page = admin_context.new_page()
        admin_page.on(
            "console",
            lambda message: (
                browser_errors.append(message.text) if message.type == "error" else None
            ),
        )
        login(admin_page, ADMIN_EMAIL, "google", "superadmin")
        results.append(
            visit(
                admin_page,
                "08-admin-disputes",
                "/admin/disputes",
                (
                    "Đối soát bộ tiêu chí kiểm định chất lượng dữ liệu",
                    "Hoàn thiện hồ sơ tranh chấp cho hội đồng kiểm duyệt",
                ),
            )
        )
        admin_context.close()
        browser.close()

    actionable_errors = [
        message
        for message in browser_errors
        if "favicon" not in message.lower()
        and "websocket" not in message.lower()
        and "devtools" not in message.lower()
    ]
    report = {
        "status": "PASS" if not actionable_errors else "FAIL",
        "base_url": BASE_URL,
        "screens": results,
        "browser_errors": actionable_errors,
    }
    (OUTPUT_DIR / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if actionable_errors:
        raise AssertionError(f"Browser console errors: {actionable_errors}")


if __name__ == "__main__":
    main()
