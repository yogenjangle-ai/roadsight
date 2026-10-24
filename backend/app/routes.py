from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc, delete
from .database import get_db
from .models import PotholeReportDB, ReportCreate, ReportResponse, StatsResponse
from .inference import run_server_detection

router = APIRouter(prefix="/api", tags=["RoadSight API"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "RoadSight Backend API",
        "version": "1.0.0"
    }

@router.post("/reports", response_model=ReportResponse)
async def create_or_sync_report(payload: ReportCreate, db: AsyncSession = Depends(get_db)):
    # Check if report already exists by client_id
    if payload.client_id:
        existing = await db.execute(
            select(PotholeReportDB).where(PotholeReportDB.client_id == payload.client_id)
        )
        report = existing.scalars().first()
        if report:
            # Update existing
            report.latitude = payload.latitude
            report.longitude = payload.longitude
            report.severity = payload.severity
            report.confidence = payload.confidence
            report.potholes_count = payload.potholes_count
            report.address = payload.address
            report.authority = payload.authority or report.authority
            report.status = payload.status or report.status
            report.notes = payload.notes
            report.technical_note = payload.technical_note
            if payload.image_data:
                report.image_data = payload.image_data
            await db.commit()
            await db.refresh(report)
            return report

    new_report = PotholeReportDB(
        client_id=payload.client_id,
        ticket_id=payload.ticket_id,
        timestamp=payload.timestamp or (func.now()),
        latitude=payload.latitude,
        longitude=payload.longitude,
        severity=payload.severity,
        confidence=payload.confidence,
        potholes_count=payload.potholes_count,
        address=payload.address,
        authority=payload.authority or "State Public Works Department (PWD)",
        status=payload.status or "REPORTED TO PWD",
        notes=payload.notes,
        technical_note=payload.technical_note,
        image_data=payload.image_data,
    )
    db.add(new_report)
    await db.commit()
    await db.refresh(new_report)
    return new_report

@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(
    severity: Optional[str] = Query(None, description="Filter by severity: Small, Medium, Large"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(PotholeReportDB).order_by(desc(PotholeReportDB.timestamp))
    if severity and severity.upper() != "ALL":
        query = query.where(func.lower(PotholeReportDB.severity) == severity.lower())
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PotholeReportDB).where(PotholeReportDB.id == report_id))
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.delete("/reports/{report_id}")
async def delete_report(report_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PotholeReportDB).where(PotholeReportDB.id == report_id))
    report = result.scalars().first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
    return {"status": "success", "message": f"Report {report_id} deleted"}

@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Total count
    total_reports = await db.scalar(select(func.count(PotholeReportDB.id))) or 0
    total_potholes = await db.scalar(select(func.sum(PotholeReportDB.potholes_count))) or 0
    avg_conf = await db.scalar(select(func.avg(PotholeReportDB.confidence))) or 0.0

    # Severity breakdown
    counts = await db.execute(
        select(PotholeReportDB.severity, func.count(PotholeReportDB.id)).group_by(PotholeReportDB.severity)
    )
    severity_breakdown = {row[0].capitalize(): row[1] for row in counts.all()}
    for s in ["Small", "Medium", "Large"]:
        if s not in severity_breakdown:
            severity_breakdown[s] = 0

    # Recent 5
    recent_query = select(PotholeReportDB).order_by(desc(PotholeReportDB.timestamp)).limit(5)
    recent_res = await db.execute(recent_query)
    recent_reports = recent_res.scalars().all()

    return StatsResponse(
        total_reports=total_reports,
        total_potholes=int(total_potholes),
        severity_breakdown=severity_breakdown,
        avg_confidence=round(float(avg_conf), 2),
        recent_reports=recent_reports
    )

@router.post("/detect")
async def detect_potholes(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file and runs server-side pothole detection.
    """
    contents = await file.read()
    results = run_server_detection(contents)
    return results
