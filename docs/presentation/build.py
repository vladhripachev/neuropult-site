import re, sys, pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

D = pathlib.Path(__file__).parent
GEN = D / "gen"
OUT_PDF = pathlib.Path(sys.argv[1])
MOBILE = "--mobile" in sys.argv
SRC, BUILT, W, H, OPT, PNG = (("mobile.html", "mobile.built.html", 1080, 2340, "opt-m", "png-m") if MOBILE
                              else ("deck.html", "deck.built.html", 1920, 1080, "opt", "png"))

# trimmed generated images
imgs = {}
for name in ["console", "battery", "calendar", "rocket", "team"]:
    dst = D / "img" / f"gen-{name}.webp"
    if not dst.exists():
        im = Image.open(GEN / f"{name}.png").convert("RGBA")
        im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
        im.save(dst, quality=90)
    imgs[f"%IMG_{name.upper()}%"] = f"img/gen-{name}.webp"

html = (D / SRC).read_text(encoding="utf-8")
icons = (D / "img" / "icons.svg").read_text(encoding="utf-8")
icons = re.sub(r'<svg ', '<svg width="0" height="0" style="position:absolute" ', icons, count=1).replace('style="display:none"', "")
logo = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#372AAC"/><path fill="#fff" d="M16 6.4C17.37 12.74 19.26 14.63 25.6 16C19.26 17.37 17.37 19.26 16 25.6C14.63 19.26 12.74 17.37 6.4 16C12.74 14.63 14.63 12.74 16 6.4Z"/></svg>'
logo_w = logo.replace('fill="#372AAC"', 'fill="#fff"').replace('fill="#fff" d=', 'fill="#372AAC" d=')
html = html.replace("<!--ICONS-->", icons).replace("%LOGO_W%", logo_w).replace("%LOGO%", logo)
for k, v in imgs.items():
    html = html.replace(k, v)
# PDF-size optimisation: resize to ~1.3x display width; opaque photos -> JPEG
DISPLAY = {"gen-console": 720, "gen-team": 520, "gen-calendar": 330, "gen-battery": 210, "gen-rocket": 380,
           "core": 540, "cloud": 260, "server": 170, "shield": 560, "enterprise": 330, "agents": 760, "laptop": 760,
           "persona-owner": 340, "persona-marketing": 340, "persona-sales": 340, "persona-dev": 340, "persona-enterprise": 340,
           "hero-bg": 1920}
if MOBILE:  # display widths on a 1080px-wide portrait page
    DISPLAY = {"gen-console": 820, "gen-team": 620, "gen-calendar": 300, "gen-battery": 220, "gen-rocket": 330,
               "core": 560, "cloud": 230, "server": 120, "shield": 330, "enterprise": 330, "agents": 560, "laptop": 620,
               "persona-owner": 230, "persona-marketing": 230, "persona-sales": 230, "persona-dev": 230, "persona-enterprise": 230,
               "hero-bg": 1080}
opt = D / "img" / OPT; opt.mkdir(exist_ok=True)
for name, w in DISPLAY.items():
    src = D / "img" / f"{name}.webp"
    if not src.exists():
        continue
    im = Image.open(src)
    tw = min(im.width, int(w * (1.15 if MOBILE else 1.3))) if name != "hero-bg" else im.width
    if tw < im.width:
        im = im.resize((tw, round(im.height * tw / im.width)), Image.LANCZOS)
    has_alpha = im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255
    if has_alpha:
        out = opt / f"{name}.png"; im.save(out, optimize=True)
    else:
        out = opt / f"{name}.jpg"; im.convert("RGB").save(out, quality=(80 if MOBILE else 86), optimize=True)
    html = html.replace(f"img/{name}.webp", f"img/{OPT}/{out.name}")
(D / BUILT).write_text(html, encoding="utf-8")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", args=["--no-proxy-server"])
    pg = b.new_page(viewport={"width": W, "height": H})
    pg.goto((D / BUILT).as_uri(), wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(800)
    # overflow check
    print(pg.evaluate("""() => [...document.querySelectorAll('.slide, .s')].map((s,i)=>{
        const r=s.getBoundingClientRect(); const bad=[];
        s.querySelectorAll('*').forEach(e=>{const q=e.getBoundingClientRect(); if(q.width && (q.bottom>r.bottom+1||q.right>r.right+1)) bad.push(e.className||e.tagName)});
        return (i+1)+':'+bad.slice(0,4).join(',')})"""))
    if "--png" in sys.argv:
        shots = D / PNG; shots.mkdir(exist_ok=True)
        for i, el in enumerate(pg.query_selector_all(".slide, .s")):
            el.screenshot(path=str(shots / f"{i+1:02d}.png"))
    pg.pdf(path=str(OUT_PDF), width=f"{W}px", height=f"{H}px", print_background=True, prefer_css_page_size=True)
    b.close()
print("ok", OUT_PDF)
