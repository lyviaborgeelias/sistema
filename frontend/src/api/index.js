import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const metodo = (config.method || 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(metodo)) {
    // O login troca o token do Django; cada escrita usa um token atualizado.
    config.headers['X-CSRFToken'] = await prepararCsrf()
  }
  return config
})

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const url = erro.config?.url || ''
    if (!url.includes('/auth/')) {
      if (erro.response?.status === 401) {
        window.dispatchEvent(new CustomEvent('sessao-expirada'))
      } else if (erro.response?.status === 403) {
        try {
          await api.get('/auth/me/')
        } catch (falhaSessao) {
          if (falhaSessao.response?.status === 401) {
            window.dispatchEvent(new CustomEvent('sessao-expirada'))
          }
        }
      }
    }
    return Promise.reject(erro)
  },
)

export async function prepararCsrf() {
  const { data } = await api.get('/auth/csrf/')
  return data.csrfToken
}

export function mensagemErro(erro, padrao = 'Não foi possível concluir a operação.') {
  const dados = erro?.response?.data
  if (!dados) return erro?.message || padrao
  if (typeof dados.erro === 'string') return dados.erro
  if (typeof dados.detail === 'string') return dados.detail
  const primeiro = Object.values(dados).flat(Infinity).find((valor) => typeof valor === 'string')
  return primeiro || padrao
}

export default api
