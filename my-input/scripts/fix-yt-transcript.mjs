import https from 'https';

function httpsPost(url, data, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

function httpsPatch(url, data, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'PATCH', headers }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  const playerData = JSON.parse(await httpsPost(
    'https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
    { context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'ja', gl: 'JP' } }, videoId: 'acrXa0h5nAI' },
    { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip' }
  ));

  const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  console.log('Tracks:', tracks.length);
  const track = tracks.find(t => t.languageCode === 'ja') || tracks[0];
  if (!track) { console.log('No tracks'); return; }
  console.log('Selected:', track.languageCode, track.kind || 'manual');

  const xml = await httpsGet(track.baseUrl);
  console.log('XML length:', xml.length);
  console.log('XML preview:', xml.substring(0, 500));
  console.log('Has format=3:', xml.includes('format="3"'));

  const segments = [];

  // Try srv3 format first
  if (xml.includes('format="3"')) {
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let pm;
    while ((pm = pRegex.exec(xml)) !== null) {
      const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
      let segText = '';
      let sm;
      while ((sm = sRegex.exec(pm[1])) !== null) {
        segText += sm[1];
      }
      if (!segText) segText = pm[1].replace(/<[^>]+>/g, '');
      segText = segText.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\n/g,' ').trim();
      if (segText) segments.push(segText);
    }
    console.log('srv3 segments:', segments.length);
  }

  // Fallback: legacy format
  if (segments.length === 0) {
    console.log('Trying legacy format...');
  }
  const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    let t = m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n/g, ' ')
      .trim();
    if (t) segments.push(t);
  }
  const transcript = segments.join(' ');
  console.log('Transcript length:', transcript.length);
  console.log('First 300:', transcript.substring(0, 300));

  if (transcript.length === 0) {
    console.log('Empty transcript, aborting');
    return;
  }

  // Update DB
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aHdteG9yc2l2cWRrc3J2Y2FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODIzNzQsImV4cCI6MjA4NzQ1ODM3NH0.osfJ-F-SEAZwr1SDENLJa4Ky61iGBnIVawW09mNvMJs';
  const result = await httpsPatch(
    'https://rvhwmxorsivqdksrvcak.supabase.co/rest/v1/contents?id=eq.d94318c5-822a-4879-a7c3-60581d2f155f',
    { full_text: transcript },
    {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=minimal'
    }
  );
  console.log('DB update status:', result.status);
  if (result.body) console.log('Response:', result.body);
}

main().catch(console.error);
