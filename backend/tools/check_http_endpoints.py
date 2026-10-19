"""Teste HTTP do servidor local com contas e registros temporários no MySQL."""
import json
import os
from pathlib import Path
import secrets
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from backend.models import Tutor, Pet, Agendamento

BASE = 'http://127.0.0.1:8000'
ORIGIN = 'http://127.0.0.1:5173'
results = []
created = []
users = []
tag = 'http_test_' + secrets.token_hex(6)
password = secrets.token_urlsafe(24)

class Session:
    def __init__(self):
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    def request(self, method, path, expected, data=None, csrf=True, headers=None, label=None):
        h = {'Origin': ORIGIN, 'Accept': 'application/json'}
        if method in ('POST','PUT','PATCH','DELETE') and csrf:
            r = self.client.open(BASE + '/api/auth/csrf/', timeout=10)
            h['X-CSRFToken'] = json.load(r)['csrfToken']
        payload = None
        if data is not None:
            payload = json.dumps(data).encode()
            h['Content-Type'] = 'application/json'
        h.update(headers or {})
        req = urllib.request.Request(BASE+path, data=payload, headers=h, method=method)
        try:
            response = self.client.open(req, timeout=15)
        except urllib.error.HTTPError as e:
            response = e
        body = response.read()
        try: value = json.loads(body)
        except (ValueError, UnicodeDecodeError): value = None
        ok = response.status == expected
        cors = response.headers.get('Access-Control-Allow-Origin') == ORIGIN
        if h['Origin'] == ORIGIN:
            ok = ok and cors
        results.append({'scenario':label or '', 'method':method, 'path':path,
                        'expected':expected, 'actual':response.status, 'ok':ok, 'cors':cors})
        print(('PASS' if ok else 'FAIL'), method, path, response.status, label or '')
        return value

def cpf():
    d = [int(c) for c in str(secrets.randbelow(900000000)+100000000)]
    for n in (9,10):
        r=sum(d[i]*(n+1-i) for i in range(n))*10%11
        d.append(0 if r==10 else r)
    return ''.join(map(str,d))

anon, admin, reader = Session(), Session(), Session()
try:
    owner = get_user_model().objects.create_superuser(username=tag, password=password)
    users.append(owner.pk)
    anon.request('GET','/',200)
    anon.request('GET','/api/auth/csrf/',200)
    anon.request('GET','/api/auth/me/',401)
    for p in ('/api/','/api/resumo/','/api/tutores/','/api/pets/','/api/agendamentos/'):
        anon.request('GET',p,403,label='sem sessão')
    anon.request('POST','/api/auth/login/',403,{'username':tag,'password':password},csrf=False,label='sem CSRF')
    anon.request('POST','/api/auth/login/',401,{'username':tag,'password':'senha-errada'},label='senha inválida')
    anon.request('POST','/api/auth/login/',403,{'username':tag,'password':password},headers={'Origin':'http://untrusted.example'},label='origem não autorizada')
    admin.request('POST','/api/auth/login/',200,{'username':tag,'password':password})
    me=admin.request('GET','/api/auth/me/',200)
    assert me['is_admin'] is True
    registration={'username':tag+'_reader','nome':'Teste HTTP','email':tag+'@example.com','password':password,'password_confirm':password,'is_superuser':True}
    r=reader.request('POST','/api/auth/register/',201,registration)
    if r and 'usuario' in r:
        users.append(r['usuario']['id'])
        assert r['usuario']['is_admin'] is False
    reader.request('POST','/api/auth/register/',400,registration,label='usuário duplicado')
    reader.request('POST','/api/auth/login/',200,{'username':registration['username'],'password':password})
    reader.request('GET','/api/auth/me/',200)
    for p in ('/api/','/api/resumo/'):
        admin.request('GET',p,200)
    admin.request('OPTIONS','/api/tutores/',200,headers={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-csrftoken'},label='preflight CORS')
    tutor={'nome':tag,'cpf':cpf(),'senha':password,'telefone':'11999999999','email':tag+'@example.com','endereco':'Registro temporário de teste HTTP'}
    r=admin.request('POST','/api/tutores/',201,tutor)
    if r and 'id' in r:
        tid=r['id']
    else:
        # Permite testar pets e agendamentos mesmo se o cadastro de tutor falhar.
        t=Tutor.objects.create(nome=tag,cpf_encrypted='fixture-http-sem-cpf-real',cpf_lookup_hash=secrets.token_hex(32),senha_hash='!',telefone='11999999999',email=tag+'@example.com',endereco='Fixture temporária')
        tid=t.pk
        results.append({'scenario':'Tutor inserido via ORM para testar rotas dependentes após falha do POST','ok':None})
    created.append((Tutor,tid))
    if r and 'id' in r:
        admin.request('POST','/api/tutores/',400,tutor,label='CPF duplicado')
        updated_cpf=cpf()
        admin.request('PATCH',f'/api/tutores/{tid}/',200,{'cpf':updated_cpf},label='alteração de CPF')
        admin.request('POST','/api/tutores/',400,{**tutor,'cpf':updated_cpf},label='duplicidade após alteração de CPF')
        from backend.models import descriptografar_cpf
        existing=Tutor.objects.exclude(pk=tid).first()
        if existing:
            admin.request('POST','/api/tutores/',400,{**tutor,'cpf':descriptografar_cpf(existing.cpf_encrypted)},label='CPF importado já existente')
    pet={'nome':tag,'especie':'Gato','tutor':tid,'raca':'SRD','sexo':'F'}
    p=admin.request('POST','/api/pets/',201,pet)
    pid=p['id'];created.append((Pet,pid))
    appointment={'pet':pid,'tutor':tid,'data_agendamento':(datetime.now(timezone.utc)+timedelta(days=2)).isoformat(),'motivo':'Teste HTTP','status':'pendente'}
    a=admin.request('POST','/api/agendamentos/',201,appointment)
    aid=a['id'];created.append((Agendamento,aid))
    for route,pk,payload,field in [('tutores',tid,{k:v for k,v in tutor.items() if k not in ('cpf','senha')},'nome'),('pets',pid,pet,'nome'),('agendamentos',aid,appointment,'motivo')]:
        collection=f'/api/{route}/';detail=f'{collection}{pk}/'
        admin.request('GET',collection,200)
        admin.request('GET',detail,200)
        admin.request('HEAD',collection,200)
        admin.request('HEAD',detail,200)
        admin.request('OPTIONS',collection,200)
        admin.request('OPTIONS',detail,200)
        admin.request('PUT',detail,200,payload)
        admin.request('PATCH',detail,200,{field:tag+'_editado'})
        value=admin.request('GET',detail,200,label='persistência da edição')
        assert value[field]==tag+'_editado'
        admin.request('GET',collection+'999999999/',404)
        reader.request('GET',collection,200,label='consulta por usuário comum')
        reader.request('GET',detail,200,label='consulta por usuário comum')
        for method,path in [('POST',collection),('PUT',detail),('PATCH',detail),('DELETE',detail)]:
            reader.request(method,path,403,{},label='usuário comum sem permissão de escrita')
        anon.request('GET',detail,403,label='detalhe sem sessão')
    admin.request('GET','/api/tutores/?search='+tag,200)
    admin.request('GET','/api/pets/?search='+tag,200)
    admin.request('GET','/api/resumo/',200)
    admin.request('POST','/api/tutores/',400,{**tutor,'cpf':'11111111111'},label='CPF inválido')
    admin.request('POST','/api/pets/',400,{**pet,'tutor':999999999},label='tutor inexistente')
    admin.request('POST','/api/agendamentos/',400,{**appointment,'pet':999999999},label='pet inexistente')
    admin.request('DELETE',f'/api/tutores/{tid}/',400,label='tutor vinculado protegido')
    admin.request('DELETE',f'/api/pets/{pid}/',400,label='pet vinculado protegido')
    for route,pk in [('agendamentos',aid),('pets',pid),('tutores',tid)]:
        admin.request('DELETE',f'/api/{route}/{pk}/',204)
        admin.request('GET',f'/api/{route}/{pk}/',404,label='exclusão confirmada')
    admin.request('GET','/admin/',200,label='painel Django com superusuário')
    admin.request('POST','/api/auth/logout/',200,{})
    admin.request('GET','/api/auth/me/',401,label='sessão encerrada')
    reader.request('POST','/api/auth/logout/',200,{})
finally:
    for model,pk in reversed(created):
        model.objects.filter(pk=pk).delete()
    get_user_model().objects.filter(pk__in=users).delete()
    # Remove somente sessões das contas temporárias usadas nesta execução.
    from django.contrib.sessions.models import Session as DbSession
    for session in DbSession.objects.all().iterator():
        if session.get_decoded().get('_auth_user_id') in {str(pk) for pk in users}:
            session.delete()
    report=Path(__file__).resolve().parents[2]/'http-endpoints-report.json'
    report.write_text(json.dumps({'base_url':BASE,'database':'MySQL','time':datetime.now(timezone.utc).isoformat(),'results':results,'temporary_records_cleaned':True},indent=2,ensure_ascii=False),encoding='utf-8')
    print('RESULTADO:',sum(r['ok'] is True for r in results),'passaram;',sum(r['ok'] is False for r in results),'falharam. Registros temporários removidos.')
if any(r['ok'] is False for r in results):
    sys.exit(1)
