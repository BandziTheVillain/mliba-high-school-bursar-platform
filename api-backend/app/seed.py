from uuid import uuid4
from sqlmodel import Session, select

from app.config import Config
from app.db import engine
from app import models, hashing


def create_superuser():
    """Create the admin user on startup if no users exist yet."""
    with Session(engine) as session:
        if session.scalars(select(models.User)).first() is not None:
            print("Superuser already exists. Quitting...")
            return

        if not Config.ADMIN_PASSWORD:
            print("WARNING: no users exist and ADMIN_PASSWORD is not set; skipping superuser creation")
            return

        user = models.User(
            id=uuid4(),
            username=Config.ADMIN_USERNAME,
            password=hashing.generate_password_hash(Config.ADMIN_PASSWORD),
        )
        session.add(user)
        session.commit()
        print(f"Created superuser '{Config.ADMIN_USERNAME}'")

