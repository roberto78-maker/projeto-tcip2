import React from "react";
import { useTriagem } from "../hooks/useTriagem.js";
import { TriagemModals } from "./TriagemModals.jsx";
import { TriagemTable } from "./TriagemTable.jsx";

export default function ConferenciaView() {
  const {
    abaAtiva,
    setAbaAtiva,
    busca,
    itemSelecionado,
    itemParaExcluir,
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    totalPendencias,
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
    handleFileUpload,
    handleRemoverPdf,
  } = useTriagem();

  const corAba = abaAtiva === "CORRETOS" ? "#3b82f6" : "#ef4444";

  return (
    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
      <TriagemModals
        itemSelecionado={itemSelecionado}
        itemParaExcluir={itemParaExcluir}
        fecharModalDespacho={fecharModalDespacho}
        fecharModalExclusao={fecharModalExclusao}
        confirmarDespacho={confirmarDespacho}
        confirmarExclusao={confirmarExclusao}
      />

      {/* Header */}
      <div style={{ padding: "25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>⚖️ Triagem e Entrada no Depósito</h2>
            <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              {abaAtiva === "CORRETOS"
                ? "Materiais aguardando triagem oficial e armazenamento físico."
                : "Pendências de erro de data aguardando ofício de justificativa para arquivamento."
              }
              {totalCount !== null && !loading && (
                <span style={{ marginLeft: "12px", fontWeight: "600", color: corAba }}>
                  {itens.length} de {totalCount} registro{totalCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="🔍 Buscar por Nº BOU ou Noticiado..."
              value={busca}
              onChange={(event) => handleBuscaChange(event.target.value)}
              style={{
                padding: "10px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                width: "290px"
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "5px" }}>
          {[
            {
              id: "CORRETOS",
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚖️ PROCESSOS</span>
                </div>
              ),
              corActiveBg: "#3b82f6",
              corActiveText: "white",
              corInactiveBg: "#e2e8f0",
              corInactiveText: "#475569"
            },
            {
              id: "PENDENCIAS",
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚠️ PENDÊNCIAS</span>
                  {totalPendencias > 0 && (
                    <span
                      style={{
                        background: abaAtiva === "PENDENCIAS" ? "white" : "#ef4444",
                        color: abaAtiva === "PENDENCIAS" ? "#ef4444" : "white",
                        borderRadius: "10px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: "800",
                        lineHeight: "1",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      }}
                    >
                      {totalPendencias}
                    </span>
                  )}
                </div>
              ),
              corActiveBg: "#ef4444",
              corActiveText: "white",
              corInactiveBg: "#fee2e2",
              corInactiveText: "#b91c1c"
            },
          ].map(({ id, label, corActiveBg, corActiveText, corInactiveBg, corInactiveText }) => (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              style={{
                padding: "12px 25px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "13px",
                transition: "all 0.2s",
                background: abaAtiva === id ? corActiveBg : corInactiveBg,
                color: abaAtiva === id ? corActiveText : corInactiveText,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "25px" }}>
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
          handleFileUpload={handleFileUpload}
          handleRemoverPdf={handleRemoverPdf}
        />
      </div>
    </div>
  );
}
