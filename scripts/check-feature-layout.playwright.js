/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI reads this file as a callback expression. */
async (page) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('http://localhost:3100/')
  const titles = ['Live Interpreter Relay', 'In-Browser Vision AI', 'Medico-Legal Audit Trail']
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.getByRole('heading', { name: titles[0], exact: true }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200) // Allow both the stagger delay and scroll reveal transition to finish.
  const cards = await page.locator('#features h3').evaluateAll((headings, titles) => headings
    .filter((heading) => titles.includes(heading.textContent.trim()))
    .map((heading) => {
      const card = heading.closest('.group')
      const rect = card.getBoundingClientRect()
      return { title: heading.textContent.trim(), top: rect.top, left: rect.left, width: rect.width }
    }), titles)
  if (cards.length !== 3 || Math.max(...cards.map((card) => card.top)) - Math.min(...cards.map((card) => card.top)) > 1) {
    throw new Error(`Desktop cards do not share a row: ${JSON.stringify(cards)}`)
  }
  console.log('Desktop feature cards share one row:', cards)
  await page.screenshot({ path: 'docs/feature-cards-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('heading', { name: titles[0], exact: true }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(700)
  const mobile = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }))
  if (mobile.content > mobile.viewport) throw new Error(`Mobile overflow: ${JSON.stringify(mobile)}`)
  console.log('Mobile feature layout fits viewport:', mobile)
  await page.goto('http://localhost:3100/login')
  await page.getByText('DEMO ACCOUNTS', { exact: true }).waitFor({ state: 'visible' })
  if (await page.getByText('ACTIVE BEDS', { exact: true }).count()) throw new Error('Anonymous bed roster visible')
  console.log('Portal displays judge credentials and hides anonymous bed roster')
  await page.goto('http://localhost:3100/auth/hospital')
  await page.getByRole('button', { name: /Dr\. Rajesh Sharma/ }).click()
  if (await page.locator('input[type="email"]').inputValue() !== 'dr.sharma@apollo.health') throw new Error('Doctor email not filled')
  if (await page.locator('input[type="password"]').inputValue() !== 'Ishara2026!') throw new Error('Doctor password not filled')
  await page.goto('http://localhost:3100/auth/interpreter')
  await page.getByRole('button', { name: /Ananya Deshmukh/ }).click()
  if (await page.locator('input[type="email"]').inputValue() !== 'ananya.isl@relay.org') throw new Error('Interpreter email not filled')
  if (await page.locator('input[type="password"]').inputValue() !== 'Ishara2026!') throw new Error('Interpreter password not filled')
  console.log('Judge account suggestions fill both login forms')
}
