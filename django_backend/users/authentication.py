"""
Custom JWT authentication using HttpOnly cookies.

This module provides cookie-based JWT authentication with automatic token refresh,
replacing localStorage token storage for improved security against XSS attacks.
"""
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework import exceptions
import logging

logger = logging.getLogger(__name__)


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom authentication class that reads JWT from HttpOnly cookies.
    
    Supports automatic access token refresh when expired but refresh token is valid.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request using JWT tokens from cookies.
        
        Returns (user, token) tuple if authenticated, None otherwise.
        """
        # Get access token from cookie
        access_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        
        if not access_token:
            # No access token in cookies, try standard header authentication
            return None
        
        try:
            # Validate the access token
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
            
        except (InvalidToken, TokenError) as e:
            # Access token is invalid/expired - try to refresh
            refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
            
            if not refresh_token:
                # No refresh token, can't auto-refresh
                logger.debug("Access token expired and no refresh token available")
                raise exceptions.AuthenticationFailed("Token expired. Please log in again.")
            
            try:
                # Attempt to refresh the tokens
                refresh = RefreshToken(refresh_token)
                new_access_token = str(refresh.access_token)
                
                # Validate the new access token
                validated_token = self.get_validated_token(new_access_token)
                user = self.get_user(validated_token)
                
                # Store the new tokens in request for the view to set cookies
                request._new_access_token = new_access_token
                if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                    request._new_refresh_token = str(refresh)
                
                logger.debug(f"Auto-refreshed access token for user {user.username}")
                return (user, validated_token)
                
            except (InvalidToken, TokenError) as refresh_error:
                logger.debug(f"Failed to refresh token: {refresh_error}")
                raise exceptions.AuthenticationFailed("Session expired. Please log in again.")


def set_jwt_cookies(response, access_token, refresh_token=None):
    """
    Helper function to set JWT tokens as HttpOnly cookies on a response.
    
    Args:
        response: The Response object to add cookies to
        access_token: The access token string
        refresh_token: Optional refresh token string
    
    Returns:
        The modified response object
    """
    # Access token cookie
    response.set_cookie(
        settings.JWT_AUTH_COOKIE,
        access_token,
        httponly=settings.JWT_AUTH_COOKIE_HTTPONLY,
        secure=settings.JWT_AUTH_COOKIE_SECURE,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
    )
    
    # Refresh token cookie (if provided)
    if refresh_token:
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh_token,
            httponly=settings.JWT_AUTH_COOKIE_HTTPONLY,
            secure=settings.JWT_AUTH_COOKIE_SECURE,
            samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
            path=settings.JWT_AUTH_COOKIE_PATH,
            max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        )
    
    return response


def clear_jwt_cookies(response):
    """
    Helper function to clear JWT cookies from a response (for logout).
    
    Args:
        response: The Response object to clear cookies from
    
    Returns:
        The modified response object
    """
    response.delete_cookie(
        settings.JWT_AUTH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.JWT_AUTH_REFRESH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    return response
