import React, { useState } from "react";
import { createPortal } from "react-dom";
import { verificarPossuiApreensao } from "../hooks/useTriagem.js";
import { JUIZADOS } from "../constants/options.js";

function ModalDespacho({ item, onConfirm, onMoverPendencia, onClose }) {
  const [obs, setObs] = useState("");
  const isProcessoErro = item.processo === "(ERRO - DATA DE AUDIENCIA)" || (item.processo && item.processo.includes("ERRO"));
  const isVaraErro = item.vara === "OUTROS JUIZADOS - ERRO MATERIAL" || (item.vara && item.vara.includes("ERRO MATERIAL"));
  
  const [processo, setProcesso] = useState(isProcessoErro ? "" : item.processo || "");
  const [vara, setVara] = useState(
    isVaraErro || !item.vara ? "1º JUIZADO ESPECIAL CRIMINAL" : item.vara
  );

  const temApreensao = verificarPossuiApreensao(item);
  const isPendencia =
    isProcessoErro ||
    isVaraErro ||
    !!item.is_pendencia;
  const temDoc = !!item.numero_oficio || !!item.arquivo_pdf_url;

  const handleConfirmar = () => {
    if (isPendencia && !temDoc && (!obs || !obs.trim())) {
      alert(
        "⚠️ Como este registro possui uma pendência e não tem ofício/PDF anexado, é OBRIGATÓRIO informar uma observação explicando como o problema foi resolvido antes de confirmar."
      );
      return;
    }

    if (isPendencia || isProcessoErro || isVaraErro) {
      if (!processo || !processo.trim() || processo.includes("ERRO")) {
        alert("⚠️ Por favor, informe o número do Processo real (PROJUDI) para sanar a pendência.");
        return;
      }
      if (!vara || !vara.trim() || vara.includes("ERRO MATERIAL")) {
        alert("⚠️ Por favor, selecione o Juizado de destino correto (1º, 2º ou 3º) para sanar a pendência.");
        return;
      }
    }

    onConfirm(obs, { processo: processo.trim(), vara });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#dbe4ee",
          border: "1px solid #94a3b8",
          padding: "25px",
          borderRadius: "14px",
          width: "520px",
          maxWidth: "92vw",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ marginBottom: "12px", color: isPendencia ? "#d97706" : temApreensao ? "#1e3a8a" : "#0f766e", fontSize: "17px" }}>
          {isPendencia
            ? "⚠️ Resolver Pendência e Confirmar Triagem"
            : temApreensao
            ? "📦 Confirmar Entrada no Depósito / Triagem"
            : "📁 Confirmar Triagem e Arquivamento"}
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px", lineHeight: "1.4" }}>
          {isPendencia ? (
            <>
              Você está resolvendo a pendência do <strong>BOU {item.bou}</strong>.
              {!temDoc && (
                <span style={{ display: "block", color: "#b45309", marginTop: "4px", fontWeight: "600" }}>
                  Caso este caso não dependa de ofício, descreva a solução e complete o Processo/Juizado abaixo.
                </span>
              )}
            </>
          ) : temApreensao ? (
            <>
              Você está confirmando a entrada do material do <strong>BOU {item.bou}</strong> (
              <strong style={{ color: "#0284c7" }}>
                {item.substancia ? item.substancia.toUpperCase() : "MATERIAL APREENDIDO"}
              </strong>
              ) no depósito de custódia.
            </>
          ) : (
            <>
              O procedimento do <strong>BOU {item.bou}</strong> não possui materiais apreendidos. A triagem realizará o <strong>arquivamento definitivo</strong> do registro.
            </>
          )}
        </p>

        {(isPendencia || isProcessoErro || isVaraErro) && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              padding: "14px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "12px", color: "#b45309", marginBottom: "10px" }}>
              ✏️ RETIFICAÇÃO DOS DADOS DO PROCESSO E JUIZADO
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#78350f", marginBottom: "4px" }}>
                NÚMERO DO PROCESSO REAL (PROJUDI):
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "white",
                  fontWeight: "600",
                }}
                placeholder="Informe o nº real do PROJUDI (ex: 0012345-67.2026.8.16.0021)"
                value={processo}
                onChange={(e) => setProcesso(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#78350f", marginBottom: "4px" }}>
                JUIZADO DE DESTINO (VARA):
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  background: "white",
                  fontWeight: "600",
                }}
                value={vara}
                onChange={(e) => setVara(e.target.value)}
              >
                {JUIZADOS.filter((j) => !j.includes("ERRO MATERIAL")).map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: "700",
              marginBottom: "6px",
              color: isPendencia && !temDoc ? "#b45309" : "#475569",
            }}
          >
            {isPendencia && !temDoc
              ? "OBSERVAÇÃO DA RESOLUÇÃO DA PENDÊNCIA (OBRIGATÓRIO)"
              : "OBSERVAÇÕES DA TRIAGEM OU MOTIVO DO ERRO (SE PENDÊNCIA)"}
          </label>
          <textarea
            style={{
              width: "100%",
              height: "75px",
              padding: "10px",
              borderRadius: "6px",
              border: isPendencia && !temDoc ? "1px solid #f59e0b" : "1px solid #cbd5e1",
              fontSize: "13px",
              fontFamily: "inherit",
            }}
            placeholder={
              isPendencia && !temDoc
                ? "Descreva como a pendência foi averiguada e resolvida para liberar o despacho..."
                : "Detalhes de entrada ou descreva o erro constatado se for mover para a aba Pendências..."
            }
            value={obs}
            onChange={(event) => setObs(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="btn-green"
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "13px",
              fontWeight: "700",
              background: isPendencia ? "#d97706" : temApreensao ? "#10b981" : "#0d9488",
              borderRadius: "8px",
            }}
            onClick={handleConfirmar}
          >
            {isPendencia
              ? "✅ RESOLVER PENDÊNCIA E CONFIRMAR DESPACHO"
              : temApreensao
              ? "📦 CONFIRMAR DESPACHO PARA O DEPÓSITO"
              : "📁 CONFIRMAR ARQUIVAMENTO"}
          </button>

          {!isPendencia && (
            <button
              className="btn-warning"
              style={{
                width: "100%",
                padding: "11px",
                fontSize: "12px",
                fontWeight: "700",
                background: "#d97706",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={() => onMoverPendencia(obs)}
              title="Mover registro para a aba Pendências para averiguação do erro"
            >
              ⚠️ CONSTATADO ERRO - MOVER PARA PENDÊNCIAS
            </button>
          )}

          <button
            className="btn-blue"
            style={{
              width: "100%",
              padding: "10px",
              fontSize: "12px",
              background: "#94a3b8",
              borderRadius: "8px",
            }}
            onClick={onClose}
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalExclusao({ item, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#dbe4ee",
          border: "1px solid #94a3b8",
          padding: "30px",
          borderRadius: "16px",
          width: "450px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
        }}
      >
        <h3
          style={{
            marginBottom: "15px",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          Cancelar Registro (Excluir)
        </h3>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          Voce esta prestes a excluir o registro do <strong>BOU {item.bou}</strong>. Esta
          acao ficara registrada na auditoria.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "700",
              marginBottom: "8px",
              color: "#475569",
            }}
          >
            MOTIVO DA EXCLUSAO / CANCELAMENTO
          </label>
          <textarea
            style={{
              width: "100%",
              height: "100px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
            }}
            placeholder="Descreva obrigatoriamente o motivo..."
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="btn-red"
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              fontWeight: "600",
              opacity: motivo.trim().length < 5 ? 0.5 : 1,
            }}
            onClick={() => onConfirm(motivo)}
            disabled={motivo.trim().length < 5}
          >
            CONFIRMAR EXCLUSAO
          </button>
          <button
            className="btn-outline-gray"
            style={{
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              color: "#64748b",
              fontWeight: "600",
            }}
            onClick={onClose}
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}

export function TriagemModals({
  itemSelecionado,
  itemParaExcluir,
  itemObservacao,
  fecharModalDespacho,
  fecharModalExclusao,
  fecharModalObservacao,
  confirmarDespacho,
  marcarComoPendente,
  confirmarExclusao,
  salvarObservacao,
}) {
  if (!itemSelecionado && !itemParaExcluir && !itemObservacao) {
    return null;
  }

  const content = (
    <>
      {itemSelecionado && (
        <ModalDespacho
          item={itemSelecionado}
          onClose={fecharModalDespacho}
          onConfirm={confirmarDespacho}
          onMoverPendencia={marcarComoPendente}
        />
      )}

      {itemParaExcluir && (
        <ModalExclusao
          item={itemParaExcluir}
          onClose={fecharModalExclusao}
          onConfirm={confirmarExclusao}
        />
      )}

      {itemObservacao && (
        <ModalObservacao
          item={itemObservacao}
          onClose={fecharModalObservacao}
          onSave={salvarObservacao}
        />
      )}
    </>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}

function ModalObservacao({ item, onSave, onClose }) {
  const [texto, setTexto] = useState(item.observacao_cofre || "");
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await onSave(texto);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "#dbe4ee",
          border: "1px solid #94a3b8",
          padding: "30px",
          borderRadius: "16px",
          width: "520px",
          maxWidth: "90vw",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ marginBottom: "5px", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "10px" }}>
          📝 Observação de Acompanhamento
        </h3>
        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
          <strong>BOU {item.bou}</strong> — {item.reu || "Noticiado não informado"}
        </p>

        <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#475569",
            }}
          >
            REGISTRO DE PROVIDÊNCIAS / AUDITORIA
          </label>
          {item.observacao_cofre && (
            <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "600" }}>
              ✓ Observação existente
            </span>
          )}
        </div>
        <textarea
          style={{
            width: "100%",
            height: "130px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            fontSize: "13px",
            resize: "vertical",
            fontFamily: "inherit",
          }}
          placeholder="Descreva o que foi tratado, as providências tomadas e o andamento do processo para fins de auditoria..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px", marginBottom: "20px" }}>
          Esta observação ficará visível na Busca Processual (Radar) para consulta de auditoria.
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="btn-blue"
            style={{
              flex: 1,
              padding: "12px",
              fontWeight: "700",
              borderRadius: "8px",
              opacity: salvando ? 0.6 : 1,
            }}
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? "SALVANDO..." : "💾 SALVAR OBSERVAÇÃO"}
          </button>
          <button
            className="btn-outline-gray"
            style={{
              padding: "12px 20px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              color: "#64748b",
              fontWeight: "600",
            }}
            onClick={onClose}
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}

