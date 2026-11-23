import getpass
import sys
from uuid import uuid4

from sqlmodel import Session, select

from app import hashing, models
from app.db import engine


def set_admin(username: str, password: str) -> None:
    """Create the user, or reset its password if it already exists."""
    with Session(engine) as session:
        user = session.scalars(select(models.User).where(models.User.username == username)).first()
        if user:
            user.password = hashing.generate_password_hash(password)
            action = "Updated password for"
        else:
            session.add(models.User(id=uuid4(), username=username,
                                    password=hashing.generate_password_hash(password)))
            action = "Created"
        session.commit()
        print(f"{action} user '{username}'")


def run_cli() -> None:
    username = input("Admin username: ").strip()
    if not username:
        sys.exit("Username cannot be empty.")
    password = getpass.getpass("Admin password: ")
    if len(password) < 8:
        sys.exit("Password must be at least 8 characters.")
    if getpass.getpass("Confirm password: ") != password:
        sys.exit("Passwords do not match.")
    set_admin(username, password)


if __name__ == "__main__":
    run_cli()
