from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.views.generic import (ListView, UpdateView, )
from django.shortcuts import render
from rest_framework import viewsets, permissions, status

from django.contrib.auth.models import User
from rest_framework.response import Response

from . import models
from . import serializers
from . import forms


# Create your views here.
class ChatListView(LoginRequiredMixin, ListView):
    model = models.Chat
    form_class = forms.MessageForm
    template_name = 'app/chatlist.html'
    context_object_name = 'chats'

    def get_queryset(self):
        queryset = super().get_queryset().filter(members__in=[self.request.user])
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['author'] = self.request.user
        profile, creted = models.Profile.objects.get_or_create(user=self.request.user)
        context['profile'] = profile
        context['form'] = self.form_class
        return context


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = serializers.UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class ChatViewSet(viewsets.ModelViewSet):
    queryset = models.Chat.objects.all()
    serializer_class = serializers.ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(members__in=[self.request.user])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.members.clear()
        m = instance.message_set.all()
        m.delete()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = models.Message.objects.all()
    serializer_class = serializers.MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        chat_id = self.request.query_params.get('chat_id', None)
        if chat_id and models.Chat.objects.filter(pk=chat_id).exists():
            if models.Chat.objects.get(pk=chat_id).members.contains(request.user) or request.user.is_superuser:
                serializer = self.serializer_class(self.queryset.filter(chat__id=chat_id, deleted=False), many=True,
                                                   context={'request': request})
                data = serializer.data
                return Response(data)

        return Response(status=status.HTTP_404_NOT_FOUND)

    def retrieve(self, request, pk=None):
        chat_id = pk
        if chat_id and models.Chat.objects.filter(pk=chat_id).exists():
            if models.Chat.objects.get(pk=chat_id).members.contains(request.user) or request.user.is_superuser:
                serializer = self.serializer_class(self.queryset.filter(chat__id=chat_id, deleted=False), many=True,
                                                   context={'request': request})
                data = serializer.data
                return Response(data)

        return Response(status=status.HTTP_404_NOT_FOUND)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.author_id == request.user.id:
            instance.deleted = True
            instance.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_404_NOT_FOUND)


class EditProfileView(LoginRequiredMixin, UpdateView):
    model = models.Profile
    form_class = forms.ProfileForm
    template_name = 'app/profile.html'
    success_url = '/'

    def get_object(self, queryset=None):
        return self.request.user.profile