from io import BytesIO
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import qrcode

from app.constants import CARD_WIDTH

def generate_qrcode(c: canvas.Canvas, x, y, data):
    qr = qrcode.make(data=data)
    img_buffer = BytesIO()
    qr.save(img_buffer)
    img_buffer.seek(0)
    c.drawImage(ImageReader(img_buffer), x + CARD_WIDTH - 30, y + 5, width=25, height=25)