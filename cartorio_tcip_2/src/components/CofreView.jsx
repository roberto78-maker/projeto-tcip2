import React, { useEffect, useState } from "react";
import { getApreensoes, updateApreensao, destinarIncineracao } from "../services/api.js";

// Pegar URL Base para Mídia
const MEDIA_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Formata peso com unidade inteligente
const formatarPesoDisplay = (valor, unidade) => {
  const num = parseFloat(String(valor).replace(",", ".")) || 0;
  if (["Kg", "kg"].includes(unidade)) return `${num.toFixed(3).replace(".", ",")} Kg`;
  if (["Gr", "g"].includes(unidade)) {
    if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${num.toFixed(2).replace(".", ",")} g`;
  }
  if (["Mg", "mg"].includes(unidade)) return `${num.toFixed(2).replace(".", ",")} mg`;
  return `${num} ${unidade}`;
};

export default function CofreView() {
  const [apreensoes, setApreensoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [obsVisivel, setObsVisivel] = useState(null); // Armazena o item para ver a observação

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const data = await getApreensoes({ status: "cofre", fetchAll: true });
      setApreensoes(data);
    } catch (e) {
      console.error(e);
    }
  }

  const handleFileUpload = async (id, file) => {
    if (!file) return;
    try {
      // Envia o arquivo PDF para o campo arquivo_pdf do backend
      await updateApreensao(id, { arquivo_pdf: file });
      alert("PDF anexado com sucesso!");
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao fazer upload do PDF.");
    }
  };

  const enviarParaIncineracao = async (id) => {
    try {
      await destinarIncineracao(id);
      alert("Item destinado aos Lotes de Incineração!");
      carregar();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao destinar para incineração");
    }
  };

  const itens = apreensoes.filter(a => 
    a.status === "cofre" && (!busca || a.bou.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="card">
      {/* Modal para Visualizar Observação */}
      {obsVisivel && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "16px", width: "500px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
              <span style={{ fontSize: "24px", marginRight: "12px" }}>📝</span>
              <h3 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>Observação de Entrada</h3>
            </div>
            
            <div style={{ marginBottom: "25px" }}>
              <p style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                BOU/ANO: {obsVisivel.bou}
              </p>
              <div style={{ 
                background: "#f8fafc", 
                padding: "20px", 
                borderRadius: "12px", 
                border: "1px solid #e2e8f0",
                color: "#334155",
                fontSize: "15px",
                lineHeight: "1.6",
                minHeight: "100px",
                whiteSpace: "pre-wrap"
              }}>
                {obsVisivel.observacao_cofre || "Nenhuma observação registrada."}
              </div>
            </div>

            <button 
              className="btn-blue" 
              style={{ width: "100%", padding: "12px", borderRadius: "10px", fontWeight: "600" }} 
              onClick={() => setObsVisivel(null)}
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ fontSize: "24px", marginRight: "10px", color: "#10b981" }}>🗄️</span>
          <h2 className="card-title" style={{ margin: 0 }}>Itens em Custódia (Cofre)</h2>
        </div>
        <span className="badge" style={{ background: "#ef4444", color: "white" }}>{itens.length} ITENS NO COFRE</span>
      </div>
      <p className="card-subtitle">Materiais aguardando autorização judicial para incineração.</p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          placeholder="🔍 Buscar por Nº BOU..."
          value={busca}
          onChange={(e)=>setBusca(e.target.value)}
          style={{ flex: 1, padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
        />
      </div>

      <div className="table-container">
        <table className="tcip-table">
          <thead>
            <tr>
              <th>Data Entrada</th>
              <th>BOU</th>
              <th>Material / Noticiado</th>
              <th>Peso Real</th>
              <th style={{ textAlign: "center" }}>OBSERVAÇÃO</th>
              <th>PDF / Autorização</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Nenhum material no cofre.
                </td>
              </tr>
            )}
            {itens.map((item) => {
              const hasPDF = !!item.arquivo_pdf;
              const pdfUrl = item.arquivo_pdf ? (item.arquivo_pdf.startsWith('http') ? item.arquivo_pdf : `${MEDIA_URL.endsWith('/') ? MEDIA_URL.slice(0, -1) : MEDIA_URL}${item.arquivo_pdf.startsWith('/') ? '' : '/'}${item.arquivo_pdf}`) : null;
              const hasObs = !!item.observacao_cofre;

              return (
                <tr key={item.id}>
                  <td style={{ color: "#64748b" }}>{new Date(item.data_criacao).toLocaleDateString()}</td>
                  <td style={{ fontWeight: "600", color: "#059669" }}>{item.bou}</td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span className="badge" style={{ background: "#e2e8f0", color: "#475569", width: "fit-content" }}>{item.substancia}</span>
                      <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>{item.reu || "NÃO IDENTIFICADO"}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: "600" }}>{formatarPesoDisplay(item.peso, item.unidade)}</td>
                  
                  {/* Nova Coluna OBSERVACAO */}
                  <td style={{ textAlign: "center" }}>
                    {hasObs ? (
                      <button 
                        onClick={() => setObsVisivel(item)}
                        title="Ver Observação"
                        style={{ 
                          background: "#f1f5f9", 
                          border: "1px solid #e2e8f0", 
                          cursor: "pointer", 
                          fontSize: "14px",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "#1e293b",
                          fontWeight: "600",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#e2e8f0";
                          e.currentTarget.style.transform = "scale(1.05)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "#f1f5f9";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        ✅ <span style={{ fontSize: "11px" }}>VER</span>
                      </button>
                    ) : (
                      <span style={{ color: "#cbd5e1", fontSize: "18px" }}>-</span>
                    )}
                  </td>

                  <td>
                    {hasPDF ? (
                      <a 
                        href={pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="badge badge-outline-green" 
                        style={{ cursor: "pointer", textDecoration: "none" }}
                      >
                        📄 VISUALIZAR PDF
                      </a>
                    ) : (
                      <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px", color: "#3b82f6", fontSize: "13px", fontWeight: "600" }}>
                        📎 ANEXAR PDF
                        <input 
                          type="file" 
                          accept="application/pdf" 
                          style={{ display: "none" }} 
                          onChange={(e) => handleFileUpload(item.id, e.target.files[0])} 
                        />
                      </label>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {hasPDF && (
                      <button 
                         className="btn-blue" 
                         onClick={() => enviarParaIncineracao(item.id)}
                         style={{ background: "#8b5cf6" }} // Roxo para distinguir
                      >
                        🔥 DESTINAR INCINERAÇÃO
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}