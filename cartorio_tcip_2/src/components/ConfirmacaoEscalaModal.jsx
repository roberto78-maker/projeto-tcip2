import React, { useState, useEffect } from "react";
import { getDiarioAtual, assumirDiario } from "../services/api";
import { getUsuario } from "../services/auth";

export default function ConfirmacaoEscalaModal({ usuarioLogado, onConcluido }) {
  const [diario, setDiario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState(null);

  // Etapa 1: Modal inicial (Imagem 02)
  // Etapa 2: Confirmação de segurança ("Tem certeza?")
  const [step, setStep] = useState(1);

  useEffect(() => {
    async function carregarDiario() {
      setLoading(true);
      setErro(null);
      try {
        const data = await getDiarioAtual();
        setDiario(data);

        // Se o usuário logado já for o operador registrado neste diário, conclui direto
        const user = usuarioLogado || getUsuario();
        if (data && user && data.operador === user.id) {
          onConcluido({ assumiu: true, diario: data });
          return;
        }

        // Verificar se este operador já recusou a escala desta jornada nesta sessão/navegador
        const keyRecusa = data && user ? `recusou_diario_${data.id}_user_${user.id}` : null;
        const jaRecusou = keyRecusa ? localStorage.getItem(keyRecusa) === "true" : false;
        if (jaRecusou) {
          onConcluido({ assumiu: false, diario: data });
          return;
        }
      } catch (err) {
        console.error("Erro ao carregar diário da jornada:", err);
        setErro("Erro ao verificar escala de serviço da jornada atual. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }
    carregarDiario();
  }, [usuarioLogado, onConcluido]);

  const formatarDataHora = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      return `${d}/${m}/${y} às ${h}h${min}`;
    } catch (e) {
      return isoString;
    }
  };

  const handleIniciarAssumir = () => {
    // Avança para a dupla confirmação (Etapa 2)
    setStep(2);
  };

  const handleConfirmarAssumir = async () => {
    if (!diario) return;
    setSubmitting(true);
    setErro(null);
    try {
      const updated = await assumirDiario(diario.id);
      setDiario(updated);
      onConcluido({ assumiu: true, diario: updated });
    } catch (err) {
      console.error(err);
      setErro(err?.message || "Erro ao assumir escala da jornada.");
      setStep(1); // Retorna para etapa 1 em caso de erro
    } finally {
      setSubmitting(false);
    }
  };

  const handleNaoAssumir = () => {
    const user = usuarioLogado || getUsuario();
    if (diario && user) {
      const keyRecusa = `recusou_diario_${diario.id}_user_${user.id}`;
      localStorage.setItem(keyRecusa, "true");
    }
    onConcluido({ assumiu: false, diario });
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={modalBoxStyle}>
          <div style={{ textAlign: "center", padding: "20px" }}>
            <span className="spinner" style={{ width: "32px", height: "32px", marginBottom: "12px", display: "inline-block" }}></span>
            <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>Carregando dados da escala de serviço...</p>
          </div>
        </div>
      </div>
    );
  }

  if (erro && !diario) {
    return (
      <div style={overlayStyle}>
        <div style={modalBoxStyle}>
          <div style={{ textAlign: "center", padding: "10px" }}>
            <span style={{ fontSize: "36px" }}>⚠️</span>
            <h3 style={{ color: "#ef4444", margin: "10px 0" }}>Atenção</h3>
            <p style={{ color: "#475569", fontSize: "14px" }}>{erro}</p>
            <button
              onClick={() => onConcluido({ assumiu: false, diario: null })}
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Prosseguir ao Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={modalBoxStyle}>
        {/* ETAPA 1: Confirmação Inicial da Escala */}
        {step === 1 && (
          <>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "40px" }}>👮‍♂️</span>
              <h3 style={{ margin: "10px 0 6px 0", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
                Confirmação de Escala de Serviço
              </h3>
              {diario && (
                <p style={{ margin: 0, fontSize: "14px", color: "#64748b", fontWeight: "600" }}>
                  Jornada: {formatarDataHora(diario.data_inicio)} às {formatarDataHora(diario.data_fim)}
                </p>
              )}
            </div>

            <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px", fontSize: "14px", color: "#334155", lineHeight: "1.5" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>
                Você é o operador que está cumprindo a escala desta jornada de trabalho?
              </p>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#475569" }}>
                <li><strong>SIM:</strong> Você assumirá o Diário de Serviço e poderá registrar as ocorrências e anexos da sua escala.</li>
                <li><strong>NÃO:</strong> Você visualizará o registro em modo somente leitura sem assumir a escala do colega.</li>
              </ul>
            </div>

            {diario?.operador && diario.operador !== usuarioLogado?.id && (
              <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#fef3c7", color: "#92400e", borderRadius: "6px", fontSize: "12px", border: "1px solid #fcd34d" }}>
                ⚠️ Atualmente este diário consta como assumido por: <strong>{diario.operador_nome}</strong>. Se você é o operador escalado hoje, confirme em "SIM" para assumir a escala.
              </div>
            )}

            {erro && (
              <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px" }}>
                {erro}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={handleNaoAssumir}
                disabled={submitting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ✖️ NÃO (Apenas Visualizar)
              </button>
              <button
                onClick={handleIniciarAssumir}
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)"
                }}
              >
                ✓ SIM (Assumir Escala)
              </button>
            </div>
          </>
        )}

        {/* ETAPA 2: Dupla Confirmação de Segurança ("Tem certeza?") */}
        {step === 2 && (
          <>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "42px" }}>⚠️</span>
              <h3 style={{ margin: "10px 0 6px 0", fontSize: "19px", fontWeight: "700", color: "#991b1b" }}>
                Confirmar Posse da Escala de Serviço
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                Verificação de segurança operacional
              </p>
            </div>

            <div style={{ background: "#fff1f2", padding: "14px", borderRadius: "8px", border: "1px solid #fecdd3", marginBottom: "20px", fontSize: "14px", color: "#9f1239", lineHeight: "1.5" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "700" }}>
                Tem certeza que deseja assumir a escala de trabalho desta jornada?
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#881337" }}>
                Ao confirmar, seu nome será associado ao Diário de Serviço como o operador responsável pelo turno ({formatarDataHora(diario?.data_inicio)} às {formatarDataHora(diario?.data_fim)}).
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: "12px", fontStyle: "italic", color: "#9f1239" }}>
                💡 Se você está acessando o sistema apenas para consultas de gestão ou relatórios, clique em "Voltar" e selecione "NÃO (Apenas Visualizar)".
              </p>
            </div>

            {erro && (
              <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px" }}>
                {erro}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setStep(1)}
                disabled={submitting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                ⬅️ Voltar
              </button>
              <button
                onClick={handleConfirmarAssumir}
                disabled={submitting}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#16a34a",
                  color: "#ffffff",
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.3)"
                }}
              >
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px", borderColor: "#ffffff transparent" }}></span>
                    Registrando...
                  </>
                ) : (
                  <>✓ Confirmar e Assumir Escala</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(15, 23, 42, 0.75)",
  backdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 99999,
  padding: "20px"
};

const modalBoxStyle = {
  background: "#ffffff",
  borderRadius: "12px",
  maxWidth: "520px",
  width: "100%",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  padding: "24px",
  border: "1px solid #e2e8f0"
};
