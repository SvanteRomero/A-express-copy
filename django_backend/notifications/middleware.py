"""
JWT Authentication middleware for WebSocket connections.
Authenticates users via JWT token from cookies (same as HTTP auth).
"""

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from http.cookies import SimpleCookie


class JWTAuthMiddleware:
    """
    Custom middleware that authenticates WebSocket connections using JWT from cookies.
    Uses the same HttpOnly access_token cookie as HTTP requests, allowing WebSocket
    connections to automatically benefit from cookie-based auth refresh.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Get token from cookies
        token = self.get_token_from_cookies(scope)
        
        if token:
            scope['user'] = await self.get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await self.app(scope, receive, send)
    
    def get_token_from_cookies(self, scope):
        """Extract access_token from WebSocket connection cookies."""
        headers = dict(scope.get('headers', []))
        cookie_header = headers.get(b'cookie', b'').decode()
        
        if not cookie_header:
            return None
        
        cookies = SimpleCookie()
        cookies.load(cookie_header)
        
        access_token_cookie = cookies.get('access_token')
        if access_token_cookie:
            return access_token_cookie.value
        
        return None
    
    @database_sync_to_async
    def get_user_from_token(self, token):
        """Validate JWT token and return user."""
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            # Validate token
            access_token = AccessToken(token)
            user_id = access_token.get('user_id')
            
            if user_id:
                return User.objects.get(id=user_id)
        except Exception:
            pass
        
        return AnonymousUser()
