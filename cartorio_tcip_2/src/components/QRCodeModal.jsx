/**
 * QRCodeModal.jsx
 * Modal exibido no PC do cartório com o QR Code.
 * Faz polling a cada 3s aguardando a assinatura do celular.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { verificarStatusAssinatura } from "../services/assinaturaService.js";

const POLLING_INTERVAL_MS = 3000;
const EXPIRACAO_MINUTOS = 30;

export default function QRCodeModal({ token, urlQr, bou, onSucesso, onCancelar }) {
  const [assinado, setAssinado] = useState(false);
  const [assinaturaBase64, setAssinaturaBase64] = useState(null);
  const [assinaturaCartorarioBase64, setAssinaturaCartorarioBase64] = useState(null);
  const [expirado, setExpirado] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(
    EXPIRACAO_MINUTOS * 60
  );
  const [erroPoll, setErroPoll] = useState("");

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Polling: verifica status da assinatura ─────────────────────────────────
  const verificar = useCallback(async () => {
    try {
      const dados = await verificarStatusAssinatura(token, bou);

      if (dados.expirado) {
        setExpirado(true);
        clearInterval(pollingRef.current);
        clearInterval(countdownRef.current);
        return;
      }

      if (dados.assinado && dados.assinatura_base64) {
        setAssinado(true);
        setAssinaturaBase64(dados.assinatura_base64);
        setAssinaturaCartorarioBase64(dados.assinatura_cartorario_base64 || null);
        clearInterval(pollingRef.current);
        clearInterval(countdownRef.current);
      }
    } catch {
      setErroPoll("Falha ao verificar status. Aguardando...");
    }
  }, [token, bou]);

  useEffect(() => {
    if (!token) return;

    // Inicia o polling imediatamente
    verificar();
    pollingRef.current = setInterval(verificar, POLLING_INTERVAL_MS);

    // Contador regressivo de expiração
    countdownRef.current = setInterval(() => {
      setSegundosRestantes((s) => {
        if (s <= 1) {
          clearInterval(pollingRef.current);
          clearInterval(countdownRef.current);
          setExpirado(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollingRef.current);
      clearInterval(countdownRef.current);
    };
  }, [verificar, token]);

  // Formata segundos em MM:SS
  const formatarTempo = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const seg = (s % 60).toString().padStart(2, "0");
    return `${m}:${seg}`;
  };

  // Percentual para o arco SVG do countdown
  const pct = segundosRestantes / (EXPIRACAO_MINUTOS * 60);
  const circunferencia = 2 * Math.PI * 22;
  const dashoffset = circunferencia * (1 - pct);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Cabeçalho */}
        <div style={styles.header}>
          <h2 style={styles.titulo}>📱 Coletar Assinatura</h2>
          <p style={styles.subtitulo}>
            Aponte o celular do cartório para o QR Code abaixo.
            {bou && (
              <>
                {" "}
                BOU: <strong style={{ color: "#60a5fa" }}>{bou}</strong>
              </>
            )}
          </p>
        </div>

        {/* ── ESTADO: Aguardando ─────────────────────────────────────────── */}
        {!assinado && !expirado && (
          <>
            <div style={styles.qrWrapper}>
              <div style={styles.qrFrame}>
                <QRCodeSVG
                  value={urlQr}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#1e3a8a"
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Indicador de polling */}
              <div style={styles.pollingRow}>
                <span style={styles.pollingDot} />
                <span style={styles.pollingText}>
                  Aguardando assinatura do policial...
                </span>
              </div>

              {erroPoll && (
                <p style={styles.erroText}>{erroPoll}</p>
              )}
            </div>

            {/* Contador regressivo */}
            <div style={styles.countdownRow}>
              <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
                <circle
                  cx="26"
                  cy="26"
                  r="22"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="26"
                  cy="26"
                  r="22"
                  fill="none"
                  stroke={pct > 0.2 ? "#3b82f6" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={circunferencia}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <p style={styles.countdownLabel}>Expira em</p>
                <p style={styles.countdownValue}>
                  {formatarTempo(segundosRestantes)}
                </p>
              </div>
            </div>

            <div style={styles.instrucoes}>
              <p style={styles.instrucaoItem}>
                1. Pegue o celular do cartório
              </p>
              <p style={styles.instrucaoItem}>
                2. Abra a câmera e aponte para o QR Code
              </p>
              <p style={styles.instrucaoItem}>
                3. O policial assina com o dedo na tela
              </p>
            </div>
          </>
        )}

        {/* ── ESTADO: Assinatura Recebida ────────────────────────────────── */}
        {assinado && (
          <div style={styles.sucessoBox}>
            <div style={styles.sucessoIcone}>✅</div>
            <h3 style={styles.sucessoTitulo}>Assinatura Coletada!</h3>
            <p style={styles.sucessoTexto}>
              A assinatura do policial foi registrada com sucesso.
            </p>

            {/* Miniatura das assinaturas */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", width: "100%", margin: "10px 0" }}>
              {assinaturaBase64 && (
                <div style={{ ...styles.miniatura, flex: 1 }}>
                  <p style={styles.miniaturaLabel}>Entregador (Policial):</p>
                  <img
                    src={assinaturaBase64}
                    alt="Assinatura Entregador"
                    style={styles.miniaturaImg}
                  />
                </div>
              )}
              {assinaturaCartorarioBase64 && (
                <div style={{ ...styles.miniatura, flex: 1 }}>
                  <p style={styles.miniaturaLabel}>Cartorário (Recebedor):</p>
                  <img
                    src={assinaturaCartorarioBase64}
                    alt="Assinatura Cartorário"
                    style={styles.miniaturaImg}
                  />
                </div>
              )}
            </div>

            <button
              id="btn-finalizar-com-assinatura"
              onClick={() => onSucesso({ assinaturaBase64, assinaturaCartorarioBase64 })}
              style={styles.btnFinalizar}
            >
              ⬇️ Finalizar e Baixar Recibo PDF
            </button>
          </div>
        )}

        {/* ── ESTADO: Expirado ──────────────────────────────────────────── */}
        {expirado && (
          <div style={styles.expiradoBox}>
            <div style={{ fontSize: "40px" }}>⏰</div>
            <h3 style={{ color: "#fca5a5", margin: "8px 0" }}>
              QR Code Expirado
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13px" }}>
              O tempo de 30 minutos esgotou. Cancele e tente novamente.
            </p>
          </div>
        )}

        {/* Botão cancelar */}
        {!assinado && (
          <button
            id="btn-cancelar-assinatura"
            onClick={onCancelar}
            style={styles.btnCancelar}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
  },
  modal: {
    background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: "24px",
    padding: "32px",
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    textAlign: "center",
    width: "100%",
  },
  titulo: {
    color: "#ffffff",
    fontSize: "22px",
    fontWeight: "800",
    margin: "0 0 6px 0",
  },
  subtitulo: {
    color: "#94a3b8",
    fontSize: "13px",
    margin: 0,
    lineHeight: "1.5",
  },
  qrWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    width: "100%",
  },
  qrFrame: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "12px",
    boxShadow: "0 0 0 4px rgba(59,130,246,0.3), 0 8px 30px rgba(0,0,0,0.3)",
  },
  pollingRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(59,130,246,0.1)",
    border: "1px solid rgba(59,130,246,0.2)",
    borderRadius: "20px",
    padding: "6px 16px",
  },
  pollingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#3b82f6",
    animation: "pulse 1.5s infinite",
    flexShrink: 0,
    boxShadow: "0 0 6px #3b82f6",
  },
  pollingText: {
    color: "#93c5fd",
    fontSize: "12px",
    fontWeight: "600",
  },
  erroText: {
    color: "#f87171",
    fontSize: "12px",
    margin: 0,
  },
  countdownRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  countdownLabel: {
    color: "#64748b",
    fontSize: "11px",
    margin: "0 0 2px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  countdownValue: {
    color: "#e2e8f0",
    fontSize: "20px",
    fontWeight: "700",
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
  instrucoes: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "14px 18px",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  instrucaoItem: {
    color: "#64748b",
    fontSize: "12px",
    margin: 0,
    lineHeight: "1.6",
  },
  // Sucesso
  sucessoBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    textAlign: "center",
  },
  sucessoIcone: {
    fontSize: "52px",
  },
  sucessoTitulo: {
    color: "#34d399",
    fontSize: "20px",
    fontWeight: "800",
    margin: 0,
  },
  sucessoTexto: {
    color: "#94a3b8",
    fontSize: "13px",
    margin: 0,
  },
  miniatura: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "12px",
    boxSizing: "border-box",
  },
  miniaturaLabel: {
    color: "#64748b",
    fontSize: "11px",
    margin: "0 0 8px 0",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  miniaturaImg: {
    width: "100%",
    maxHeight: "80px",
    objectFit: "contain",
    background: "#ffffff",
    borderRadius: "8px",
    display: "block",
  },
  btnFinalizar: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    letterSpacing: "0.5px",
    boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
    transition: "transform 0.1s",
  },
  // Expirado
  expiradoBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
    padding: "16px",
  },
  // Cancelar
  btnCancelar: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "#64748b",
    fontSize: "13px",
    padding: "10px 24px",
    cursor: "pointer",
    transition: "all 0.2s",
    width: "100%",
  },
};
