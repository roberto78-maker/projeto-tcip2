// 🌐 BASE URL (AMBIENTE)
const BASE_URL = import.meta.env.VITE_API_URL || "";

// 🔗 ENDPOINT
const API_URL = `${BASE_URL}/api/apreensoes/`;

// 🛡️ Helper para Headers com Token
function getHeaders(isFormData = false) {
  const user = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (user.access) headers["Authorization"] = `Bearer ${user.access}`;
  return headers;
}

// 🔍 LISTAR (suporta paginação)
export async function getApreensoes(options = {}) {
  const { status, fetchAll = false } = options;
  let url = API_URL;
  
  if (status) {
    url += `?status=${status}`;
  }

  if (!fetchAll) {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
      const erro = await res.text();
      console.error("Erro GET:", erro);
      throw new Error("Erro ao buscar apreensões");
    }
    const data = await res.json();
    return data.results || data;
  }

  let allResults = [];
  let nextUrl = url;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: getHeaders() });
    if (!res.ok) {
      const erro = await res.text();
      console.error("Erro GET multipágina:", erro);
      throw new Error("Erro ao buscar apreensões multipágina");
    }
    const data = await res.json();
    
    if (data.results) {
      allResults = [...allResults, ...data.results];
      nextUrl = data.next; // DRF returns null when it's the last page
    } else {
      allResults = data;
      break;
    }
  }

  return allResults;
}

// ➕ CRIAR (FormData)
export async function addApreensao(data) {
  const formData = new FormData();

  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: getHeaders(true),
    body: formData
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("🔥 ERRO POST REAL:", erro);
    throw new Error("Erro ao criar apreensão");
  }

  return await res.json();
}

// ✏️ ATUALIZAR (FormData)
export async function updateApreensao(id, data) {
  const formData = new FormData();

  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  }

  const res = await fetch(`${API_URL}${id}/`, {
    method: "PATCH",
    headers: getHeaders(true),
    body: formData
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("🔥 ERRO PUT REAL:", erro);
    throw new Error("Erro ao atualizar apreensão");
  }

  return await res.json();
}

// 📦 LOTES (suporta paginação)
export async function getLotes() {
  const res = await fetch(`${BASE_URL}/api/lotes/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar lotes");
  const data = await res.json();
  return data.results || data;
}

// 🚀 DESTINAR INCINERAÇÃO (Action específica)
export async function destinarIncineracao(id) {
  const res = await fetch(`${API_URL}${id}/destinar_incineracao/`, {
    method: "POST",
    headers: getHeaders()
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error || "Erro ao destinar para incineração");
  }

  return await res.json();
}

// ✅ FINALIZAR LOTE (Action específica)
export async function finalizarLote(loteId) {
  const res = await fetch(`${API_URL}finalizar_lote/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ lote_id: loteId })
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error || "Erro ao finalizar lote");
  }

  return await res.json();
}

// 📊 RELATÓRIOS E AUDITORIA
export async function getRelatorioIncineracao(filtros = {}) {
  const queryParams = new URLSearchParams();
  if (filtros.data_inicio) queryParams.append("data_inicio", filtros.data_inicio);
  if (filtros.data_fim) queryParams.append("data_fim", filtros.data_fim);
  if (filtros.vara) queryParams.append("vara", filtros.vara);
  if (filtros.substancia) queryParams.append("substancia", filtros.substancia);

  const res = await fetch(`${BASE_URL}/api/relatorios/incineracao/?${queryParams.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar relatório de incineração");
  return await res.json();
}

export async function downloadRelatorioPdf(filtros = {}) {
  const queryParams = new URLSearchParams();
  if (filtros.data_inicio) queryParams.append("data_inicio", filtros.data_inicio);
  if (filtros.data_fim) queryParams.append("data_fim", filtros.data_fim);
  if (filtros.vara) queryParams.append("vara", filtros.vara);
  if (filtros.substancia) queryParams.append("substancia", filtros.substancia);

  const res = await fetch(`${BASE_URL}/api/relatorios/incineracao/pdf/?${queryParams.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF do relatório");
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_incineracao_${new Date().getTime()}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}