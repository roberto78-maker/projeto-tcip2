import React, { useEffect, useState } from "react";
import { getApreensoes, updateApreensao, destinarIncineracao } from "../services/api.js";

const MEDIA_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const formatarPesoDisplay = (valor, unidade) => {
  if (unidade === "Unid") return `${valor} Unid.`;
  const num = parseFloat(String(valor).replace(",", ".")) || 0;
  if (["Kg", "kg"].includes(unidade)) return `${num.toFixed(3).replace(".", ",")} Kg`;
  if (["Gr", "g"].includes(unidade)) {
    if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${num.toFixed(2).replace(".", ",")} g`;
  }
  return `${num.toFixed(2).replace(".", ",")} ${unidade}`;
};

export default function CofreView() {
  const [apreensoes, setApreensoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("DROGAS"); // DROGAS ou OBJETOS
  const [obsVisivel, setObsVisivel] = useState(null);

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
      await updateApreensao(id, { arquivo_pdf: file });
      alert("Documento anexado com sucesso!");
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao fazer upload.");
    }
  };

  const enviarParaIncineracao = async (id) => {
    try {
      await destinarIncineracao(id);
      alert("Item destinado aos Lotes de Incineracão!");
      carregar();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao destinar para incineração");
    }
  };

  const liberarObjeto = async (id) => {
    if (!window.confirm("Deseja realmente confirmar a LIBERAÇÃO deste objeto do sistema?")) return;
    try {
      await updateApreensao(id, { status: "arquivado" });
      alert("Item liberado e arquivado com sucesso!");
      carregar();
    } catch (e) {
      alert("Erro ao liberar item.");
    }
  };

  // Lógica de Filtragem por Aba e Busca
  const itensFiltrados = apreensoes.filter(a => {
    const combinaBusca = !busca || a.bou.toLowerCase().includes(busca.toLowerCase()) || a.reu.toLowerCase().includes(busca.toLowerCase());
    const ehCofre = a.status === "cofre";
    
    if (abaAtiva === "DROGAS") {
      return ehCofre && a.natureza === "DROGAS" && combinaBusca;
    } else {
      // Objetos Diversos (Natureza SOM ou outros que tenham apreensão)
      return ehCofre && a.natureza !== "DROGAS" && a.tem_apreensao && combinaBusca;
    }
  });

  return (
    <div className="card" style={{ padding: "0", overflow: "hidden" }}>
      {/* Modal de Observação */}
      {obsVisivel && (
        <div style={{ position: "fixed", top:0, left:0, width:"100%", height:"100%", background:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:2000, backdropFilter:"blur(4px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "16px", width: "500px" }}>
            <h3 style={{ marginBottom: "15px" }}>📌 Observação de Entrada</h3>
            <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", marginBottom: "20px", whiteSpace: "pre-wrap" }}>
              {obsVisivel.observacao_cofre || "Nenhuma observação."}
            </div>
            <button className="btn-blue" style={{ width: "100%" }} onClick={() => setObsVisivel(null)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* HEADER E ABAS */}
      <div style={{ padding: "25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>📦 Central de Custódia / Depósito</h2>
            <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>Gerencie entorpecentes e materiais apreendidos separadamente.</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="🔍 Buscar BOU ou Noticiado..."
              value={busca}
              onChange={(e)=>setBusca(e.target.value)}
              style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "250px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "5px" }}>
          <button 
            onClick={() => setAbaAtiva("DROGAS")}
            style={{
              padding: "12px 25px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px",
              background: abaAtiva === "DROGAS" ? "#10b981" : "#e2e8f0",
              color: abaAtiva === "DROGAS" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            💊 ENTORPECENTES (DROGAS)
          </button>
          <button 
            onClick={() => setAbaAtiva("OBJETOS")}
            style={{
              padding: "12px 25px", borderRadius: "8px 8px 0 0", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "13px",
              background: abaAtiva === "OBJETOS" ? "#3b82f6" : "#e2e8f0",
              color: abaAtiva === "OBJETOS" ? "white" : "#475569",
              transition: "all 0.2s"
            }}
          >
            📢 OBJETOS DIVERSOS (SOM/EQUIP.)
          </button>
        </div>
      </div>

      <div style={{ padding: "25px" }}>
        <div className="table-container">
          <table className="tcip-table">
            <thead>
              <tr style={{ background: abaAtiva === "DROGAS" ? "#f0fdf4" : "#eff6ff" }}>
                <th>Entrada</th>
                <th>BOU / Processo</th>
                <th>{abaAtiva === "DROGAS" ? "Drogas / Noticiado" : "Material / Noticiado"}</th>
                <th>Qtd/Peso</th>
                <th style={{ textAlign: "center" }}>OBS.</th>
                <th>Documentos</th>
                <th style={{ textAlign: "right" }}>AÇÕES DE FLUXO</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
                    Nenhum item encontrado nesta categoria.
                  </td>
                </tr>
              )}
              {itensFiltrados.map((item) => {
                const hasPDF = !!item.arquivo_pdf;
                let pdfUrl = item.arquivo_pdf ? (item.arquivo_pdf.startsWith('http') ? item.arquivo_pdf : `${MEDIA_URL}${item.arquivo_pdf}`) : null;
                const hasObs = !!item.observacao_cofre;

                return (
                  <tr key={item.id}>
                    <td style={{ fontSize: "12px" }}>{new Date(item.data_criacao).toLocaleDateString()}</td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.bou}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{item.processo}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: abaAtiva === "DROGAS" ? "#059669" : "#2563eb" }}>{item.substancia}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{item.reu}</div>
                    </td>
                    <td style={{ fontWeight: "600" }}>{formatarPesoDisplay(item.peso, item.unidade)}</td>
                    <td style={{ textAlign: "center" }}>
                      {hasObs ? (
                        <button onClick={() => setObsVisivel(item)} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "15px", cursor: "pointer", fontSize: "10px", padding: "4px 10px" }}>VER</button>
                      ) : "-"}
                    </td>
                    <td>
                      {hasPDF ? (
                        <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", textDecoration: "none" }}>📄 VER PDF</a>
                      ) : (
                        <label style={{ cursor: "pointer", color: "#3b82f6", fontSize: "11px", fontWeight: "700" }}>
                          📎 ANEXAR
                          <input type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => handleFileUpload(item.id, e.target.files[0])} />
                        </label>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {abaAtiva === "DROGAS" ? (
                        <button 
                          className="btn-blue" 
                          onClick={() => enviarParaIncineracao(item.id)}
                          disabled={!hasPDF}
                          style={{ background: hasPDF ? "#8b5cf6" : "#cbd5e1", fontSize: "11px" }}
                        >
                          🔥 INCINERAÇÃO
                        </button>
                      ) : (
                        <button 
                          className="btn-green" 
                          onClick={() => liberarObjeto(item.id)}
                          style={{ background: "#2563eb", fontSize: "11px" }}
                        >
                          📦 LIBERAR / DAR BAIXA
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
    </div>
  );
}
