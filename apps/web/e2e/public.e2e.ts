import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("storefront remains usable by keyboard and at narrow width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await expect(
    page.getByRole("link", { name: /explore the collection/i }),
  ).toHaveAttribute("href", "/shop");
  await page.getByRole("button", { name: /open navigation/i }).click();
  await expect(
    page.getByRole("navigation", { name: /mobile navigation/i }),
  ).toBeVisible();
});

test("catalogue search exposes live product controls", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Verdant Signet" }),
  ).toBeVisible();
});

test("trade application remains public", async ({ page }) => {
  await page.goto("/trade");
  await expect(
    page.getByRole("heading", { name: /apply for a trade account/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /submit application/i })).toBeVisible();
});

for (const path of [
  "/",
  "/shop",
  "/login",
  "/register",
  "/policies/delivery",
  "/policies/returns",
  "/contact",
]) {
  test(`${path} has no serious automated accessibility violations`, async ({
    page,
  }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
    ).toEqual([]);
  });
}
