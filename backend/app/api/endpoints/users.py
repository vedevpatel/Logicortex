from fastapi import APIRouter, Depends
from app.schemas.user import User
from app.api.deps import get_current_user
from app.db.models.user import User as UserModel

router = APIRouter()

@router.get("/me", response_model=User)
def read_users_me(current_user: UserModel = Depends(get_current_user)):
    """
    Get the current logged-in user.
    """
    return current_user