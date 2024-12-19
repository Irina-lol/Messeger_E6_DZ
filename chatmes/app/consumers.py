import json
from channels.generic.websocket import AsyncWebsocketConsumer

from . import models


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chat_id = self.scope["url_route"]["kwargs"]["chat_id"]
        self.chat_name = f"chat-id_{self.chat_id}"
        print(f"Получен chat_id={self.chat_id}")

        await self.channel_layer.group_add(self.chat_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.chat_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'message':
            await self.channel_layer.group_send(
                self.chat_name, {"type": "chat.message", "message": data}
            )
        elif data['type'] == 'chat':
            await self.channel_layer.group_send(
                self.chat_name, {"type": "chat.message", "message": data}
            )
            async for chat in models.Chat.objects.filter(members__in=data['parcel']['members']).values('id').distinct():
                chatName = f"chat-id_{chat['id']}"
                await self.channel_layer.group_send(
                    chatName, {"type": "chat.message", "message": data}
                )


    async def chat_message(self, event):
        message = event["message"]

        await self.send(text_data=json.dumps({"message": message}))