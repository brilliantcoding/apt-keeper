/**
 * Shared login helper — call loginAs(page, 'admin') or loginAs(page, 'resident')
 * before tests that need auth.
 *
 * Credentials come from env vars:
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *   RESIDENT_EMAIL / RESIDENT_PASSWORD
 */
import { Page } from '@playwright/test'

export async function loginAs(page: Page, role: 'admin' | 'resident') {
  const email =
    role === 'admin'
      ? process.env.ADMIN_EMAIL!
      : process.env.RESIDENT_EMAIL!
  const password =
    role === 'admin'
      ? process.env.ADMIN_PASSWORD!
      : process.env.RESIDENT_PASSWORD!

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  // Wait for redirect away from /login
  await page.waitForURL(/\/(admin|dashboard)/)
}
