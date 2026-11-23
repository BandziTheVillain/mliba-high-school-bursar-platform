from datetime import datetime, timezone
from pydantic import computed_field
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
import uuid

from . import constants

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    username: str = Field(unique=True, index=True)
    password: str = Field(exclude=True)

class Student(SQLModel, table=True):
    __tablename__ = "students"
    
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    full_name: str
    form: str
    ovc_status: str
    practical_subjects_count: int = Field(default=0, sa_column_kwargs={"server_default": "0"}, description="Number of practical subjects the student is taking")
     
    payments: List["Payment"] = Relationship(back_populates="student", cascade_delete=True)

    
    @property
    def amount_paid(self) -> float:
        amount = 0.00
        for payment in self.payments:
            amount = amount + payment.amount
        return amount
    
    @property
    def amount_to_pay(self) -> float:
        """Total fee for the year: base fee by OVC status + practical subject fees."""
        if self.ovc_status == "OVC":
            base = constants.OVC_AMOUNT
        elif self.ovc_status == "OVC (Form 4)":
            base = constants.OVC_FORM_4_AMOUNT
        else:  # "Non OVC"
            base = constants.NON_OVC_AMOUNT
        return base + constants.PRACTICAL_SUBJECT_FEE * (self.practical_subjects_count or 0)

    @property
    def amount_owing(self) -> float:
        return self.amount_to_pay - self.amount_paid

    @property
    def amount_payable(self) -> float:
        return self.amount_to_pay
    
    @computed_field
    @property
    def fees(self) -> dict:
        return {"paid": self.amount_paid, "balance": self.amount_owing, "total": self.amount_to_pay}
        
    
class Payment(SQLModel, table=True):
    __tablename__ = "payments"
    
    id: Optional[uuid.UUID] = Field(primary_key=True, default_factory=uuid.uuid4, index=True)
    month: str 
    year: str
    amount: float
    student_id: uuid.UUID = Field(foreign_key="students.id")
    date_created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    student: "Student" = Relationship(back_populates="payments")


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    
    id: Optional[uuid.UUID] = Field(primary_key=True, default_factory=uuid.uuid4, index=True)
    detail: str
    status: str = Field(default="Pending")
    priority: str 
    date_created: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    