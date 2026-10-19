import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import api, { mensagemErro } from '../../api'
import './styles.css'

const formularioVazio = { nome: '', cpf: '', senha: '', telefone: '', email: '', endereco: '' }

export default function TutorForm({ mostrar }) {
  const { id } = useParams()
  const editar = Boolean(id)
  const navegar = useNavigate()
  const [formulario, setFormulario] = useState(formularioVazio)
  const [cpfAtual, setCpfAtual] = useState('')
  const [carregando, setCarregando] = useState(editar)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState({})

  useEffect(() => {
    if (!editar) return
    api.get(`/tutores/${id}/`).then(({ data }) => {
      setFormulario({ nome: data.nome, cpf: '', senha: '', telefone: data.telefone, email: data.email, endereco: data.endereco })
      setCpfAtual(data.cpf_mascarado)
    }).catch((erro) => mostrar(mensagemErro(erro), 'erro')).finally(() => setCarregando(false))
  }, [editar, id, mostrar])

  function alterar(evento) {
    setFormulario((atual) => ({ ...atual, [evento.target.name]: evento.target.value }))
  }

  async function enviar(evento) {
    evento.preventDefault()
    setErros({})
    setSalvando(true)
    const dados = { ...formulario, cpf: formulario.cpf.replace(/\D/g, '') }
    try {
      if (editar) await api.patch(`/tutores/${id}/`, dados)
      else await api.post('/tutores/', dados)
      mostrar(editar ? 'Dados do tutor atualizados.' : 'Tutor cadastrado com sucesso.')
      navegar('/tutores')
    } catch (erro) {
      setErros(erro.response?.data || {})
      mostrar(mensagemErro(erro), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="loading loading-screen tutor-form-page" role="status"><span className="spinner" /><span>Carregando tutor...</span></div>

  return (
    <div className="page-stack form-page tutor-form-page">
      <Link className="back-link" to="/tutores"><ArrowLeft className="lucide-icon" size={16} aria-hidden="true" /> Voltar para tutores</Link>
      <div className="page-heading"><div><span className="eyebrow">CADASTROS · TUTORES</span><h2>{editar ? 'Editar tutor' : 'Novo tutor'}</h2><p>{editar ? 'Atualize as informações do responsável.' : 'Preencha os dados do responsável pelo pet.'}</p></div></div>

      <form className="panel form-panel" onSubmit={enviar}>
        <div className="form-section-title"><strong>Dados pessoais</strong><span>Os campos com * são obrigatórios</span></div>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="nome">Nome completo<span className="required-mark"> *</span></label>
            <input id="nome" name="nome" value={formulario.nome} onChange={alterar} required maxLength="150" />
            {erros.nome && <small className="field-error">{Array.isArray(erros.nome) ? erros.nome[0] : erros.nome}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="cpf">CPF{!editar && <span className="required-mark"> *</span>}</label>
            <input id="cpf" name="cpf" value={formulario.cpf} onChange={alterar} inputMode="numeric" placeholder={editar ? 'Informe apenas se quiser alterar' : '000.000.000-00'} required={!editar} />
            <small className="field-hint">{editar ? `CPF cadastrado: ${cpfAtual}. Deixe em branco para manter.` : 'Será armazenado criptografado e exibido mascarado.'}</small>
            {erros.cpf && <small className="field-error">{Array.isArray(erros.cpf) ? erros.cpf[0] : erros.cpf}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="telefone">Telefone<span className="required-mark"> *</span></label>
            <input id="telefone" name="telefone" type="tel" value={formulario.telefone} onChange={alterar} required maxLength="20" placeholder="(00) 00000-0000" />
            {erros.telefone && <small className="field-error">{Array.isArray(erros.telefone) ? erros.telefone[0] : erros.telefone}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="email">E-mail<span className="required-mark"> *</span></label>
            <input id="email" name="email" type="email" value={formulario.email} onChange={alterar} required maxLength="254" placeholder="nome@email.com" />
            {erros.email && <small className="field-error">{Array.isArray(erros.email) ? erros.email[0] : erros.email}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="endereco">Endereço<span className="required-mark"> *</span></label>
            <input id="endereco" name="endereco" value={formulario.endereco} onChange={alterar} required maxLength="255" placeholder="Rua, número e bairro" />
            {erros.endereco && <small className="field-error">{Array.isArray(erros.endereco) ? erros.endereco[0] : erros.endereco}</small>}
          </div>
          <div className="form-field">
            <label htmlFor="senha">{editar ? 'Nova senha do tutor' : 'Senha do tutor'}{!editar && <span className="required-mark"> *</span>}</label>
            <input id="senha" name="senha" type="password" autoComplete="new-password" value={formulario.senha} onChange={alterar} required={!editar} minLength="8" />
            <small className="field-hint">{editar ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 8 caracteres; armazenada com hash.'}</small>
            {erros.senha && <small className="field-error">{Array.isArray(erros.senha) ? erros.senha[0] : erros.senha}</small>}
          </div>
        </div>
        <div className="form-footer">
          <Link className="button button-light" to="/tutores">Cancelar</Link>
          <button className="button button-primary" type="submit" disabled={salvando}><Save className="lucide-icon" size={18} aria-hidden="true" />{salvando ? 'Salvando...' : 'Salvar tutor'}</button>
        </div>
      </form>
    </div>
  )
}
