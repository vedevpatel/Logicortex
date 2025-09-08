from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, Dict, Any, TYPE_CHECKING, List

from app.db.base_class import Base

if TYPE_CHECKING:
    from .organization import Organization
    from .finding import Finding
class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    repository_name: Mapped[str] = mapped_column(String, index=True)
    results: Mapped[dict] = mapped_column(JSON, nullable=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization: Mapped["Organization"] = relationship("Organization", back_populates="scans")
    
    findings: Mapped[List["Finding"]] = relationship(
        "Finding",
        back_populates="scan",
        cascade="all, delete-orphan"
    )