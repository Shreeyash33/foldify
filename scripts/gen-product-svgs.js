// Generate 12 origami-style product SVGs for the Foldify shop.
// Run: node scripts/gen-product-svgs.js
// Writes to: frontend/public/products/{slug}.svg

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'frontend', 'public', 'products');

// Palette
const PAPER_W = '#fbfaf7';
const PAPER_C = '#efede6';
const PAPER_S = '#e0ddd5';
const CARDBOARD = '#cbae8b';
const CARDBOARD_D = '#a98a64';
const INDIGO = '#2e4a6b';
const INDIGO_L = '#4a6a8b';
const BENI = '#a6344b';
const BENI_L = '#c44a62';
const BG_LIGHT = '#f5f3ee';
const BG_MID = '#e8e4dc';

// Background gradient (subtle paper-sunken feel)
function bg() {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PAPER_C}"/>
      <stop offset="100%" stop-color="#d3d8dd"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>`;
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  ${bg()}
  ${inner}
</svg>`;
}

// ── 1. Traditional Crane ──
function crane() {
  return svg(`
  <!-- body -->
  <polygon points="200,100 280,220 200,190" fill="${PAPER_W}" stroke="${PAPER_S}" stroke-width="1"/>
  <polygon points="200,100 120,220 200,190" fill="${PAPER_C}" stroke="${PAPER_S}" stroke-width="1"/>
  <!-- wings -->
  <polygon points="200,190 300,160 280,220" fill="${PAPER_C}" stroke="${PAPER_S}" stroke-width="1"/>
  <polygon points="200,190 100,160 120,220" fill="${PAPER_S}" stroke="${PAPER_S}" stroke-width="1"/>
  <!-- wing fold highlight -->
  <polygon points="200,190 260,155 300,160" fill="${PAPER_W}" opacity="0.6"/>
  <polygon points="200,190 140,155 100,160" fill="${PAPER_C}" opacity="0.6"/>
  <!-- tail -->
  <polygon points="200,190 195,280 205,280" fill="${PAPER_C}" stroke="${PAPER_S}" stroke-width="1"/>
  <!-- head/neck -->
  <polygon points="200,190 200,80 215,80 210,190" fill="${PAPER_W}" stroke="${PAPER_S}" stroke-width="1"/>
  <!-- head -->
  <polygon points="200,80 215,80 210,60" fill="${PAPER_C}" stroke="${PAPER_S}" stroke-width="1"/>
  <polygon points="215,80 210,60 225,55" fill="${PAPER_S}" stroke="${PAPER_S}" stroke-width="1"/>
  <!-- fold line accents -->
  <line x1="200" y1="100" x2="200" y2="190" stroke="${PAPER_S}" stroke-width="0.5" opacity="0.5"/>
  <line x1="200" y1="190" x2="300" y2="160" stroke="${PAPER_S}" stroke-width="0.5" opacity="0.3"/>
  <line x1="200" y1="190" x2="100" y2="160" stroke="${PAPER_S}" stroke-width="0.5" opacity="0.3"/>`);
}

// ── 2. Crane Flock Mobile ──
function craneFlock() {
  return svg(`
  <!-- brass rod -->
  <rect x="140" y="60" width="120" height="4" rx="2" fill="${CARDBOARD}" opacity="0.8"/>
  <!-- strings and cranes -->
  <g>
    <line x1="170" y1="64" x2="170" y2="130" stroke="${CARDBOARD_D}" stroke-width="0.8"/>
    <polygon points="170,130 150,155 190,155" fill="${INDIGO}" opacity="0.9"/>
    <polygon points="170,130 150,155 170,145" fill="${INDIGO_L}" opacity="0.7"/>
    <polygon points="170,130 190,155 170,145" fill="#3a5a7b" opacity="0.8"/>
    <polygon points="170,145 170,180 174,180" fill="${INDIGO}" opacity="0.8"/>
    <polygon points="170,145 170,160 160,148" fill="${INDIGO_L}" opacity="0.6"/>
  </g>
  <g>
    <line x1="200" y1="64" x2="200" y2="105" stroke="${CARDBOARD_D}" stroke-width="0.8"/>
    <polygon points="200,105 183,125 217,125" fill="${PAPER_C}" opacity="0.9"/>
    <polygon points="200,105 183,125 200,118" fill="${PAPER_W}" opacity="0.8"/>
    <polygon points="200,105 217,125 200,118" fill="${PAPER_S}" opacity="0.8"/>
    <polygon points="200,118 200,148 203,148" fill="${PAPER_C}" opacity="0.8"/>
    <polygon points="200,118 200,130 192,120" fill="${PAPER_W}" opacity="0.6"/>
  </g>
  <g>
    <line x1="230" y1="64" x2="230" y2="145" stroke="${CARDBOARD_D}" stroke-width="0.8"/>
    <polygon points="230,145 213,167 247,167" fill="#7a8a9b" opacity="0.9"/>
    <polygon points="230,145 213,167 230,158" fill="#8a9aab" opacity="0.7"/>
    <polygon points="230,145 247,167 230,158" fill="#6a7a8b" opacity="0.8"/>
    <polygon points="230,158 230,193 233,193" fill="#7a8a9b" opacity="0.8"/>
    <polygon points="230,158 230,172 222,161" fill="#8a9aab" opacity="0.6"/>
  </g>
  <g>
    <line x1="185" y1="64" x2="185" y2="165" stroke="${CARDBOARD_D}" stroke-width="0.8"/>
    <polygon points="185,165 170,184 200,184" fill="${BENI}" opacity="0.8"/>
    <polygon points="185,165 170,184 185,177" fill="${BENI_L}" opacity="0.7"/>
    <polygon points="185,165 200,184 185,177" fill="#8a2a3b" opacity="0.8"/>
    <polygon points="185,177 185,210 188,210" fill="${BENI}" opacity="0.8"/>
  </g>
  <g>
    <line x1="215" y1="64" x2="215" y2="120" stroke="${CARDBOARD_D}" stroke-width="0.8"/>
    <polygon points="215,120 200,138 230,138" fill="${CARDBOARD}" opacity="0.8"/>
    <polygon points="215,120 200,138 215,131" fill="${CARDBOARD_D}" opacity="0.7"/>
    <polygon points="215,120 230,138 215,131" fill="#b89a70" opacity="0.8"/>
    <polygon points="215,131 215,160 218,160" fill="${CARDBOARD}" opacity="0.8"/>
  </g>`);
}

// ── 3. Koi Pair ──
function koi() {
  return svg(`
  <!-- red koi (top) -->
  <polygon points="120,160 180,140 220,160 180,180" fill="${BENI}" stroke="${BENI_L}" stroke-width="0.8"/>
  <polygon points="120,160 140,140 180,140 180,180" fill="#c44a62" opacity="0.8"/>
  <polygon points="180,140 220,160 180,180" fill="#8a2a3b" opacity="0.8"/>
  <!-- tail -->
  <polygon points="120,160 90,140 100,170" fill="${BENI}" opacity="0.8"/>
  <polygon points="120,160 100,170 90,190" fill="${BENI_L}" opacity="0.7"/>
  <!-- head detail -->
  <circle cx="210" cy="158" r="3" fill="#2a1520"/>
  <!-- white koi (bottom, offset right) -->
  <polygon points="200,220 260,200 300,220 260,240" fill="${PAPER_W}" stroke="${PAPER_S}" stroke-width="0.8"/>
  <polygon points="200,220 220,200 260,200 260,240" fill="${PAPER_C}" opacity="0.8"/>
  <polygon points="260,200 300,220 260,240" fill="${PAPER_S}" opacity="0.8"/>
  <!-- tail -->
  <polygon points="200,220 170,200 180,230" fill="${PAPER_W}" opacity="0.8"/>
  <polygon points="200,220 180,230 170,250" fill="${PAPER_C}" opacity="0.7"/>
  <!-- head detail -->
  <circle cx="290" cy="218" r="3" fill="#2a1520"/>
  <!-- water ripple -->
  <ellipse cx="200" cy="200" rx="120" ry="80" fill="none" stroke="${INDIGO_L}" stroke-width="0.5" opacity="0.2"/>`);
}

// ── 4. Western Dragon ──
function dragon() {
  return svg(`
  <!-- body -->
  <polygon points="200,120 260,180 240,260 160,260 140,180" fill="#2a2a30" stroke="#3a3a40" stroke-width="0.8"/>
  <polygon points="200,120 260,180 200,200" fill="#3a3a42" opacity="0.8"/>
  <polygon points="200,120 140,180 200,200" fill="#1a1a20" opacity="0.8"/>
  <!-- wings left -->
  <polygon points="140,180 60,120 80,200 140,220" fill="#3a3a42" stroke="#4a4a52" stroke-width="0.8"/>
  <polygon points="140,180 60,120 100,160" fill="#4a4a52" opacity="0.7"/>
  <line x1="100" y1="160" x2="140" y2="220" stroke="#4a4a52" stroke-width="0.8" opacity="0.5"/>
  <line x1="80" y1="140" x2="140" y2="210" stroke="#4a4a52" stroke-width="0.6" opacity="0.4"/>
  <!-- wings right -->
  <polygon points="260,180 340,120 320,200 260,220" fill="#2a2a32" stroke="#3a3a40" stroke-width="0.8"/>
  <polygon points="260,180 340,120 300,160" fill="#3a3a42" opacity="0.7"/>
  <line x1="300" y1="160" x2="260" y2="220" stroke="#3a3a42" stroke-width="0.8" opacity="0.5"/>
  <!-- neck/head -->
  <polygon points="200,120 190,70 210,70" fill="#2a2a30" stroke="#3a3a40" stroke-width="0.8"/>
  <polygon points="190,70 210,70 200,50" fill="#3a3a42" opacity="0.8"/>
  <!-- horns -->
  <polygon points="190,70 180,50 185,72" fill="#4a4a52"/>
  <polygon points="210,70 220,50 215,72" fill="#3a3a42"/>
  <!-- eyes -->
  <circle cx="195" cy="62" r="2" fill="${BENI}"/>
  <circle cx="205" cy="62" r="2" fill="${BENI}"/>
  <!-- tail -->
  <polygon points="200,260 180,310 220,310" fill="#2a2a30"/>
  <polygon points="180,310 160,330 200,320" fill="#3a3a42"/>
  <!-- spines -->
  <polygon points="195,260 200,250 205,260" fill="#4a4a52"/>
  <polygon points="195,275 200,265 205,275" fill="#4a4a52"/>
  <polygon points="195,290 200,280 205,290" fill="#3a3a42"/>
  <!-- claws -->
  <line x1="170" y1="260" x2="160" y2="280" stroke="#4a4a52" stroke-width="1.5"/>
  <line x1="175" y1="262" x2="165" y2="282" stroke="#3a3a42" stroke-width="1.5"/>
  <line x1="230" y1="260" x2="240" y2="280" stroke="#3a3a42" stroke-width="1.5"/>
  <line x1="225" y1="262" x2="235" y2="282" stroke="#2a2a30" stroke-width="1.5"/>`);
}

// ── 5. Lotus Blossom ──
function lotus() {
  return svg(`
  <!-- petals layer 1 (back) -->
  <polygon points="200,100 170,180 230,180" fill="${BENI_L}" opacity="0.6"/>
  <polygon points="140,140 160,220 200,160" fill="${BENI}" opacity="0.5"/>
  <polygon points="260,140 240,220 200,160" fill="${BENI}" opacity="0.5"/>
  <!-- petals layer 2 (mid) -->
  <polygon points="200,110 165,185 235,185" fill="${BENI}" opacity="0.7"/>
  <polygon points="155,150 170,210 200,170" fill="${BENI_L}" opacity="0.7"/>
  <polygon points="245,150 230,210 200,170" fill="#c44a62" opacity="0.7"/>
  <!-- petals layer 3 (front) -->
  <polygon points="200,120 175,190 225,190" fill="${BENI}" opacity="0.85"/>
  <polygon points="165,160 180,210 200,180" fill="${BENI_L}" opacity="0.85"/>
  <polygon points="235,160 220,210 200,180" fill="#8a2a3b" opacity="0.85"/>
  <!-- side petals -->
  <polygon points="130,170 160,200 140,220" fill="${BENI}" opacity="0.6"/>
  <polygon points="270,170 240,200 260,220" fill="${BENI}" opacity="0.6"/>
  <!-- center -->
  <circle cx="200" cy="175" r="8" fill="${CARDBOARD}" opacity="0.8"/>
  <circle cx="200" cy="175" r="4" fill="${CARDBOARD_D}" opacity="0.7"/>
  <!-- leaf -->
  <polygon points="160,250 200,230 240,250 200,280" fill="#6a8a5a" opacity="0.5"/>
  <polygon points="200,230 200,280" stroke="#5a7a4a" stroke-width="0.8" opacity="0.5"/>`);
}

// ── 6. Tulip Trio ──
function tulip() {
  return svg(`
  <!-- stems -->
  <line x1="155" y1="200" x2="155" y2="300" stroke="#6a8a5a" stroke-width="2.5"/>
  <line x1="200" y1="190" x2="200" y2="310" stroke="#6a8a5a" stroke-width="2.5"/>
  <line x1="245" y1="200" x2="245" y2="300" stroke="#6a8a5a" stroke-width="2.5"/>
  <!-- leaf left -->
  <polygon points="155,260 120,280 155,270" fill="#7a9a6a" opacity="0.7"/>
  <!-- leaf right -->
  <polygon points="245,250 280,265 245,260" fill="#7a9a6a" opacity="0.7"/>
  <!-- tulip 1 (yellow) -->
  <polygon points="155,200 140,160 155,130" fill="#e8c840" opacity="0.85"/>
  <polygon points="155,200 170,160 155,130" fill="#d4b430" opacity="0.85"/>
  <polygon points="140,160 155,130 170,160" fill="#f0d850" opacity="0.7"/>
  <polygon points="140,160 155,180 170,160" fill="#e8c840" opacity="0.9"/>
  <!-- tulip 2 (coral) -->
  <polygon points="200,190 185,145 200,115" fill="${BENI}" opacity="0.85"/>
  <polygon points="200,190 215,145 200,115" fill="#c44a62" opacity="0.85"/>
  <polygon points="185,145 200,115 215,145" fill="${BENI_L}" opacity="0.7"/>
  <polygon points="185,145 200,170 215,145" fill="${BENI}" opacity="0.9"/>
  <!-- tulip 3 (white) -->
  <polygon points="245,200 230,160 245,130" fill="${PAPER_W}" opacity="0.9"/>
  <polygon points="245,200 260,160 245,130" fill="${PAPER_C}" opacity="0.9"/>
  <polygon points="230,160 245,130 260,160" fill="${PAPER_S}" opacity="0.7"/>
  <polygon points="230,160 245,180 260,160" fill="${PAPER_W}" opacity="0.95"/>`);
}

// ── 7. Kawasaki Rose ──
function rose() {
  return svg(`
  <!-- outer petals -->
  <polygon points="200,100 250,170 200,190" fill="${BENI}" opacity="0.7"/>
  <polygon points="200,100 150,170 200,190" fill="${BENI_L}" opacity="0.7"/>
  <polygon points="250,170 280,250 200,210" fill="#8a2a3b" opacity="0.7"/>
  <polygon points="150,170 120,250 200,210" fill="${BENI}" opacity="0.7"/>
  <polygon points="280,250 200,300 200,210" fill="${BENI}" opacity="0.6"/>
  <polygon points="120,250 200,300 200,210" fill="#8a2a3b" opacity="0.6"/>
  <!-- spiral center -->
  <path d="M200,180 Q215,175 210,195 Q205,210 190,205 Q175,200 180,185 Q185,170 200,175" fill="none" stroke="#c44a62" stroke-width="2" opacity="0.8"/>
  <path d="M200,185 Q210,182 207,197 Q204,207 193,204 Q183,201 186,190 Q189,180 200,183" fill="none" stroke="${BENI_L}" stroke-width="1.5" opacity="0.6"/>
  <!-- center -->
  <circle cx="200" cy="192" r="5" fill="#c44a62" opacity="0.8"/>
  <!-- petal edges -->
  <line x1="200" y1="100" x2="250" y2="170" stroke="#8a2a3b" stroke-width="0.5" opacity="0.4"/>
  <line x1="200" y1="100" x2="150" y2="170" stroke="${BENI}" stroke-width="0.5" opacity="0.4"/>
  <!-- stem hint -->
  <line x1="200" y1="300" x2="200" y2="340" stroke="#6a8a5a" stroke-width="2"/>`);
}

// ── 8. Sonobe Cube ──
function sonobe() {
  return svg(`
  <!-- top face -->
  <polygon points="200,100 280,140 200,180 120,140" fill="${INDIGO}" stroke="#1a3a5b" stroke-width="1"/>
  <polygon points="200,100 280,140 200,140" fill="${INDIGO_L}" opacity="0.5"/>
  <!-- left face -->
  <polygon points="120,140 200,180 200,280 120,240" fill="#3a5a7b" stroke="#1a3a5b" stroke-width="1"/>
  <polygon points="120,140 200,180 200,210 140,180" fill="${INDIGO_L}" opacity="0.3"/>
  <!-- right face -->
  <polygon points="200,180 280,140 280,240 200,280" fill="#1a3a5b" stroke="#0a2a4b" stroke-width="1"/>
  <polygon points="200,180 280,140 280,190 230,210" fill="${INDIGO}" opacity="0.3"/>
  <!-- unit fold lines on top -->
  <line x1="160" y1="120" x2="200" y2="140" stroke="#4a6a8b" stroke-width="0.8" opacity="0.5"/>
  <line x1="200" y1="100" x2="200" y2="140" stroke="#4a6a8b" stroke-width="0.8" opacity="0.5"/>
  <line x1="240" y1="120" x2="200" y2="140" stroke="#4a6a8b" stroke-width="0.8" opacity="0.5"/>
  <!-- unit fold lines on left -->
  <line x1="160" y1="190" x2="200" y2="230" stroke="#4a6a8b" stroke-width="0.6" opacity="0.4"/>
  <!-- unit fold lines on right -->
  <line x1="240" y1="190" x2="200" y2="230" stroke="#0a2a4b" stroke-width="0.6" opacity="0.4"/>`);
}

// ── 9. Kusudama Flower Ball ──
function kusudama() {
  return svg(`
  <!-- main sphere outline -->
  <circle cx="200" cy="190" r="90" fill="none" stroke="${PAPER_S}" stroke-width="0.5" opacity="0.3"/>
  <!-- flower units arranged in a sphere pattern -->
  <g transform="translate(200,130)">
    <polygon points="0,-15 -12,0 0,8 12,0" fill="${BENI}" opacity="0.8"/>
    <polygon points="0,-15 -12,0 0,0" fill="${BENI_L}" opacity="0.6"/>
  </g>
  <g transform="translate(155,160)">
    <polygon points="0,-12 -10,0 0,6 10,0" fill="${INDIGO}" opacity="0.8"/>
    <polygon points="0,-12 -10,0 0,0" fill="${INDIGO_L}" opacity="0.6"/>
  </g>
  <g transform="translate(245,160)">
    <polygon points="0,-12 -10,0 0,6 10,0" fill="${BENI}" opacity="0.75"/>
    <polygon points="0,-12 -10,0 0,0" fill="#8a2a3b" opacity="0.6"/>
  </g>
  <g transform="translate(170,210)">
    <polygon points="0,-12 -10,0 0,6 10,0" fill="#e8c840" opacity="0.7"/>
    <polygon points="0,-12 -10,0 0,0" fill="#d4b430" opacity="0.6"/>
  </g>
  <g transform="translate(230,210)">
    <polygon points="0,-12 -10,0 0,6 10,0" fill="${INDIGO}" opacity="0.75"/>
    <polygon points="0,-12 -10,0 0,0" fill="#1a3a5b" opacity="0.6"/>
  </g>
  <g transform="translate(200,250)">
    <polygon points="0,-10 -8,0 0,5 8,0" fill="${BENI}" opacity="0.7"/>
    <polygon points="0,-10 -8,0 0,0" fill="${BENI_L}" opacity="0.5"/>
  </g>
  <g transform="translate(130,190)">
    <polygon points="0,-10 -8,0 0,5 8,0" fill="#e8c840" opacity="0.65"/>
    <polygon points="0,-10 -8,0 0,0" fill="#d4b430" opacity="0.5"/>
  </g>
  <g transform="translate(270,190)">
    <polygon points="0,-10 -8,0 0,5 8,0" fill="${BENI}" opacity="0.65"/>
    <polygon points="0,-10 -8,0 0,0" fill="#8a2a3b" opacity="0.5"/>
  </g>
  <g transform="translate(200,170)">
    <polygon points="0,-10 -8,0 0,5 8,0" fill="${PAPER_W}" opacity="0.7"/>
    <polygon points="0,-10 -8,0 0,0" fill="${PAPER_C}" opacity="0.6"/>
  </g>
  <!-- tassel -->
  <line x1="200" y1="280" x2="200" y2="340" stroke="${CARDBOARD_D}" stroke-width="1.5"/>
  <polygon points="195,340 200,360 205,340" fill="${CARDBOARD}" opacity="0.7"/>
  <polygon points="193,342 195,355 197,342" fill="${CARDBOARD_D}" opacity="0.5"/>
  <polygon points="203,342 205,355 207,342" fill="${CARDBOARD_D}" opacity="0.5"/>`);
}

// ── 10. Icosahedral Star Cluster ──
function icosahedron() {
  return svg(`
  <!-- icosahedron wireframe with star points -->
  <!-- main body (triangulated faces) -->
  <polygon points="200,90 260,150 200,180" fill="${INDIGO}" stroke="#1a3a5b" stroke-width="0.8" opacity="0.8"/>
  <polygon points="200,90 140,150 200,180" fill="${INDIGO_L}" stroke="#1a3a5b" stroke-width="0.8" opacity="0.8"/>
  <polygon points="260,150 290,230 200,240" fill="#1a3a5b" stroke="#0a2a4b" stroke-width="0.8" opacity="0.8"/>
  <polygon points="140,150 110,230 200,240" fill="${INDIGO}" stroke="#1a3a5b" stroke-width="0.8" opacity="0.75"/>
  <polygon points="200,180 260,150 290,230" fill="${INDIGO_L}" opacity="0.5"/>
  <polygon points="200,180 140,150 110,230" fill="#2a4a6b" opacity="0.5"/>
  <polygon points="200,240 290,230 260,300" fill="#1a3a5b" stroke="#0a2a4b" stroke-width="0.8" opacity="0.7"/>
  <polygon points="200,240 110,230 140,300" fill="${INDIGO}" stroke="#1a3a5b" stroke-width="0.8" opacity="0.7"/>
  <polygon points="260,300 200,340 140,300" fill="${INDIGO_L}" stroke="#1a3a5b" stroke-width="0.8" opacity="0.65"/>
  <!-- star points at vertices -->
  <polygon points="200,90 195,65 205,65" fill="${PAPER_W}" opacity="0.9"/>
  <polygon points="260,150 280,140 275,155" fill="${PAPER_C}" opacity="0.8"/>
  <polygon points="140,150 120,140 125,155" fill="${PAPER_S}" opacity="0.8"/>
  <polygon points="290,230 315,230 305,240" fill="${PAPER_W}" opacity="0.7"/>
  <polygon points="110,230 85,230 95,240" fill="${PAPER_C}" opacity="0.7"/>
  <polygon points="260,300 278,315 262,312" fill="${PAPER_S}" opacity="0.6"/>
  <polygon points="140,300 122,315 138,312" fill="${PAPER_W}" opacity="0.6"/>
  <polygon points="200,340 195,358 205,358" fill="${PAPER_C}" opacity="0.6"/>`);
}

// ── 11. Nested Masu Boxes ──
function masuBox() {
  return svg(`
  <!-- outer box (largest) -->
  <polygon points="100,180 200,140 300,180 300,280 200,320 100,280" fill="${CARDBOARD}" stroke="${CARDBOARD_D}" stroke-width="1"/>
  <polygon points="100,180 200,140 200,240 100,280" fill="${CARDBOARD_D}" opacity="0.5"/>
  <polygon points="200,140 300,180 300,280 200,240" fill="#b89a70" opacity="0.5"/>
  <!-- middle box (visible inside) -->
  <polygon points="130,195 200,165 270,195 270,265 200,295 130,265" fill="${PAPER_C}" stroke="${PAPER_S}" stroke-width="0.8"/>
  <polygon points="130,195 200,165 200,235 130,265" fill="${PAPER_S}" opacity="0.5"/>
  <polygon points="200,165 270,195 270,265 200,235" fill="${PAPER_W}" opacity="0.5"/>
  <!-- smallest box (visible inside middle) -->
  <polygon points="155,210 200,190 245,210 245,250 200,270 155,250" fill="${PAPER_W}" stroke="${PAPER_S}" stroke-width="0.6"/>
  <polygon points="155,210 200,190 200,230 155,250" fill="${PAPER_S}" opacity="0.4"/>
  <polygon points="200,190 245,210 245,250 200,230" fill="${PAPER_C}" opacity="0.4"/>
  <!-- lid (hovering above) -->
  <polygon points="90,140 200,100 310,140 200,175" fill="${CARDBOARD}" stroke="${CARDBOARD_D}" stroke-width="0.8" opacity="0.7"/>
  <polygon points="90,140 200,100 200,155 90,175" fill="${CARDBOARD_D}" opacity="0.3"/>
  <polygon points="200,100 310,140 200,175" fill="#b89a70" opacity="0.3"/>`);
}

// ── 12. Eight-Point Star Bowl ──
function starBowl() {
  return svg(`
  <!-- bowl base (octagonal) -->
  <polygon points="200,200 250,170 290,200 280,250 240,280 200,270 160,280 120,250 110,200 150,170" fill="#5a8a4a" opacity="0.3"/>
  <!-- star points (8 points radiating from center) -->
  <polygon points="200,200 200,100 215,170" fill="#6a9a5a" stroke="#5a8a4a" stroke-width="0.8"/>
  <polygon points="200,200 270,130 230,180" fill="#5a8a4a" stroke="#4a7a3a" stroke-width="0.8"/>
  <polygon points="200,200 300,200 240,210" fill="#7aaa6a" stroke="#5a8a4a" stroke-width="0.8"/>
  <polygon points="200,200 270,270 225,230" fill="#6a9a5a" stroke="#5a8a4a" stroke-width="0.8"/>
  <polygon points="200,200 200,300 185,230" fill="#5a8a4a" stroke="#4a7a3a" stroke-width="0.8"/>
  <polygon points="200,200 130,270 175,230" fill="#7aaa6a" stroke="#5a8a4a" stroke-width="0.8"/>
  <polygon points="200,200 100,200 160,210" fill="#6a9a5a" stroke="#5a8a4a" stroke-width="0.8"/>
  <polygon points="200,200 130,130 175,180" fill="#5a8a4a" stroke="#4a7a3a" stroke-width="0.8"/>
  <!-- shading facets -->
  <polygon points="200,200 200,100 215,170 230,180" fill="#8aba7a" opacity="0.3"/>
  <polygon points="200,200 270,270 225,230 185,230" fill="#4a7a3a" opacity="0.3"/>
  <!-- center -->
  <circle cx="200" cy="200" r="12" fill="#5a8a4a" opacity="0.6"/>
  <circle cx="200" cy="200" r="6" fill="#4a7a3a" opacity="0.5"/>`);
}

// Map slug → generator
const generators = {
  'crane-traditional-white': crane,
  'crane-flock-mobile': craneFlock,
  'koi-pair-red-white': koi,
  'dragon-western-black': dragon,
  'lotus-blossom-pink': lotus,
  'tulip-trio-stems': tulip,
  'rose-kawasaki-crimson': rose,
  'sonobe-cube-six-unit': sonobe,
  'kusudama-flower-ball': kusudama,
  'star-cluster-icosahedron': icosahedron,
  'masu-box-nested-set': masuBox,
  'star-bowl-eight-point': starBowl,
};

fs.mkdirSync(OUT, { recursive: true });

for (const [slug, fn] of Object.entries(generators)) {
  const file = path.join(OUT, `${slug}.svg`);
  fs.writeFileSync(file, fn(), 'utf-8');
  console.log(`  ✓ ${slug}.svg`);
}

console.log(`\nGenerated ${Object.keys(generators).length} SVGs in ${OUT}`);
