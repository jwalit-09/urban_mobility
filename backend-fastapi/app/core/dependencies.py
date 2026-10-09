from typing import List, Dict, Any, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict[str, Any]:
    """Dependency: Validates Bearer token and returns authenticated user claims."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency Factory: Enforces Role-Based Access Control (RBAC)."""
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "PASSENGER").upper()
        allowed_normalized = [r.upper() for r in allowed_roles]
        
        # ADMIN has universal access
        if "ADMIN" in user_role or user_role in allowed_normalized:
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: requires one of roles {allowed_roles}, your role is {user_role}"
        )
    return role_checker
