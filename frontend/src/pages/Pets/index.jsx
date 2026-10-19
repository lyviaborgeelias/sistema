import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Pencil, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react'
import api, { mensagemErro } from '../../api'
import './styles.css'

export default function Pets({ usuario, mostrar }) {
  const administrador = usuario?.is_admin === true
  const [pets, setPets] = useState([])
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [excluir, setExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async (filtro = '') => {
    setCarregando(true)
    try {
      const { data } = await api.get('/pets/', { params: filtro ? { search: filtro } : {} })
      setPets(data)
    } catch (erro) {
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setCarregando(false)
    }
  }, [mostrar])

  useEffect(() => { carregar() }, [carregar])

  function buscar(evento) {
    evento.preventDefault()
    const filtro = busca.trim()
    setTermo(filtro)
    carregar(filtro)
  }

  function limpar() {
    setBusca('')
    setTermo('')
    carregar()
  }

  async function remover() {
    if (!administrador || !excluir) return
    setExcluindo(true)
    try {
      await api.delete(`/pets/${excluir.id}/`)
      mostrar('Pet excluído.')
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
    <div className="page-stack pets-page">
      <div className="page-heading">
        <div><span className="eyebrow">CADASTROS</span><h2>Pets</h2><p>Veja os animais e seus tutores responsáveis.</p></div>
        {administrador && <Link className="button button-primary" to="/pets/novo"><Plus className="lucide-icon" size={18} aria-hidden="true" /> Novo pet</Link>}
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div><strong>Pets cadastrados</strong><span>{pets.length} registro{pets.length === 1 ? '' : 's'}</span></div>
          <form className="search-bar" onSubmit={buscar}>
            <Search className="lucide-icon" size={18} aria-hidden="true" />
            <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Nome do pet ou tutor" aria-label="Nome do pet ou tutor" />
            {busca && <button className="icon-button" type="button" onClick={limpar} aria-label="Limpar busca"><X className="lucide-icon" size={16} aria-hidden="true" /></button>}
            <button className="button button-dark button-small" type="submit">Buscar</button>
          </form>
        </div>

        {carregando ? <div className="table-loading" role="status">Carregando registros...</div> : !pets.length ? (
          <div className="empty-state">
            <span className="empty-icon"><PawPrint className="lucide-icon" size={22} aria-hidden="true" /></span>
            <strong>{termo ? 'Nenhum pet encontrado' : 'Ainda não há pets'}</strong>
            <p>{administrador ? 'Cadastre um pet e vincule-o a um tutor.' : 'Os pets cadastrados aparecerão aqui.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Pet</th><th>Sexo</th><th>Tutor responsável</th>{administrador && <th>Ações</th>}</tr></thead>
              <tbody>{pets.map((pet) => (
                <tr key={pet.id}>
                  <td><div className="person-cell"><span className="pet-avatar"><PawPrint className="lucide-icon" size={17} aria-hidden="true" /></span><span><strong>{pet.nome}</strong><small>{pet.especie}{pet.raca ? ` · ${pet.raca}` : ''}</small></span></div></td>
                  <td>{{ M: 'Macho', F: 'Fêmea', N: 'Não informado' }[pet.sexo] || pet.sexo}</td>
                  <td>{pet.tutor_nome}</td>
                  {administrador && <td><div className="table-actions">
                    <Link className="action-button" to={`/pets/${pet.id}/editar`} aria-label={`Editar ${pet.nome}`}><Pencil className="lucide-icon" size={16} aria-hidden="true" /></Link>
                    <button className="action-button action-delete" onClick={() => setExcluir(pet)} aria-label={`Excluir ${pet.nome}`}><Trash2 className="lucide-icon" size={16} aria-hidden="true" /></button>
                  </div></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {administrador && excluir && <div className="dialog-backdrop" role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && !excluindo && setExcluir(null)}>
        <section className="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="excluir-pet-titulo">
          <button className="dialog-close icon-button" onClick={() => setExcluir(null)} disabled={excluindo} aria-label="Fechar"><X className="lucide-icon" size={18} aria-hidden="true" /></button>
          <span className="dialog-icon"><TriangleAlert className="lucide-icon" size={22} aria-hidden="true" /></span>
          <h2 id="excluir-pet-titulo">Excluir pet?</h2>
          <p>{excluir.nome} será removido. Pets com agendamentos não podem ser excluídos.</p>
          <div className="dialog-actions">
            <button className="button button-light" onClick={() => setExcluir(null)} disabled={excluindo}>Cancelar</button>
            <button className="button button-danger" onClick={remover} disabled={excluindo}>{excluindo ? 'Excluindo...' : 'Confirmar exclusão'}</button>
          </div>
        </section>
      </div>}
    </div>
  )
}
