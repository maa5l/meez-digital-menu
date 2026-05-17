
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import CurrentUser, RequireStaff, RequireViewer

DbSession = Annotated[Session, Depends(get_db)]
