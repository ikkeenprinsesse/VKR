# backend/routers/reports.py
import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, cast, Numeric

from fpdf import FPDF

from ..database import get_db
from ..models import Payment, PaymentStatus, Lesson, User, Role
from ..security import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


async def _fetch_payments(
    db: AsyncSession,
    tutor_id: int,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
) -> list[Payment]:
    stmt = (
        select(Payment)
        .join(Lesson, Payment.lesson_id == Lesson.id)
        .where(
            and_(
                Lesson.tutor_id == tutor_id,
                Payment.status == PaymentStatus.paid,
            )
        )
    )
    if date_from:
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Payment.payment_date >= date_from)
    if date_to:
        if date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Payment.payment_date <= date_to)

    result = await db.execute(stmt.order_by(Payment.payment_date))
    return result.scalars().all()


async def _monthly_summary_db(
    db: AsyncSession,
    tutor_id: int,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
) -> list[dict]:
    """Месячная сводка через GROUP BY на БД — O(1) по памяти."""
    date_col = func.coalesce(Payment.payment_date, Payment.created_at)
    period_col = func.to_char(date_col, "YYYY-MM").label("period")

    stmt = (
        select(
            period_col,
            func.round(cast(func.sum(Payment.amount), Numeric(12, 2)), 2).label("total"),
            func.count(Payment.id).label("count"),
        )
        .join(Lesson, Payment.lesson_id == Lesson.id)
        .where(and_(Lesson.tutor_id == tutor_id, Payment.status == PaymentStatus.paid))
        .group_by(period_col)
        .order_by(period_col)
    )
    if date_from:
        if date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Payment.payment_date >= date_from)
    if date_to:
        if date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        stmt = stmt.where(Payment.payment_date <= date_to)

    result = await db.execute(stmt)
    return [{"period": r.period, "total": r.total or 0.0, "count": r.count} for r in result.all()]


# ── CSV ────────────────────────────────────────────────────────────────────────

async def _require_pro_reports(db: AsyncSession, current_user: User) -> None:
    from ..routers.subscriptions import get_or_create_subscription, _is_active
    from ..models import PlanType
    sub = await get_or_create_subscription(db, current_user.id)
    if sub.plan == PlanType.free or not _is_active(sub):
        raise HTTPException(
            status_code=402,
            detail="Экспорт отчётов доступен только на тарифе PRO.",
        )


@router.get("/income/csv")
async def income_csv(
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может получать отчёты")
    await _require_pro_reports(db, current_user)

    payments = await _fetch_payments(db, current_user.id, date_from, date_to)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID занятия", "Сумма", "Валюта", "Дата оплаты", "Способ оплаты"])

    for p in payments:
        pd = p.payment_date or p.created_at
        writer.writerow([
            p.lesson_id,
            p.amount,
            p.currency,
            pd.strftime("%Y-%m-%d %H:%M") if pd else "",
            p.payment_method or "",
        ])

    # итоговая строка
    total = sum(p.amount for p in payments)
    writer.writerow([])
    writer.writerow(["ИТОГО", round(total, 2), "", "", ""])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=income_report.csv"},
    )


# ── PDF ────────────────────────────────────────────────────────────────────────

class _ReportPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 10, "TutorSpace - Income Report", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


@router.get("/income/pdf")
async def income_pdf(
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может получать отчёты")
    await _require_pro_reports(db, current_user)

    payments = await _fetch_payments(db, current_user.id, date_from, date_to)
    summary = await _monthly_summary_db(db, current_user.id, date_from, date_to)

    pdf = _ReportPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # период
    pdf.set_font("Helvetica", size=10)
    period_str = ""
    if date_from:
        period_str += f"From: {date_from.strftime('%Y-%m-%d')}  "
    if date_to:
        period_str += f"To: {date_to.strftime('%Y-%m-%d')}"
    if period_str:
        pdf.cell(0, 8, period_str.strip(), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # таблица платежей
    col_w = [25, 35, 20, 45, 40]
    headers = ["Lesson ID", "Amount", "Currency", "Payment Date", "Method"]

    pdf.set_font("Helvetica", "B", 10)
    for w, h in zip(col_w, headers):
        pdf.cell(w, 8, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", size=9)
    for p in payments:
        pd = p.payment_date or p.created_at
        row = [
            str(p.lesson_id),
            f"{p.amount:.2f} {p.currency}",
            p.currency,
            pd.strftime("%Y-%m-%d %H:%M") if pd else "-",
            p.payment_method or "-",
        ]
        for w, val in zip(col_w, row):
            pdf.cell(w, 7, val[:25], border=1)
        pdf.ln()

    pdf.ln(5)

    # итоги по месяцам
    if summary:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Monthly Summary", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(40, 8, "Period", border=1)
        pdf.cell(40, 8, "Total", border=1)
        pdf.cell(30, 8, "Count", border=1)
        pdf.ln()
        pdf.set_font("Helvetica", size=10)
        for row in summary:
            pdf.cell(40, 7, row["period"], border=1)
            pdf.cell(40, 7, f"{row['total']:.2f}", border=1)
            pdf.cell(30, 7, str(row["count"]), border=1)
            pdf.ln()

    pdf.ln(5)
    total = sum(p.amount for p in payments)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, f"TOTAL: {total:.2f} RUB", new_x="LMARGIN", new_y="NEXT")

    pdf_bytes = pdf.output()

    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=income_report.pdf"},
    )
