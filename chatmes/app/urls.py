from django.urls import path, include
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'chat', views.ChatViewSet)
router.register(r'message', views.MessageViewSet)


urlpatterns = [
    path('', views.ChatListView.as_view(), name='home'),
    path('api/', include(router.urls), name='api'),
    path('profile/', views.EditProfileView.as_view(), name='profile'),
]