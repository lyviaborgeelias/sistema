import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Clock, Hand, PawPrint, Plus, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { mensagemErro } from '../../api'
import { formatarDataHora } from '../../utils/datas'
import './styles.css'

const nomesStatus = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' }

export default function Dashboard({ usuario, mostrar }) {
  const administrador = usuario?.is_admin === true
  const [resumo, setResumo] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get('/resumo/').then(({ data }) => setResumo(data)).catch((erro) => mostrar(mensagemErro(erro), 'erro')).finally(() => setCarregando(false))
  }, [mostrar])

  const hoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const cards = [
    { titulo: 'Tutores cadastrados', valor: resumo?.total_tutores ?? '—', icone: UsersRound, cor: 'brown', link: '/tutores' },
    { titulo: 'Pets acompanhados', valor: resumo?.total_pets ?? '—', icone: PawPrint, cor: 'sand', link: '/pets' },
    { titulo: 'Agendamentos', valor: resumo?.total_agendamentos ?? '—', icone: CalendarDays, cor: 'caramel', link: '/agendamentos' },
  ]

  return (
    <div className="page-stack dashboard-page">
      <section className="welcome-banner"><div><span className="eyebrow eyebrow-light">{hoje.toLocaleUpperCase('pt-BR')} · PAINEL DA CLÍNICA</span><h1>Olá, {usuario?.nome || 'equipe'} <Hand className="lucide-icon" size={27} aria-hidden="true" /></h1><p>Veja o que está acontecendo na clínica hoje.</p></div><div className="welcome-decoration"><span className="welcome-circle circle-one" /><span className="welcome-circle circle-two" /><PawPrint className="lucide-icon" size={45} aria-hidden="true" /></div></section>
      <div className="page-heading"><div><span className="eyebrow">RESUMO DA ROTINA</span><h2>Visão geral</h2><p>Acompanhe os cadastros e os próximos atendimentos.</p></div>{administrador && <Link className="button button-primary" to="/agendamentos/novo"><Plus className="lucide-icon" size={17} aria-hidden="true" /> Novo agendamento</Link>}</div>
      {carregando ? <div className="loading" role="status"><span className="spinner" /><span>Buscando dados da clínica...</span></div> : (
        <>
          <section className="summary-grid">
            {cards.map(({ titulo, valor, icone: Icone, cor, link }) => <Link className="summary-card" to={link} key={titulo}><span className={`summary-icon icon-${cor}`}><Icone className="lucide-icon" size={21} aria-hidden="true" /></span><span className="summary-title">{titulo}</span><strong>{valor}</strong><span className="summary-link">Ver módulo <ArrowRight className="lucide-icon" size={14} aria-hidden="true" /></span></Link>)}
          </section>
          <section className="panel upcoming-panel"><div className="panel-heading"><div><span className="eyebrow">AGENDA</span><h3>Próximos atendimentos</h3></div><Link className="text-link" to="/agendamentos">Ver todos <ArrowRight className="lucide-icon" size={15} aria-hidden="true" /></Link></div>
            {(resumo?.proximos_agendamentos || []).length ? <div className="upcoming-list">{resumo.proximos_agendamentos.map((item) => <div className="upcoming-row" key={item.id}><div className="appointment-date-icon"><Clock className="lucide-icon" size={18} aria-hidden="true" /></div><div className="upcoming-main"><strong>{item.pet_nome}</strong><span>{item.tutor_nome} · {item.motivo}</span></div><span className="upcoming-time">{formatarDataHora(item.data_agendamento)}</span><span className={`status-badge status-${item.status}`}>{nomesStatus[item.status] || item.status}</span></div>)}</div> : <div className="dashboard-empty"><CalendarDays className="lucide-icon" size={22} aria-hidden="true" /><span>Nenhum atendimento futuro cadastrado.</span>{administrador && <Link to="/agendamentos/novo">Adicionar agendamento</Link>}</div>}
          </section>
        </>
      )}
    </div>
  )
}
