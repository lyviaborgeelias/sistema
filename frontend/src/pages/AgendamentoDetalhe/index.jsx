import { useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, Mail, PawPrint, Pencil, Phone, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import api, { mensagemErro } from '../../api'
import { formatarData, formatarDataHora } from '../../utils/datas'
import './styles.css'

const statusNomes = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' }

export default function AgendamentoDetalhe({ usuario, mostrar }) {
  const administrador = usuario?.is_admin === true
  const { id } = useParams()
  const [agendamento, setAgendamento] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.get(`/agendamentos/${id}/`)
      .then(({ data }) => setAgendamento(data))
      .catch((erro) => mostrar(mensagemErro(erro), 'erro'))
      .finally(() => setCarregando(false))
  }, [id, mostrar])

  if (carregando) return <div className="agendamento-detalhe-page loading loading-screen" role="status"><span className="spinner" /><span>Carregando atendimento...</span></div>
  if (!agendamento) return <div className="agendamento-detalhe-page panel detail-not-found">Não foi possível carregar este atendimento. <Link to="/agendamentos">Voltar para agenda</Link></div>

  return (
    <div className="page-stack form-page agendamento-detalhe-page">
      <Link className="back-link" to="/agendamentos"><ArrowLeft className="lucide-icon" size={16} aria-hidden="true" /> Voltar para agendamentos</Link>
      <div className="page-heading">
        <div><span className="eyebrow">DETALHES DO ATENDIMENTO</span><h2>{agendamento.pet_nome} · {agendamento.motivo}</h2><p>{formatarDataHora(agendamento.data_agendamento)} <span className={`status-badge status-${agendamento.status}`}>{statusNomes[agendamento.status] || agendamento.status}</span></p></div>
        {administrador && <Link className="button button-primary" to={`/agendamentos/${id}/editar`}><Pencil className="lucide-icon" size={17} aria-hidden="true" /> Editar</Link>}
      </div>
      <div className="detail-grid">
        <section className="panel detail-card">
          <div className="detail-card-title"><span className="detail-icon"><UserRound className="lucide-icon" size={20} aria-hidden="true" /></span><div><span className="eyebrow">RESPONSÁVEL</span><h3>{agendamento.tutor_nome}</h3></div></div>
          <dl>
            <div><dt>Endereço</dt><dd>{agendamento.tutor_endereco}</dd></div>
            <div><dt>CPF</dt><dd>{agendamento.tutor_cpf_mascarado}</dd></div>
            <div><dt>Telefone</dt><dd><Phone className="lucide-icon" size={15} aria-hidden="true" /> {agendamento.tutor_telefone}</dd></div>
            <div><dt>E-mail</dt><dd><Mail className="lucide-icon" size={15} aria-hidden="true" /> {agendamento.tutor_email}</dd></div>
          </dl>
        </section>
        <section className="panel detail-card">
          <div className="detail-card-title"><span className="detail-icon detail-icon-mint"><PawPrint className="lucide-icon" size={20} aria-hidden="true" /></span><div><span className="eyebrow">PACIENTE</span><h3>{agendamento.pet_nome}</h3></div></div>
          <dl>
            <div><dt>Espécie</dt><dd>{agendamento.pet_especie}</dd></div>
            <div><dt>Raça</dt><dd>{agendamento.pet_raca || 'Não informada'}</dd></div>
            <div><dt>Sexo</dt><dd>{agendamento.pet_sexo}</dd></div>
            <div><dt>Nascimento</dt><dd>{formatarData(agendamento.pet_data_nascimento)}</dd></div>
            <div><dt>Observações do pet</dt><dd>{agendamento.pet_observacoes || 'Nenhuma observação registrada.'}</dd></div>
          </dl>
        </section>
        <section className="panel detail-card detail-card-wide">
          <div className="detail-card-title"><span className="detail-icon detail-icon-peach"><CalendarDays className="lucide-icon" size={20} aria-hidden="true" /></span><div><span className="eyebrow">ATENDIMENTO</span><h3>{agendamento.motivo}</h3></div></div>
          <dl>
            <div><dt>Data e horário</dt><dd>{formatarDataHora(agendamento.data_agendamento)}</dd></div>
            <div><dt>Status</dt><dd><span className={`status-badge status-${agendamento.status}`}>{statusNomes[agendamento.status] || agendamento.status}</span></dd></div>
            <div><dt>Observações</dt><dd>{agendamento.observacoes || 'Nenhuma observação registrada.'}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}
