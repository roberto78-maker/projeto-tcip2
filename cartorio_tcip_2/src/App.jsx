import React, { useState } from "react";
import DashboardView from "./components/DashboardView";
import CadastroView from "./components/CadastroView";
import ConferenciaView from "./components/ConferenciaView";
import CofreView from "./components/CofreView";
import ProntoQueimaView from "./components/ProntoQueimaView";
import LotesProntosView from "./components/LotesProntosView";
import LoginView from "./components/LoginView";

import brasao from "./assets/brasao.png";

import { isAutenticado, logout, getUsuario } from "./services/auth.js";

export default function App() {

  const [view, setView] = useState("dashboard");
  const [logado, setLogado] = useState(isAutenticado());

  const usuario = getUsuario();

  // 🔐 LOGIN
  if (!logado) {
    return <LoginView onLogin={() => setLogado(true)} />;
  }

  // 🔓 LOGOUT
  function handleLogout() {
    logout();
    setLogado(false);
  }

  // 🔥 CONTROLE DE TELAS
  const renderView = () => {
    switch (view) {

      case "dashboard":
        return <DashboardView />;

      case "cadastro":
        return <CadastroView />;

      case "conferencia":
        return <ConferenciaView />;

      case "deposito":
        return <CofreView />;

      case "incineracao":
        return <ProntoQueimaView />;

      case "lotes_prontos":
        return <LotesProntosView />;

      default:
        return <h1>Erro de navegação</h1>;
    }
  };

  return (
    <div className="app-layout">

      {/* MENU LATERAL COMPLETO */}
      <div className="sidebar">

        <div className="sidebar-header">
          <img src={brasao} alt="Brasão 6º BPM" />
          <h2>6º BPM - CASCAVEL</h2>
        </div>

        {/* 👤 Usuário logado */}
        <div style={{ padding: "10px 20px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
          Operador: {usuario?.username}
        </div>

        <button
          className={`sidebar-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView("dashboard")}
        >
          <span style={{ fontSize: "16px" }}>⏱</span> Dashboard
        </button>

        <div className="sidebar-section">OPERACIONAL</div>

        <button
          className={`sidebar-btn ${view === 'cadastro' ? 'active' : ''}`}
          onClick={() => setView("cadastro")}
        >
          <span style={{ fontSize: "16px" }}>📝</span> CADASTRO
        </button>

        <button
          className={`sidebar-btn ${view === 'conferencia' ? 'active' : ''}`}
          onClick={() => setView("conferencia")}
        >
          <span style={{ fontSize: "16px" }}>⚖️</span> Conferir Pesagem
        </button>

        <div className="sidebar-section">COFRE</div>

        <button
          className={`sidebar-btn ${view === 'deposito' ? 'active' : ''}`}
          onClick={() => setView("deposito")}
        >
          <span style={{ fontSize: "16px" }}>🗄️</span> Itens no Cofre
        </button>

        <div className="sidebar-section">INCINERAÇÃO</div>

        <button
          className={`sidebar-btn ${view === 'incineracao' ? 'active' : ''}`}
          onClick={() => setView("incineracao")}
        >
          <span style={{ fontSize: "16px" }}>📦</span> Montar Lotes
        </button>

        <button
          className={`sidebar-btn ${view === 'lotes_prontos' ? 'active' : ''}`}
          onClick={() => setView("lotes_prontos")}
        >
          <span style={{ fontSize: "16px" }}>🔥</span> Lotes Prontos
        </button>

        <div style={{ flex: 1 }}></div>

        <button
          className="sidebar-btn"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)", color: "#f87171" }}
          onClick={handleLogout}
        >
          Sair
        </button>

      </div>

      {/* TELA */}
      <div className="main-content">
        {renderView()}
      </div>

    </div>
  );
}