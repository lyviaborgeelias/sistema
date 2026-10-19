import { useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensagemErro } from '../../api'
import { paraDataHoraLocal } from '../../utils/datas'
import './styles.css'

const vazio = { tutor: '', pet: '', data_agendamento: '', motivo: '', status: 'pendente', observacoes: '' }

export default function AgendamentoForm({ mostrar }) {
  const { id } = useParams()
  const editar = Boolean(id)
  const navegar = useNavigate()
  const [formulario, setFormulario] = useState(vazio)
  const [tutores, setTutores] = useState([])
  const [pets, setPets] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState({})

  useEffect(() => {
    Promise.all([api.get('/tutores/'), api.get('/pets/'), editar ? api.get(`/agendamentos/${id}/`) : Promise.resolve(null)])
      .then(([respostaTutores, respostaPets, respostaAgendamento]) => {
        setTutores(respostaTutores.data)
        setPets(respostaPets.data)
        if (respostaAgendamento) setFormulario({ ...vazio, ...respostaAgendamento.data, tutor: String(respostaAgendamento.data.tutor), pet: String(respostaAgendamento.data.pet), data_agendamento: paraDataHoraLocal(respostaAgendamento.data.data_agendamento) })
      }).catch((erro) => mostrar(mensagemErro(erro), 'erro')).finally(() => setCarregando(false))
  }, [editar, id, mostrar])

  function alterar(evento) {
    const { name, value } = evento.target
    setFormulario((atual) => ({ ...atual, [name]: value, ...(name === 'tutor' ? { pet: '' } : {}) }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErros({})
    setSalvando(true)
    try {
      const dados = { ...formulario, tutor: Number(formulario.tutor), pet: Number(formulario.pet), data_agendamento: new Date(formulario.data_agendamento).toISOString() }
      if (editar) await api.patch(`/agendamentos/${id}/`, dados)
      else await api.post('/agendamentos/', dados)
      mostrar(editar ? 'Agendamento atualizado.' : 'Agendamento cadastrado.')
      navegar('/agendamentos')
    } catch (erro) {
      setErros(erro.response?.data || {})
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="agendamento-form-page loading loading-screen" role="status"><span className="spinner" /><span>Carregando agenda...</span></div>
  const petsDoTutor = pets.filter((pet) => String(pet.tutor) === String(formulario.tutor))

  return (
    <div className="page-stack form-page agendamento-form-page">
      <Link className="back-link" to="/agendamentos"><ArrowLeft className="lucide-icon" size={16} aria-hidden="true" /> Voltar para agendamentos</Link>
      <div className="page-heading"><div><span className="eyebrow">AGENDA DA CLÍNICA</span><h2>{editar ? 'Editar agendamento' : 'Novo agendamento'}</h2><p>Selecione o tutor e um pet que pertença a ele.</p></div></div>
      <form className="panel form-panel" onSubmit={enviar}>
        <div className="form-section-title"><strong>Dados do atendimento</strong><span>Os campos com * são obrigatórios</span></div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="tutor">Tutor<span className="required-mark"> *</span></label>
            <select id="tutor" name="tutor" value={formulario.tutor} onChange={alterar} required><option value="">Selecione um tutor</option>{tutores.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.nome}</option>)}</select>
            {erros.tutor && <small className="field-error">{Array.isArray(erros.tutor) ? erros.tutor[0] : erros.tutor}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="pet">Pet<span className="required-mark"> *</span></label>
            <select id="pet" name="pet" value={formulario.pet} onChange={alterar} required disabled={!formulario.tutor}><option value="">Selecione um pet</option>{petsDoTutor.map((pet) => <option key={pet.id} value={pet.id}>{pet.nome} · {pet.especie}</option>)}</select>
            {erros.pet && <small className="field-error">{Array.isArray(erros.pet) ? erros.pet[0] : erros.pet}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="data_agendamento">Data e horário<span className="required-mark"> *</span></label>
            <input id="data_agendamento" name="data_agendamento" type="datetime-local" value={formulario.data_agendamento} onChange={alterar} required />
            {erros.data_agendamento && <small className="field-error">{Array.isArray(erros.data_agendamento) ? erros.data_agendamento[0] : erros.data_agendamento}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="motivo">Motivo<span className="required-mark"> *</span></label>
            <input id="motivo" name="motivo" value={formulario.motivo} onChange={alterar} required maxLength="180" placeholder="Ex.: Consulta de rotina" />
            {erros.motivo && <small className="field-error">{Array.isArray(erros.motivo) ? erros.motivo[0] : erros.motivo}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formulario.status} onChange={alterar}><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select>
            {erros.status && <small className="field-error">{Array.isArray(erros.status) ? erros.status[0] : erros.status}</small>}
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" rows="4" value={formulario.observacoes} onChange={alterar} />
            {erros.observacoes && <small className="field-error">{Array.isArray(erros.observacoes) ? erros.observacoes[0] : erros.observacoes}</small>}
          </div>
        </div>
        <div className="form-footer"><Link className="button button-light" to="/agendamentos">Cancelar</Link><button className="button button-primary" type="submit" disabled={salvando || !tutores.length || !petsDoTutor.length}><Save className="lucide-icon" size={17} aria-hidden="true" />{salvando ? 'Salvando...' : 'Salvar agendamento'}</button></div>
      </form>
    </div>
  )
}
