import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Eye, Pencil, Plus, Trash2, TriangleAlert, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api, { mensagemErro } from '../../api'
import { formatarDataHora } from '../../utils/datas'
import './styles.css'

const statusNomes = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' }

export default function Agendamentos({ usuario, mostrar }) {
  const administrador = usuario?.is_admin === true
  const [agendamentos, setAgendamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const { data } = await api.get('/agendamentos/')
      setAgendamentos(data)
    } catch (erro) {
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setCarregando(false)
    }
  }, [mostrar])

  useEffect(() => { carregar() }, [carregar])

  async function remover() {
    if (!administrador || !excluir) return
    setExcluindo(true)
    try {
      await api.delete(`/agendamentos/${excluir.id}/`)
      mostrar('Agendamento excluído.')
      setExcluir(null)
      carregar()
    } catch (erro) {
      mostrar(mensagemErro(erro), 'erro')
      setExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="page-stack agendamentos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ROTINA DA CLÍNICA</span>
          <h2>Agendamentos</h2>
          <p>Atendimentos ordenados pela data e horário.</p>
        </div>
        {administrador && <Link className="button button-primary" to="/agendamentos/novo"><Plus className="lucide-icon" size={18} aria-hidden="true" /> Novo agendamento</Link>}
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div><strong>Agenda da clínica</strong><span>{agendamentos.length} atendimento{agendamentos.length === 1 ? '' : 's'}</span></div>
        </div>
        {carregando ? <div className="table-loading" role="status">Carregando registros...</div> : !agendamentos.length ? (
          <div className="empty-state">
            <span className="empty-icon"><CalendarDays className="lucide-icon" size={22} aria-hidden="true" /></span>
            <strong>Agenda vazia</strong>
            <p>{administrador ? 'Cadastre um atendimento para organizar a rotina da clínica.' : 'Os atendimentos cadastrados aparecerão aqui.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Data e horário</th><th>Tutor</th><th>Pet</th><th>Motivo</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {agendamentos.map((agendamento) => (
                  <tr key={agendamento.id}>
                    <td><div className="date-cell"><CalendarDays className="lucide-icon" size={17} aria-hidden="true" /><strong>{formatarDataHora(agendamento.data_agendamento)}</strong></div></td>
                    <td><div className="compact-cell"><strong>{agendamento.tutor_nome}</strong><small>{agendamento.tutor_telefone}</small></div></td>
                    <td><div className="compact-cell"><strong>{agendamento.pet_nome}</strong><small>{agendamento.pet_especie}{agendamento.pet_raca ? ` · ${agendamento.pet_raca}` : ''}</small></div></td>
                    <td>{agendamento.motivo}</td>
                    <td><span className={`status-badge status-${agendamento.status}`}>{statusNomes[agendamento.status] || agendamento.status}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link className="action-button" to={`/agendamentos/${agendamento.id}`} aria-label={`Ver agendamento de ${agendamento.pet_nome}`}><Eye className="lucide-icon" size={16} aria-hidden="true" /></Link>
                        {administrador && <Link className="action-button" to={`/agendamentos/${agendamento.id}/editar`} aria-label="Editar agendamento"><Pencil className="lucide-icon" size={16} aria-hidden="true" /></Link>}
                        {administrador && <button className="action-button action-delete" onClick={() => setExcluir(agendamento)} aria-label="Excluir agendamento"><Trash2 className="lucide-icon" size={16} aria-hidden="true" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {administrador && excluir && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && !excluindo && setExcluir(null)}>
          <section className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="excluir-agendamento-titulo">
            <button className="dialog-close icon-button" onClick={() => setExcluir(null)} aria-label="Fechar" disabled={excluindo}><X className="lucide-icon" size={18} aria-hidden="true" /></button>
            <span className="dialog-icon"><TriangleAlert className="lucide-icon" size={22} aria-hidden="true" /></span>
            <h2 id="excluir-agendamento-titulo">Excluir agendamento?</h2>
            <p>O atendimento de {excluir.pet_nome} será removido da agenda.</p>
            <div className="dialog-actions">
              <button className="button button-light" onClick={() => setExcluir(null)} disabled={excluindo}>Cancelar</button>
              <button className="button button-danger" onClick={remover} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Confirmar exclusão'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
