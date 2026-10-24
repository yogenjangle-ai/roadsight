from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from .database import Base

class PotholeReportDB(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    client_id = Column(String(100), unique=True, index=True, nullable=True)
    ticket_id = Column(String(100), index=True, nullable=True)
    timestamp = Column(Float, default=lambda: datetime.utcnow().timestamp() * 1000)
    created_at = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(String(50), default="Medium", index=True)
    confidence = Column(Float, default=0.8)
    potholes_count = Column(Integer, default=1)
    address = Column(String(255), nullable=True)
    authority = Column(String(255), default="State Public Works Department (PWD)")
    status = Column(String(100), default="REPORTED TO PWD", index=True)
    notes = Column(Text, nullable=True)
    technical_note = Column(Text, nullable=True)
    image_data = Column(Text, nullable=True) # Base64 data URL

class ReportCreate(BaseModel):
    client_id: Optional[str] = None
    ticket_id: Optional[str] = None
    timestamp: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: str = "Medium"
    confidence: float = 0.8
    potholes_count: int = 1
    address: Optional[str] = None
    authority: Optional[str] = "State Public Works Department (PWD)"
    status: Optional[str] = "REPORTED TO PWD"
    notes: Optional[str] = None
    technical_note: Optional[str] = None
    image_data: Optional[str] = None

class ReportResponse(BaseModel):
    id: int
    client_id: Optional[str] = None
    ticket_id: Optional[str] = None
    timestamp: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: str
    confidence: float
    potholes_count: int
    address: Optional[str] = None
    authority: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    technical_note: Optional[str] = None
    image_data: Optional[str] = None

    class Config:
        from_attributes = True

class StatsResponse(BaseModel):
    total_reports: int
    total_potholes: int
    severity_breakdown: dict
    avg_confidence: float
    recent_reports: List[ReportResponse]
