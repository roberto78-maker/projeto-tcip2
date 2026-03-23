import React, { useEffect, useState } from "react";
import { getApreensoes } from "../services/storage.js";

function HistoricoView() {

  const [apreensoes, setApreensoes] = useState([]);

  useEffect(() => {
    setApreensoes(getApreensoes());
  }, []);

  // 🔥 monta histórico corretamente
  const historico = apreensoes.flatMap(item =>
    (item.historico || []).map(h => ({
      ...h,
      bou: item.bou,
      processo: item.processo
    }))
  );

  // 🔥 ordena do mais recente para o mais antigo
  historico.sort((a, b) => new Date(b.data) - new Date(a.data));

  // 🔥 padrão visual
  const tableStyle = {
    width: "100%",
    marginTop: "20px",
    borderCollapse: "collapse",
    background: "white",
    borderRadius: "8px",
    overflow: "hidden"
  };

  const thStyle = {
    padding: "12px",
    background: "#e5e7eb",
    textAlign: "left",
    borderBottom: "2px solid #ddd"
  };

  const tdStyle = {
    padding: "12px",
    borderBottom: "1px solid #eee"
  };

  return (
    <div style={{
      background: "white",
      padding: "20px",
      borderRadius: "10px",
      border: "1px solid #ddd"
    }}>

      <h2>Histórico de Movimentações</h2>

      <table style={tableStyle}>

        <thead>
          <tr>
            <th style={thStyle}>PROCESSO</th>
            <th style={thStyle}>BOU</th>
            <th style={thStyle}>STATUS</th>
            <th style={thStyle}>DATA</th>
          </tr>
        </thead>

        <tbody>

          {historico.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", padding: "15px" }}>
                Nenhuma movimentação registrada
              </td>
            </tr>
          )}

          {historico.map((h, i) => (
            <tr key={i}>
              <td style={tdStyle}>{h.processo}</td>
              <td style={tdStyle}>{h.bou}</td>
              <td style={tdStyle}>{h.status}</td>
              <td style={tdStyle}>
                {new Date(h.data).toLocaleString()}
              </td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

export default HistoricoView;