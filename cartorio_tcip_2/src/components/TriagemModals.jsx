import React, { useState } from "react";
import { verificarPossuiApreensao } from "../hooks/useTriagem.js";

function ModalDespacho({ item, onConfirm, onClose }) {
  const [obs, setObs] = useState("");
  const temApreensao = verificarPossuiApreensao(item);

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
          padding: "30px",
          borderRadius: "12px",
          width: "480px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ marginBottom: "15px", color: temApreensao ? "#1e3a8a" : "#0f766e" }}>
          {temApreensao ? "📦 Confirmar Entrada no Depósito" : "📁 Confirmar Triagem e Arquivamento"}
        </h3>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px", lineHeight: "1.5" }}>
          {temApreensao ? (
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
            {temApreensao ? "OBSERVAÇÕES DE ENTRADA (OPCIONAL)" : "OBSERVAÇÕES DE ARQUIVAMENTO (OPCIONAL)"}
          </label>
          <textarea
            style={{
              width: "100%",
              height: "90px",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
            }}
            placeholder={
              temApreensao
                ? "Algum detalhe sobre o lacre, peso real ou acondicionamento..."
                : "Observação opcional sobre o arquivamento do termo..."
            }
            value={obs}
            onChange={(event) => setObs(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="btn-green"
            style={{
              flex: 1,
              background: temApreensao ? "#10b981" : "#0d9488",
            }}
            onClick={() => onConfirm(obs)}
          >
            {temApreensao ? "CONFIRMAR DESPACHO PARA O DEPÓSITO" : "CONFIRMAR ARQUIVAMENTO"}
          </button>
          <button className="btn-blue" style={{ background: "#94a3b8" }} onClick={onClose}>
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
  fecharModalDespacho,
  fecharModalExclusao,
  confirmarDespacho,
  confirmarExclusao,
}) {
  return (
    <>
      {itemSelecionado && (
        <ModalDespacho
          item={itemSelecionado}
          onClose={fecharModalDespacho}
          onConfirm={confirmarDespacho}
        />
      )}

      {itemParaExcluir && (
        <ModalExclusao
          item={itemParaExcluir}
          onClose={fecharModalExclusao}
          onConfirm={confirmarExclusao}
        />
      )}
    </>
  );
}
