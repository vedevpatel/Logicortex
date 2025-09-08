from sqlalchemy import Column, String, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.base_class import Base
import enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .scan import Scan   # 👈 safe import for type hints

class FindingStatus(enum.Enum):
    OPEN = "open"
    ACCEPTED_RISK = "accepted_risk"
    FALSE_POSITIVE = "false_positive"

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id"))
    
    # A unique hash to identify this specific finding across scans
    fingerprint: Mapped[str] = mapped_column(String, unique=True, index=True)
    
    status: Mapped[FindingStatus] = mapped_column(
        Enum(FindingStatus), default=FindingStatus.OPEN, nullable=False
    )
    
    # Store the detailed finding JSON from the LLM
    details = Column(JSON, nullable=False)

    scan: Mapped["Scan"] = relationship("Scan", back_populates="findings")  # 👈 quotes avoid runtime lookup