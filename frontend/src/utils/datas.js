export function formatarDataHora(valor) {
  if (!valor) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor))
}

export function paraDataHoraLocal(valor) {
  if (!valor) return ''
  const data = new Date(valor)
  const deslocamento = data.getTimezoneOffset() * 60000
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16)
}

export function formatarData(valor) {
  if (!valor) return "Não informado"
  const [ano, mes, dia] = valor.split("-")
  return `${dia}/${mes}/${ano}`
}
