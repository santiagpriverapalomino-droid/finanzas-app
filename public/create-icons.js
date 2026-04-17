const fs = require('fs')

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
  <rect width="192" height="192" rx="40" fill="#4C1D95"/>
  <polyline points="20,150 60,90 96,115 136,55 172,80" stroke="white" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="155" cy="42" r="18" fill="#FCD34D"/>
</svg>`

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="100" fill="#4C1D95"/>
  <polyline points="60,380 160,220 240,300 340,140 420,200" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="380" cy="100" r="50" fill="#FCD34D"/>
</svg>`

fs.writeFileSync('icon-192.svg', svg192)
fs.writeFileSync('icon-512.svg', svg512)
console.log('SVGs creados')