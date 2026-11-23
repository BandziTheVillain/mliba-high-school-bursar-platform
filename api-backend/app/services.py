import csv
from datetime import date, datetime
from io import StringIO
from urllib.parse import quote
from typing import Optional
from uuid import UUID, uuid4
from fastapi import HTTPException, Response, UploadFile
from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select
from app import constants, schemas
from app.utils.card_generator import generate_cards_pdf
from .models import Payment, Student, Task


MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

def _attachment(filename: str) -> str:
    """Content-Disposition value that is safe for spaces/non-ASCII names."""
    ascii_name = filename.encode("ascii", "ignore").decode().replace('"', "")
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"

def _to_amount(value) -> float:
    value = (value or "").strip().replace(",", "")
    if value in ("", "N/A"):
        return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0

def get_analytics_data(session: Session):
    # total money paid (ovc, non-ovc, etc), payments per form... /
    return True

def get_students_by_payment_type(session: Session, payment_type: str):
    stmt = select(Student)
    students = session.scalars(stmt).all()
    added_students = []
    if payment_type == "deposit":
        for student in students:
            if student.amount_paid == float(2500):
                added_students.append(student)
        return added_students
    elif payment_type == "partial":
        for student in students:
            if student.amount_paid < float(2500):
                added_students.append(student)
        return added_students
    else:
        for student in students:
            if student.amount_owing <= float(0):
                added_students.append(student)
        return added_students

def download_batch_cards(session: Session, payment_type: str, ids: list[str]):
    students: list[Student] = []

    stmt = select(Student)
    students = session.scalars(stmt).all()
    
    if payment_type != "all":
        if len(students) == 0:
            raise HTTPException(status_code=404, detail="Please insert students first")
    
    added_students: list[Student] = []
    filename = ""

    if len(ids) > 0:
        for student in students:
            if str(student.id) in ids:
                added_students.append(student)             
    else:
        for student in students:
            added_students.append(student)
                
    filename = "student_cards.pdf"
    if payment_type == "deposit":
        added_students = [s for s in added_students if s.amount_paid >= 2500]
        filename = "deposit_student_cards.pdf"
    elif payment_type and payment_type != "all":
        added_students = [s for s in added_students if s.amount_owing <= 0]
        filename = "fully_paid_student_cards.pdf"

    pdf_buffer = generate_cards_pdf(students=added_students)
    
    # start a thread

    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": _attachment(filename)})



def download_single_card(session: Session, id: UUID):
    student = session.get(Student, id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    pdf_buffer = generate_cards_pdf(students=[student])
    
    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": _attachment(f"{student.full_name}_card.pdf")})

def get_all_students(session: Session, q: str, form: str, ovc_status: str):
    stmt = select(Student)
    if q:
        stmt = stmt.filter(Student.full_name.ilike(f"%{q}%"))
    if form:
        stmt = stmt.filter(Student.form==form)
    if ovc_status:
        stmt = stmt.filter(Student.ovc_status==ovc_status)
    students = session.exec(stmt).all()

    return students


def _pay_state(student: Student) -> str:
    if student.amount_owing <= 0:
        return "paid"
    return "partial" if student.amount_paid > 0 else "unpaid"


REGISTER_SORTS = {
    "name": lambda s: s.full_name.lower(),
    "form": lambda s: (s.form, s.full_name.lower()),
    "billed": lambda s: s.amount_to_pay,
    "received": lambda s: s.amount_paid,
    "due": lambda s: s.amount_owing,
}


def get_fee_register(session: Session, page: int, size: int, q: Optional[str], form: Optional[str],
                     ovc_status: Optional[str], status: Optional[str], sort: str, order: str):
    """One page of the fee register plus totals for everything matching the filters.

    Fees are computed in Python (they depend on payments and practicals), so status
    filtering and money sorting happen after the query. Fine at school scale; move to
    SQL aggregates if a tenant ever has many thousands of students.
    """
    stmt = select(Student).options(selectinload(Student.payments))
    if q:
        stmt = stmt.filter(Student.full_name.ilike(f"%{q}%"))
    if form:
        stmt = stmt.filter(Student.form == form)
    if ovc_status:
        stmt = stmt.filter(Student.ovc_status == ovc_status)
    students = list(session.exec(stmt).all())

    if status:
        students = [s for s in students if _pay_state(s) == status]

    students.sort(key=REGISTER_SORTS.get(sort, REGISTER_SORTS["name"]), reverse=(order == "desc"))

    total = len(students)
    pages = max(1, -(-total // size))
    page = min(max(1, page), pages)
    start = (page - 1) * size

    return {
        "items": students[start:start + size],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
        "totals": {
            "billed": sum(s.amount_to_pay for s in students),
            "received": sum(s.amount_paid for s in students),
            "due": sum(max(0.0, s.amount_owing) for s in students),
            "fully_paid": sum(1 for s in students if s.amount_owing <= 0),
        },
    }


def get_monthly_receipts(session: Session, year: str):
    """Total received per month for a year, all 12 months in calendar order."""
    stmt = (
        select(Payment.month, func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.year == year)
        .group_by(Payment.month)
    )
    by_month = {month: float(amount) for month, amount in session.exec(stmt).all()}
    return [{"month": m, "amount": by_month.get(m, 0.0)} for m in MONTHS]

def add_student(data: schemas.AddStudentSchema, session: Session):
    student = session.scalars(select(Student).filter(Student.full_name == data.full_name, Student.form == data.form)).first()
    if student:
        raise HTTPException(status_code=409, detail="Student already exists")
    
    student = Student(id=uuid4(),full_name=data.full_name, form=data.form, ovc_status=data.ovc_status, practical_subjects_count=data.practical_subjects_count)
    student.payments = [Payment(id=uuid4(),month=payment["month"], amount=payment["amount"], year=str(date.today().year)) for payment in data.payments] if len(data.payments) > 0 else []
    
    session.add(student)
    session.commit()
    session.refresh(student)
    
    return student


def get_single_student(id: UUID, session: Session):
    student = session.get(Student, id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student
 
def get_student_payments(id: UUID, year: str, session: Session):
    student = session.get(Student, id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found") 
    stmt = select(Payment).filter(Payment.student == student)
    if year:
        stmt = stmt.filter(Payment.year == year)

    payments = session.exec(stmt).all()
    return payments

def edit_student_payments(id: UUID, session: Session, data: schemas.PaymentSchema):
    if not session.get(Student, id):
        raise HTTPException(status_code=404, detail="Student not found")

    year = str(data.year)
    stmt = select(Payment).filter(Payment.month == data.month, Payment.year == year, Payment.student_id == id)
    payment: Payment = session.scalars(stmt).first()
    if payment:
        payment.amount = data.amount
        session.commit()
        session.refresh(payment)
        return payment

    payment = Payment(id=uuid4(), student_id=id, month=data.month, amount=data.amount, year=year)
    session.add(payment)
    session.commit()
    session.refresh(payment)
    
    return payment
    
      
def edit_student(id: UUID, session: Session, data: schemas.EditStudentSchema):
    student = session.get(Student, id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.full_name = data.full_name
    student.form = data.form
    student.ovc_status = data.ovc_status
    student.practical_subjects_count = data.practical_subjects_count
    
    session.commit()
    session.refresh(student)
    
    return student

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
REQUIRED_CSV_COLUMNS = {"Full Name", "Form", "Amount To Pay", *MONTHS}
PRACTICALS_CSV_COLUMN = "Practical Subjects"  # optional

async def upload_csv_data(file: UploadFile, session: Session, year: Optional[str] = None):
    year = year or str(datetime.now().year)

    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be CSV")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is too large (max 5 MB)")

    try:
        # utf-8-sig strips the BOM that Excel adds to CSV exports
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    csv_reader = csv.DictReader(StringIO(decoded))
    missing = REQUIRED_CSV_COLUMNS - set(csv_reader.fieldnames or [])
    if missing:
        raise HTTPException(status_code=400, detail=f"CSV is missing columns: {', '.join(sorted(missing))}")

    total_added = 0
    for row in csv_reader:
        full_name = (row["Full Name"] or "").strip()
        form = (row["Form"] or "").strip()
        if not full_name:
            continue

        stmt = select(Student).filter(Student.full_name == full_name, Student.form == form)
        if session.scalars(stmt).first():
            continue

        practicals = max(0, int(_to_amount(row.get(PRACTICALS_CSV_COLUMN))))
        # "Amount To Pay" includes practical fees; strip them to find the base fee
        amount_to_pay = _to_amount(row["Amount To Pay"]) - practicals * constants.PRACTICAL_SUBJECT_FEE
        if amount_to_pay == constants.OVC_AMOUNT:
            ovc_status = "OVC"
        elif amount_to_pay == constants.OVC_FORM_4_AMOUNT:
            ovc_status = "OVC (Form 4)"
        else:
            ovc_status = "Non OVC"

        student = Student(id=uuid4(), full_name=full_name, form=form, ovc_status=ovc_status, practical_subjects_count=practicals)
        student.payments = [
            Payment(id=uuid4(), amount=_to_amount(row[month]), month=month, year=year)
            for month in MONTHS
        ]
        session.add(student)
        total_added += 1

    session.commit()

    return {"success": True, "message": f'{total_added} student(s) uploaded to db'}

def get_all_tasks(session: Session):
    stmt = select(Task).order_by(Task.date_created.desc())
    return session.exec(stmt).all()

def delete_task(session: Session, id: UUID):
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session.delete(task)
    session.commit()
    
    return None

def edit_task(session: Session, id: UUID, data: schemas.AddTaskSchema):
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.detail = data.detail
    task.status = data.status
    task.priority = data.priority
    
    session.commit()
    session.refresh(task)
    return task
        
def add_task(session: Session, data: schemas.AddTaskSchema):
    task = Task(id=uuid4(), detail=data.detail, status=data.status, priority=data.priority)
    session.add(task)
    session.commit()
    session.refresh(task)
    
    return task