"""Generate src/styles/admin-dark.css: the dark navy re-skin of the admin pages.

The admin pages (src/pages/AdminPage.tsx, src/components/admin, src/pages/admin and the two detail drawers)
are written with Tailwind's light palette (white cards, slate text, blue-600 accents). Rather than edit
~5,800 lines of markup, this script finds every colour utility those files use and emits an override for
each one, scoped under `.admin-dark`, mapped to the AquaAlert dashboard palette.

Re-run after adding new colour classes to the admin pages:   python scripts/gen_admin_theme.py
A colour class that is not in the maps below is left untouched (it stays as Tailwind draws it).
"""
from __future__ import annotations

import glob
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = (
    ['src/pages/AdminPage.tsx']
    + sorted(glob.glob('src/components/admin/*.tsx'))
    + sorted(glob.glob('src/pages/admin/*.tsx'))
    + ['src/components/sources/SourceDetailDrawer.tsx', 'src/components/alerts/AlertDetailDrawer.tsx']
)
OUT = ROOT / 'src/styles/admin-dark.css'
SCOPE = '.admin-dark'

# ---- palette (shared with the staff dashboard: src/features/staff/dashboard on the sumit branch) -----------
PAGE, PANEL, CELL, HOVER, LINE, LINE_SOFT = '#080e26', '#111a42', '#0e1740', '#16215a', '#1d2b62', '#16224f'

# Tinted surfaces / borders for status families: (50, 100, 200)
FAMILY = {
    'blue':    ('#0c2a52', '#12356a', '#1f4f95'),
    'sky':     ('#0c2a52', '#12356a', '#2a6fb8'),
    'cyan':    ('#0c3a45', '#0f4d5c', '#1d7d95'),
    'emerald': ('#0c3a3a', '#14524a', '#1d8f6f'),
    'green':   ('#0c3a3a', '#14524a', '#1d8f6f'),
    'teal':    ('#0c3a3a', '#14524a', '#1d8f6f'),
    'rose':    ('#3d1020', '#571a2e', '#a02a40'),
    'red':     ('#3d1020', '#571a2e', '#a02a40'),
    'amber':   ('#3b2a0a', '#4d380f', '#a8741a'),
    'yellow':  ('#3b2a0a', '#4d380f', '#a8741a'),
    'orange':  ('#3b2a0a', '#4d2a0f', '#b5651d'),
    'purple':  ('#2a1d5c', '#3b2a7a', '#6a4cc0'),
    'violet':  ('#2a1d5c', '#3b2a7a', '#6a4cc0'),
    'indigo':  ('#1f2a66', '#2c3a85', '#4c5fc4'),
}
NEUTRAL = {'slate', 'gray', 'zinc', 'neutral', 'stone'}

# Readable accent text on dark surfaces, by family and shade (500..900)
TEXT_FAMILY = {
    'blue':    {500: '#5aa9ff', 600: '#6ec1ff', 700: '#8fd0ff', 800: '#a8dcff', 900: '#c0e6ff'},
    'sky':     {500: '#38bdf8', 600: '#5fc8f5', 700: '#7fd6ff', 800: '#9fe0ff', 900: '#bfeaff'},
    'cyan':    {500: '#22d3ee', 600: '#4fd8ea', 700: '#67e8f9', 800: '#8ff0fb', 900: '#b3f5fd'},
    'emerald': {500: '#34d399', 600: '#3de0a6', 700: '#6ee7b7', 800: '#86efc5', 900: '#a7f3d0'},
    'green':   {500: '#34d399', 600: '#3de0a6', 700: '#6ee7b7', 800: '#86efc5', 900: '#a7f3d0'},
    'teal':    {500: '#2dd4bf', 600: '#3de0c8', 700: '#5eead4', 800: '#99f6e4', 900: '#b8f9ee'},
    'rose':    {500: '#fb7185', 600: '#ff7f8d', 700: '#ff9aa5', 800: '#ffb3bb', 900: '#ffc9cf'},
    'red':     {500: '#f87171', 600: '#ff7f8d', 700: '#ff9aa5', 800: '#ffb3bb', 900: '#ffc9cf'},
    'amber':   {500: '#fbbf24', 600: '#f7b32b', 700: '#fbbf4a', 800: '#fcd34d', 900: '#fde08a'},
    'yellow':  {500: '#facc15', 600: '#f7b32b', 700: '#fbbf4a', 800: '#fcd34d', 900: '#fde08a'},
    'orange':  {500: '#fb923c', 600: '#ffa24a', 700: '#ffb870', 800: '#ffc995', 900: '#ffd9b3'},
    'purple':  {500: '#a78bfa', 600: '#b794ff', 700: '#c4a8ff', 800: '#d4c0ff', 900: '#e2d5ff'},
    'violet':  {500: '#a78bfa', 600: '#b794ff', 700: '#c4a8ff', 800: '#d4c0ff', 900: '#e2d5ff'},
    'indigo':  {500: '#818cf8', 600: '#93a0ff', 700: '#a8b3ff', 800: '#bcc5ff', 900: '#d0d6ff'},
}
SLATE_TEXT = {900: '#ffffff', 800: '#f1f4ff', 700: '#dfe6ff', 600: '#c4cdf0', 500: '#9aa6d0', 400: '#8794c4', 300: '#7f8cc0'}
SLATE_BG = {50: CELL, 100: HOVER, 200: LINE, 300: '#2a376b'}
SLATE_BORDER = {50: LINE_SOFT, 100: LINE_SOFT, 200: LINE, 300: '#2a376b'}
SOLID_BLUE = {500: '#2d8cff', 600: '#2d8cff', 700: '#1f78e6', 800: '#1a63c0'}

# Original Tailwind values, to put things back inside the (already dark) sidebar
SIDEBAR_RESTORE = {'text-slate-300': '#cbd5e1', 'text-slate-400': '#94a3b8', 'text-slate-500': '#64748b'}


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def with_alpha(h: str, alpha: str | None) -> str:
    if alpha is None:
        return h
    r, g, b = hex_rgb(h)
    return f'rgb({r} {g} {b} / {int(alpha) / 100:g})'


def surface(name: str) -> str | None:
    """Dark equivalent of a *light* surface colour (used for bg-, gradient stops). None = leave alone."""
    if name == 'white':
        return PANEL
    if name.lower() == '[#f3f6fa]':
        return PAGE
    m = re.fullmatch(r'([a-z]+)-(\d+)', name)
    if not m:
        return None
    fam, shade = m.group(1), int(m.group(2))
    if fam in NEUTRAL:
        return SLATE_BG.get(shade)
    if fam == 'blue' and shade in SOLID_BLUE:
        return SOLID_BLUE[shade]
    if fam in FAMILY and shade in (50, 100, 200):
        return FAMILY[fam][(50, 100, 200).index(shade)]
    return None


def text_color(name: str) -> str | None:
    m = re.fullmatch(r'([a-z]+)-(\d+)', name)
    if not m:
        return None
    fam, shade = m.group(1), int(m.group(2))
    if fam in NEUTRAL:
        return SLATE_TEXT.get(shade)
    if fam in TEXT_FAMILY:
        return TEXT_FAMILY[fam].get(shade)
    return None


def border_color(name: str) -> str | None:
    if name == 'white':
        return LINE
    m = re.fullmatch(r'([a-z]+)-(\d+)', name)
    if not m:
        return None
    fam, shade = m.group(1), int(m.group(2))
    if fam in NEUTRAL:
        return SLATE_BORDER.get(shade)
    if fam in FAMILY and shade in (50, 100, 200):
        return FAMILY[fam][(50, 100, 200).index(shade)]
    if fam in FAMILY and shade == 300:
        return TEXT_FAMILY.get(fam, {}).get(600)
    return None


COLOR = (r'white|black|transparent|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|'
         r'cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|\[#[0-9a-fA-F]{3,8}\]')
TOKEN = re.compile(
    r'(?<![\w\-:/])((?:(?:hover|focus|focus-visible|focus-within|active|disabled|group-hover|file|placeholder):)*)'
    r'(bg|text|border|ring|fill|from|via|to|divide|placeholder)-(' + COLOR + r')(?:/(\d{1,3}))?(?![\w\-])'
)


def esc(token: str) -> str:
    return re.sub(r'([:/\[\]#.%()])', r'\\\1', token)


def selector(variants: list[str], cls: str, extra: str = '') -> str | None:
    """CSS selector for `variant:...:cls`; None for variants we do not theme."""
    sel = f'.{esc(cls)}'
    pseudo = ''
    group = False
    for v in variants:
        if v == 'hover':
            pseudo += ':hover'
        elif v in ('focus', 'active', 'disabled'):
            pseudo += f':{v}'
        elif v == 'focus-visible':
            pseudo += ':focus-visible'
        elif v == 'focus-within':
            pseudo += ':focus-within'
        elif v == 'file':
            pseudo += '::file-selector-button'
        elif v == 'placeholder':
            pseudo += '::placeholder'
        elif v == 'group-hover':
            group = True
        else:
            return None
    if group:
        return f'.group:hover {sel}{pseudo}{extra}'
    return f'{sel}{pseudo}{extra}'


def main() -> None:
    src = ''.join((ROOT / f).read_text(encoding='utf-8') for f in SOURCES)
    seen: dict[str, tuple[list[str], str, str, str | None]] = {}
    for m in TOKEN.finditer(src):
        variants_s, util, color, alpha = m.groups()
        variants = [v for v in variants_s.split(':') if v]
        full = f'{variants_s}{util}-{color}' + (f'/{alpha}' if alpha else '')
        seen[full] = (variants, util, color, alpha)

    rules: list[tuple[str, str]] = []
    skipped = 0
    for full, (variants, util, color, alpha) in sorted(seen.items()):
        util_eff = 'text' if (util == 'placeholder' or 'placeholder' in variants) else util
        decl = None
        if util == 'bg':
            c = surface(color)
            decl = f'background-color: {with_alpha(c, alpha)};' if c else None
        elif util == 'text' or util == 'placeholder':
            c = text_color(color)
            decl = f'color: {with_alpha(c, alpha)};' if c else None
        elif util == 'border':
            c = border_color(color)
            decl = f'border-color: {with_alpha(c, alpha)};' if c else None
        elif util == 'ring':
            c = surface(color) or border_color(color)
            decl = f'--tw-ring-color: {with_alpha(c, alpha)};' if c else None
        elif util == 'fill':
            c = surface(color)
            decl = f'fill: {with_alpha(c, alpha)};' if c else None
        elif util in ('from', 'via', 'to'):
            c = surface(color)
            if c:
                col = with_alpha(c, alpha)
                r, g, b = hex_rgb(c)
                if util == 'from':
                    decl = (f'--tw-gradient-from: {col} var(--tw-gradient-from-position); '
                            f'--tw-gradient-to: rgb({r} {g} {b} / 0) var(--tw-gradient-to-position); '
                            f'--tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);')
                elif util == 'via':
                    decl = (f'--tw-gradient-to: rgb({r} {g} {b} / 0) var(--tw-gradient-to-position); '
                            f'--tw-gradient-stops: var(--tw-gradient-from), {col} var(--tw-gradient-via-position), var(--tw-gradient-to);')
                else:
                    decl = f'--tw-gradient-to: {col} var(--tw-gradient-to-position);'
        elif util == 'divide':
            c = border_color(color)
            if c:
                sel = selector(variants, full, ' > :not([hidden]) ~ :not([hidden])')
                if sel:
                    rules.append((f'{SCOPE} {sel}', f'border-color: {with_alpha(c, alpha)};'))
                continue
        if not decl:
            skipped += 1
            continue
        sel = selector(variants, full)
        if not sel:
            skipped += 1
            continue
        rules.append((f'{SCOPE} {sel}', decl))

    sidebar = [(f'{SCOPE} aside .{esc(k)}', f'color: {v};') for k, v in SIDEBAR_RESTORE.items()]

    css = [f'''/* GENERATED by scripts/gen_admin_theme.py - do not edit by hand; re-run the script instead.
   Dark navy re-skin of the admin pages, matching the AquaAlert staff dashboard. Remove the `admin-dark`
   class from the root <div> in src/pages/AdminPage.tsx to get Tailwind's original light look back. */

/* ---- 1. Scoped Tailwind "preflight" -------------------------------------------------------------
   tailwind.config.js sets corePlugins.preflight = false (so the rest of the app is not reset), which left
   the admin pages with browser-default buttons, no border styles, etc. This restores the reset for the
   admin area only. :where() keeps specificity at 0 so every utility class still wins. */
:where(.admin-root) *, :where(.admin-root) ::before, :where(.admin-root) ::after {{ box-sizing: border-box; border-width: 0; border-style: solid; border-color: {LINE}; }}
:where(.admin-root) button, :where(.admin-root) input, :where(.admin-root) select, :where(.admin-root) textarea, :where(.admin-root) optgroup {{ font-family: inherit; font-size: 100%; font-weight: inherit; line-height: inherit; color: inherit; margin: 0; padding: 0; }}
:where(.admin-root) button, :where(.admin-root) [type='button'], :where(.admin-root) [type='submit'], :where(.admin-root) [type='reset'] {{ -webkit-appearance: button; appearance: button; background-color: transparent; background-image: none; cursor: pointer; }}
:where(.admin-root) button:disabled {{ cursor: default; }}
:where(.admin-root) h1, :where(.admin-root) h2, :where(.admin-root) h3, :where(.admin-root) h4, :where(.admin-root) h5, :where(.admin-root) h6 {{ font-size: inherit; font-weight: inherit; margin: 0; }}
:where(.admin-root) p, :where(.admin-root) figure, :where(.admin-root) blockquote, :where(.admin-root) dl, :where(.admin-root) dd, :where(.admin-root) hr, :where(.admin-root) pre {{ margin: 0; }}
:where(.admin-root) ol, :where(.admin-root) ul, :where(.admin-root) menu {{ list-style: none; margin: 0; padding: 0; }}
:where(.admin-root) img, :where(.admin-root) svg, :where(.admin-root) video, :where(.admin-root) canvas, :where(.admin-root) audio, :where(.admin-root) iframe {{ display: block; vertical-align: middle; }}
:where(.admin-root) img, :where(.admin-root) video {{ max-width: 100%; height: auto; }}
:where(.admin-root) table {{ text-indent: 0; border-color: inherit; border-collapse: collapse; }}
:where(.admin-root) a {{ color: inherit; text-decoration: inherit; }}
:where(.admin-root) textarea {{ resize: vertical; }}
:where(.admin-root) ::placeholder {{ opacity: 1; color: #6f7cae; }}
:where(.admin-root) [role='button'] {{ cursor: pointer; }}

/* ---- 2. Dark canvas -------------------------------------------------------------------------- */
/* The root <div> carries the original light classes itself (bg-[#F3F6FA] text-slate-800), which the
   descendant selectors below cannot match, so set its colours explicitly. */
.admin-root{SCOPE} {{ background-color: {PAGE}; color: #f1f4ff; color-scheme: dark; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }}
{SCOPE} {{ color-scheme: dark; }}
{SCOPE} aside {{ background-color: #0a1130; border-color: {LINE_SOFT}; }}
{SCOPE} main header {{ background-color: #0a1130; border-color: {LINE_SOFT}; }}
/* Leaflet's panes use z-index 400+; without their own stacking context they paint above fixed modals (z-50). */
.admin-root .leaflet-container {{ position: relative; z-index: 0; isolation: isolate; }}
{SCOPE} ::-webkit-scrollbar {{ width: 10px; height: 10px; }}
{SCOPE} ::-webkit-scrollbar-thumb {{ background: #2a376b; border-radius: 6px; }}
{SCOPE} ::-webkit-scrollbar-track {{ background: transparent; }}
{SCOPE} input[type='checkbox'], {SCOPE} input[type='radio'], {SCOPE} input[type='range'] {{ accent-color: #2d8cff; }}

/* ---- 3. Colour utilities used by the admin pages, remapped ({len(rules)} rules) ----------------------- */''']
    css += [f'{sel} {{ {decl} }}' for sel, decl in rules]
    css += [f"""
/* ---- 3b. Older portal components (App.css) reused inside admin modals, retuned to the same navy ----- */
{SCOPE} .portal-panel, {SCOPE} .metric-card {{ background: linear-gradient(180deg, #121b44, #0d1536); border-color: {LINE}; box-shadow: none; backdrop-filter: none; }}
{SCOPE} .portal-panel h2, {SCOPE} .panel-heading h2 {{ font-family: inherit; font-size: 1.05rem; font-weight: 700; text-transform: none; letter-spacing: 0; color: #fff; }}
{SCOPE} .panel-eyebrow, {SCOPE} .subhead {{ color: #7fd6ff; }}
{SCOPE} .muted-copy {{ color: #9aa6d0; }}
{SCOPE} .portal-form label {{ color: #9aa6d0; }}
{SCOPE} .portal-form input, {SCOPE} .portal-form select, {SCOPE} .portal-form textarea {{ background: #0b1338; border-color: #243372; color: #edf0ff; }}
{SCOPE} .portal-form input:focus, {SCOPE} .portal-form select:focus, {SCOPE} .portal-form textarea:focus {{ outline: 2px solid #2d8cff66; border-color: #2d8cff; }}
{SCOPE} .portal-form small, {SCOPE} .form-help {{ color: #8794c4; }}
{SCOPE} .primary-button {{ background: #2d8cff; color: #fff; }}
{SCOPE} .primary-button:hover:not(:disabled) {{ background: #4a9dff; }}
{SCOPE} .trust-note {{ border-left-color: #f5a524; background: #3b2a0a66; color: #f3d48a; }}
{SCOPE} .demo-pill {{ background: #0c2a52; border-color: #2a6fb8; color: #6ec1ff; }}
"""]
    css += ['', '/* ---- 4. Sidebar is already dark: keep its light text ------------------------------------------ */']
    css += [f'{sel} {{ {decl} }}' for sel, decl in sidebar]
    OUT.write_text('\n'.join(css) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(seen)} colour utilities found, {len(rules)} remapped, {skipped} left as Tailwind draws them -> {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
