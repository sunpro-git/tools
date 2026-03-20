// SVG-based demo image generator (separate .js file to avoid JSX parser issues)
const ICONS = { 'パンフレット': '📖', 'カタログ': '📚', 'チラシ': '📄', '封筒': '✉️', 'ファイル': '📁', '紙類': '📃' };

export function makeDemoImage(name, genre, group, bgColor, accentColor) {
  const icon = ICONS[group] || '📋';
  const label = name.length > 12 ? name.slice(0, 12) + '…' : name;
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">',
    '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" style="stop-color:' + bgColor + '"/>',
    '<stop offset="100%" style="stop-color:' + accentColor + '"/>',
    '</linearGradient></defs>',
    '<rect width="300" height="400" fill="url(#bg)" rx="8"/>',
    '<rect x="20" y="20" width="260" height="360" rx="6" fill="white" opacity="0.95"/>',
    '<rect x="20" y="20" width="260" height="80" rx="6" fill="' + accentColor + '" opacity="0.15"/>',
    '<text x="150" y="60" text-anchor="middle" font-size="12" font-weight="bold" fill="' + accentColor + '" font-family="sans-serif">' + genre + '</text>',
    '<text x="150" y="170" text-anchor="middle" font-size="48">' + icon + '</text>',
    '<text x="150" y="230" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155" font-family="sans-serif">' + label + '</text>',
    '<text x="150" y="255" text-anchor="middle" font-size="11" fill="#94a3b8" font-family="sans-serif">' + group + '</text>',
    '<rect x="40" y="280" width="220" height="4" rx="2" fill="#e2e8f0"/>',
    '<rect x="40" y="294" width="180" height="4" rx="2" fill="#e2e8f0"/>',
    '<rect x="40" y="308" width="200" height="4" rx="2" fill="#e2e8f0"/>',
    '<rect x="100" y="340" width="100" height="28" rx="14" fill="' + accentColor + '" opacity="0.2"/>',
    '<text x="150" y="359" text-anchor="middle" font-size="10" font-weight="bold" fill="' + accentColor + '" font-family="sans-serif">SAMPLE</text>',
    '</svg>',
  ].join('');
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}
