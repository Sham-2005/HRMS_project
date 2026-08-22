from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

import hmac

# Setup password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pre-computed dummy bcrypt hash for timing attack protection on non-existent users
DUMMY_HASH = "$2b$12$LqyqyqyqyqyqyqyqyqyqyeXoD.gC5i66lE6P.g633p2.gC5i66lE6"

def is_bcrypt_hash(value: str) -> bool:
    if not value:
        return False
    return len(value) == 60 and (value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$"))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not is_bcrypt_hash(hashed_password):
        # Fallback to constant-time comparison for legacy plaintext passwords to allow migration
        return hmac.compare_digest(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(
    subject: Union[str, Any], role: str, expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt
