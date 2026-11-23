from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
import jwt
from app.config import Config

def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Could not validate token",
        headers={"WWW-Authenticate": "Bearer"},
    )

def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise _unauthorized()
    username = payload.get("sub")
    if not username:
        raise _unauthorized()
    return username

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(seconds=Config.ACCESS_TOKEN_MAX_AGE)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, Config.SECRET_KEY, algorithm="HS256")
