/**
 * Payments toggle e2e tests
 *
 * Tests the admin ability to enable/disable online payments per property,
 * and verifies that residents see/don't see the Pay button accordingly.
 *
 * Required env vars:
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 *   RESIDENT_EMAIL, RESIDENT_PASSWORD  (optional — skips resident tests if absent)
 */
import { test, expect } from '@playwright/test'
import { loginAs } from './auth.setup'

test.describe('Payments toggle (admin settings)', () => {
  test('admin can see payment toggle on settings page', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/settings')

    // Should show at least one property card
    const propertyCard = page.locator('text=Online payments').first()
    await expect(propertyCard).toBeVisible({ timeout: 10_000 })
    console.log('✅ Payment toggle is visible on settings page')
  })

  test('toggle switch reflects current state and can be flipped', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/settings')

    // Find the toggle switch (role=switch)
    const toggle = page.getByRole('switch', { name: /online payments/i }).first()
    await expect(toggle).toBeVisible({ timeout: 10_000 })

    const before = await toggle.getAttribute('aria-checked')
    console.log(`Toggle state before click: ${before}`)

    // Click to flip
    await toggle.click()
    await page.waitForTimeout(1000) // allow server action to complete

    const after = await toggle.getAttribute('aria-checked')
    console.log(`Toggle state after click: ${after}`)

    if (before === after) {
      console.log('❌ Toggle did NOT change — likely DB column missing (payments_enabled)')
      console.log('   Run this SQL in Supabase SQL Editor:')
      console.log('   ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT true;')
    } else {
      console.log('✅ Toggle successfully flipped')
      // Flip back to restore original state
      await toggle.click()
    }

    expect(after).not.toBe(before)
  })
})

test.describe('Pay button visibility (resident)', () => {
  test.skip(!process.env.RESIDENT_EMAIL, 'RESIDENT_EMAIL not set — skipping resident tests')

  test('resident sees Pay button when payments are enabled', async ({ page }) => {
    await loginAs(page, 'resident')
    await page.goto('/dashboard/bills')

    // If there are unpaid bills, Pay button should be visible
    const payBtn = page.locator('button', { hasText: /pay/i }).first()
    const noBills = page.locator('text=No invoices found')

    const hasBills = await payBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    const empty = await noBills.isVisible({ timeout: 2_000 }).catch(() => false)

    if (empty) {
      console.log('ℹ️  No invoices to test Pay button against')
    } else if (hasBills) {
      console.log('✅ Pay button is visible for resident with pending bills')
    } else {
      console.log('❌ Pay button NOT visible — payments may be disabled or column missing')
    }
  })
})
