from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import InvoiceStatus


class LineItemIn(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class InvoiceCreate(BaseModel):
    supplier_name: str = Field(min_length=1, max_length=200)
    invoice_number: str = Field(min_length=1, max_length=100)
    issue_date: date
    due_date: date | None = None
    currency: str = Field(default="EUR", pattern=r"^[A-Z]{3}$")
    total_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    line_items: list[LineItemIn] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def due_date_not_before_issue_date(self) -> "InvoiceCreate":
        if self.due_date and self.due_date < self.issue_date:
            raise ValueError("due_date cannot be before issue_date")
        return self


class LineItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal


class InvoiceOut(BaseModel):
    id: int
    supplier_name: str
    invoice_number: str
    issue_date: date
    due_date: date | None
    currency: str
    total_amount: Decimal
    status: InvoiceStatus
    line_items: list[LineItemOut]
    created_at: datetime


class InvoiceList(BaseModel):
    items: list[InvoiceOut]
    total: int
    page: int
    page_size: int


# ---- users and auth ----
import re  # noqa: E402

from app.models import UserRole  # noqa: E402

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserCreate(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def validate_fields(self) -> "UserCreate":
        self.email = self.email.strip().lower()
        if not EMAIL_PATTERN.match(self.email):
            raise ValueError("invalid email address")
        if len(self.password.encode("utf-8")) > 72:
            raise ValueError("password is too long")
        return self


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdate(BaseModel):
    role: UserRole
