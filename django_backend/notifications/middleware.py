"""
JWT Authentication middleware for WebSocket connections.
Authenticates users via JWT token passed in query string.
"""

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs


class JWTAuthMiddleware:
    """
    Custom middleware that authenticates WebSocket connections using JWT.
    Token should be passed in query string: ws://host/ws/notifications/?token=<jwt>
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        # Parse query string for token
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if token:
            scope['user'] = await self.get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
        
        return await self.app(scope, receive, send)
    
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
