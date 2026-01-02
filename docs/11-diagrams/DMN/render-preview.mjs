import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  console.error('Usage: node docs/11-diagrams/DMN/render-preview.mjs <input.dmn> <output.png>')
  process.exit(1)
}

const canonicalXml = await readFile(inputPath, 'utf8')
const renderXml = canonicalXml
  .replaceAll(
    'https://www.omg.org/spec/DMN/20230324/MODEL/',
    'https://www.omg.org/spec/DMN/20191111/MODEL/'
  )
  .replaceAll(
    'https://www.omg.org/spec/DMN/20230324/DMNDI/',
    'https://www.omg.org/spec/DMN/20191111/DMNDI/'
  )

const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({
    viewport: { width: 1250, height: 500 },
    deviceScaleFactor: 2,
  })

  await page.setContent('<!doctype html><html><body><div id="canvas"></div></body></html>')
  await page.addStyleTag({
    url: 'https://unpkg.com/dmn-js@17.8.1/dist/assets/dmn-js-shared.css',
  })
  await page.addStyleTag({
    url: 'https://unpkg.com/dmn-js@17.8.1/dist/assets/dmn-js-drd.css',
  })
  await page.addStyleTag({
    url: 'https://unpkg.com/dmn-js@17.8.1/dist/assets/dmn-font/css/dmn.css',
  })
  await page.addStyleTag({
    content:
      'html,body,#canvas{width:100%;height:100%;margin:0;background:#fff;overflow:hidden}' +
      '.dmn-definitions,.bjs-powered-by{display:none!important}',
  })
  await page.addScriptTag({
    url: 'https://unpkg.com/dmn-js@17.8.1/dist/dmn-viewer.production.min.js',
  })

  const warnings = await page.evaluate(async (xml) => {
    const viewer = new window.DmnJS({ container: '#canvas' })
    const imported = await viewer.importXML(xml)
    viewer.getActiveViewer().get('canvas').zoom('fit-viewport')
    return imported.warnings.map((warning) => warning.message)
  }, renderXml)

  if (warnings.length > 0) {
    throw new Error(`DMN render warnings: ${warnings.join('; ')}`)
  }

  await page.locator('#canvas').screenshot({ path: outputPath })
} finally {
  await browser.close()
}

console.log(`Rendered ${inputPath} -> ${outputPath}`)

