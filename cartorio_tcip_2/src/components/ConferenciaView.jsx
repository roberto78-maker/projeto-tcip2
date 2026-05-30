import React from "react";
import { useTriagem } from "../hooks/useTriagem.js";
import { TriagemModals } from "./TriagemModals.jsx";
import { TriagemTable } from "./TriagemTable.jsx";

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
    confirmarArquivamento,
  } = useTriagem();

  return (
    <div className="card">
      <TriagemModals
        itemSelecionado={itemSelecionado}
        itemParaExcluir={itemParaExcluir}
        fecharModalDespacho={fecharModalDespacho}
        fecharModalExclusao={fecharModalExclusao}
        confirmarDespacho={confirmarDespacho}
        confirmarExclusao={confirmarExclusao}
      />

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

      <TriagemTable
        itens={itens}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        totalCount={totalCount}
        carregarMais={carregarMais}
        abrirModalDespacho={abrirModalDespacho}
        abrirModalExclusao={abrirModalExclusao}
        confirmarArquivamento={confirmarArquivamento}
      />
    </div>
  );
}
