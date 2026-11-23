from typing import Annotated
from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.db import engine
from app.config import Config

from app import hashing, tokens
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

def login_user(session: Session, form_data: OAuth2PasswordRequestForm = Depends()):

    stmt = select(User).filter(User.username == form_data.username)
    user = session.scalars(stmt).first()
    if not user or not hashing.verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect user credentials")

    access_token = tokens.create_access_token(data={"sub": user.username})

    return {"access_token": access_token, "token_type": "bearer", "user": user}

def get_current_user(request: Request, access_token: Annotated[str, Depends(oauth2_scheme)]):
    token = request.cookies.get(Config.JWT_ACCESS_COOKIE_NAME) or access_token
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    
    username = tokens.verify_token(token)

    with Session(engine) as session:
        stmt = select(User).filter(User.username == username)
        user = session.scalars(stmt).first()
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

auth_dependency = Annotated[User, Depends(get_current_user)]
