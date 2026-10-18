"""Makes the booking QR code: assets/img/qr-prenota.svg and .png.

Run again after moving the site to its own domain:  python tools/qr.py https://www.example.it/#prenota
"""
import os, sys
import qrcode
from qrcode.constants import ERROR_CORRECT_H

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://souheilcharefkhoudja.github.io/barber-room-catania/#prenota'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')

# High error correction, so the BR monogram in the middle never stops it scanning.
qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, border=0)
qr.add_data(URL)
qr.make(fit=True)
m = qr.get_matrix()
n = len(m)
hole = n * 0.26  # monogram square, about 7% of the area: well inside what level H can lose
lo, hi = (n - hole) / 2, (n + hole) / 2

def covered(x, y):
    return lo - 0.5 < x + 0.5 < hi + 0.5 and lo - 0.5 < y + 0.5 < hi + 0.5

d = ''.join(f'M{x} {y}h1v1h-1z' for y, row in enumerate(m) for x, v in enumerate(row) if v and not covered(x, y))
pad = 2
size = n + pad * 2
c = n / 2
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {size} {size}" shape-rendering="crispEdges">
<rect x="{-pad}" y="{-pad}" width="{size}" height="{size}" fill="#f4ece0"/>
<path d="{d}" fill="#0c0908"/>
<rect x="{lo + .6}" y="{lo + .6}" width="{hole - 1.2}" height="{hole - 1.2}" rx="{hole / 2}" fill="#0c0908" shape-rendering="geometricPrecision"/>
<rect x="{lo + 1.4}" y="{lo + 1.4}" width="{hole - 2.8}" height="{hole - 2.8}" rx="{hole / 2}" fill="none" stroke="#c8a45c" stroke-width=".35" shape-rendering="geometricPrecision"/>
<text x="{c}" y="{c + hole * .16}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="{hole * .44:.2f}" fill="#e6c98c">BR</text>
</svg>
'''
open(os.path.join(OUT, 'qr-prenota.svg'), 'w', encoding='utf-8', newline='\n').write(svg)

# PNG for WhatsApp, Instagram stories and the print shop.
from PIL import Image, ImageDraw, ImageFont
S = 40
img = Image.new('RGB', (size * S, size * S), '#f4ece0')
dr = ImageDraw.Draw(img)
for y, row in enumerate(m):
    for x, v in enumerate(row):
        if v and not covered(x, y):
            dr.rectangle([(x + pad) * S, (y + pad) * S, (x + pad + 1) * S - 1, (y + pad + 1) * S - 1], fill='#0c0908')
a, b = (lo + pad + .6) * S, (hi + pad - .6) * S
dr.rounded_rectangle([a, a, b, b], radius=(b - a) / 2, fill='#0c0908')
a2, b2 = (lo + pad + 1.4) * S, (hi + pad - 1.4) * S
dr.rounded_rectangle([a2, a2, b2, b2], radius=(b2 - a2) / 2, outline='#c8a45c', width=max(2, int(.35 * S)))
font = None
for f in ('georgiai.ttf', 'C:/Windows/Fonts/georgiai.ttf', 'DejaVuSerif-Italic.ttf'):
    try: font = ImageFont.truetype(f, int(hole * .44 * S)); break
    except OSError: pass
if font:
    dr.text(((c + pad) * S, (c + pad) * S), 'BR', font=font, fill='#e6c98c', anchor='mm')
img.save(os.path.join(OUT, 'qr-prenota.png'), optimize=True)
print(URL, f'{n}x{n} modules')
