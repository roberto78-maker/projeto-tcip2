// BASE URL (AMBIENTE)
const BASE_URL = import.meta.env.VITE_API_URL || "";

// ENDPOINT
const API_URL = `${BASE_URL}/api/apreensoes/`;

// In-memory cache — see apiCache.js for TTL and invalidation strategy
import * as apiCache from "./apiCache.js";

// 🛡️ Helper para Headers com Token
function getHeaders(isFormData = false) {
  const user = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (user.access) headers["Authorization"] = `Bearer ${user.access}`;
  return headers;
}

// 🛡️ Helper para manter a paginação dentro do Proxy do Vite
function fixPaginationUrl(nextUrl) {
  if (!nextUrl) return null;
  // Se BASE_URL for vazio (estamos usando proxy local), removemos o domínio retornado pelo DRF
  if (!BASE_URL && nextUrl.startsWith("http")) {
    const urlObj = new URL(nextUrl);
    return urlObj.pathname + urlObj.search;
  }
  return nextUrl;
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
      nextUrl = fixPaginationUrl(data.next); // DRF returns null when it's the last page
    } else {
      allResults = data;
      break;
    }
  }

  return allResults;
}

// Paginated fetch — returns { results, next, count } preserving the DRF
// envelope so callers can drive a "Load more" / append pattern.
//
// First page:  getApreensoesPaginado({ filters: { status: "cofre", natureza: "DROGAS" } })
// Next pages:  getApreensoesPaginado({ nextUrl: previousPage.next })
export async function getApreensoesPaginado({ filters = {}, nextUrl = null } = {}) {
  let url = nextUrl;

  if (!url) {
    const params = new URLSearchParams();
    if (filters.status)           params.append("status",           filters.status);
    if (filters.natureza)         params.append("natureza",         filters.natureza);
    if (filters.excluir_natureza) params.append("excluir_natureza", filters.excluir_natureza);
    if (filters.tem_apreensao !== undefined)
                                  params.append("tem_apreensao",    filters.tem_apreensao);
    if (filters.search)           params.append("search",           filters.search);
    if (filters.ordering)         params.append("ordering",         filters.ordering);
    const qs = params.toString();
    url = qs ? `${API_URL}?${qs}` : API_URL;
  }

  // ── Cache check ──────────────────────────────────────────────────────────
  // The resolved URL (with all params + DRF page cursors) is the cache key.
  // Same filters + same page → instant return, no network.
  const cached = apiCache.get(url);
  if (cached) {
    return cached;
  }

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro GET paginado:", erro);
    throw new Error("Erro ao buscar apreensoes");
  }
  const data = await res.json();
  const result = {
    results: data.results || data,
    next:    fixPaginationUrl(data.next),
    count:   data.count   ?? null,
  };

  // Store with default 2-minute TTL
  apiCache.set(url, result);

  return result;
}

// Call this after any mutation (upload, status change, excluir, liberar).
// Clears all cached pages for the apreensoes endpoint so the next read
// always fetches fresh data.
export function invalidateApreensaoCache() {
  const cleared = apiCache.invalidatePrefix(API_URL);
  console.debug(`[cache] Invalidated ${cleared} apreensao cache entries.`);
}

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

// 📈 DASHBOARD STATS — single request, all aggregation done server-side
export async function getDashboardStats() {
  const res = await fetch(`${BASE_URL}/api/dashboard/stats/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar estatísticas do dashboard");
  return await res.json();
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

export async function finalizarLote(loteId, file = null) {
    const formData = new FormData();
    formData.append("lote_id", loteId);
    if (file) {
      formData.append("arquivo_pdf", file);
    }
  
    const res = await fetch(`${API_URL}finalizar_lote/`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData
    });
  
    if (!res.ok) {
      const erro = await res.json();
      throw new Error(erro.error || "Erro ao finalizar lote");
    }
  
    return await res.json();
  }
  
  // 🗑️ EXCLUIR (Lógica de cancelamento com motivo)
  export async function excluirApreensao(id, motivo) {
    const res = await fetch(`${API_URL}${id}/excluir/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ motivo })
    });
  
    if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.error || "Erro ao excluir registro");
    }
  
    return await res.json();
  }

// Helper para construir parâmetros de consulta de relatórios
export function buildRelatorioParams(filtros = {}) {
  const queryParams = new URLSearchParams();
  const keys = [
    "data_inicio",
    "data_fim",
    "vara",
    "substancia",
    "natureza",
    "status",
    "bou",
    "processo",
    "reu",
    "crime"
  ];
  for (const key of keys) {
    if (filtros[key]) {
      queryParams.append(key, filtros[key]);
    }
  }
  return queryParams.toString();
}

// 📊 RELATÓRIOS E AUDITORIA
export async function getRelatorioIncineracao(filtros = {}) {
  const qs = buildRelatorioParams(filtros);
  const res = await fetch(`${BASE_URL}/api/relatorios/incineracao/?${qs}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar relatório de incineração");
  return await res.json();
}

export async function downloadRelatorioPdf(filtros = {}) {
  const qs = buildRelatorioParams(filtros);
  const res = await fetch(`${BASE_URL}/api/relatorios/incineracao/pdf/?${qs}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao gerar PDF do relatório");

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  // ✅ Compatível com Navegador e Android WebView (Capacitor)
  // Em navegadores desktop, usa o atributo download para salvar o arquivo.
  // Em Android WebViews (Capacitor), o "click" pode não funcionar, então
  // usamos window.open como fallback para abrir o PDF no visualizador nativo.
  const nomeArquivo = `relatorio_radar_${new Date().getTime()}.pdf`;

  const tentouDownload = (() => {
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch {
      return false;
    }
  })();

  // Fallback: abre o PDF num nova aba (funciona no Android WebView)
  if (!tentouDownload) {
    window.open(blobUrl, "_blank");
  }

  // Revoga a URL após um curto delay para garantir que o browser processou
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
}

// 👤 PERFIL DO USUÁRIO — retorna nome completo do operador
export async function getUserProfile() {
  const res = await fetch(`${BASE_URL}/api/me/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar perfil do usuário");
  return await res.json();
}

// 🔢 GERAR NÚMERO DE OFÍCIO
export async function gerarNumeroOficio(id) {
  const res = await fetch(`${API_URL}${id}/gerar_numero_oficio/`, {
    method: "POST",
    headers: getHeaders()
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error || "Erro ao gerar número de ofício");
  }

  return await res.json();
}

// 🔢 GERAR NÚMERO SEQUENCIAL DO RECIBO
export async function gerarNumeroRecibo(bou) {
  const res = await fetch(`${API_URL}gerar_numero_recibo/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ bou }),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error || "Erro ao gerar número de recibo");
  }

  return await res.json();
}
// ? RESET DO SISTEMA (Apenas Superusers)
// export async function resetSystem() {
//   const res = await fetch(`${BASE_URL}/api/system/reset/`, {
//     method: "POST",
//     headers: getHeaders(),
//   });
//
//   if (!res.ok) {
//     const erro = await res.json();
//     throw new Error(erro.error || 'Erro ao resetar sistema');
//   }
//
//   return await res.json();
// }
