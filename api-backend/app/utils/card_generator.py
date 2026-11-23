from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from fastapi.responses import StreamingResponse
from io import BytesIO
import qrcode

# Page & Layout Config
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)
NUM_COLUMNS = 3
NUM_ROWS = 4
CARDS_PER_PAGE = NUM_COLUMNS * NUM_ROWS

# Margins and Gaps
MARGIN_X = 10 * mm
MARGIN_Y = 10 * mm
GAP_X = 5 * mm
GAP_Y = 5 * mm

# Compute card size based on layout constraints
usable_width = PAGE_WIDTH - 2 * MARGIN_X - (NUM_COLUMNS - 1) * GAP_X
usable_height = PAGE_HEIGHT - 2 * MARGIN_Y - (NUM_ROWS - 1) * GAP_Y

CARD_WIDTH = usable_width / NUM_COLUMNS
CARD_HEIGHT = usable_height / NUM_ROWS

LOGO_PATH = Path(__file__).parent.parent / "static" / "images" / "logo.png"

def draw_crop_marks(c, x, y, width, height):
    mark_len = 3 * mm
    c.setLineWidth(0.3)
    for dx in (0, width):
        for dy in (0, height):
            c.line(x + dx - mark_len, y + dy, x + dx + mark_len, y + dy)
            c.line(x + dx, y + dy - mark_len, x + dx, y + dy + mark_len)

def draw_card(c, student, x, y):
    c.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
    draw_crop_marks(c, x, y, CARD_WIDTH, CARD_HEIGHT)

    # Logo
    c.drawImage(LOGO_PATH, x + 5, y + CARD_HEIGHT - 55, 50, 50, preserveAspectRatio=True, mask='auto')

    # Text
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 60, y + CARD_HEIGHT - 20, "Full Name")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 60, y + CARD_HEIGHT - 35, student.full_name)
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 60, y + CARD_HEIGHT - 55, "Form")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 60, y + CARD_HEIGHT - 70, student.form)

def generate_cards_pdf(students: list):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))

    for idx, student in enumerate(students):
        card_index = idx % CARDS_PER_PAGE
        row = card_index // NUM_COLUMNS
        col = card_index % NUM_COLUMNS

        x = MARGIN_X + col * (CARD_WIDTH + GAP_X)
        y = PAGE_HEIGHT - MARGIN_Y - (row + 1) * (CARD_HEIGHT + GAP_Y) + GAP_Y

        draw_card(c, student, x, y)

        # New page after every 12 cards, except final student
        if (idx + 1) % CARDS_PER_PAGE == 0 and (idx + 1) < len(students):
            c.showPage()

    c.save()
    buffer.seek(0)
    return buffer
    # return StreamingResponse(buffer, media_type="application/pdf", headers={
    #     "Content-Disposition": "inline; filename=student_cards.pdf"
    # })






# PROPER CODE
# def draw_card(c, student, x, y):
#     c.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
#     draw_crop_marks(c, x, y, CARD_WIDTH, CARD_HEIGHT)

#     # Logo
#     c.drawImage(LOGO_PATH, x + 5, y + CARD_HEIGHT - 55, 50, 50, preserveAspectRatio=True, mask='auto')

#     # Text
#     c.setFont("Helvetica-Bold", 11)
#     c.drawString(x + 60, y + CARD_HEIGHT - 20, "Full Name")
#     c.setFont("Helvetica-Bold", 14)
#     c.drawString(x + 60, y + CARD_HEIGHT - 35, student.full_name)
    
#     c.setFont("Helvetica-Bold", 11)
#     c.drawString(x + 60, y + CARD_HEIGHT - 55, "Form")
#     c.setFont("Helvetica-Bold", 14)
#     c.drawString(x + 60, y + CARD_HEIGHT - 70, student.form)
