// 🌐 BASE URL (AMBIENTE)
const BASE_URL = import.meta.env.VITE_API_URL || "";

// 🔗 ENDPOINT
const API_URL = `${BASE_URL}/api/apreensoes/`;

// 🔍 LISTAR
export async function getApreensoes() {
  const res = await fetch(API_URL);

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
  const res = await fetch(`${BASE_URL}/api/lotes/`);
  if (!res.ok) throw new Error("Erro ao buscar lotes");
  return await res.json();
}

// 🚀 DESTINAR INCINERAÇÃO (Action específica)
export async function destinarIncineracao(id) {
  const res = await fetch(`${API_URL}${id}/destinar_incineracao/`, {
    method: "POST"
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error || "Erro ao destinar para incineração");
  }

  return await res.json();
}