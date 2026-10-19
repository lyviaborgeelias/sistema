import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, HeartPulse, LockKeyhole, PawPrint, ShieldCheck, UserRound } from 'lucide-react'
import { mensagemErro } from '../../api'
import './styles.css'

export default function Login({ usuario, entrar, sessaoExpirada }) {
  const navegar = useNavigate()
  const local = useLocation()
  const [username, setUsername] = useState(local.state?.username || '')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  if (usuario) return <Navigate to="/" replace />

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    if (!username.trim() || !password) {
      setErro('Informe seu usuário e sua senha para continuar.')
      return
    }
    setCarregando(true)
    try {
      await entrar(username.trim(), password)
      navegar(local.state?.de?.pathname || '/', { replace: true })
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível entrar. Verifique os dados e tente novamente.'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-shell login-page">
      <section className="login-brand-panel">
        <div className="login-brand"><span className="brand-mark brand-mark-light"><HeartPulse className="lucide-icon" size={24} aria-hidden="true" /></span><span><strong>VetCare</strong><small>Gestão veterinária</small></span></div>
        <div className="login-message"><span className="eyebrow eyebrow-light">CUIDADO QUE ORGANIZA</span><h1>Mais tempo para cuidar.<br /><em>Mais clareza para gerir.</em></h1><p>Uma rotina mais simples para a equipe e mais acolhedora para cada família.</p><div className="login-paw"><PawPrint className="lucide-icon" size={27} aria-hidden="true" /></div></div>
        <div className="login-panel-footer">Gestão de clínica veterinária · SAEP 2026</div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">BEM-VINDO DE VOLTA</span>
          <h2>Acesse sua conta</h2>
          <p className="muted-text">Entre para acompanhar a rotina da clínica.</p>
          {local.state?.cadastroConcluido && <div className="login-success" role="status">Conta criada com sucesso. Entre para continuar.</div>}
          <form onSubmit={enviar} className="login-form">
            <label className="login-label" htmlFor="username">Usuário</label>
            <div className="login-input-wrap"><UserRound className="lucide-icon" size={18} aria-hidden="true" /><input id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Seu usuário" required /></div>
            <label className="login-label" htmlFor="password">Senha</label>
            <div className="login-input-wrap"><LockKeyhole className="lucide-icon" size={18} aria-hidden="true" /><input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required /></div>
            {(erro || sessaoExpirada) && <div className="login-error" role="alert">{erro || 'Sua sessão expirou. Entre novamente para continuar.'}</div>}
            <button className="button button-login" type="submit" disabled={carregando}>{carregando ? 'Verificando...' : <>Entrar no sistema <ArrowRight className="lucide-icon" size={17} aria-hidden="true" /></>}</button>
          </form>
          <p className="login-register">Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
          <div className="login-security"><ShieldCheck className="lucide-icon" size={15} aria-hidden="true" /><span>Sua conexão é protegida e sua sessão expira após 30 minutos sem atividade.</span></div>
        </div>
      </section>
    </div>
  )
}
