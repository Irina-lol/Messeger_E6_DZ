from rest_framework import serializers
from .models import Chat, Message, Profile
from django.contrib.auth.models import User


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SlugRelatedField(many=False, read_only=True, slug_field='nickname')

    class Meta:
        model = User
        fields = ['id', 'username', 'profile']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['itsMe'] = data['id'] == self.context['request'].user.id
        return data


class ChatSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all())

    class Meta:
        model = Chat
        fields = ['id', 'title', 'members', 'members_list']

    def create(self, validated_data):
        if 'members' in self.initial_data:
            members = validated_data.pop('members')
        else:
            members = []

        chat = Chat.objects.create(**validated_data)
        chat.members.add(*set([m.id for m in members]))
        return chat

    def update(self, instance, validated_data):
        members = validated_data.pop('members')
        new_members = [m.id for m in members]
        old_members = [m.id for m in instance.members.all()]
        for m in list(set(new_members) & set(old_members)):
            old_members.remove(m)
            new_members.remove(m)
        instance.members.add(*new_members)
        instance.members.remove(*old_members)
        instance.title = validated_data.get('title', instance.title)
        instance.save()
        return instance


class MessageSerializer(serializers.ModelSerializer):
    authorName = serializers.ReadOnlyField(source='author.username')
    dateCreation = serializers.DateTimeField(read_only=True)
    authorizedUser = serializers.ReadOnlyField(default=0, read_only=True)
    nickname = serializers.ReadOnlyField(source='author.profile.nickname')
    avatar = serializers.ReadOnlyField(source='author.profile.portrait.url')

    class Meta:
        model = Message
        fields = ['id', 'text', 'author', 'authorName', 'chat', 'deleted', 'dateCreation', 'authorizedUser', 'nickname',
                  'avatar']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['dateCreation'] = instance.dateCreation.strftime("%d.%m.%Y %H:%M")
        return data