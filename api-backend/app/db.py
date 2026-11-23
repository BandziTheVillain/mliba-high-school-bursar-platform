from typing import Annotated
from fastapi import Depends
from .config import Config
from sqlmodel import create_engine, Session, SQLModel

DATABASE_URL = Config.DATABASE_URL

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(bind=engine)
        
session_dependency = Annotated[Session, Depends(get_session)]