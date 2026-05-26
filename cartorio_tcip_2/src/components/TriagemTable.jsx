import React, { useState } from "react";
import { gerarOficioEncaminhamentoPdf } from "../services/oficioPdf.js";
import { gerarNumeroOficio, invalidateApreensaoCache } from "../services/api.js";

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

export function TriagemTable({
  itens,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  carregarMais,
  abrirModalDespacho,
  abrirModalExclusao,
}) {
  const [gerandoOficio, setGerandoOficio] = useState(null);
  const [gerandoRecibo, setGerandoRecibo] = useState(null);

  const handleGerarOficio = async (item) => {
    setGerandoOficio(item.id);
    try {
      // 1. Garante que o item tem um número de ofício (gera no backend se necessário)
      const itemAtualizado = await gerarNumeroOficio(item.id);
      
      // 2. Gera o PDF com os dados atualizados
      await gerarOficioEncaminhamentoPdf(itemAtualizado);
      
      // 3. Invalida o cache para que a tabela mostre o número se o usuário atualizar
      invalidateApreensaoCache();
    } catch (err) {
      console.error("Erro ao gerar ofício:", err);
      alert("Erro ao gerar ofício. Tente novamente.");
    } finally {
      setGerandoOficio(null);
    }
  };

  const handleGerarRecibo = async (item) => {
    setGerandoRecibo(item.id);
    try {
      // 1. Busca todas as apreensões com o mesmo BOU
      const materials = await getApreensoesPorBou(item.bou);
      
      if (!materials || materials.length === 0) {
        alert("Nenhum registro encontrado para este BOU.");
        return;
      }

      const firstItem = materials[0];

      // 2. Separa a patente do nome do policial
      const fullPolicial = firstItem.policial || "";
      let patente = "";
      let policial = fullPolicial;
      const sortedPatentes = [...PATENTES].sort((a, b) => b.length - a.length);
      for (const p of sortedPatentes) {
        if (fullPolicial.startsWith(p + " ")) {
          patente = p;
          policial = fullPolicial.slice(p.length + 1);
          break;
        }
      }

      // 3. Reconstrói o formato de dados para gerar o PDF
      const crimes = firstItem.descricao ? firstItem.descricao.split(", ") : [];

      const dados = {
        crimesSelecionados: crimes,
        fielDepositario: false, // Itens na triagem não são fiel depositário
        bou: firstItem.bou,
        vara: firstItem.vara,
        patente: patente || "SD",
        policial: policial || fullPolicial,
        rg: firstItem.rg || "N/A",
        unidadeOrigem: firstItem.unidade_origem || "RPA",
        processo: firstItem.processo,
        materiais: materials.map((m) => ({
          reu: m.reu,
          tipo: m.natureza === "DROGAS" ? "DROGA" : m.natureza === "SOM" ? "SOM" : m.tem_apreensao ? "OBJETO" : "NENHUM",
          substancia: m.substancia,
          peso: m.peso,
          unidadePeso: m.unidade,
          lacre: m.lacre,
        }))
      };

      // 4. Gera o PDF com a assinatura se existir
      await gerarReciboCadastroPdf(dados, firstItem.numero_recibo, firstItem.ano_recibo, firstItem.assinatura_base64);
    } catch (err) {
      console.error("Erro ao gerar recibo:", err);
      alert("Erro ao gerar recibo: " + (err.message || err));
    } finally {
      setGerandoRecibo(null);
    }
  };

  return (
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
                    {item.substancia ? item.substancia.toUpperCase() : "DESCONHECIDA"}
                  </span>
                </td>
                <td style={{ color: "#dc2626", fontWeight: "600" }}>
                  {formatarPesoDisplay(item.peso, item.unidade)}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <button
                      className="btn-oficio"
                      onClick={() => handleGerarOficio(item)}
                      disabled={gerandoOficio === item.id}
                      style={{
                        padding: "8px 12px",
                        border: "none",
                        color: "white",
                        background:
                          gerandoOficio === item.id
                            ? "#9ca3af"
                            : item.numero_oficio
                            ? "#10b981"
                            : "#d97706",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: gerandoOficio === item.id ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        transition: "all 0.2s ease",
                      }}
                      title={
                        item.numero_oficio
                          ? `Ofício nº ${item.numero_oficio}/${item.ano_oficio} já gerado`
                          : "Gerar Ofício de Encaminhamento"
                      }
                    >
                      {gerandoOficio === item.id
                        ? "..."
                        : item.numero_oficio
                        ? "OFÍCIO ✓"
                        : "OFÍCIO"}
                    </button>
                    <button
                      className="btn-recibo"
                      onClick={() => handleGerarRecibo(item)}
                      disabled={gerandoRecibo === item.id}
                      style={{
                        padding: "8px 12px",
                        border: "none",
                        color: "white",
                        background:
                          gerandoRecibo === item.id
                            ? "#9ca3af"
                            : "#2563eb",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: gerandoRecibo === item.id ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        transition: "all 0.2s ease",
                      }}
                      title="Reimprimir Recibo de Objetos Apreendidos"
                    >
                      {gerandoRecibo === item.id ? "..." : "RECIBO"}
                    </button>
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
  );
}

