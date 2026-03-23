const USER_KEY = "usuario_logado";

// 🔐 base de usuários
const usuarios = [
  { username: "admin", password: "1234", role: "admin" },
  { username: "operador", password: "1234", role: "operador" }
];

export function login(username, password) {
  const user = usuarios.find(
    u => u.username === username && u.password === password
  );

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  }

  return false;
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