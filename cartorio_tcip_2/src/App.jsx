import React, { useState, useEffect } from "react";
import DashboardView from "./components/DashboardView";
import CadastroView from "./components/CadastroView";
import ConferenciaView from "./components/ConferenciaView";
import CofreView from "./components/CofreView";
import ProntoQueimaView from "./components/ProntoQueimaView";
import LotesProntosView from "./components/LotesProntosView";
import AuditoriaView from "./components/AuditoriaView";
import OficiosView from "./components/OficiosView";
import LoginView from "./components/LoginView";
import AssinaturaView from "./components/AssinaturaView";

import brasao from "./assets/brasao.png";

import { isAutenticado, logout, getUsuario } from "./services/auth.js";

const RelogioDigital = () => {
  const [hora, setHora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dataExtenso = hora.toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dataFormatada = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1);

  return (
    <div style={{ position: "absolute", top: "20px", left: "40px", color: "#64748b", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", zIndex: 10 }}>
      <span style={{ fontSize: "16px" }}>🕒</span>
      {dataFormatada} • {hora.toLocaleTimeString("pt-BR")}
    </div>
  );
};


export default function App() {
  const [view, setView] = useState(() => {
    // Inicializa a view a partir do hash da URL, caso exista
    const hash = window.location.hash.replace("#/", "");
    const viewsValidas = ["dashboard", "cadastro", "conferencia", "deposito", "incineracao", "lotes_prontos", "auditoria", "oficios"];
    return viewsValidas.includes(hash) ? hash : "dashboard";
  });
  const [logado, setLogado] = useState(isAutenticado());
  const [usuario, setUsuario] = useState(() => (logado ? getUsuario() : null));

  useEffect(() => {
    setUsuario(logado ? getUsuario() : null);
  }, [logado]);

  // 💓 HEARTBEAT: Mantém o Render acordado a cada 10 minutos (previne suspensão do plano Free)
  useEffect(() => {
    if (!logado) return;
    
    const keepAlive = () => {
      console.log("💓 Keep-Alive: Mantendo o Render ativo...");
      const BASE_URL = import.meta.env.VITE_API_URL || "";
      fetch(`${BASE_URL}/api/health/`)
        .catch(() => {}); // Ignora erros, o importante é a requisição chegar ao servidor
    };

    // Primeira execução após 1 minuto, depois a cada 10 minutos
    const timerInicial = setTimeout(keepAlive, 60000);
    const interval = setInterval(keepAlive, 10 * 60 * 1000); 
    
    return () => {
      clearTimeout(timerInicial);
      clearInterval(interval);
    };
  }, [logado]);

  // Sincroniza o "Voltar" do navegador com as telas do sistema
  useEffect(() => {
    const handlePopState = () => {
      const currentHash = window.location.hash.replace("#/", "") || "dashboard";
      setView(currentHash);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Função para mudar de tela e atualizar a URL (hash)
  const changeView = (v) => {
    setView(v);
    if (window.location.hash !== `#/${v}`) {
      window.history.pushState(null, "", `#/${v}`);
    }
  };

  // 📱 ROTA DO CELULAR: /assinar?token=...&bou=...
  // Exibe a tela de assinatura sem exigir login JWT
  if (window.location.pathname === "/assinar") {
    return <AssinaturaView />;
  }

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

      case "auditoria":
        return <AuditoriaView />;

      case "oficios":
        return <OficiosView />;

      default:
        return <h1>Erro de navegação</h1>;
    }
  };

  return (
    <div className="app-layout">

      {/* MENU LATERAL COMPLETO */}
      <div className="sidebar">

        <div className="sidebar-header">
          <img 
            src={brasao} 
            alt="Brasão 6º BPM" 
            onClick={() => changeView("dashboard")}
            style={{ cursor: "pointer" }}
            title="Ir para o Dashboard"
          />
          <h2>6º BPM - CASCAVEL</h2>
          <h3 style={{ margin: "5px 0 0 0", color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px" }}>PRIMEIRO CARTÓRIO - TCIP</h3>
        </div>

        {/* 👤 Usuário logado */}
        <div style={{ padding: "10px 20px", fontSize: "12px", color: "#e2e8f0", textAlign: "center", fontStyle: "italic", background: "rgba(0,0,0,0.2)" }}>
          Operador: {usuario?.username}
        </div>

        <button
          className={`sidebar-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => changeView("dashboard")}
        >
          <span style={{ fontSize: "16px" }}>⏱</span> DASHBOARD
        </button>
 
        <div className="sidebar-section">OPERACIONAL</div>
 
        <button
          className={`sidebar-btn ${view === 'cadastro' ? 'active' : ''}`}
          onClick={() => changeView("cadastro")}
        >
          <span style={{ fontSize: "16px" }}>📝</span> CADASTRO
        </button>
 
        <button
          className={`sidebar-btn ${view === 'conferencia' ? 'active' : ''}`}
          onClick={() => changeView("conferencia")}
        >
          <span style={{ fontSize: "16px" }}>⚖️</span> TRIAGEM
        </button>
 
        <div className="sidebar-section">COFRE</div>
 
        <button
          className={`sidebar-btn ${view === 'deposito' ? 'active' : ''}`}
          onClick={() => changeView("deposito")}
        >
          <span style={{ fontSize: "16px" }}>🗄️</span> DEPÓSITO
        </button>
 
        <div className="sidebar-section">INCINERAÇÃO</div>
 
        <button
          className={`sidebar-btn ${view === 'incineracao' ? 'active' : ''}`}
          onClick={() => changeView("incineracao")}
        >
          <span style={{ fontSize: "16px" }}>📦</span> LOTES
        </button>
 
        <button
          className={`sidebar-btn ${view === 'lotes_prontos' ? 'active' : ''}`}
          onClick={() => changeView("lotes_prontos")}
        >
          <span style={{ fontSize: "16px" }}>🔥</span> INCINERADOS
        </button>
 
        <div className="sidebar-section">RELATÓRIOS</div>
 
        <button
          className={`sidebar-btn ${view === 'auditoria' ? 'active' : ''}`}
          onClick={() => changeView("auditoria")}
        >
          <span style={{ fontSize: "16px" }}>📊</span> BUSCA PROCESSUAL
        </button>
 
        <button
          className={`sidebar-btn ${view === 'oficios' ? 'active' : ''}`}
          onClick={() => changeView("oficios")}
        >
          <span style={{ fontSize: "16px" }}>📄</span> OFÍCIOS
        </button>
 
        <div style={{ flex: 1 }}></div>
 
        <button
          className="sidebar-btn"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)", color: "#f87171" }}
          onClick={handleLogout}
        >
          SAIR
        </button>

      </div>

      {/* TELA */}
      <div className="main-content">
        <RelogioDigital />
        {renderView()}
      </div>

    </div>
  );
}