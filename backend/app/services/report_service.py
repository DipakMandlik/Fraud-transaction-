"""Generates a polished, branded PDF investigation report for a fraud alert —
the "Generate Investigation Report" action in the analyst workspace.

The layout mirrors the live app's design system (frontend/tailwind.config.js)
so the exported document and the on-screen investigation page read as the
same product."""

from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.fraud_alert import FraudAlert
from app.utils.time import utcnow

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
LOGO_PATH = ASSETS_DIR / "pibythree-logo.jpg"

# Register a Unicode-capable TTF (vendored, not dependent on host fonts) so
# amounts render with the correct currency glyph (e.g. ₹) everywhere.
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
if "DejaVuSans" not in pdfmetrics.getRegisteredFontNames():
    pdfmetrics.registerFont(TTFont("DejaVuSans", str(ASSETS_DIR / "fonts" / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(ASSETS_DIR / "fonts" / "DejaVuSans-Bold.ttf")))
    FONT_REGULAR = "DejaVuSans"
    FONT_BOLD = "DejaVuSans-Bold"

# Brand palette — mirrors the Tailwind config so the PDF and the live app
# read as one product.
PRIMARY = colors.HexColor("#2563EB")
INK = colors.HexColor("#0F172A")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748B")
SLATE_400 = colors.HexColor("#94A3B8")
SLATE_300 = colors.HexColor("#CBD5E1")
SLATE_200 = colors.HexColor("#E2E8F0")
SLATE_100 = colors.HexColor("#F1F5F9")
SLATE_50 = colors.HexColor("#F8FAFC")
WHITE = colors.white
SUCCESS = colors.HexColor("#16A34A")
SUCCESS_LIGHT = colors.HexColor("#DCFCE7")
WARNING = colors.HexColor("#EA580C")
WARNING_LIGHT = colors.HexColor("#FFEDD5")
AMBER = colors.HexColor("#B45309")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
FRAUD = colors.HexColor("#DC2626")
FRAUD_LIGHT = colors.HexColor("#FEE2E2")

PAGE_SIZE = A4
MARGIN = 16 * mm
CONTENT_WIDTH = PAGE_SIZE[0] - 2 * MARGIN
HEADER_HEIGHT = 24 * mm
FOOTER_HEIGHT = 14 * mm


def _severity_tone(severity: str):
    return {
        "CRITICAL": (FRAUD, FRAUD_LIGHT),
        "HIGH": (WARNING, WARNING_LIGHT),
        "MEDIUM": (PRIMARY, colors.HexColor("#EFF4FF")),
    }.get(severity, (SLATE_500, SLATE_100))


def _status_tone(status: str):
    return {
        "OPEN": (FRAUD, FRAUD_LIGHT),
        "INVESTIGATING": (AMBER, AMBER_LIGHT),
        "FALSE_POSITIVE": (SLATE_500, SLATE_100),
        "CLOSED": (SUCCESS, SUCCESS_LIGHT),
    }.get(status, (SLATE_500, SLATE_100))


def _risk_tone(score: float):
    if score >= 81:
        return FRAUD, FRAUD_LIGHT
    if score >= 61:
        return WARNING, WARNING_LIGHT
    if score >= 31:
        return PRIMARY, colors.HexColor("#EFF4FF")
    return SUCCESS, SUCCESS_LIGHT


def _style(name, **kwargs):
    defaults = dict(fontName=FONT_REGULAR, fontSize=9, leading=12, textColor=INK)
    defaults.update(kwargs)
    return ParagraphStyle(name, **defaults)


STYLES = {
    "section": _style("section", fontName=FONT_BOLD, fontSize=10, leading=13, textColor=SLATE_700),
    "card_title": _style("card_title", fontName=FONT_BOLD, fontSize=9, leading=12, textColor=INK),
    "label": _style("label", fontSize=6.5, leading=9, textColor=SLATE_400, spaceAfter=1),
    "value": _style("value", fontName=FONT_BOLD, fontSize=9.5, leading=12.5, textColor=INK),
    "body": _style("body", fontSize=9.5, leading=14, textColor=SLATE_700),
    "bullet": _style(
        "bullet", fontSize=9.5, leading=14, textColor=SLATE_700, leftIndent=12, bulletIndent=0, spaceAfter=4
    ),
    "rule_name": _style("rule_name", fontName=FONT_BOLD, fontSize=9, leading=12, textColor=INK),
    "rule_name_muted": _style("rule_name_muted", fontSize=9, leading=12, textColor=SLATE_500),
    "rule_detail": _style("rule_detail", fontSize=8.25, leading=11, textColor=SLATE_500),
    "rule_weight": _style("rule_weight", fontName=FONT_BOLD, fontSize=9, leading=12, textColor=SLATE_700, alignment=TA_CENTER),
    "timeline_meta": _style("timeline_meta", fontName=FONT_REGULAR, fontSize=7.5, leading=10, textColor=SLATE_400),
    "timeline_title": _style("timeline_title", fontName=FONT_BOLD, fontSize=9, leading=12, textColor=INK),
    "timeline_detail": _style("timeline_detail", fontSize=8.5, leading=12, textColor=SLATE_500),
}


def _badge(text: str, fg, bg, *, font_size=8) -> Paragraph:
    style = ParagraphStyle(
        f"badge-{id(text)}-{font_size}",
        fontName=FONT_BOLD,
        fontSize=font_size,
        leading=font_size + 3,
        textColor=fg,
        backColor=bg,
        borderRadius=7,
        borderPadding=(5, 4, 5, 4),
        alignment=TA_CENTER,
    )
    return Paragraph(text, style)


def _card_heading(title: str, accent) -> Table:
    """A colored accent chip + title — the card "header" strip."""
    heading = Table([["", Paragraph(title.upper(), STYLES["card_title"])]], colWidths=[3 * mm, CONTENT_WIDTH - 3 * mm])
    heading.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), accent),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (1, 0), (1, 0), 8),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return heading


def _fields_table(fields: list[tuple[str, str]], *, columns=1) -> Table:
    """A bordered grid of label/value pairs — the card "body"."""
    rows = []
    row = []
    for label, value in fields:
        row.append([Paragraph(label.upper(), STYLES["label"]), Paragraph(str(value), STYLES["value"])])
        if len(row) == columns:
            rows.append(row)
            row = []
    if row:
        row += [""] * (columns - len(row))
        rows.append(row)

    col_width = (CONTENT_WIDTH - 20) / columns
    table = Table(rows, colWidths=[col_width] * columns)
    table.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.75, SLATE_200),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _card(title: str, fields: list[tuple[str, str]], *, accent, columns=1) -> KeepTogether:
    return KeepTogether([_card_heading(title, accent), _fields_table(fields, columns=columns)])


def _section_heading(text: str) -> Table:
    heading = Table([["", Paragraph(text.upper(), STYLES["section"])]], colWidths=[3 * mm, CONTENT_WIDTH - 3 * mm], rowHeights=[6 * mm])
    heading.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), PRIMARY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (1, 0), (1, 0), 8),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    return heading


def build_investigation_report(alert: FraudAlert) -> bytes:
    txn = alert.transaction
    customer = alert.customer
    generated_at = utcnow()

    severity_fg, severity_bg = _severity_tone(alert.severity)
    status_fg, status_bg = _status_tone(alert.status)
    risk_fg, risk_bg = _risk_tone(alert.risk_score)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN + HEADER_HEIGHT,
        bottomMargin=MARGIN + FOOTER_HEIGHT,
        title=f"{alert.alert_ref} - Investigation Report",
        author="Fraud Detection Platform - PiByThree",
    )

    story = []

    # ---- Status strip: severity / status / risk chips ----------------------
    strip = Table(
        [
            [
                _badge(f"{alert.severity} SEVERITY", severity_fg, severity_bg),
                _badge(alert.status.replace("_", " "), status_fg, status_bg),
                _badge(f"RISK SCORE {alert.risk_score:.0f}/100", risk_fg, risk_bg),
                "",
            ]
        ],
        colWidths=[42 * mm, 34 * mm, 44 * mm, CONTENT_WIDTH - 120 * mm],
    )
    strip.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-2, 0), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(strip)
    story.append(Spacer(1, 7 * mm))

    # ---- Customer + Transaction cards ---------------------------------------
    story.append(
        _card(
            "Customer",
            [
                ("Name", customer.full_name),
                ("Customer Code", customer.customer_code),
                ("Risk Segment", customer.risk_segment),
                ("City / State", f"{customer.city}, {customer.state}"),
            ],
            accent=PRIMARY,
            columns=2,
        )
    )
    story.append(Spacer(1, 5 * mm))

    device_label = txn.device.device_uid if txn.device else "Unregistered"
    story.append(
        _card(
            "Transaction",
            [
                ("Reference", txn.transaction_ref),
                ("Amount", f"{txn.currency} {float(txn.amount):,.2f}"),
                ("Channel", txn.transaction_type.replace("_", " ").title()),
                ("Decision", txn.decision.title()),
                ("Location", f"{txn.city}, {txn.country.name}"),
                ("Device", device_label),
                ("IP Address", txn.ip_address),
                ("Timestamp", txn.timestamp.strftime("%d %b %Y, %I:%M %p").strip()),
            ],
            accent=SLATE_400,
            columns=2,
        )
    )
    story.append(Spacer(1, 8 * mm))

    # ---- Why this was flagged ------------------------------------------------
    story.append(_section_heading("Why This Was Flagged"))
    story.append(Spacer(1, 3 * mm))
    points = alert.explanation or [alert.reason_summary]
    bullet_flowables = [Paragraph(point, STYLES["bullet"], bulletText="•") for point in points]
    explanation_box = Table([[bullet_flowables]], colWidths=[CONTENT_WIDTH])
    explanation_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SLATE_50),
                ("BOX", (0, 0), (-1, -1), 0.75, SLATE_200),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(explanation_box)
    story.append(Spacer(1, 8 * mm))

    # ---- Rule evaluation table -------------------------------------------------
    story.append(_section_heading("Rule Evaluation"))
    story.append(Spacer(1, 3 * mm))
    rule_rows = [[Paragraph("RULE", STYLES["label"]), Paragraph("WEIGHT", STYLES["label"]), Paragraph("VERDICT", STYLES["label"])]]
    row_tones = [None]
    for rule in sorted(txn.rule_evaluations or [], key=lambda r: (not r["triggered"], -r["weight"])):
        triggered = rule["triggered"]
        name_style = STYLES["rule_name"] if triggered else STYLES["rule_name_muted"]
        name_cell = [Paragraph(rule["name"], name_style), Paragraph(rule.get("detail", ""), STYLES["rule_detail"])]
        weight_cell = Paragraph(f"+{rule['weight']:.0f}" if triggered else f"{rule['weight']:.0f}", STYLES["rule_weight"])
        verdict_fg, verdict_bg = (FRAUD, FRAUD_LIGHT) if triggered else (SUCCESS, SUCCESS_LIGHT)
        verdict_cell = _badge("TRIGGERED" if triggered else "PASSED", verdict_fg, verdict_bg, font_size=7)
        rule_rows.append([name_cell, weight_cell, verdict_cell])
        row_tones.append(FRAUD_LIGHT if triggered else None)

    rule_table = Table(rule_rows, colWidths=[CONTENT_WIDTH - 55 * mm, 20 * mm, 35 * mm], repeatRows=1)
    rule_style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 1, SLATE_300),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, SLATE_100),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]
    for i, tone in enumerate(row_tones):
        if tone:
            rule_style.append(("BACKGROUND", (0, i), (-1, i), tone))
    rule_table.setStyle(TableStyle(rule_style))
    story.append(rule_table)
    story.append(Spacer(1, 8 * mm))

    # ---- Investigation timeline --------------------------------------------------
    story.append(_section_heading("Investigation Timeline"))
    story.append(Spacer(1, 4 * mm))
    investigations = sorted(alert.investigations, key=lambda i: i.created_at)
    if investigations:
        for idx, inv in enumerate(investigations):
            marker_and_time = f'<font color="#2563EB">●</font>&nbsp;&nbsp;{inv.created_at.strftime("%d %b %Y, %I:%M %p")}'
            entry = [
                Paragraph(marker_and_time, STYLES["timeline_meta"]),
                Paragraph(f"{inv.action.replace('_', ' ').title()} &middot; {inv.investigator}", STYLES["timeline_title"]),
            ]
            if inv.notes:
                entry.append(Paragraph(inv.notes, STYLES["timeline_detail"]))
            story.append(KeepTogether(entry))
            if idx < len(investigations) - 1:
                story.append(Spacer(1, 4 * mm))
    else:
        story.append(Paragraph("No investigator actions have been logged for this case yet.", STYLES["body"]))

    def _header_footer(canvas, _doc):
        canvas.saveState()
        page_w, page_h = PAGE_SIZE

        # Header
        top = page_h - MARGIN
        try:
            canvas.drawImage(
                str(LOGO_PATH),
                MARGIN,
                top - 14 * mm,
                width=26 * mm,
                height=14 * mm,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pass

        text_x = MARGIN + 30 * mm
        canvas.setFillColor(INK)
        canvas.setFont(FONT_BOLD, 14)
        canvas.drawString(text_x, top - 6.5 * mm, "Fraud Detection Platform")
        canvas.setFillColor(PRIMARY)
        canvas.setFont(FONT_BOLD, 7.5)
        canvas.drawString(text_x, top - 11.5 * mm, "CONFIDENTIAL  ·  INVESTIGATION REPORT")

        canvas.setFillColor(SLATE_400)
        canvas.setFont(FONT_REGULAR, 6.5)
        canvas.drawRightString(page_w - MARGIN, top - 4 * mm, "ALERT REFERENCE")
        canvas.setFillColor(INK)
        canvas.setFont(FONT_BOLD, 11)
        canvas.drawRightString(page_w - MARGIN, top - 8.5 * mm, alert.alert_ref)
        canvas.setFillColor(SLATE_400)
        canvas.setFont(FONT_REGULAR, 7.5)
        canvas.drawRightString(
            page_w - MARGIN, top - 13 * mm, f"Generated {generated_at.strftime('%d %b %Y, %I:%M %p UTC')}"
        )

        canvas.setStrokeColor(PRIMARY)
        canvas.setLineWidth(1.5)
        canvas.line(MARGIN, top - HEADER_HEIGHT + 6, page_w - MARGIN, top - HEADER_HEIGHT + 6)

        # Footer
        canvas.setStrokeColor(SLATE_200)
        canvas.setLineWidth(0.75)
        canvas.line(MARGIN, FOOTER_HEIGHT, page_w - MARGIN, FOOTER_HEIGHT)

        canvas.setFillColor(SLATE_500)
        canvas.setFont(FONT_BOLD, 7)
        canvas.drawCentredString(page_w / 2, FOOTER_HEIGHT - 7, "PiByThree · Enterprise AI Solutions")
        canvas.setFillColor(SLATE_400)
        canvas.setFont(FONT_REGULAR, 6.5)
        canvas.drawCentredString(
            page_w / 2,
            FOOTER_HEIGHT - 15,
            "CONFIDENTIAL — for authorized internal use only. Do not distribute externally.",
        )
        canvas.drawRightString(page_w - MARGIN, FOOTER_HEIGHT - 7, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buffer.getvalue()
