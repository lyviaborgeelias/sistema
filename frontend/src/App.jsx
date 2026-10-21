import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, CircleAlert, CircleCheck, HeartHandshake, LayoutDashboard, LogOut, Menu, PawPrint, UsersRound, X } from 'lucide-react'
import api, { mensagemErro } from './api'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Dashboard from './pages/Dashboard'
import Tutores from './pages/Tutores'
import TutorForm from './pages/TutorForm'
import Pets from './pages/Pets'
import PetForm from './pages/PetForm'
import Agendamentos from './pages/Agendamentos'
import AgendamentoForm from './pages/AgendamentoForm'
import AgendamentoDetalhe from './pages/AgendamentoDetalhe'
import './App.css'

const links = [
  { to: '/', label: 'Visão geral', icone: LayoutDashboard, end: true },
  { to: '/tutores', label: 'Tutores', icone: UsersRound },
  { to: '/pets', label: 'Pets', icone: PawPrint },
  { to: '/agendamentos', label: 'Agendamentos', icone: CalendarDays },
]

export default function App() {
  const navegar = useNavigate()
  const local = useLocation()
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [menuAberto, setMenuAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [sessaoExpirada, setSessaoExpirada] = useState(false)
  const [avisos, setAvisos] = useState([])
  const temporizadores = useRef(new Set())

  const mostrar = useCallback((mensagem, tipo = 'sucesso') => {
    const id = Date.now() + Math.random()
    setAvisos((atuais) => [...atuais, { id, mensagem, tipo }])
    const temporizador = window.setTimeout(() => {
      setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id))
      temporizadores.current.delete(temporizador)
    }, 4200)
    temporizadores.current.add(temporizador)
  }, [])

  useEffect(() => {
    let ativo = true

    async function buscarSessao() {
      try {
        const { data } = await api.get('/auth/me/')
        if (ativo) setUsuario(data)
      } catch {
        if (ativo) setUsuario(null)
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    function expirarSessao() {
      setUsuario(null)
      setSessaoExpirada(true)
    }

    buscarSessao()
    window.addEventListener('sessao-expirada', expirarSessao)
    return () => {
      ativo = false
      window.removeEventListener('sessao-expirada', expirarSessao)
    }
  }, [])

  useEffect(() => {
    setMenuAberto(false)
  }, [local.pathname])

  useEffect(() => () => {
    temporizadores.current.forEach((temporizador) => window.clearTimeout(temporizador))
  }, [])

  useEffect(() => {
    if (!menuAberto) return
    function fecharComEsc(evento) {
      if (evento.key === 'Escape') setMenuAberto(false)
    }
    window.addEventListener('keydown', fecharComEsc)
    return () => window.removeEventListener('keydown', fecharComEsc)
  }, [menuAberto])

  async function entrar(username, password) {
    const { data } = await api.post('/auth/login/', { username, password })
    setUsuario(data.usuario)
    setSessaoExpirada(false)
    return data.usuario
  }

  async function sair() {
    if (saindo) return
    setSaindo(true)
    try {
      await api.post('/auth/logout/')
      setUsuario(null)
      navegar('/login', { replace: true })
    } catch (erro) {
      mostrar(mensagemErro(erro, 'Não foi possível encerrar a sessão.'), 'erro')
    } finally {
      setSaindo(false)
    }
  }

  if (carregando) {
    return <div className="loading loading-screen" role="status"><span className="spinner" /><span>Carregando...</span></div>
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login usuario={usuario} entrar={entrar} sessaoExpirada={sessaoExpirada} />} />
        <Route path="/cadastro" element={<Cadastro usuario={usuario} />} />
        <Route element={usuario ? (
          <div className="app-shell">
            <button className="mobile-menu-button" onClick={() => setMenuAberto(!menuAberto)} aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuAberto} aria-controls="menu-principal">
              {menuAberto ? <X className="lucide-icon" size={21} aria-hidden="true" /> : <Menu className="lucide-icon" size={21} aria-hidden="true" />}
            </button>
            {menuAberto && <button className="mobile-backdrop" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}
            <aside id="menu-principal" className={`sidebar ${menuAberto ? 'sidebar-open' : ''}`}>
              <div className="brand-lockup">
                <span className="brand-mark brand-mark-logo"><img className="brand-logo" src="/agropet-logo.png" alt="" aria-hidden="true" /></span>
                <span><strong>AgroPet</strong><small>Gestão veterinária</small></span>
              </div>
              <div className="sidebar-label">MENU PRINCIPAL</div>
              <nav className="sidebar-nav">
                {links.map(({ to, label, icone: Icone, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setMenuAberto(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                    <Icone className="lucide-icon" size={19} aria-hidden="true" /><span>{label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="sidebar-bottom">
                <div className="sidebar-note"><HeartHandshake className="lucide-icon" size={17} aria-hidden="true" /><span>Cuidado com carinho, gestão com clareza.</span></div>
                <button className="logout-button" onClick={sair} disabled={saindo}><LogOut className="lucide-icon" size={18} aria-hidden="true" /><span>{saindo ? 'Saindo...' : 'Sair do sistema'}</span></button>
              </div>
            </aside>
            <div className="main-area">
              <header className="topbar">
                <div className="topbar-context"><span className="topbar-kicker">CLÍNICA VETERINÁRIA</span><span className="topbar-title">Painel de gestão</span></div>
                <div className="user-chip"><span className="user-avatar">{(usuario.nome || 'U').charAt(0).toUpperCase()}</span><span className="user-chip-name">{usuario.nome || usuario.username}</span><span className="user-role">{usuario.is_admin ? 'Administrador' : 'Somente visualização'}</span></div>
              </header>
              <main className="page-content"><Outlet /></main>
            </div>
          </div>
        ) : <Navigate to="/login" state={{ de: local }} replace />}>
          <Route index element={<Dashboard usuario={usuario} mostrar={mostrar} />} />
          <Route path="tutores" element={<Tutores usuario={usuario} mostrar={mostrar} />} />
          <Route path="pets" element={<Pets usuario={usuario} mostrar={mostrar} />} />
          <Route path="agendamentos" element={<Agendamentos usuario={usuario} mostrar={mostrar} />} />
          <Route path="agendamentos/:id" element={<AgendamentoDetalhe usuario={usuario} mostrar={mostrar} />} />
          <Route element={usuario?.is_admin === true ? <Outlet /> : <Navigate to="/" replace />}>
            <Route path="tutores/novo" element={<TutorForm mostrar={mostrar} />} />
            <Route path="tutores/:id/editar" element={<TutorForm mostrar={mostrar} />} />
            <Route path="pets/novo" element={<PetForm mostrar={mostrar} />} />
            <Route path="pets/:id/editar" element={<PetForm mostrar={mostrar} />} />
            <Route path="agendamentos/novo" element={<AgendamentoForm mostrar={mostrar} />} />
            <Route path="agendamentos/:id/editar" element={<AgendamentoForm mostrar={mostrar} />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="toast-stack" aria-live="polite">
        {avisos.map((aviso) => (
          <div className={`toast toast-${aviso.tipo}`} key={aviso.id} role="status">
            {aviso.tipo === 'erro' ? <CircleAlert className="lucide-icon" size={18} aria-hidden="true" /> : <CircleCheck className="lucide-icon" size={18} aria-hidden="true" />}
            <span>{aviso.mensagem}</span>
            <button className="icon-button" aria-label="Fechar aviso" onClick={() => setAvisos((atuais) => atuais.filter((item) => item.id !== aviso.id))}><X className="lucide-icon" size={16} aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </>
  )
}
