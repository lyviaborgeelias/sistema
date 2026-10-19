import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2, TriangleAlert, UsersRound, X } from 'lucide-react'
import api, { mensagemErro } from '../../api'
import './styles.css'

export default function Tutores({ usuario, mostrar }) {
  const administrador = usuario?.is_admin === true
  const [tutores, setTutores] = useState([])
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async (filtro = '') => {
    setCarregando(true)
    try {
      const { data } = await api.get('/tutores/', { params: filtro ? { search: filtro } : {} })
      setTutores(data)
    } catch (erro) {
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setCarregando(false)
    }
  }, [mostrar])

  useEffect(() => { carregar('') }, [carregar])

  function buscar(evento) {
    evento.preventDefault()
    const filtro = busca.trim()
    setTermo(filtro)
    carregar(filtro)
  }

  function limpar() {
    setBusca('')
    setTermo('')
    carregar('')
  }

  async function confirmarExclusao() {
    if (!administrador || !excluir) return
    setExcluindo(true)
    try {
      await api.delete(`/tutores/${excluir.id}/`)
      mostrar('Tutor excluído com sucesso.')
      setExcluir(null)
      carregar(termo)
    } catch (erro) {
      mostrar(mensagemErro(erro), 'erro')
      setExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="page-stack tutores-page">
      <div className="page-heading">
        <div><span className="eyebrow">CADASTROS</span><h2>Tutores</h2><p>Gerencie os responsáveis e os dados de contato.</p></div>
        {administrador && <Link className="button button-primary" to="/tutores/novo"><Plus className="lucide-icon" size={18} aria-hidden="true" /> Novo tutor</Link>}
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div><strong>Todos os tutores</strong><span>{tutores.length} registro{tutores.length === 1 ? '' : 's'}</span></div>
          <form className="search-bar" onSubmit={buscar}>
            <Search className="lucide-icon" size={18} aria-hidden="true" />
            <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome, telefone ou e-mail" aria-label="Nome, telefone ou e-mail" />
            {busca && <button className="icon-button" type="button" onClick={limpar} aria-label="Limpar busca"><X className="lucide-icon" size={16} aria-hidden="true" /></button>}
            <button className="button button-dark button-small" type="submit">Buscar</button>
          </form>
        </div>

        {carregando ? <div className="table-loading" role="status">Carregando registros...</div> : !tutores.length ? (
          <div className="empty-state">
            <span className="empty-icon"><UsersRound className="lucide-icon" size={22} aria-hidden="true" /></span>
            <strong>{termo ? 'Nenhum tutor encontrado' : 'Ainda não há tutores'}</strong>
            <p>{termo ? 'Tente outro nome, telefone ou e-mail.' : administrador ? 'Cadastre o primeiro tutor para começar.' : 'Os tutores cadastrados aparecerão aqui.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Tutor</th><th>Telefone</th><th>E-mail</th>{administrador && <th>Ações</th>}</tr></thead>
              <tbody>{tutores.map((tutor) => (
                <tr key={tutor.id}>
                  <td><div className="person-cell"><span className="person-avatar">{tutor.nome?.charAt(0)}</span><span><strong>{tutor.nome}</strong><small>{tutor.cpf_mascarado}</small></span></div></td>
                  <td>{tutor.telefone}</td>
                  <td>{tutor.email}</td>
                  {administrador && <td><div className="table-actions">
                    <Link className="action-button" to={`/tutores/${tutor.id}/editar`} aria-label={`Editar ${tutor.nome}`}><Pencil className="lucide-icon" size={16} aria-hidden="true" /></Link>
                    <button className="action-button action-delete" onClick={() => setExcluir(tutor)} aria-label={`Excluir ${tutor.nome}`}><Trash2 className="lucide-icon" size={16} aria-hidden="true" /></button>
                  </div></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {administrador && excluir && <div className="dialog-backdrop" role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && !excluindo && setExcluir(null)}>
        <section className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="excluir-tutor-titulo">
          <button className="dialog-close icon-button" onClick={() => setExcluir(null)} disabled={excluindo} aria-label="Fechar"><X className="lucide-icon" size={18} aria-hidden="true" /></button>
          <span className="dialog-icon"><TriangleAlert className="lucide-icon" size={22} aria-hidden="true" /></span>
          <h2 id="excluir-tutor-titulo">Excluir tutor?</h2>
          <p>O cadastro de {excluir.nome} será removido. Tutores vinculados a pets não podem ser excluídos.</p>
          <div className="dialog-actions">
            <button className="button button-light" onClick={() => setExcluir(null)} disabled={excluindo}>Cancelar</button>
            <button className="button button-danger" onClick={confirmarExclusao} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Confirmar exclusão'}</button>
          </div>
        </section>
      </div>}
    </div>
  )
}
