import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

// Read the original logo SVG
const logoSvg = readFileSync(resolve(projectRoot, 'public/logo.svg'), 'utf-8')

// Original viewBox: 0 0 1198.5 1480.9
// To make it square with padding:
// Height is larger (1480.9), so use that as base
// Add ~15% padding on each side
const origW = 1198.5
const origH = 1480.9
const padding = origH * 0.15
const squareSize = origH + padding * 2
const offsetX = (squareSize - origW) / 2
const offsetY = padding

// Create a new SVG with white background and centered content
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${squareSize} ${squareSize}" width="512" height="512">
  <rect width="${squareSize}" height="${squareSize}" fill="white"/>
  <g transform="translate(${offsetX}, ${offsetY})">
    ${logoSvg.replace(/<\/?svg[^>]*>/g, '')}
  </g>
</svg>`

// Generate apple-touch-icon (180x180)
await sharp(Buffer.from(iconSvg))
  .resize(180, 180)
  .png()
  .toFile(resolve(projectRoot, 'public/apple-touch-icon.png'))

console.log('Generated apple-touch-icon.png (180x180)')

// Generate favicon PNG (32x32) as fallback
await sharp(Buffer.from(iconSvg))
  .resize(32, 32)
  .png()
  .toFile(resolve(projectRoot, 'public/favicon-32.png'))

console.log('Generated favicon-32.png (32x32)')

// Also generate a 192x192 for PWA manifest
await sharp(Buffer.from(iconSvg))
  .resize(192, 192)
  .png()
  .toFile(resolve(projectRoot, 'public/icon-192.png'))

console.log('Generated icon-192.png (192x192)')

// And 512x512 for PWA
await sharp(Buffer.from(iconSvg))
  .resize(512, 512)
  .png()
  .toFile(resolve(projectRoot, 'public/icon-512.png'))

console.log('Generated icon-512.png (512x512)')
