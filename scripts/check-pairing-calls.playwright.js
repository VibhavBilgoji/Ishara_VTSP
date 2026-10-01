/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI callback. */
async (page) => {
  const origin = page.url().split('/').slice(0, 3).join('/')
  const browser = page.context().browser()
  const tabletContext = await browser.newContext()
  const interpreterContext = await browser.newContext()
  let sessionId
  const post = (path, data) => page.request.post(`${origin}${path}`, { data, headers: { Origin: origin } })
  try {
    const created = await post('/api/session', { patientDisplayName: 'Automated demo pairing check', bedLabel: `qa ${Date.now()}` })
    if (created.status() !== 201) throw new Error(`Create test session: ${created.status()} ${await created.text()}`)
    sessionId = (await created.json()).session.id
    const paired = await post(`/api/session/${sessionId}/pairing`, {})
    if (!paired.ok()) throw new Error(`Generate QR: ${paired.status()} ${await paired.text()}`)
    const pairing = await paired.json()
    if (!pairing.qrCode.startsWith('data:image/png')) throw new Error('QR image was not generated')
    const tablet = await tabletContext.newPage()
    await tablet.goto(pairing.url)
    await tablet.getByRole('button', { name: 'Pair this tablet' }).click()
    await tablet.waitForURL(`**/patient/${sessionId}`)
    const replay = await interpreterContext.request.post(`${origin}/api/kiosk/pair`, {
      data: { secret: pairing.url.split('#')[1] }, headers: { Origin: origin },
    })
    if (replay.status() !== 401) throw new Error(`Pairing replay was not rejected: ${replay.status()}`)
    console.log('PASS: QR generation, independent tablet pairing, and one-use secret replay rejection')

    // Page while the receiver is disconnected: a persisted request must survive opening the dashboard later.
    const paged = await tablet.request.post(`${origin}/api/session/${sessionId}/request-interpreter`, {
      data: { note: 'Automated demo interpreter check' }, headers: { Origin: origin },
    })
    if (!paged.ok()) throw new Error(`Page interpreter: ${paged.status()} ${await paged.text()}`)
    const interpreter = await interpreterContext.newPage()
    await interpreter.goto(`${origin}/auth/interpreter`)
    await interpreter.getByRole('button', { name: /Ananya Deshmukh/ }).click()
    await interpreter.getByRole('button', { name: 'Sign In to Interpreter Dashboard' }).click()
    await interpreter.waitForURL('**/interpreter/dashboard')
    const request = interpreter.locator('section[role="alert"]').filter({ hasText: /qa / }).first()
    await request.waitFor({ state: 'visible', timeout: 15000 })
    await interpreter.reload()
    await request.waitFor({ state: 'visible', timeout: 15000 })
    await request.getByRole('button', { name: /Accept/ }).click()
    await interpreter.waitForURL(`**/interpreter/call/${sessionId}`)
    const token = await interpreter.request.post(`${origin}/api/livekit-token`, {
      data: { roomName: sessionId }, headers: { Origin: origin },
    })
    if (!token.ok()) throw new Error(`Interpreter video authorization: ${token.status()} ${await token.text()}`)
    console.log('PASS: request survives disconnected receiver and reload; interpreter accepts and receives video authorization')
  } finally {
    if (sessionId) {
      const closed = await post(`/api/session/${sessionId}/status`, { status: 'closed', activeMode: 'pictogram' })
      if (!closed.ok()) throw new Error(`Could not close test session: ${closed.status()}`)
    }
    await tabletContext.close()
    await interpreterContext.close()
  }
}
