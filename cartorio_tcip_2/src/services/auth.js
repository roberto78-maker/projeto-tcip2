const USER_KEY = "usuario_logado";
const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function login(username, password) {
  try {
    const res = await fetch(`${BASE_URL}/api/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) return false;

    const data = await res.json();
    // Armazena tokens e infos (role pode vir do token or outro endpoint se necessário)
    localStorage.setItem(USER_KEY, JSON.stringify({
      username,
      access: data.access,
      refresh: data.refresh,
      role: username === "admin" ? "admin" : "operador" // temporário até vir do backend
    }));
    return true;
  } catch (err) {
    console.error("Erro Login:", err);
    return false;
  }
}

export function logout() {
  localStorage.removeItem(USER_KEY);
}

export function getUsuario() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function isAutenticado() {
  return !!getUsuario();
}

export function isAdmin() {
  const user = getUsuario();
  return user?.role === "admin";
}