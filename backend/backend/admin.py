from django.contrib import admin
from django import forms
from django.contrib.auth.hashers import make_password

from .models import Agendamento, Pet, Tutor, criptografar_cpf, hash_consulta_cpf, normalizar_cpf, validar_cpf


class TutorAdminForm(forms.ModelForm):
    cpf = forms.CharField(label="CPF", required=False, help_text="Na edição, deixe vazio para manter o CPF atual.")
    senha = forms.CharField(
        label="Senha", required=False, widget=forms.PasswordInput,
        help_text="Na edição, deixe vazio para manter a senha atual.",
    )

    class Meta:
        model = Tutor
        fields = ["nome", "telefone", "email", "endereco"]

    def clean_cpf(self):
        cpf = normalizar_cpf(self.cleaned_data.get("cpf"))
        if not cpf and self.instance.pk:
            return ""
        if not validar_cpf(cpf):
            raise forms.ValidationError("Informe um CPF válido.")
        existentes = Tutor.objects.filter(cpf_lookup_hash=hash_consulta_cpf(cpf))
        if self.instance.pk:
            existentes = existentes.exclude(pk=self.instance.pk)
        if existentes.exists():
            raise forms.ValidationError("Já existe um tutor cadastrado com este CPF.")
        return cpf

    def clean_senha(self):
        senha = self.cleaned_data.get("senha", "")
        if not senha and not self.instance.pk:
            raise forms.ValidationError("A senha é obrigatória.")
        if senha and len(senha) < 8:
            raise forms.ValidationError("A senha deve ter pelo menos 8 caracteres.")
        return senha

    def save(self, commit=True):
        tutor = super().save(commit=False)
        cpf = self.cleaned_data["cpf"]
        senha = self.cleaned_data["senha"]
        if cpf:
            tutor.cpf_encrypted = criptografar_cpf(cpf)
            tutor.cpf_lookup_hash = hash_consulta_cpf(cpf)
        if senha:
            tutor.senha_hash = make_password(senha)
        if commit:
            tutor.save()
        return tutor


@admin.register(Tutor)
class TutorAdmin(admin.ModelAdmin):
    form = TutorAdminForm
    fields = ["nome", "cpf", "senha", "telefone", "email", "endereco", "cpf_mascarado", "created_at", "updated_at"]
    list_display = ["nome", "cpf_mascarado", "telefone", "email"]
    search_fields = ["nome", "telefone", "email"]
    readonly_fields = ["cpf_mascarado", "created_at", "updated_at"]


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ["nome", "especie", "raca", "tutor"]
    list_filter = ["especie", "sexo"]
    search_fields = ["nome", "tutor__nome"]


@admin.register(Agendamento)
class AgendamentoAdmin(admin.ModelAdmin):
    list_display = ["data_agendamento", "tutor", "pet", "motivo", "status"]
    list_filter = ["status", "data_agendamento"]
    search_fields = ["tutor__nome", "pet__nome", "motivo"]
