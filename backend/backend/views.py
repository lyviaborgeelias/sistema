import json

from django.contrib.auth import authenticate, login, logout
from django.db.models import ProtectedError, Q
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_GET, require_POST
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError as ApiValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response

from .models import Agendamento, Pet, Tutor
from .serializers import AgendamentoSerializer, CadastroUsuarioSerializer, PetSerializer, TutorSerializer


class LeituraOuAdministrador(BasePermission):
    message = "Somente administradores podem cadastrar, editar ou excluir registros."

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and (request.method in SAFE_METHODS or request.user.is_superuser))


@require_GET
@ensure_csrf_cookie
def csrf_view(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@csrf_protect
def register_view(request):
    try:
        dados = json.loads(request.body or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"erro": "Envie os dados de cadastro em formato JSON."}, status=400)
    if not isinstance(dados, dict):
        return JsonResponse({"erro": "Envie os dados de cadastro em um objeto JSON."}, status=400)

    serializer = CadastroUsuarioSerializer(data=dados)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    try:
        usuario = serializer.save()
    except ApiValidationError as erro:
        return JsonResponse(erro.detail, status=400)
    return JsonResponse({
        "mensagem": "Cadastro realizado. Faça login para acessar.",
        "usuario": {"id": usuario.id, "username": usuario.username, "nome": usuario.get_full_name().strip(), "email": usuario.email, "is_admin": False},
    }, status=201)


@require_POST
@csrf_protect
def login_view(request):
    try:
        dados = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"erro": "Envie os dados de login em formato JSON."}, status=400)
    if not isinstance(dados, dict):
        return JsonResponse({"erro": "Envie usuário e senha em um objeto JSON."}, status=400)

    usuario = str(dados.get("username", "")).strip()
    senha = str(dados.get("password", ""))
    if not usuario or not senha:
        return JsonResponse({"erro": "Informe usuário e senha."}, status=400)

    autenticado = authenticate(request, username=usuario, password=senha)
    if autenticado is None:
        return JsonResponse({"erro": "Usuário ou senha inválidos."}, status=401)

    login(request, autenticado)
    request.session.set_expiry(30 * 60)
    nome = autenticado.get_full_name().strip() or autenticado.username
    return JsonResponse({"usuario": {"id": autenticado.id, "username": autenticado.username, "nome": nome, "email": autenticado.email, "is_admin": autenticado.is_superuser}})


@require_GET
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"erro": "Sessão expirada ou usuário não autenticado."}, status=401)
    nome = request.user.get_full_name().strip() or request.user.username
    return JsonResponse({"id": request.user.id, "username": request.user.username, "nome": nome, "email": request.user.email, "is_admin": request.user.is_superuser})


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({"mensagem": "Sessão encerrada."})


class TutorViewSet(viewsets.ModelViewSet):
    serializer_class = TutorSerializer
    permission_classes = [LeituraOuAdministrador]

    def get_queryset(self):
        queryset = Tutor.objects.all()
        termo = self.request.query_params.get("search", "").strip()
        if termo:
            queryset = queryset.filter(Q(nome__icontains=termo) | Q(telefone__icontains=termo) | Q(email__icontains=termo))
        return queryset

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as erro:
            raise ApiValidationError({"erro": "Não é possível excluir este tutor enquanto houver pets ou agendamentos vinculados."}) from erro


class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.select_related("tutor").all()
    serializer_class = PetSerializer
    permission_classes = [LeituraOuAdministrador]

    def get_queryset(self):
        queryset = super().get_queryset()
        termo = self.request.query_params.get("search", "").strip()
        if termo:
            queryset = queryset.filter(Q(nome__icontains=termo) | Q(especie__icontains=termo) | Q(tutor__nome__icontains=termo))
        return queryset

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as erro:
            raise ApiValidationError({"erro": "Não é possível excluir este pet enquanto houver agendamentos vinculados."}) from erro


class AgendamentoViewSet(viewsets.ModelViewSet):
    queryset = Agendamento.objects.select_related("tutor", "pet").all()
    serializer_class = AgendamentoSerializer
    permission_classes = [LeituraOuAdministrador]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError as erro:
            raise ApiValidationError({"erro": "Não foi possível excluir este agendamento."}) from erro


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def resumo(request):
    proximos = Agendamento.objects.filter(data_agendamento__gte=timezone.now()).exclude(status="cancelado").select_related("tutor", "pet")[:5]
    return Response({
        "total_tutores": Tutor.objects.count(),
        "total_pets": Pet.objects.count(),
        "total_agendamentos": Agendamento.objects.count(),
        "proximos_agendamentos": AgendamentoSerializer(proximos, many=True).data,
    })
