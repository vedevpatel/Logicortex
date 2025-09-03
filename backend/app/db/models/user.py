from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING

from app.db.base_class import Base
from app.db.models.organization import user_organization_association

if TYPE_CHECKING:
    from .organization import Organization

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False, default="email")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships to Organization
    owned_organizations: Mapped[List["Organization"]] = relationship("Organization", back_populates="owner")
    organizations: Mapped[List["Organization"]] = relationship(
        "Organization",
        secondary=user_organization_association, 
        back_populates="members"
    )