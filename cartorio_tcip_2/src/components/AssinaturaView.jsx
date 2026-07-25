/**
 * AssinaturaView.jsx
 * Tela do celular — o policial entregador assina com o dedo nesta página.
 * Acessada via QR Code: /assinar?token=UUID&bou=2026/786
 */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { enviarAssinatura } from "../services/assinaturaService.js";

export default function AssinaturaView() {
  const canvasRef = useRef(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temAssinatura, setTemAssinatura] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  // Suporte a 2 etapas quando sem_token === "true"
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const bou = params.get("bou") || "";
  const semTokenCartorario = params.get("sem_token") === "true";

  const [etapa, setEtapa] = useState(1); // 1 = Entregador, 2 = Cartorário
  const [assinaturaEntregadorB64, setAssinaturaEntregadorB64] = useState(null);

  // Re-inicializa canvas ao trocar de etapa ou montar
  const inicializarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setTemAssinatura(false);
  }, []);

  useEffect(() => {
    inicializarCanvas();
  }, [inicializarCanvas, etapa]);

  // Obtém posição correta dentro do canvas (touch ou mouse)
  const getPosicao = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const source = e.touches ? e.touches[0] : e;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  };

  const iniciarDesenho = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPosicao(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDesenhando(true);
  }, []);

  const desenhar = useCallback(
    (e) => {
      if (!desenhando) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const pos = getPosicao(e, canvas);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setTemAssinatura(true);
    },
    [desenhando]
  );

  const pararDesenho = useCallback((e) => {
    e?.preventDefault();
    setDesenhando(false);
  }, []);

  const limparCanvas = () => {
    inicializarCanvas();
    setErro("");
  };

  const avancarParaEtapa2 = () => {
    if (!temAssinatura) {
      setErro("Por favor, assine antes de prosseguir para a próxima assinatura.");
      return;
    }
    const canvas = canvasRef.current;
    const b64 = canvas.toDataURL("image/png");
    setAssinaturaEntregadorB64(b64);
    setErro("");
    setEtapa(2);
  };

  const voltarParaEtapa1 = () => {
    setErro("");
    setEtapa(1);
  };

  const confirmarAssinatura = async () => {
    if (!temAssinatura) {
      setErro("Por favor, assine antes de confirmar.");
      return;
    }
    if (!token) {
      setErro("Token inválido. Escaneie o QR Code novamente.");
      return;
    }

    setEnviando(true);
    setErro("");

    try {
      const canvas = canvasRef.current;
      const assinaturaAtualB64 = canvas.toDataURL("image/png");

      if (semTokenCartorario) {
        // Modo 2 etapas: entregador (salvo no estado) + cartorário (canvas atual)
        await enviarAssinatura(token, bou, assinaturaEntregadorB64, assinaturaAtualB64);
      } else {
        // Modo padrão: apenas entregador
        await enviarAssinatura(token, bou, assinaturaAtualB64);
      }

      setSucesso(true);
    } catch (err) {
      setErro(err.message || "Erro ao enviar assinatura. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  // ── Tela de Sucesso ────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div style={styles.pageSuccess}>
        <div style={styles.successCard}>
          <div style={styles.successIcon}>✅</div>
          <h1 style={styles.successTitle}>Assinatura Confirmada!</h1>
          <p style={styles.successText}>
            {semTokenCartorario
              ? "As assinaturas do entregador e do cartorário foram registradas com sucesso."
              : "Sua assinatura foi registrada com sucesso no sistema do cartório."}
          </p>
          <p style={styles.successSub}>Pode fechar esta janela.</p>
        </div>
      </div>
    );
  }

  // ── Tela de Assinatura ─────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div style={styles.headerBadge}>PMPR · TCIP</div>
        <h1 style={styles.headerTitle}>Assinatura Eletrônica</h1>
        {bou && (
          <p style={styles.headerSub}>
            BOU: <strong>{bou}</strong>
          </p>
        )}
      </div>

      {/* Indicador de Etapas (se sem_token = true) */}
      {semTokenCartorario && (
        <div style={styles.etapaBadgeContainer}>
          <span
            style={{
              ...styles.etapaBadge,
              background: etapa === 1 ? "#3b82f6" : "#1e293b",
              color: etapa === 1 ? "#ffffff" : "#94a3b8",
            }}
          >
            1. Policial Entregador {etapa === 2 && "✓"}
          </span>
          <span
            style={{
              ...styles.etapaBadge,
              background: etapa === 2 ? "#d97706" : "#1e293b",
              color: etapa === 2 ? "#ffffff" : "#94a3b8",
            }}
          >
            2. Cartorário Recebedor
          </span>
        </div>
      )}

      {/* Instrução */}
      <div style={styles.instrucaoBox}>
        <span style={styles.instrucaoIcon}>✍️</span>
        <p style={styles.instrucaoText}>
          {semTokenCartorario
            ? etapa === 1
              ? "PASSO 1 DE 2: Assinatura do Policial / Entregador"
              : "PASSO 2 DE 2: Assinatura do Recebedor / Cartorário"
            : "Assine abaixo com o dedo, conforme sua assinatura usual."}
        </p>
      </div>

      {/* Canvas de assinatura */}
      <div style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          // Eventos Touch (celular)
          onTouchStart={iniciarDesenho}
          onTouchMove={desenhar}
          onTouchEnd={pararDesenho}
          // Eventos Mouse (teste em desktop)
          onMouseDown={iniciarDesenho}
          onMouseMove={desenhar}
          onMouseUp={pararDesenho}
          onMouseLeave={pararDesenho}
        />
        {!temAssinatura && (
          <div style={styles.canvasPlaceholder}>
            <span style={{ fontSize: "32px", opacity: 0.3 }}>✍️</span>
            <span style={{ color: "#94a3b8", fontSize: "13px" }}>
              {semTokenCartorario
                ? etapa === 1
                  ? "Assinatura do Policial Entregador"
                  : "Assinatura do Cartorário Recebedor"
                : "Assine aqui"}
            </span>
          </div>
        )}
      </div>

      {/* Mensagem de erro */}
      {erro && <div style={styles.erroBox}>{erro}</div>}

      {/* Botões */}
      <div style={styles.botoesRow}>
        {semTokenCartorario && etapa === 2 ? (
          <button
            onClick={voltarParaEtapa1}
            style={styles.btnLimpar}
            disabled={enviando}
          >
            ⬅️ Voltar Etapa 1
          </button>
        ) : (
          <button
            id="btn-limpar-assinatura"
            onClick={limparCanvas}
            style={styles.btnLimpar}
            disabled={enviando}
          >
            🔄 Limpar
          </button>
        )}

        {semTokenCartorario && etapa === 1 ? (
          <button
            id="btn-avancar-etapa"
            onClick={avancarParaEtapa2}
            style={{
              ...styles.btnConfirmar,
              background: "#3b82f6",
            }}
          >
            Próxima Assinatura ➔
          </button>
        ) : (
          <button
            id="btn-confirmar-assinatura"
            onClick={confirmarAssinatura}
            style={{
              ...styles.btnConfirmar,
              background: semTokenCartorario ? "#d97706" : "#10b981",
              opacity: enviando ? 0.7 : 1,
              cursor: enviando ? "not-allowed" : "pointer",
            }}
            disabled={enviando}
          >
            {enviando ? "Enviando..." : "✅ Confirmar Assinaturas"}
          </button>
        )}
      </div>

      <p style={styles.rodape}>
        Cartório TCIP · Assinatura Digital Segura
      </p>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "24px 16px",
    gap: "16px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    width: "100%",
  },
  headerBadge: {
    display: "inline-block",
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(8px)",
    color: "#93c5fd",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "2px",
    padding: "4px 14px",
    borderRadius: "20px",
    border: "1px solid rgba(147,197,253,0.3)",
    marginBottom: "8px",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "800",
    margin: "0 0 4px 0",
    letterSpacing: "0.5px",
  },
  headerSub: {
    color: "#93c5fd",
    fontSize: "13px",
    margin: 0,
  },
  etapaBadgeContainer: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    width: "100%",
    maxWidth: "400px",
  },
  etapaBadge: {
    flex: 1,
    textAlign: "center",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    transition: "all 0.3s ease",
  },
  instrucaoBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px",
    padding: "12px 16px",
    width: "100%",
    maxWidth: "440px",
    boxSizing: "border-box",
  },
  instrucaoIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },
  instrucaoText: {
    color: "#cbd5e1",
    fontSize: "13px",
    margin: 0,
    lineHeight: "1.5",
  },
  canvasWrapper: {
    position: "relative",
    width: "100%",
    maxWidth: "440px",
    borderRadius: "16px",
    overflow: "hidden",
    border: "2px solid rgba(59,130,246,0.5)",
    boxShadow: "0 0 30px rgba(59,130,246,0.2)",
    background: "#ffffff",
  },
  canvas: {
    width: "100%",
    height: "220px",
    display: "block",
    touchAction: "none", // Impede scroll ao assinar
    cursor: "crosshair",
  },
  canvasPlaceholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    pointerEvents: "none",
  },
  erroBox: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#fca5a5",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "13px",
    width: "100%",
    maxWidth: "440px",
    textAlign: "center",
    boxSizing: "border-box",
  },
  botoesRow: {
    display: "flex",
    gap: "12px",
    width: "100%",
    maxWidth: "440px",
  },
  btnLimpar: {
    flex: "0 0 auto",
    padding: "14px 20px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "12px",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnConfirmar: {
    flex: 1,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(16,185,129,0.4)",
  },
  rodape: {
    color: "rgba(255,255,255,0.3)",
    fontSize: "11px",
    marginTop: "auto",
  },
  // Tela de sucesso
  pageSuccess: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #064e3b 0%, #065f46 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  successCard: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "24px",
    padding: "48px 32px",
    textAlign: "center",
    maxWidth: "340px",
    width: "100%",
  },
  successIcon: {
    fontSize: "64px",
    marginBottom: "16px",
  },
  successTitle: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "800",
    margin: "0 0 12px 0",
  },
  successText: {
    color: "#a7f3d0",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 8px 0",
  },
  successSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "12px",
    margin: 0,
  },
};
