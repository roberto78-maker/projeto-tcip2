import React, { useEffect, useState } from "react";
import { getApreensoes, updateApreensao } from "../services/api.js";

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

// Modal Simples para Despacho
const ModalDespacho = ({ item, onConfirm, onClose }) => {
  const [obs, setObs] = useState("");

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
    }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "12px", width: "450px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginBottom: "15px", color: "#1e3a8a" }}>📦 Confirmar Entrada no Cofre</h3>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          Você está confirmando a entrada do material do <strong>BOU {item.bou}</strong> no cofre de custódia.
        </p>
        
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "#475569" }}>
            OBSERVAÇÕES DE ENTRADA (OPCIONAL)
          </label>
          <textarea 
            style={{ width: "100%", height: "100px", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            placeholder="Algum detalhe sobre o lacre ou peso real..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn-green" style={{ flex: 1 }} onClick={() => onConfirm(obs)}>
            CONFIRME DESPACHO PARA O COFRE
          </button>
          <button className="btn-blue" style={{ background: "#94a3b8" }} onClick={onClose}>
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ConferenciaView() {
  const [apreensoes, setApreensoes] = useState([]);
  const [busca, setBusca] = useState("");
  const [itemSelecionado, setItemSelecionado] = useState(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const data = await getApreensoes({ status: "conferencia", fetchAll: true });
      setApreensoes(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function confirmarDespacho(observacao) {
    if (!itemSelecionado) return;
    try {
      await updateApreensao(itemSelecionado.id, {
        ...itemSelecionado,
        status: "cofre",
        observacao_cofre: observacao
      });
      setItemSelecionado(null);
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao despachar item.");
    }
  }

  const itensConferencia = apreensoes.filter(
    (item) =>
      item.status === "conferencia" &&
      item.bou &&
      item.bou.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="card">
      {itemSelecionado && (
        <ModalDespacho 
          item={itemSelecionado} 
          onClose={() => setItemSelecionado(null)} 
          onConfirm={confirmarDespacho} 
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h2 className="card-title">Conferência e Entrada no Cofre</h2>
        <span className="badge" style={{ background: "#ef4444", color: "white" }}>{itensConferencia.length} ITENS PENDENTES</span>
      </div>
      <p className="card-subtitle">Materiais aguardando pesagem oficial e armazenamento físico.</p>

      <div style={{ marginBottom: "20px" }}>
        <input
          placeholder="🔍 Buscar por Nº BOU..."
          value={busca}
          onChange={(e)=>setBusca(e.target.value)}
          style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
        />
      </div>

      <div className="table-container">
        <table className="tcip-table">
          <thead style={{ background: "#111827", color: "white" }}>
            <tr>
              <th style={{ color: "white", border: "none" }}>DATA REGISTRO</th>
              <th style={{ color: "white", border: "none" }}>BOU / ANO</th>
              <th style={{ color: "white", border: "none" }}>NOTICIADO</th>
              <th style={{ color: "white", border: "none" }}>SUBSTÂNCIA</th>
              <th style={{ color: "white", border: "none" }}>PESO EST. (G)</th>
              <th style={{ color: "white", border: "none", textAlign: "right" }}>AÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {itensConferencia.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Nenhum material pendente de conferência.
                </td>
              </tr>
            )}
            {itensConferencia.map((item) => (
              <tr key={item.id}>
                <td style={{ color: "#64748b" }}>{item.dataFato || new Date(item.data_criacao).toLocaleDateString()}</td>
                <td style={{ fontWeight: "600", color: "#0f172a" }}>{item.bou}</td>
                <td>{item.reu || "NÃO INFORMADO"}</td>
                <td>
                  <span className="badge" style={{ background: "#0ea5e9", color: "white" }}>
                    {item.substancia || "Desconhecida"}
                  </span>
                </td>
                <td style={{ color: "#dc2626", fontWeight: "600" }}>{item.peso} {item.unidade}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn-green" onClick={() => setItemSelecionado(item)}>
                    📦 CONFERIR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}