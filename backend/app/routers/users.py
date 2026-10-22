from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import User, UserRole
from app.schemas import RoleUpdate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    _: User = Depends(require_roles(UserRole.ADMIN)), db: Session = Depends(get_db)
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)).all())


@router.patch("/{user_id}/role", response_model=UserOut)
def change_role(
    user_id: int,
    payload: RoleUpdate,
    admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
) -> User:
    if user_id == admin.id:
        # Prevents the last admin from locking everyone out.
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user
