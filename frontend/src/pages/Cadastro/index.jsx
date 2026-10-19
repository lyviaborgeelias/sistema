import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, HeartPulse, UserPlus } from 'lucide-react'
import api, { mensagemErro } from '../../api'
import './styles.css'

const vazio = { nome: '', username: '', email: '', password: '', password_confirm: '' }

export default function Cadastro({ usuario }) {
  const navegar = useNavigate()
  const [formulario, setFormulario] = useState(vazio)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (usuario) return <Navigate to="/" replace />

  function alterar(evento) {
    const { name, value } = evento.target
    setFormulario((atual) => ({ ...atual, [name]: value }))
    setErros((atuais) => ({ ...atuais, [name]: null }))
    setErroGeral('')
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErros({})
    setErroGeral('')
    if (formulario.password !== formulario.password_confirm) {
      setErros({ password_confirm: ['As senhas não conferem.'] })
      return
    }
    setSalvando(true)
    try {
      await api.post('/auth/register/', formulario)
      navegar('/login', { replace: true, state: { cadastroConcluido: true, username: formulario.username.trim() } })
    } catch (erro) {
      const dados = erro.response?.data
      if (dados && typeof dados === 'object' && !dados.erro && !dados.detail) {
        setErros(dados)
      } else {
        setErroGeral(mensagemErro(erro, 'Não foi possível criar sua conta. Tente novamente.'))
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="cadastro-page">
      <section className="cadastro-brand-panel">
        <div className="cadastro-brand"><span className="brand-mark"><HeartPulse className="lucide-icon" size={24} aria-hidden="true" /></span><span><strong>VetCare</strong><small>Gestão veterinária</small></span></div>
        <div className="cadastro-message"><span className="eyebrow eyebrow-light">ACOMPANHE A CLÍNICA</span><h1>Crie sua conta.<br /><em>Tenha tudo por perto.</em></h1><p>Consulte os tutores, pets e agendamentos em um só lugar.</p></div>
        <div className="cadastro-panel-footer">Gestão de clínica veterinária · SAEP 2026</div>
      </section>
      <section className="cadastro-form-panel">
        <div className="cadastro-form-wrap">
          <Link className="cadastro-back" to="/login"><ArrowLeft className="lucide-icon" size={14} aria-hidden="true" /> Voltar para o login</Link>
          <span className="eyebrow">SEU ACESSO À VETCARE</span>
          <h2>Criar conta</h2>
          <p className="cadastro-description">Preencha os dados para começar.</p>
          <p className="cadastro-info">Sua conta terá acesso somente para visualização dos cadastros e agendamentos.</p>
          <form className="cadastro-form" onSubmit={enviar}>
            <div className="cadastro-field">
              <label htmlFor="nome">Nome completo</label>
              <input id="nome" name="nome" autoComplete="name" value={formulario.nome} onChange={alterar} maxLength="150" required aria-invalid={Boolean(erros.nome)} aria-describedby={erros.nome ? 'erro-nome' : undefined} />
              {erros.nome && <small className="cadastro-field-error" id="erro-nome" role="alert">{[].concat(erros.nome).join(' ')}</small>}
            </div>
            <div className="cadastro-field">
              <label htmlFor="username">Usuário</label>
              <input id="username" name="username" autoComplete="username" value={formulario.username} onChange={alterar} maxLength="150" required aria-invalid={Boolean(erros.username)} aria-describedby={erros.username ? 'erro-username' : undefined} />
              {erros.username && <small className="cadastro-field-error" id="erro-username" role="alert">{[].concat(erros.username).join(' ')}</small>}
            </div>
            <div className="cadastro-field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" value={formulario.email} onChange={alterar} maxLength="254" required aria-invalid={Boolean(erros.email)} aria-describedby={erros.email ? 'erro-email' : undefined} />
              {erros.email && <small className="cadastro-field-error" id="erro-email" role="alert">{[].concat(erros.email).join(' ')}</small>}
            </div>
            <div className="cadastro-field">
              <label htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" autoComplete="new-password" value={formulario.password} onChange={alterar} minLength="8" maxLength="128" required aria-invalid={Boolean(erros.password)} aria-describedby="senha-dica erro-password" />
              <small id="senha-dica">Use pelo menos 8 caracteres, misturando letras e números. Evite senhas comuns e dados pessoais.</small>
              {erros.password && <small className="cadastro-field-error" id="erro-password" role="alert">{[].concat(erros.password).join(' ')}</small>}
            </div>
            <div className="cadastro-field">
              <label htmlFor="password_confirm">Confirmar senha</label>
              <input id="password_confirm" name="password_confirm" type="password" autoComplete="new-password" value={formulario.password_confirm} onChange={alterar} minLength="8" maxLength="128" required aria-invalid={Boolean(erros.password_confirm)} aria-describedby={erros.password_confirm ? 'erro-confirmacao' : undefined} />
              {erros.password_confirm && <small className="cadastro-field-error" id="erro-confirmacao" role="alert">{[].concat(erros.password_confirm).join(' ')}</small>}
            </div>
            {erros.non_field_errors && <div className="cadastro-error" role="alert">{[].concat(erros.non_field_errors).join(' ')}</div>}
            {erroGeral && <div className="cadastro-error" role="alert">{erroGeral}</div>}
            <button className="button button-primary cadastro-submit" type="submit" disabled={salvando}><UserPlus className="lucide-icon" size={18} aria-hidden="true" />{salvando ? 'Criando conta...' : 'Criar conta'}</button>
          </form>
          <p className="cadastro-login"><Link to="/login">Já tenho conta</Link></p>
        </div>
      </section>
    </div>
  )
}
