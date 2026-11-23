from datetime import datetime
from typing import Literal, Optional
import uuid
from pydantic import BaseModel, Field

class PaymentSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    amount: float
    month: Literal["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] = Field(default_factory=lambda: datetime.now().strftime("%B"))
    year: int
    
    # @validator("year")
    # def validate_year(cls, value):
    #     if value < utils.current_year - 2 or value > 2025:
    #         raise ValueError(f"Year must be between {utils.current_year - 2} and {utils.current_year}")
    #     return value
    
class StudentsSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    full_name: str
    form: str
    ovc_status: str
    fees: dict
    
class StudentSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    first_name: str
    last_name: str
    form: str
    ovc_status: str
    fees: dict
  
class AddStudentSchema(BaseModel):
    full_name: str
    ovc_status: Literal["OVC", "Non OVC", "OVC (Form 4)"]
    form: Literal["F1A", "F1B", "F1C", "F2A", "F2B", "F3A", "F3B", "F3C", "F4A", "F4B", "F4C", "F5A", "F5B", "F5C"]
    practical_subjects_count: int = Field(default=0, ge=0, le=10)
    payments: list[dict]
    
class EditStudentSchema(BaseModel):
    full_name: str
    ovc_status: Literal["OVC", "Non OVC", "OVC (Form 4)"]
    form: Literal["F1A", "F1B", "F1C", "F2A", "F2B", "F3A", "F3B", "F3C", "F4A", "F4B", "F4C", "F5A", "F5B", "F5C"]
    practical_subjects_count: int = Field(default=0, ge=0, le=10)
    # payments: list[dict]

class BatchPrintData(BaseModel):
    ids: list[str]
    payment_type: str = ""
    
class AddTaskSchema(BaseModel):
    detail: str
    status: Literal["Pending", "Completed"] = "Pending"
    priority: Literal["High", "Medium", "Low"] 
    
class TaskSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    detail: str
    status: Literal["Pending", "Completed"] = "Pending"
    priority: Literal["High", "Medium", "Low"] 
    date_created: datetime