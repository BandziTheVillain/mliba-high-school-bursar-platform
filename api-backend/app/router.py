from uuid import UUID
from typing import Literal, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, Response, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from app import auth, schemas
from .config import Config
from . import services
from .db import session_dependency

# Public routes
router = APIRouter()

# Everything on this router requires a valid bearer token
protected = APIRouter(dependencies=[Depends(auth.get_current_user)])

@router.post("/auth/token")
def login_user(session: session_dependency, response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    data = auth.login_user(session=session, form_data=form_data)
    response.set_cookie(
        key=Config.JWT_ACCESS_COOKIE_NAME,
        value=data["access_token"],
        max_age=Config.ACCESS_TOKEN_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=Config.COOKIE_SECURE,
        path="/",
    )
    return {"access_token": data["access_token"], "token_type": "bearer", "user": data["user"]}

@router.post("/auth/logout")
def logout_user(response: Response):
    response.delete_cookie(
        key=Config.JWT_ACCESS_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=Config.COOKIE_SECURE,
    )
    return {"detail": "Logged out"}

@protected.get("/auth/me")
def get_me(user: auth.auth_dependency):
    return {"user": user}

@protected.get("/tasks")
def get_all_tasks(session: session_dependency):
    return services.get_all_tasks(session=session)

@protected.post("/tasks", response_model=schemas.TaskSchema, status_code=201)
def add_new_task(session: session_dependency, data: schemas.AddTaskSchema):
    return services.add_task(session=session, data=data)

@protected.put("/tasks/{id}", response_model=schemas.TaskSchema)
def edit_task(session: session_dependency, id: UUID, data: schemas.AddTaskSchema):
    return services.edit_task(session=session, id=id, data=data)

@protected.delete("/tasks/{id}")
def remove_task(session: session_dependency, id: UUID):
    return services.delete_task(session=session, id=id)

@protected.get("/students/filter")
def get_students_by_payments(session: session_dependency, payment_type: Literal["full", "deposit", "partial"] = "partial"):
    return services.get_students_by_payment_type(session=session, payment_type=payment_type)

@protected.post("/students/generate-cards")
def generate_student_cards(session: session_dependency, data: schemas.BatchPrintData):
    return services.download_batch_cards(session=session, ids=data.ids, payment_type=data.payment_type)

@protected.get("/students/register", summary="Fee register (paginated)")
def get_fee_register(
    session: session_dependency,
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    q: Optional[str] = None,
    form: Optional[str] = None,
    ovc_status: Optional[str] = None,
    status: Optional[Literal["paid", "partial", "unpaid"]] = None,
    sort: Literal["name", "form", "billed", "received", "due"] = "name",
    order: Literal["asc", "desc"] = "asc",
):
    return services.get_fee_register(session=session, page=page, size=size, q=q, form=form,
                                     ovc_status=ovc_status, status=status, sort=sort, order=order)

@protected.get("/stats/monthly", summary="Received per month")
def get_monthly_receipts(session: session_dependency, year: Optional[int] = None):
    return services.get_monthly_receipts(session=session, year=str(year or date.today().year))

@protected.get("/students")
def get_all_students(session: session_dependency, q: Optional[str] = None, form: Optional[str] = None, ovc_status: Optional[str] = None):
    return services.get_all_students(session=session, q=q, form=form, ovc_status=ovc_status)

@protected.post("/students/upload", status_code=201)
async def import_csv_data(session: session_dependency, file: UploadFile = File(...)):
    return await services.upload_csv_data(file=file, session=session)

@protected.post("/students")
def add_student_info(session: session_dependency, data: schemas.AddStudentSchema):
    return services.add_student(session=session, data=data)


@protected.get("/students/{id}/payments", response_model=list[schemas.PaymentSchema])
def get_student_payments(id: UUID, session: session_dependency, year: Optional[str] = None):
    return services.get_student_payments(id=id, year=year, session=session)

@protected.put("/students/{id}/payments", status_code=200)
def edit_student_payments(id: UUID, session: session_dependency, data: schemas.PaymentSchema):
    return services.edit_student_payments(id=id, session=session, data=data)

@protected.get("/students/{studentId}")
def get_student_by_id(session: session_dependency, studentId: UUID):
    return services.get_single_student(id=studentId, session=session)

@protected.put("/students/{studentId}")
def edit_student_by_id(session: session_dependency, studentId: UUID, data: schemas.EditStudentSchema):
    return services.edit_student(session=session, id=studentId, data=data)

@protected.get("/students/{id}/generate-card")
def generate_student_card(session: session_dependency, id: UUID):
    return services.download_single_card(session=session, id=id)


# Must come after all @protected routes are declared
router.include_router(protected)
