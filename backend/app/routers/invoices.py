from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Invoice, InvoiceLineItem, InvoiceStatus, Supplier
from app.schemas import InvoiceCreate, InvoiceList, InvoiceOut, LineItemOut

router = APIRouter(prefix="/invoices", tags=["invoices"])

CENT = Decimal("0.01")


def to_out(invoice: Invoice) -> InvoiceOut:
    return InvoiceOut(
        id=invoice.id,
        supplier_name=invoice.supplier.name,
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        currency=invoice.currency,
        total_amount=invoice.total_amount,
        status=invoice.status,
        line_items=[LineItemOut.model_validate(li) for li in invoice.line_items],
        created_at=invoice.created_at,
    )


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)) -> InvoiceOut:
    line_items = [
        InvoiceLineItem(
            description=li.description,
            quantity=li.quantity,
            unit_price=li.unit_price,
            amount=(li.quantity * li.unit_price).quantize(CENT, rounding=ROUND_HALF_UP),
        )
        for li in payload.line_items
    ]

    if line_items and sum((li.amount for li in line_items), Decimal("0")) != payload.total_amount:
        raise HTTPException(status_code=422, detail="Line items do not add up to the invoice total")

    supplier = db.scalar(select(Supplier).where(Supplier.name == payload.supplier_name))
    if supplier is None:
        supplier = Supplier(name=payload.supplier_name)

    invoice = Invoice(
        supplier=supplier,
        invoice_number=payload.invoice_number,
        issue_date=payload.issue_date,
        due_date=payload.due_date,
        currency=payload.currency,
        total_amount=payload.total_amount,
        line_items=line_items,
    )
    db.add(invoice)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Invoice already exists for this supplier")

    db.refresh(invoice)
    return to_out(invoice)


@router.get("", response_model=InvoiceList)
def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    supplier: str | None = Query(None, max_length=200),
    db: Session = Depends(get_db),
) -> InvoiceList:
    base = select(Invoice).join(Supplier)
    if status_filter is not None:
        base = base.where(Invoice.status == status_filter)
    if supplier:
        base = base.where(Supplier.name.ilike(f"%{supplier}%"))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        base.options(selectinload(Invoice.supplier), selectinload(Invoice.line_items))
        .order_by(Invoice.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return InvoiceList(
        items=[to_out(r) for r in rows], total=total, page=page, page_size=page_size
    )


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)) -> InvoiceOut:
    invoice = db.scalar(
        select(Invoice)
        .where(Invoice.id == invoice_id)
        .options(selectinload(Invoice.supplier), selectinload(Invoice.line_items))
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return to_out(invoice)
