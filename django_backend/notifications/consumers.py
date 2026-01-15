"""
WebSocket consumer for real-time notifications.
Handles connection, disconnection, and message broadcasting to role-based groups.
"""

import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for notifications.
    Users are added to groups based on their role (manager, front_desk).
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get('user')
        
        # Only authenticated users can connect
        if user and user.is_authenticated:
            user_role = getattr(user, 'role', 'user')
            # Normalize role for group name (lowercase, replace spaces with underscores)
            normalized_role = user_role.lower().replace(' ', '_') if user_role else 'user'
            
            # Add user to role-based group
            self.group_name = f'notifications_{normalized_role}'
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()
            logger.info(f"WebSocket connected: user={user.username}, role={user_role}, group={self.group_name}")
            
            # Send welcome message
            await self.send_json({
                'type': 'connection_established',
                'message': f'Connected to notifications as {user_role}'
            })
            return
        
        # Reject connection for unauthenticated users
        logger.warning(f"WebSocket connection rejected: user={getattr(user, 'username', 'anonymous')}")
        await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected: group={self.group_name}")
    
    async def receive_json(self, content):
        """
        Handle incoming messages from client.
        Currently just echoes back - can be extended for client-to-server messages.
        """
        message_type = content.get('type', 'unknown')
        logger.debug(f"Received WebSocket message: {message_type}")
        
        # Ping-pong for connection keep-alive
        if message_type == 'ping':
            await self.send_json({'type': 'pong'})
    
    async def scheduler_notification(self, event):
        """
        Handler for scheduler.notification messages.
        Called when channel_layer.group_send is used with type='scheduler.notification'
        """
        await self.send_json(event['data'])
    
    async def task_notification(self, event):
        """
        Handler for task-related notifications.
        Can be extended for other notification types.
        """
        await self.send_json(event['data'])

    async def toast_notification(self, event):
        """
        Handler for toast notifications.
        Called when channel_layer.group_send is used with type='toast.notification'
        """
        await self.send_json(event['data'])
