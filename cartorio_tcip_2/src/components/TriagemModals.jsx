import React, { useState } from "react";
import { createPortal } from "react-dom";
import { verificarPossuiApreensao, obterLocalProcesso, obterNomeOperadorLogado } from "../hooks/useTriagem.js";
import { JUIZADOS } from "../constants/options.js";
import { formatarProcesso } from "../services/cadastroWorkflow.js";

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
                placeholder="0000000-00.0000"
                maxLength={17}
                value={processo}
                onChange={(e) => setProcesso(formatarProcesso(e.target.value))}
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

export function ModalObservacao({ item, onSave, onClose }) {
  const [novaObs, setNovaObs] = useState("");
  const [textoCompleto, setTextoCompleto] = useState(item.observacao_cofre || "");
  const [modoEdicaoCompleta, setModoEdicaoCompleta] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const localProcesso = obterLocalProcesso(item);
  const operadorNome = obterNomeOperadorLogado();
  const dtAtual = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const handleSalvar = async () => {
    if (!modoEdicaoCompleta && (!novaObs || !novaObs.trim())) {
      alert("⚠️ Por favor, digite o texto da nova observação antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      if (modoEdicaoCompleta) {
        await onSave(textoCompleto, true);
      } else {
        await onSave(novaObs.trim(), false);
      }
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
          padding: "24px",
          borderRadius: "16px",
          width: "550px",
          maxWidth: "92vw",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px", fontSize: "17px" }}>
          📝 Observação de Acompanhamento
        </h3>
        <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px 0" }}>
          <strong>BOU {item.bou}</strong> — {item.reu || "Noticiado não informado"}
        </p>

        {/* HISTÓRICO EXISTENTE */}
        {item.observacao_cofre && !modoEdicaoCompleta && (
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569" }}>
                📋 HISTÓRICO REGISTRADO:
              </label>
              <button
                type="button"
                onClick={() => {
                  setTextoCompleto(item.observacao_cofre || "");
                  setModoEdicaoCompleta(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                ✏️ Editar histórico completo
              </button>
            </div>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "10px 12px",
                maxHeight: "140px",
                overflowY: "auto",
                fontSize: "12px",
                color: "#334155",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5",
              }}
            >
              {item.observacao_cofre}
            </div>
          </div>
        )}

        {/* MODO ADIÇÃO DE NOVA OBSERVAÇÃO */}
        {!modoEdicaoCompleta ? (
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "#1e3a8a",
                marginBottom: "6px",
              }}
            >
              ➕ NOVA OBSERVAÇÃO / ANDAMENTO:
            </label>
            <textarea
              style={{
                width: "100%",
                height: "85px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
              placeholder="Descreva o que foi tratado, providências tomadas ou andamento do processo..."
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              autoFocus
            />
            {/* CARIMBO PREVIEW */}
            <div
              style={{
                marginTop: "6px",
                padding: "8px 10px",
                background: "#e0f2fe",
                borderRadius: "6px",
                border: "1px solid #bae6fd",
                fontSize: "11px",
                color: "#0369a1",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🏷️</span>
              <span>
                Carimbo automático ao salvar: <strong>[ {dtAtual} | LOCAL: {localProcesso} | OPERADOR: {operadorNome} ]</strong>
              </span>
            </div>
          </div>
        ) : (
          /* MODO EDIÇÃO COMPLETA MANUAL */
          <div style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#d97706",
                }}
              >
                ✏️ EDIÇÃO DIRETA DO HISTÓRICO COMPLETO:
              </label>
              <button
                type="button"
                onClick={() => setModoEdicaoCompleta(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                ⬅️ Voltar para inserção rápida
              </button>
            </div>
            <textarea
              style={{
                width: "100%",
                height: "160px",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #f59e0b",
                fontSize: "12px",
                fontFamily: "inherit",
              }}
              value={textoCompleto}
              onChange={(e) => setTextoCompleto(e.target.value)}
            />
            <p style={{ fontSize: "11px", color: "#b45309", margin: "4px 0 0 0" }}>
              ⚠️ Neste modo, as alterações substituirão todo o texto do histórico diretamente.
            </p>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
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
            {salvando ? "SALVANDO..." : "💾 SALVAR OBSERVAÇÃO COM CARIMBO"}
          </button>
          <button
            className="btn-outline-gray"
            style={{
              padding: "12px 18px",
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

