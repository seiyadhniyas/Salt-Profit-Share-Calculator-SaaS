import puppeteer from 'puppeteer'
import fs from 'fs'

const URL = process.env.URL || 'http://localhost:5176'
const OUT = process.env.OUT || 'capture.pdf'

;(async ()=>{
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle2' })

  // wait for print area
  await page.waitForSelector('#print-area', { timeout: 5000 })
  // make the print area visible so PDF capture includes styles
  await page.evaluate(() => {
    const el = document.getElementById('print-area')
    if(el){ el.style.left = '0'; el.style.position = 'relative'; el.style.background = '#fff' }
  })

  // give time for reflow
  await page.waitForTimeout(300)

  const clip = await page.evaluate(() => {
    const el = document.getElementById('print-area')
    const rect = el.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
  })

  // set viewport large enough
  await page.setViewport({ width: Math.max(800, clip.width), height: Math.max(600, clip.height) })

  // capture PDF using page.pdf with a print CSS sized to element
  const pdfBuffer = await page.pdf({
    printBackground: true,
    width: Math.min(clip.width + 40, 1200) + 'px',
    height: (clip.height + 40) + 'px',
    pageRanges: '1'
  })

  fs.writeFileSync(OUT, pdfBuffer)
  console.log('Saved PDF to', OUT)
  await browser.close()
})().catch(err => { console.error(err); process.exit(1) })
