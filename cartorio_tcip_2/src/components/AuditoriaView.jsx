import React, { useState, useEffect } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import { getRelatorioIncineracao, downloadRelatorioPdf } from "../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function AuditoriaView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
    vara: "",
    substancia: ""
  });

  const buscarRelatorio = async () => {
    setLoading(true);
    try {
      const res = await getRelatorioIncineracao(filtros);
      setData(res);
    } catch (e) {
      alert("Erro ao buscar relatório");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarRelatorio();
  }, []);

  const handleDownload = async () => {
    try {
      await downloadRelatorioPdf(filtros);
    } catch (e) {
      alert("Erro ao baixar PDF");
    }
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  if (!data && loading) return <div style={{ padding: "20px" }}>Carregando dados da auditoria...</div>;
  if (!data) return null;

  // Render Charts
  const pieData = {
    labels: data.por_substancia.map(s => s.nome),
    datasets: [{
      data: data.por_substancia.map(s => s.peso),
      backgroundColor: ["#007bff", "#ffb000", "#28a745", "#dc3545", "#6f42c1", "#e83e8c"]
    }]
  };

  const barData = {
    labels: data.por_vara.map(v => v.vara || "Não informada"),
    datasets: [{
      label: "Processos Arquivados/Incinerados",
      data: data.por_vara.map(v => v.quantidade),
      backgroundColor: "#0ea5e9"
    }]
  };

  const formatarPesoDisplay = (gramas) => {
    if (gramas >= 1000) return `${(gramas / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${gramas.toFixed(2).replace(".", ",")} g`;
  };

  return (
    <div style={{ padding: "10px", paddingBottom: "50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "700" }}>📊 Auditoria e Relatórios</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>Resultados oficiais de drogas e materiais já incinerados</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card" style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "30px", background: "#f8fafc" }}>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>De:</label>
          <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange} className="input-tcip" />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Até:</label>
          <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange} className="input-tcip" />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Substância:</label>
          <input type="text" name="substancia" placeholder="Ex: Maconha" value={filtros.substancia} onChange={handleFiltroChange} className="input-tcip" />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Vara Judicial:</label>
          <input type="text" name="vara" placeholder="Ex: 1ª Vara" value={filtros.vara} onChange={handleFiltroChange} className="input-tcip" />
        </div>
        <div>
          <button onClick={buscarRelatorio} className="btn-tcip primary" style={{ height: "38px", padding: "0 25px" }} disabled={loading}>
            🔍 Filtrar
          </button>
        </div>
        <div>
          <button onClick={handleDownload} className="btn-tcip success" style={{ height: "38px", padding: "0 25px" }}>
            ⬇️ EXPORTAR PDF OFICIAL
          </button>
        </div>
      </div>

      {/* TOP CARDS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={{ background: "#475569", color: "white", padding: "20px", borderRadius: "8px", flex: 1, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>TOTAL DE PROCESSOS AUDITADOS</div>
          <div style={{ fontSize: "32px", fontWeight: "700" }}>{data.total_processos}</div>
        </div>
        <div style={{ background: "#3b82f6", color: "white", padding: "20px", borderRadius: "8px", flex: 1, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px" }}>PESO TOTAL DESTRUÍDO</div>
          <div style={{ fontSize: "32px", fontWeight: "700" }}>{formatarPesoDisplay(data.peso_total)}</div>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", height: "350px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", color: "#475569", marginBottom: "15px", textAlign: "center" }}>Volume Destruído por Substância</h3>
          <div style={{ flex: 1, position: "relative" }}>
            {data.por_substancia.length > 0 ? (
              <Pie data={pieData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
            ) : (
              <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center", color: "#94a3b8" }}>Sem dados</div>
            )}
          </div>
        </div>
        <div className="card" style={{ flex: 2, display: "flex", flexDirection: "column", height: "350px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", color: "#475569", marginBottom: "15px", textAlign: "center" }}>Processos Finalizados por Unidade Judiciária</h3>
          <div style={{ flex: 1, position: "relative" }}>
            {data.por_vara.length > 0 ? (
              <Bar data={barData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            ) : (
              <div style={{ display: "flex", height: "100%", justifyContent: "center", alignItems: "center", color: "#94a3b8" }}>Sem dados</div>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DE DADOS DETALHADA */}
      <div className="card">
        <h3 style={{ fontSize: "16px", color: "#334155", marginBottom: "15px", fontWeight: "600" }}>Detalhamento da Auditoria</h3>
        <div className="tcip-table-container">
          <table className="tcip-table">
            <thead>
              <tr>
                <th>BOU</th>
                <th>Substância</th>
                <th>Volume/Peso</th>
                <th>Vara Judicial</th>
                <th>Data Apreensão</th>
              </tr>
            </thead>
            <tbody>
              {data.detalhado.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    Nenhum registro encontrado para estes filtros.
                  </td>
                </tr>
              ) : (
                data.detalhado.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: "600", color: "#007bff" }}>{item.bou || "-"}</td>
                    <td><span className="badge amber">{item.substancia || "-"}</span></td>
                    <td style={{ fontWeight: "700" }}>{formatarPesoDisplay(item.peso || 0)}</td>
                    <td>{item.vara || "-"}</td>
                    <td>{item.data ? item.data.split("-").reverse().join("/") : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
