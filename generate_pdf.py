# -*- coding: utf-8 -*-
"""Generate a premium school book price list PDF from data.py."""

from pathlib import Path

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

import data

ROOT = Path(__file__).resolve().parent
LOGO_PATH = ROOT / "assets" / "mahat_logo.png"

# ── Fonts (Arial supports the Naira sign on Windows) ───────────────────────────
_ARIAL = Path(r"C:\Windows\Fonts\arial.ttf")
_ARIAL_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
_ARIAL_ITALIC = Path(r"C:\Windows\Fonts\ariali.ttf")

if _ARIAL.exists():
    pdfmetrics.registerFont(TTFont("Arial", str(_ARIAL)))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(_ARIAL_BOLD)))
    pdfmetrics.registerFont(TTFont("Arial-Italic", str(_ARIAL_ITALIC)))
    FONT = "Arial"
    FONT_BOLD = "Arial-Bold"
    FONT_OBL = "Arial-Italic"
else:
    FONT = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"
    FONT_OBL = "Helvetica-Oblique"

# ── Page geometry ──────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 8 * mm
COL_GAP = 6 * mm
TOP_STRIPE = 2.5 * mm
HEADER_H = 34 * mm
FOOTER_H = 10 * mm
PRICE_W = 17 * mm
LOGO_SIZE = 20 * mm
CARD_RADIUS = 3 * mm
CARD_PAD = 3.5 * mm
SECTION_GAP = 6 * mm
ROW_GAP = 2 * mm
ROW_LINE_H = 3 * mm
ROW_MIN_H = 6 * mm
BADGE_H = 4.5 * mm
LINE_LEAD = 3.5 * mm

# ── Palette ────────────────────────────────────────────────────────────────────
NAVY = HexColor("#0B1D3A")
TEAL = HexColor("#0E6E7A")
TEAL_LIGHT = HexColor("#14919B")
GOLD = HexColor("#F5A623")
GOLD_DARK = HexColor("#D4891A")
CREAM = HexColor("#FDF8F2")
WHITE = HexColor("#FFFFFF")
INK = HexColor("#1C2333")
ROW_ALT = HexColor("#EEF3F8")
BORDER = HexColor("#D8E0EA")

SECTION_TINTS = [
    HexColor("#0E6E7A"),
    HexColor("#1B4965"),
    HexColor("#2D6A4F"),
    HexColor("#5C4D7D"),
    HexColor("#9B5E2E"),
    HexColor("#1A535C"),
]

SZ_BRAND = 11.5
SZ_EDITION = 8
SZ_TAGLINE = 6.5
SZ_SECTION = 7
SZ_ROW = 6.2
SZ_PRICE = 5.8
SZ_FOOTER = 6.5


def format_price(price: str) -> str:
    if not price or not str(price).strip():
        return ""
    return f"\u20a6{price.strip()}"


def lerp_color(c1: Color, c2: Color, t: float) -> Color:
    return Color(
        c1.red + (c2.red - c1.red) * t,
        c1.green + (c2.green - c1.green) * t,
        c1.blue + (c2.blue - c1.blue) * t,
    )


def draw_gradient_rect(c, x, y, w, h, top_color, bottom_color, steps=30):
    step_h = h / steps
    for i in range(steps):
        t = i / max(steps - 1, 1)
        c.setFillColor(lerp_color(top_color, bottom_color, t))
        c.rect(x, y + i * step_h, w, step_h + 0.5, stroke=0, fill=1)


def header_banner_rect():
    banner_h = HEADER_H - 6 * mm
    banner_y = PAGE_H - TOP_STRIPE - banner_h - 3 * mm
    return MARGIN, banner_y, PAGE_W - 2 * MARGIN, banner_h


def draw_page_background(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)

    c.saveState()
    c.setFillColor(Color(TEAL.red, TEAL.green, TEAL.blue, alpha=0.04))
    for i in range(0, int(PAGE_W / mm), 14):
        c.circle(i * mm, PAGE_H - 24 * mm, 18 * mm, stroke=0, fill=1)
    c.restoreState()

    c.setFillColor(GOLD)
    c.rect(0, PAGE_H - TOP_STRIPE, PAGE_W, TOP_STRIPE, stroke=0, fill=1)
    c.setFillColor(TEAL)
    c.rect(0, 0, PAGE_W, 1.5 * mm, stroke=0, fill=1)


def draw_header(c, page_num: int, total: int):
    bx, by, bw, bh = header_banner_rect()
    draw_gradient_rect(c, bx, by, bw, bh, NAVY, TEAL)

    c.saveState()
    c.setFillColor(Color(WHITE.red, WHITE.green, WHITE.blue, alpha=0.07))
    c.circle(bx + bw - 20 * mm, by + bh / 2, 18 * mm, stroke=0, fill=1)
    c.restoreState()

    c.setFillColor(GOLD)
    c.rect(bx, by, 3 * mm, bh, stroke=0, fill=1)

    logo_x = bx + 5 * mm
    logo_y = by + (bh - LOGO_SIZE) / 2
    if LOGO_PATH.exists():
        c.drawImage(
            str(LOGO_PATH),
            logo_x,
            logo_y,
            width=LOGO_SIZE,
            height=LOGO_SIZE,
            preserveAspectRatio=True,
            mask="auto",
        )
    else:
        draw_vector_logo(c, logo_x, logo_y, LOGO_SIZE)

    text_x = logo_x + LOGO_SIZE + 5 * mm
    text_w = bw - LOGO_SIZE - 28 * mm
    text_cx = text_x + text_w / 2

    brand_y = by + bh - 9 * mm
    edition_y = by + bh - 15 * mm
    tagline_y = by + 4 * mm

    c.setFillColor(WHITE)
    c.setFont(FONT_BOLD, SZ_BRAND)
    brand_lines = simpleSplit(data.BRAND, FONT_BOLD, SZ_BRAND, text_w)
    if len(brand_lines) > 1:
        brand_y += 2 * mm
        edition_y = by + bh - 17.5 * mm
        tagline_y = by + 3 * mm
    for i, line in enumerate(brand_lines[:2]):
        c.drawCentredString(text_cx, brand_y - i * LINE_LEAD, line)

    c.setFillColor(Color(WHITE.red, WHITE.green, WHITE.blue, alpha=0.92))
    c.setFont(FONT, SZ_EDITION)
    c.drawCentredString(text_cx, edition_y, data.EDITION)

    if page_num == 1 and edition_y - tagline_y > 6 * mm:
        c.setFont(FONT_OBL, SZ_TAGLINE)
        c.setFillColor(GOLD)
        c.drawCentredString(text_cx, tagline_y, "Quality Books  ·  Trusted Prices  ·  Nationwide Supply")

    badge_w = 14 * mm
    badge_h = 6.5 * mm
    badge_x = bx + bw - badge_w - 4 * mm
    badge_y = by + (bh - badge_h) / 2
    c.setFillColor(GOLD)
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 3 * mm, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.setFont(FONT_BOLD, 7)
    c.drawCentredString(badge_x + badge_w / 2, badge_y + 2.2 * mm, f"{page_num}/{total}")


def draw_vector_logo(c, x, y, size):
    """Fallback mark if logo file is missing."""
    c.setFillColor(WHITE)
    c.roundRect(x, y, size, size, 3 * mm, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.setFont(FONT_BOLD, size * 0.38)
    c.drawCentredString(x + size / 2, y + size * 0.32, "M")
    c.setFillColor(GOLD)
    c.rect(x + size * 0.2, y + size * 0.18, size * 0.6, 1.2 * mm, stroke=0, fill=1)


def draw_footer(c):
    bar_y = MARGIN - 1 * mm
    bar_h = FOOTER_H - 2 * mm
    c.setFillColor(NAVY)
    c.roundRect(MARGIN, bar_y, PAGE_W - 2 * MARGIN, bar_h, 2 * mm, stroke=0, fill=1)

    c.setFillColor(GOLD)
    for dx in (5, 8, 11):
        c.circle(MARGIN + dx * mm, bar_y + bar_h / 2, 1.2 * mm, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont(FONT, SZ_FOOTER)
    c.drawString(MARGIN + 14 * mm, bar_y + 2.5 * mm, data.BRAND)
    c.drawRightString(PAGE_W - MARGIN - 3 * mm, bar_y + 2.5 * mm, "  ·  ".join(data.PHONES))


def content_bounds():
    _, by, _, _ = header_banner_rect()
    top = by - 5 * mm
    bottom = MARGIN + FOOTER_H + 2 * mm
    col_w = (PAGE_W - 2 * MARGIN - COL_GAP) / 2
    return top, bottom, col_w


def row_block_height(num_lines: int) -> float:
    text_h = max(1, num_lines) * ROW_LINE_H
    return max(ROW_MIN_H, text_h + 1.2 * mm)


def section_header_lines(section, col_w):
    return simpleSplit(section["header"], FONT_BOLD, SZ_SECTION, col_w - 10 * mm)[:2]


def section_bar_height(header_lines):
    return max(8 * mm, len(header_lines) * LINE_LEAD + 4 * mm)


def measure_section_height(c, section, col_w, inner_w):
    header_lines = section_header_lines(section, col_w)
    bar_h = section_bar_height(header_lines)
    h = bar_h + CARD_PAD
    for title, _ in section["rows"]:
        lines = simpleSplit(title, FONT, SZ_ROW, inner_w) or [""]
        h += row_block_height(len(lines)) + ROW_GAP
    h += CARD_PAD
    return h


def draw_price_badge(c, x, row_top, block_h, w, price):
    label = format_price(price)
    if not label:
        return
    badge_y = row_top - (block_h + BADGE_H) / 2
    c.setFillColor(HexColor("#FFF3DC"))
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.35)
    c.roundRect(x, badge_y, w, BADGE_H, 2 * mm, stroke=1, fill=1)
    c.setFillColor(GOLD_DARK)
    c.setFont(FONT_BOLD, SZ_PRICE)
    c.drawCentredString(x + w / 2, badge_y + BADGE_H / 2 - SZ_PRICE * 0.35, label)


def draw_section_card(c, section, x, y, col_w, bottom, tint_idx):
    inner_w = col_w - 2 * CARD_PAD - PRICE_W - 2 * mm
    header_lines = section_header_lines(section, col_w)
    bar_h = section_bar_height(header_lines)
    card_h = measure_section_height(c, section, col_w, inner_w)
    if y - card_h < bottom:
        return y

    card_y = y - card_h
    tint = SECTION_TINTS[tint_idx % len(SECTION_TINTS)]

    c.setFillColor(WHITE)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.roundRect(x, card_y, col_w, card_h, CARD_RADIUS, stroke=1, fill=1)

    c.saveState()
    path = c.beginPath()
    path.roundRect(x, y - bar_h, col_w, bar_h, CARD_RADIUS)
    c.clipPath(path, stroke=0)
    draw_gradient_rect(c, x, y - bar_h, col_w, bar_h, tint, lerp_color(tint, NAVY, 0.35))
    c.restoreState()

    c.setFillColor(GOLD)
    c.rect(x, y - bar_h, 2.5 * mm, bar_h, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont(FONT_BOLD, SZ_SECTION)
    hy = y - 4.5 * mm
    for line in header_lines:
        c.drawString(x + 5 * mm, hy, line.upper())
        hy -= LINE_LEAD

    row_y = y - bar_h - CARD_PAD
    c.setFont(FONT, SZ_ROW)
    for idx, (title, price) in enumerate(section["rows"]):
        lines = simpleSplit(title, FONT, SZ_ROW, inner_w) or [""]
        block_h = row_block_height(len(lines))

        if row_y - block_h < card_y + CARD_PAD:
            break

        row_bottom = row_y - block_h

        if idx % 2 == 0:
            c.setFillColor(ROW_ALT)
            c.roundRect(
                x + 1.5 * mm,
                row_bottom + 0.4 * mm,
                col_w - 3 * mm,
                block_h - 0.8 * mm,
                1.5 * mm,
                stroke=0,
                fill=1,
            )

        c.setFillColor(INK)
        text_y = row_y - 1.8 * mm
        for line in lines:
            c.drawString(x + CARD_PAD + 1.5 * mm, text_y, line)
            text_y -= ROW_LINE_H

        if price:
            draw_price_badge(
                c,
                x + col_w - PRICE_W - CARD_PAD,
                row_y,
                block_h,
                PRICE_W,
                price,
            )

        row_y = row_bottom - ROW_GAP

    return card_y - SECTION_GAP


def draw_column(c, sections, x, y_top, col_w, bottom, tint_offset=0):
    y = y_top
    for i, section in enumerate(sections):
        y = draw_section_card(c, section, x, y, col_w, bottom, tint_offset + i)
        if y <= bottom:
            break


def draw_contact_card(c, x, y_top, col_w):
    card_h = y_top - (MARGIN + FOOTER_H + 6 * mm)
    card_y = y_top - card_h

    c.setFillColor(WHITE)
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.6)
    c.roundRect(x, card_y, col_w, card_h, 4 * mm, stroke=1, fill=1)

    pad = 4 * mm
    inner_h = card_h - 2 * pad
    draw_gradient_rect(c, x + pad, card_y + pad, col_w - 2 * pad, inner_h, NAVY, TEAL_LIGHT)

    if LOGO_PATH.exists():
        ls = 16 * mm
        c.drawImage(
            str(LOGO_PATH),
            x + (col_w - ls) / 2,
            card_y + inner_h - 8 * mm,
            width=ls,
            height=ls,
            preserveAspectRatio=True,
            mask="auto",
        )

    ix = x + 8 * mm
    iy = card_y + inner_h - 28 * mm

    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 7)
    c.drawString(ix, iy, "THANK YOU")

    c.setFillColor(WHITE)
    c.setFont(FONT_BOLD, 11)
    c.drawString(ix, iy - 7 * mm, "Get In Touch")

    c.setFont(FONT, 7.5)
    c.setFillColor(Color(WHITE.red, WHITE.green, WHITE.blue, alpha=0.85))
    c.drawString(ix, iy - 12 * mm, "We supply quality school books")
    c.drawString(ix, iy - 16 * mm, "at competitive prices.")

    c.setFillColor(GOLD)
    c.rect(ix, iy - 20 * mm, 18 * mm, 0.8 * mm, stroke=0, fill=1)

    py = iy - 28 * mm
    c.setFont(FONT_BOLD, 7)
    c.setFillColor(Color(WHITE.red, WHITE.green, WHITE.blue, alpha=0.7))
    c.drawString(ix, py, "CALL / WHATSAPP")

    for phone in data.PHONES:
        py -= 9 * mm
        c.setFillColor(WHITE)
        c.roundRect(ix, py, col_w - 16 * mm, 7 * mm, 3.5 * mm, stroke=0, fill=1)
        c.setFillColor(TEAL)
        c.circle(ix + 4 * mm, py + 3.5 * mm, 2 * mm, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont(FONT_BOLD, 8.5)
        c.drawString(ix + 8 * mm, py + 2.2 * mm, phone)

    py -= 12 * mm
    c.setFont(FONT_OBL, 6.5)
    c.setFillColor(Color(WHITE.red, WHITE.green, WHITE.blue, alpha=0.75))
    c.drawString(ix, py, data.EDITION)

    c.setFont(FONT_BOLD, 7)
    c.setFillColor(GOLD)
    c.drawString(ix, py - 6 * mm, "All prices in Nigerian Naira (\u20a6)")


def generate_pdf(output_path: str | Path = "SCHOOL.pdf") -> Path:
    output_path = Path(output_path)
    c = canvas.Canvas(str(output_path), pagesize=A4)
    c.setTitle(data.EDITION)
    c.setAuthor(data.BRAND)

    y_top, bottom, col_w = content_bounds()
    left_x = MARGIN
    right_x = MARGIN + col_w + COL_GAP
    total = len(data.PAGES)

    for page_num, page in enumerate(data.PAGES, start=1):
        draw_page_background(c)
        draw_header(c, page_num, total)

        left_col = page[0]
        right_col = page[1] if len(page) > 1 else []

        draw_column(c, left_col, left_x, y_top, col_w, bottom, tint_offset=0)
        if right_col:
            draw_column(c, right_col, right_x, y_top, col_w, bottom, tint_offset=3)
        elif page_num == total:
            draw_contact_card(c, right_x, y_top, col_w)

        draw_footer(c)
        c.showPage()

    c.save()
    return output_path


if __name__ == "__main__":
    out = generate_pdf()
    print(f"PDF saved to: {out.resolve()}")
