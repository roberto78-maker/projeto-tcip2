import React, { useState } from "react";
import { login } from "../services/auth.js";

export default function LoginView({ onLogin }) {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);

    if (!ok) {
      alert("Usuário ou senha inválidos ou erro de conexão");
      return;
    }

    onLogin();
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#0f172a"
    }}>

      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "10px",
        width: "300px"
      }}>

        <h2>Login</h2>

        <input
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            marginTop: "15px",
            width: "100%",
            padding: "10px",
            background: loading ? "#94a3b8" : "#1d4ed8",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

      </div>
    </div>
  );
}