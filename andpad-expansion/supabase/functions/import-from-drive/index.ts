// import-from-drive: Google Driveのファイル操作プロキシ
// action: list(一覧), download(DL), delete(削除)

import { getDriveToken, listXlsxFiles, downloadFile, deleteFile } from './drive.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
    if (!folderId) {
      return Response.json({ error: 'GOOGLE_DRIVE_FOLDER_ID not set' }, { status: 500, headers: corsHeaders })
    }

    const token = await getDriveToken()
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'list'

    // ファイル一覧
    if (action === 'list') {
      const files = await listXlsxFiles(token, folderId)
      return Response.json({ files }, { headers: corsHeaders })
    }

    // ファイルダウンロード（バイナリを返す）
    if (action === 'download') {
      const fileId = body.fileId
      if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400, headers: corsHeaders })
      const buffer = await downloadFile(token, fileId)
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      })
    }

    // ファイル削除
    if (action === 'delete') {
      const fileId = body.fileId
      if (!fileId) return Response.json({ error: 'fileId required' }, { status: 400, headers: corsHeaders })
      await deleteFile(token, fileId)
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400, headers: corsHeaders })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`import-from-drive error: ${msg}`)
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders })
  }
})
