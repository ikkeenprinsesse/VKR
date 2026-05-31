# backend/routers/reports.py
import csv
import io
from datetime import datetime, timezone
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

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


def _build_monthly_summary(payments: list[Payment]) -> list[dict]:
    monthly: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
    for p in payments:
        pd = p.payment_date or p.created_at
        if pd.tzinfo is None:
            pd = pd.replace(tzinfo=timezone.utc)
        key = pd.strftime("%Y-%m")
        monthly[key]["total"] += p.amount
        monthly[key]["count"] += 1
    return [
        {"period": k, "total": round(v["total"], 2), "count": v["count"]}
        for k, v in sorted(monthly.items())
    ]


# ── CSV ────────────────────────────────────────────────────────────────────────

@router.get("/income/csv")
async def income_csv(
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != Role.tutor:
        raise HTTPException(status_code=403, detail="Только репетитор может получать отчёты")

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

    payments = await _fetch_payments(db, current_user.id, date_from, date_to)
    summary = _build_monthly_summary(payments)

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
