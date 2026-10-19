from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Agendamento, Pet, Tutor, criptografar_cpf, hash_consulta_cpf, mascarar_cpf, normalizar_cpf, validar_cpf


class CadastroUsuarioSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150)
    username = serializers.CharField(max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        username = get_user_model().normalize_username(value)
        if get_user_model().objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Este usuário já está cadastrado.")
        return username

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "As senhas não coincidem."})
        usuario = get_user_model()(username=attrs["username"], first_name=attrs["nome"], email=attrs["email"])
        try:
            validate_password(attrs["password"], user=usuario)
        except DjangoValidationError as erro:
            raise serializers.ValidationError({"password": erro.messages}) from erro
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return get_user_model().objects.create_user(
                    username=validated_data["username"],
                    first_name=validated_data["nome"],
                    email=validated_data["email"],
                    password=validated_data["password"],
                    is_staff=False,
                    is_superuser=False,
                )
        except IntegrityError as erro:
            raise serializers.ValidationError({"username": ["Este usuário já está cadastrado."]}) from erro


class TutorSerializer(serializers.ModelSerializer):
    cpf = serializers.CharField(write_only=True, required=False, allow_blank=True)
    senha = serializers.CharField(write_only=True, required=False, allow_blank=True, trim_whitespace=False)
    cpf_mascarado = serializers.SerializerMethodField()

    class Meta:
        model = Tutor
        fields = ["id", "nome", "cpf", "cpf_mascarado", "senha", "telefone", "email", "endereco", "created_at", "updated_at"]
        read_only_fields = ["id", "cpf_mascarado", "created_at", "updated_at"]

    def get_cpf_mascarado(self, obj):
        return obj.cpf_mascarado

    def validate_cpf(self, value):
        if not value and self.instance:
            return value
        numero = normalizar_cpf(value)
        if not validar_cpf(numero):
            raise serializers.ValidationError("Informe um CPF válido.")
        consulta = hash_consulta_cpf(numero)
        existentes = Tutor.objects.filter(cpf_lookup_hash=consulta)
        if self.instance:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise serializers.ValidationError("Já existe um tutor cadastrado com este CPF.")
        return numero

    def validate(self, attrs):
        if self.instance is None:
            if not attrs.get("cpf"):
                raise serializers.ValidationError({"cpf": "O CPF é obrigatório."})
            if not attrs.get("senha"):
                raise serializers.ValidationError({"senha": "A senha é obrigatória."})
        senha = attrs.get("senha", "")
        if senha and len(senha) < 8:
            raise serializers.ValidationError({"senha": "A senha deve ter pelo menos 8 caracteres."})
        return attrs

    def create(self, validated_data):
        cpf = validated_data.pop("cpf")
        senha = validated_data.pop("senha")
        validated_data["cpf_encrypted"] = criptografar_cpf(cpf)
        validated_data["cpf_lookup_hash"] = hash_consulta_cpf(cpf)
        validated_data["senha_hash"] = make_password(senha)
        return Tutor.objects.create(**validated_data)

    def update(self, instance, validated_data):
        cpf = validated_data.pop("cpf", "")
        senha = validated_data.pop("senha", "")
        if cpf:
            instance.cpf_encrypted = criptografar_cpf(cpf)
            instance.cpf_lookup_hash = hash_consulta_cpf(cpf)
        if senha:
            instance.senha_hash = make_password(senha)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        return instance


class PetSerializer(serializers.ModelSerializer):
    tutor_nome = serializers.CharField(source="tutor.nome", read_only=True)
    especie = serializers.CharField(max_length=60, trim_whitespace=True)

    class Meta:
        model = Pet
        fields = ["id", "tutor", "tutor_nome", "nome", "especie", "raca", "sexo", "data_nascimento", "observacoes", "created_at", "updated_at"]
        read_only_fields = ["id", "tutor_nome", "created_at", "updated_at"]

    def validate_nome(self, value):
        if not value.strip():
            raise serializers.ValidationError("O nome do pet é obrigatório.")
        return value.strip()


class AgendamentoSerializer(serializers.ModelSerializer):
    tutor_nome = serializers.CharField(source="tutor.nome", read_only=True)
    tutor_telefone = serializers.CharField(source="tutor.telefone", read_only=True)
    tutor_email = serializers.EmailField(source="tutor.email", read_only=True)
    tutor_endereco = serializers.CharField(source="tutor.endereco", read_only=True)
    tutor_cpf_mascarado = serializers.SerializerMethodField()
    pet_nome = serializers.CharField(source="pet.nome", read_only=True)
    pet_especie = serializers.CharField(source="pet.especie", read_only=True)
    pet_raca = serializers.CharField(source="pet.raca", read_only=True)
    pet_sexo = serializers.CharField(source="pet.get_sexo_display", read_only=True)
    pet_data_nascimento = serializers.DateField(source="pet.data_nascimento", read_only=True)
    pet_observacoes = serializers.CharField(source="pet.observacoes", read_only=True)

    class Meta:
        model = Agendamento
        fields = [
            "id", "tutor", "tutor_nome", "tutor_telefone", "tutor_email", "tutor_endereco", "tutor_cpf_mascarado",
            "pet", "pet_nome", "pet_especie", "pet_raca", "pet_sexo", "pet_data_nascimento", "pet_observacoes", "data_agendamento",
            "motivo", "status", "observacoes", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tutor_nome", "tutor_telefone", "tutor_email", "tutor_endereco", "tutor_cpf_mascarado", "pet_nome", "pet_especie", "pet_raca", "pet_sexo", "pet_data_nascimento", "pet_observacoes", "created_at", "updated_at"]

    def get_tutor_cpf_mascarado(self, obj):
        return mascarar_cpf(obj.tutor.cpf_encrypted)

    def validate(self, attrs):
        tutor = attrs.get("tutor", getattr(self.instance, "tutor", None))
        pet = attrs.get("pet", getattr(self.instance, "pet", None))
        if tutor and pet and pet.tutor_id != tutor.id:
            raise serializers.ValidationError({"pet": "O pet selecionado não pertence ao tutor informado."})
        return attrs
