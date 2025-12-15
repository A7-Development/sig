import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


# Association table for User-Role many-to-many relationship
UserRole = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)

# Association table for Role-Permission many-to-many relationship
RolePermission = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    roles = relationship("Role", secondary=UserRole, back_populates="users", lazy="selectin")
    
    def __repr__(self):
        return f"<User {self.email}>"


class Role(Base):
    __tablename__ = "roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", secondary=UserRole, back_populates="roles", lazy="selectin")
    permissions = relationship("Permission", secondary=RolePermission, back_populates="roles", lazy="selectin")
    
    def __repr__(self):
        return f"<Role {self.name}>"


class Module(Base):
    __tablename__ = "modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)  # e.g., "controladoria", "planejamento"
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    icon = Column(String(50))  # Icon name for UI
    order = Column(String(10), default="0")  # For menu ordering
    is_active = Column(Boolean, default=True)
    
    # Relationships
    permissions = relationship("Permission", back_populates="module", lazy="selectin")
    
    def __repr__(self):
        return f"<Module {self.code}>"


class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), nullable=False)  # e.g., "view", "create", "edit", "delete", "export", "admin"
    resource = Column(String(100), nullable=False)  # e.g., "dashboard", "reports", "settings"
    description = Column(String(500))
    
    # Relationships
    module = relationship("Module", back_populates="permissions", lazy="selectin")
    roles = relationship("Role", secondary=RolePermission, back_populates="permissions", lazy="selectin")
    
    def __repr__(self):
        return f"<Permission {self.module_id}:{self.action}:{self.resource}>"

