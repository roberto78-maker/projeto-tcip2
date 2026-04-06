import React, { useState } from "react";
import { useTriagem } from "../hooks/useTriagem.js";

const formatarPesoDisplay = (valor, unidade) => {
  const num = parseFloat(String(valor).replace(",", ".")) || 0;

  if (["Kg", "kg"].includes(unidade)) {
    return `${num.toFixed(3).replace(".", ",")} Kg`;
  }

  if (["Gr", "g"].includes(unidade)) {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
    }

    return `${num.toFixed(2).replace(".", ",")} g`;
  }

  if (["Mg", "mg"].includes(unidade)) {
    return `${num.toFixed(2).replace(".", ",")} mg`;
  }

  return `${num} ${unidade}`;
};

const ModalDespacho = ({ item, onConfirm, onClose }) => {
  const [obs, setObs] = useState("");

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
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          width: "450px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: "15px", color: "#1e3a8a" }}>
          Confirmar Entrada no Deposito
        </h3>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          Voce esta confirmando a entrada do material do <strong>BOU {item.bou}</strong> no
          deposito de custodia.
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
            OBSERVACOES DE ENTRADA (OPCIONAL)
          </label>
          <textarea
            style={{
              width: "100%",
              height: "100px",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
            }}
            placeholder="Algum detalhe sobre o lacre ou peso real..."
            value={obs}
            onChange={(event) => setObs(event.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-green" style={{ flex: 1 }} onClick={() => onConfirm(obs)}>
            CONFIRMAR DESPACHO PARA O DEPOSITO
          </button>
          <button className="btn-blue" style={{ background: "#94a3b8" }} onClick={onClose}>
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalExclusao = ({ item, onConfirm, onClose }) => {
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
          background: "white",
          padding: "30px",
          borderRadius: "16px",
          width: "450px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
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
};

export default function ConferenciaView() {
  const {
    busca,
    itemSelecionado,
    itemParaExcluir,
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    erro,
    carregarMais,
    handleBuscaChange,
    abrirModalDespacho,
    fecharModalDespacho,
    abrirModalExclusao,
    fecharModalExclusao,
    confirmarDespacho,
    confirmarExclusao,
  } = useTriagem();

  return (
    <div className="card">
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

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h2 className="card-title">Triagem e Entrada no Deposito</h2>
        <span className="badge" style={{ background: "#ef4444", color: "white" }}>
          {totalCount !== null ? `${totalCount} ITENS PENDENTES` : "CARREGANDO..."}
        </span>
      </div>
      <p
        className="card-title-sub"
        style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}
      >
        Materiais aguardando triagem oficial e armazenamento fisico.
      </p>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="Buscar por No BOU ou Noticiado..."
          value={busca}
          onChange={(event) => handleBuscaChange(event.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
          }}
        />
      </div>

      {erro && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          {erro}
        </div>
      )}

      <div className="table-container">
        <table className="tcip-table">
          <thead style={{ background: "#111827", color: "white" }}>
            <tr>
              <th style={{ color: "white", border: "none" }}>DATA REGISTRO</th>
              <th style={{ color: "white", border: "none" }}>BOU / ANO</th>
              <th style={{ color: "white", border: "none" }}>NOTICIADO</th>
              <th style={{ color: "white", border: "none" }}>SUBSTANCIA</th>
              <th style={{ color: "white", border: "none" }}>PESO EST. (G)</th>
              <th style={{ color: "white", border: "none", textAlign: "right" }}>ACAO</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Carregando registros...
                </td>
              </tr>
            )}
            {!loading && itens.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Nenhum material pendente de triagem.
                </td>
              </tr>
            )}
            {!loading &&
              itens.map((item) => (
                <tr key={item.id}>
                  <td style={{ color: "#64748b" }}>
                    {item.dataFato || new Date(item.data_criacao).toLocaleDateString()}
                  </td>
                  <td style={{ fontWeight: "600", color: "#0f172a" }}>{item.bou}</td>
                  <td style={{ textTransform: "uppercase" }}>{item.reu || "NAO INFORMADO"}</td>
                  <td>
                    <span className="badge" style={{ background: "#0ea5e9", color: "white" }}>
                      {item.substancia || "Desconhecida"}
                    </span>
                  </td>
                  <td style={{ color: "#dc2626", fontWeight: "600" }}>
                    {formatarPesoDisplay(item.peso, item.unidade)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button className="btn-green" onClick={() => abrirModalDespacho(item)}>
                        TRIAR
                      </button>
                      <button
                        className="btn-outline-red"
                        onClick={() => abrirModalExclusao(item)}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #fee2e2",
                          color: "#ef4444",
                          background: "#fef2f2",
                          borderRadius: "6px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        EXCLUIR
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {(hasMore || loadingMore) && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <button
              onClick={carregarMais}
              disabled={loadingMore}
              style={{
                padding: "10px 30px",
                borderRadius: "8px",
                border: "2px solid #ef4444",
                background: "white",
                color: "#ef4444",
                fontWeight: "700",
                cursor: loadingMore ? "not-allowed" : "pointer",
                opacity: loadingMore ? 0.6 : 1,
              }}
            >
              {loadingMore
                ? "Carregando..."
                : `Carregar mais itens (${totalCount - itens.length} restantes)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
