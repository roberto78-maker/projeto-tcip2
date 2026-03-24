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

// 🔍 LISTAR
export async function getApreensoes() {
  const res = await fetch(API_URL, {
    headers: getHeaders()
  });

  if (!res.ok) {
    const erro = await res.text();
    console.error("Erro GET:", erro);
    throw new Error("Erro ao buscar apreensões");
  }

  return await res.json();
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

// 📦 LOTES
export async function getLotes() {
  const res = await fetch(`${BASE_URL}/api/lotes/`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Erro ao buscar lotes");
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