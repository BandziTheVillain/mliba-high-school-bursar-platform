import bcrypt

# Uses bcrypt directly: passlib 1.7.4 is unmaintained and breaks with bcrypt>=5.
# Existing passlib bcrypt hashes ($2b$...) remain valid.

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False

def generate_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
