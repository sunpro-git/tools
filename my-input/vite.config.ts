import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, unlink } from 'fs/promises'

/** Vite plugin: local yt-dlp proxy for YouTube transcript extraction.
 *  YouTube blocks cloud IPs and Node.js TLS fingerprints for caption APIs.
 *  yt-dlp (Python) with ANDROID_VR client is the only reliable method.
 *  Endpoint: GET /api/yt-transcript?v=VIDEO_ID */
function ytTranscriptPlugin(): Plugin {
  return {
    name: 'yt-transcript-proxy',
    configureServer(server) {
      server.middlewares.use('/api/yt-transcript', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost')
        const videoId = url.searchParams.get('v')

        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid video ID' }))
          return
        }

        const tmpFile = join(tmpdir(), `yt-sub-${videoId}-${Date.now()}`)

        try {
          // Run yt-dlp to download subtitle file
          const transcript = await new Promise<string>((resolve, reject) => {
            const args = [
              '--write-auto-sub',
              '--sub-lang', 'ja',
              '--skip-download',
              '--sub-format', 'srv3',
              '-o', tmpFile,
              `https://www.youtube.com/watch?v=${videoId}`,
            ]

            execFile('yt-dlp', args, { timeout: 30000 }, async (err, _stdout, stderr) => {
              if (err) {
                reject(new Error(`yt-dlp failed: ${stderr || err.message}`))
                return
              }

              try {
                const srtPath = `${tmpFile}.ja.srv3`
                const xml = await readFile(srtPath, 'utf8')
                // Clean up temp file
                unlink(srtPath).catch(() => {})

                // Parse srv3 XML to plain text
                const segments: string[] = []
                const decode = (t: string) => t
                  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
                  .replace(/\n/g, ' ').trim()

                if (xml.includes('format="3"')) {
                  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g
                  let m
                  while ((m = pRegex.exec(xml)) !== null) {
                    const sRegex = /<s[^>]*>([^<]*)<\/s>/g
                    let seg = ''
                    let sm
                    while ((sm = sRegex.exec(m[1])) !== null) seg += sm[1]
                    if (!seg) seg = m[1].replace(/<[^>]+>/g, '')
                    seg = decode(seg)
                    if (seg) segments.push(seg)
                  }
                } else {
                  const tRegex = /<text[^>]*>([\s\S]*?)<\/text>/g
                  let m
                  while ((m = tRegex.exec(xml)) !== null) {
                    const t = decode(m[1])
                    if (t) segments.push(t)
                  }
                }

                resolve(segments.join(' '))
              } catch (readErr) {
                reject(new Error(`Failed to read subtitle file: ${readErr}`))
              }
            })
          })

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ transcript, length: transcript.length }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: (e as Error).message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    ytTranscriptPlugin(),
  ],
  base: '/my-input/',
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
  },
})
