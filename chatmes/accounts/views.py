from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.views import View
from django.views.generic import CreateView
from .forms import RegisterForm

class LoginView(View):
    template_name = 'registration/login.html'

@login_required(login_url='accounts/login/')
def logout_view(request):
    logout(request)
    return redirect('/')

class RegisterView(CreateView):
    model = User
    form_class = RegisterForm
    success_url = 'accounts/login'
    template_name = 'registration/register.html'

    def form_valid(self, form):
        user = form.save(commit=False)
        user.is_active = True
        user.is_stuff = True
        user.save()
        return redirect('/')