import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api, { mensagemErro } from '../../api'
import './styles.css'

const vazio = { nome: '', especie: '', raca: '', sexo: 'N', data_nascimento: '', tutor: '', observacoes: '' }

export default function PetForm({ mostrar }) {
  const { id } = useParams()
  const editar = Boolean(id)
  const navegar = useNavigate()
  const [formulario, setFormulario] = useState(vazio)
  const [tutores, setTutores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState({})

  useEffect(() => {
    Promise.all([api.get('/tutores/'), editar ? api.get(`/pets/${id}/`) : Promise.resolve(null)])
      .then(([respostaTutores, respostaPet]) => {
        setTutores(respostaTutores.data)
        if (respostaPet) setFormulario({ ...vazio, ...respostaPet.data, data_nascimento: respostaPet.data.data_nascimento || '', tutor: String(respostaPet.data.tutor) })
      }).catch((erro) => mostrar(mensagemErro(erro), 'erro')).finally(() => setCarregando(false))
  }, [editar, id, mostrar])

  function alterar(evento) {
    setFormulario((atual) => ({ ...atual, [evento.target.name]: evento.target.value }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErros({})
    setSalvando(true)
    const dados = { ...formulario, tutor: Number(formulario.tutor), data_nascimento: formulario.data_nascimento || null }
    try {
      if (editar) await api.patch(`/pets/${id}/`, dados)
      else await api.post('/pets/', dados)
      mostrar(editar ? 'Dados do pet atualizados.' : 'Pet cadastrado e vinculado ao tutor.')
      navegar('/pets')
    } catch (erro) {
      setErros(erro.response?.data || {})
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="loading loading-screen pet-form-page" role="status"><span className="spinner" /><span>Carregando dados...</span></div>

  return (
    <div className="page-stack form-page pet-form-page">
      <Link className="back-link" to="/pets"><ArrowLeft className="lucide-icon" size={16} aria-hidden="true" /> Voltar para pets</Link>
      <div className="page-heading"><div><span className="eyebrow">CADASTROS · PETS</span><h2>{editar ? 'Editar pet' : 'Novo pet'}</h2><p>Informe os dados do animal e selecione o tutor responsável.</p></div></div>

      <form className="panel form-panel" onSubmit={enviar}>
        <div className="form-section-title"><strong>Dados do pet</strong><span>Os campos com * são obrigatórios</span></div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="nome">Nome do pet<span className="required-mark"> *</span></label>
            <input id="nome" name="nome" value={formulario.nome} onChange={alterar} required maxLength="100" />
            {erros.nome && <small className="field-error">{Array.isArray(erros.nome) ? erros.nome[0] : erros.nome}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="especie">Espécie<span className="required-mark"> *</span></label>
            <input id="especie" name="especie" value={formulario.especie} onChange={alterar} required maxLength="60" placeholder="Ex.: Cachorro, gato" />
            {erros.especie && <small className="field-error">{Array.isArray(erros.especie) ? erros.especie[0] : erros.especie}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="raca">Raça</label>
            <input id="raca" name="raca" value={formulario.raca} onChange={alterar} maxLength="80" />
            {erros.raca && <small className="field-error">{Array.isArray(erros.raca) ? erros.raca[0] : erros.raca}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="sexo">Sexo</label>
            <select id="sexo" name="sexo" value={formulario.sexo} onChange={alterar}><option value="N">Não informado</option><option value="M">Macho</option><option value="F">Fêmea</option></select>
            {erros.sexo && <small className="field-error">{Array.isArray(erros.sexo) ? erros.sexo[0] : erros.sexo}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="data_nascimento">Data de nascimento</label>
            <input id="data_nascimento" name="data_nascimento" type="date" value={formulario.data_nascimento} onChange={alterar} />
            {erros.data_nascimento && <small className="field-error">{Array.isArray(erros.data_nascimento) ? erros.data_nascimento[0] : erros.data_nascimento}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="tutor">Tutor responsável<span className="required-mark"> *</span></label>
            <select id="tutor" name="tutor" value={formulario.tutor} onChange={alterar} required><option value="">Selecione um tutor</option>{tutores.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.nome}</option>)}</select>
            {!tutores.length && <small className="field-error">Cadastre um tutor antes de criar o pet.</small>}
            {erros.tutor && <small className="field-error">{Array.isArray(erros.tutor) ? erros.tutor[0] : erros.tutor}</small>}
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" rows="4" value={formulario.observacoes} onChange={alterar} />
            {erros.observacoes && <small className="field-error">{Array.isArray(erros.observacoes) ? erros.observacoes[0] : erros.observacoes}</small>}
          </div>
        </div>
        <div className="form-footer">
          <Link className="button button-light" to="/pets">Cancelar</Link>
          <button className="button button-primary" type="submit" disabled={salvando || !tutores.length}><Save className="lucide-icon" size={18} aria-hidden="true" />{salvando ? 'Salvando...' : 'Salvar pet'}</button>
        </div>
      </form>
    </div>
  )
}
