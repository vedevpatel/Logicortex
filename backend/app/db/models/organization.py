from sqlalchemy import Column, Integer, String, ForeignKey, Table, DateTime, func, Enum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List, Optional, TYPE_CHECKING

from app.db.base_class import Base

if TYPE_CHECKING:
    from .user import User
    from .scan import Scan

user_organization_association = Table(
    "user_organization_association",
    Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("organization_id", ForeignKey("organizations.id"), primary_key=True),
    Column("role", String, default="member") # Can be 'owner', 'admin', or 'member'
)

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    github_installation_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship("User", back_populates="owned_organizations")
    members: Mapped[List["User"]] = relationship(
        "User",
        secondary=user_organization_association, 
        back_populates="organizations"
    )
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="organization")