from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AgendamentoViewSet, PetViewSet, TutorViewSet, csrf_view, login_view, logout_view, me_view, register_view, resumo


router = DefaultRouter()
router.register("tutores", TutorViewSet, basename="tutor")
router.register("pets", PetViewSet, basename="pet")
router.register("agendamentos", AgendamentoViewSet, basename="agendamento")

urlpatterns = [
    path("auth/csrf/", csrf_view, name="csrf"),
    path("auth/login/", login_view, name="login"),
    path("auth/register/", register_view, name="register"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", me_view, name="me"),
    path("resumo/", resumo, name="resumo"),
    path("", include(router.urls)),
]
