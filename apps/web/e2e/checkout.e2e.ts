import { expect, test } from "@playwright/test";

for (const width of [320, 375, 414, 768]) {
  test(`checkout remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/shop/verdant-signet");
    await page
      .getByRole("button", { name: /add verdant signet to basket/i })
      .click();
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { name: "Checkout, carefully handled." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to payment" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}

test("guest checkout reaches verified mock payment confirmation", async ({
  page,
}) => {
  test.skip(
    process.env.E2E_FULL_STACK !== "true",
    "Requires PostgreSQL/API full stack",
  );
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/shop/verdant-signet");
  await page
    .getByRole("button", { name: /add verdant signet to basket/i })
    .click();
  await page.goto("/checkout");
  await page.getByLabel("First name").fill("Maya");
  await page.getByLabel("Last name").fill("Hart");
  await page.getByLabel("Email address").fill("maya@example.test");
  await page.getByLabel("Contact number").fill("07123456789");
  await page.getByLabel("Address line 1").fill("7 Stonegate");
  await page.getByLabel("Town or city").fill("York");
  await page.getByLabel("Postcode").fill("YO1 8AW");
  await page.getByLabel("Express delivery").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Complete payment" }),
  ).toBeVisible();
  await expect(page.getByText("Local payment simulation")).toBeVisible();
  await page.screenshot({
    path: "test-results/checkout-payment-375.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /confirm test payment/i }).click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed." }),
  ).toBeVisible();
});
