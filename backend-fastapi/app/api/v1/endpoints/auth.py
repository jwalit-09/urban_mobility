from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import UserLogin, UserRegister, Token, UserResponse
from app.core.security import verify_password, create_access_token, hash_password
from app.repositories.data_store import data_store

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = data_store.find_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_claims = {
        "sub": str(user["id"]),
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"]
    }
    access_token = create_access_token(token_claims)
    
    return Token(
        access_token=access_token,
        token_type="Bearer",
        expires_in=86400,
        user_id=user["id"],
        email=user["email"],
        role=user["role"]
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister):
    existing = data_store.find_user_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    user_data = {
        "email": user_in.email,
        "password_hash": hash_password(user_in.password),
        "role": user_in.role.upper(),
        "first_name": user_in.first_name,
        "last_name": user_in.last_name,
        "phone": user_in.phone,
        "is_active": True
    }
    created = data_store.create_user(user_data)
    return UserResponse(**created)
