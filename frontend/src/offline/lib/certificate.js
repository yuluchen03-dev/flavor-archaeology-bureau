// 离线复原证书生成器：产出自包含 SVG 字符串，可在浏览器内联渲染或打印。

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function createCertificateSvg({ title = '风味考古复原官', dishName = '', date = '' } = {}) {
  const titleText = escapeXml(title);
  const dishText = escapeXml(dishName);
  const dateText = escapeXml(date);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420" role="img" aria-label="风味考古复原证书">
  <rect x="0" y="0" width="600" height="420" fill="#fff8ec" />
  <rect x="16" y="16" width="568" height="388" fill="none" stroke="#c0392b" stroke-width="3" />
  <rect x="28" y="28" width="544" height="364" fill="none" stroke="#d4a017" stroke-width="1" />
  <text x="300" y="120" text-anchor="middle" font-family="serif" font-size="40" fill="#c0392b" font-weight="bold">${titleText}</text>
  <line x1="120" y1="160" x2="480" y2="160" stroke="#d4a017" stroke-width="1" />
  <text x="300" y="215" text-anchor="middle" font-family="serif" font-size="26" fill="#2c3e50">${dishText}</text>
  <text x="300" y="300" text-anchor="middle" font-family="serif" font-size="20" fill="#555">离线复原证书 · ${dateText}</text>
  <text x="300" y="365" text-anchor="middle" font-family="serif" font-size="16" fill="#888">风味考古局 · 离线评审模式</text>
</svg>`;
}
