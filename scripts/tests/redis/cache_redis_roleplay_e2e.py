#!/usr/bin/env python3
"""Role-play the task-list cache boundary through a real browser."""

import json
import os
import random
import time

from playwright.sync_api import BrowserContext, Page, expect, sync_playwright


PORT = os.environ.get("PORT", "3333")
BASE_URL = f"http://127.0.0.1:{PORT}"


def login(context: BrowserContext, email: str, organization_id: str | None = None) -> None:
    form = {"email": email, "provider": "google"}
    if organization_id:
        form["organization_id"] = organization_id

    response = context.request.post(f"{BASE_URL}/api/testing/login", form=form)
    if not response.ok:
        raise AssertionError(
            f"Testing login failed for {email}: {response.status} {response.text()}"
        )

    state_response = context.request.get(f"{BASE_URL}/api/testing/auth-state")
    if not state_response.ok:
        raise AssertionError(
            f"Auth-state failed for {email}: {state_response.status} {state_response.text()}"
        )
    state = state_response.json()["data"]
    if not state["authenticated"] or state["email"].lower() != email.lower():
        raise AssertionError(f"Wrong authenticated state after login: {state}")
    if organization_id and state["sessionOrganizationId"] != organization_id:
        raise AssertionError(f"Wrong organization after login: {state}")


def wait_for_page(page: Page, url: str) -> None:
    page.goto(url)
    page.wait_for_load_state("networkidle")
    expect(page.locator("body")).not_to_contain_text("Server Error")
    expect(page.locator("body")).not_to_contain_text("500 Internal Server Error")


def main() -> None:
    timestamp = int(time.time() * 1000)
    nonce = f"{random.randrange(16**8):08x}"
    cleanup_token = f"{timestamp}-{nonce}"

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        bootstrap_context = browser.new_context()
        owner_context = None
        member_context = None

        try:
            login(bootstrap_context, f"cache-audit-bootstrap-{nonce}@test.com")
            bootstrap_page = bootstrap_context.new_page()
            wait_for_page(bootstrap_page, f"{BASE_URL}/organizations")
            csrf_token = bootstrap_page.locator('meta[name="csrf-token"]').get_attribute(
                "content"
            )
            if not csrf_token:
                raise AssertionError("CSRF token was not rendered")

            seed_response = bootstrap_context.request.post(
                f"{BASE_URL}/api/testing/seed-project-member-flow",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": csrf_token,
                },
                data={"timestamp": timestamp, "nonce": nonce},
            )
            if seed_response.status != 201:
                raise AssertionError(
                    f"Seed failed: {seed_response.status} {seed_response.text()}"
                )
            seeded = seed_response.json()["data"]

            owner_context = browser.new_context()
            login(owner_context, seeded["ownerEmail"], seeded["organizationId"])
            owner_page = owner_context.new_page()
            task_list_url = f"{BASE_URL}/org/tasks/list?scope=organization"

            # First visit populates the owner/admin authorization-scoped cache.
            wait_for_page(owner_page, task_list_url)
            expect(owner_page.get_by_text(f"Seed Task {cleanup_token}", exact=True)).to_be_visible()

            # A second visit proves the warmed view remains usable.
            owner_page.reload()
            owner_page.wait_for_load_state("networkidle")
            expect(owner_page.get_by_text(f"Seed Task {cleanup_token}", exact=True)).to_be_visible()

            member_context = browser.new_context()
            login(member_context, seeded["memberEmail"], seeded["organizationId"])
            member_page = member_context.new_page()
            wait_for_page(member_page, task_list_url)

            # The member shares the organization but is neither creator nor assignee.
            # They must not inherit the owner-warmed task list.
            expect(member_page.locator("body")).not_to_contain_text(
                f"Seed Task {cleanup_token}"
            )

            print(
                json.dumps(
                    {
                        "status": "passed",
                        "organizationId": seeded["organizationId"],
                        "taskId": seeded["taskId"],
                        "ownerSawTask": True,
                        "memberSawTask": False,
                    }
                )
            )
        finally:
            try:
                bootstrap_context.request.post(
                    f"{BASE_URL}/api/testing/seed-cleanup",
                    data={"tokens": [cleanup_token, nonce]},
                )
            except Exception:
                pass
            if member_context:
                member_context.close()
            if owner_context:
                owner_context.close()
            bootstrap_context.close()
            browser.close()


if __name__ == "__main__":
    main()
