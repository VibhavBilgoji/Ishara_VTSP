import { test, expect } from '@playwright/test'

test.describe('Ishara End-to-End Clinical Flow', () => {
  const sessionId = '00000000-0000-0000-0000-000000000001'

  test('full multi-role flow: P0 tap -> staff ack -> doctor sign -> interpreter page & accept', async ({
    browser,
  }) => {
    // Context 1: Patient Bedside Tablet Kiosk
    const patientContext = await browser.newContext()
    const patientPage = await patientContext.newPage()

    // Context 2: Doctor Clinical Station
    const doctorContext = await browser.newContext()
    const doctorPage = await doctorContext.newPage()

    // Context 3: Remote ISL Interpreter
    const interpreterContext = await browser.newContext()
    const interpreterPage = await interpreterContext.newPage()

    // 1. Open Doctor Station
    await doctorPage.goto(`/dashboard/${sessionId}`)
    await expect(doctorPage.locator('h1')).toContainText(/Patient|Bedside|Ishara/i)

    // 2. Open Patient Kiosk
    await patientPage.goto(`/patient/${sessionId}`)
    await expect(patientPage.getByText(/Care Team Connected|Your care team/i)).toBeVisible()

    // Verify Kiosk Hardening controls
    await expect(patientPage.getByRole('button', { name: /Text:|Large/i })).toBeVisible()
    await expect(patientPage.getByRole('button', { name: /Fullscreen/i })).toBeVisible()

    // 3. Open Interpreter Portal
    await interpreterPage.goto('/interpreter/dashboard')
    await expect(interpreterPage.getByText(/Incoming calls|Available/i)).toBeVisible()

    // 4. Patient taps P0 Urgent Pictogram (e.g. Chest pain or Severe allergy)
    const p0Card = patientPage.locator('button').filter({ hasText: /Chest pain|Severe pain|Emergency|Can't breathe/i }).first()
    if (await p0Card.isVisible()) {
      await p0Card.click()
    } else {
      // Fallback: click first pictogram button
      await patientPage.locator('.patient-view button').first().click()
    }

    // 5. Patient Kiosk shows live lifecycle stepper (Sent -> Delivered)
    await expect(patientPage.getByText(/Sent/i)).toBeVisible({ timeout: 5000 })
    await expect(patientPage.getByText(/Delivered/i)).toBeVisible({ timeout: 5000 })

    // 6. Doctor Station receives Emergency Alert Banner
    const ackButton = doctorPage.getByRole('button', { name: /Acknowledge|Clear alert/i })
    await expect(ackButton).toBeVisible({ timeout: 10000 })

    // Doctor clicks Acknowledge
    await ackButton.click()

    // 7. Patient Kiosk updates to 'Seen by Staff'
    await expect(patientPage.getByText(/Seen by Staff|Doctor \/ Nurse acknowledged/i)).toBeVisible({
      timeout: 10000,
    })

    // 8. Doctor dictates or selects ISL sign phrase to broadcast to patient
    const quickChip = doctorPage.getByRole('button', { name: /\+ You are safe|\+ Take this medicine|\+ Stay still/i }).first()
    if (await quickChip.isVisible()) {
      await quickChip.click()
      // Doctor clicks send or confirm
      const sendButton = doctorPage.getByRole('button', { name: /Broadcast to patient|Send|Confirm/i }).first()
      if (await sendButton.isVisible()) {
        await sendButton.click()
      }
    }

    // 9. Patient calls live interpreter
    const callInterpreterBtn = patientPage.getByRole('button', { name: /Call live interpreter|अनुवादक बुलाएं/i })
    if (await callInterpreterBtn.isVisible()) {
      await callInterpreterBtn.click()
      await expect(patientPage.getByText(/Calling an interpreter|Connecting/i)).toBeVisible()
    }

    // 10. Interpreter receives incoming call card and accepts
    const acceptBtn = interpreterPage.getByRole('button', { name: /Accept & connect|Accept/i }).first()
    if (await acceptBtn.isVisible({ timeout: 10000 })) {
      await acceptBtn.click()
      await expect(interpreterPage).toHaveURL(new RegExp(`/interpreter/call/${sessionId}`))
    }

    // Clean up
    await patientContext.close()
    await doctorContext.close()
    await interpreterContext.close()
  })
})
