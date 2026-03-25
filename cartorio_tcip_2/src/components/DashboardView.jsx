import React, { useEffect, useState } from "react";
import { getApreensoes } from "../services/api.js";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DashboardView() {
  const [dados, setDados] = useState([]);
  const [filtroAno, setFiltroAno] = useState("Todos");
  const [filtroMes, setFiltroMes] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await getApreensoes({ fetchAll: true });
        setDados(res);
      } catch (e) {
        console.error("Erro dashboard:", e);
      }
    }
    load();
  }, []);

  // 🔍 Lógica de Filtragem
  const dadosFiltrados = dados.filter(item => {
    const dataItem = new Date(item.data_criacao || item.id);
    const anoMatch = filtroAno === "Todos" || dataItem.getFullYear().toString() === filtroAno;
    const mesMatch = filtroMes === "Todos" || (dataItem.getMonth() + 1).toString() === filtroMes;
    
    let rangeMatch = true;
    if (dataInicio) {
      const dInicio = new Date(dataInicio);
      dInicio.setHours(0, 0, 0, 0);
      rangeMatch = rangeMatch && dataItem >= dInicio;
    }
    if (dataFim) {
      const dFim = new Date(dataFim);
      dFim.setHours(23, 59, 59, 999);
      rangeMatch = rangeMatch && dataItem <= dFim;
    }

    return anoMatch && mesMatch && rangeMatch;
  });

  // 🔢 Formata peso com unidade inteligente (g / Kg)
  const formatarPesoDisplay = (gramas) => {
    if (gramas >= 1000) return `${(gramas / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${gramas.toFixed(2).replace(".", ",")} g`;
  };

  const total = dadosFiltrados.length;
  const pesoTotal = dadosFiltrados.reduce((acc, item) => acc + Number(item.peso || 0), 0);

  const statusCount = {
    conferencia: dadosFiltrados.filter(i => i.status === "conferencia").length,
    cofre: dadosFiltrados.filter(i => i.status === "cofre").length,
    queima: dadosFiltrados.filter(i => i.status === "incineracao").length,
    incinerado: dadosFiltrados.filter(i => i.status === "queima_pronta").length,
  };

  const pesoCount = {
    cofre: dadosFiltrados.filter(i => i.status === "cofre").reduce((acc, item) => acc + Number(item.peso || 0), 0),
    queima: dadosFiltrados.filter(i => i.status === "incineracao").reduce((acc, item) => acc + Number(item.peso || 0), 0),
    incinerado: dadosFiltrados.filter(i => i.status === "queima_pronta").reduce((acc, item) => acc + Number(item.peso || 0), 0),
  };

  const lotesEmFormacao = new Set(
    dadosFiltrados.filter(i => i.status === "incineracao" && i.lote_incineracao).map(i => i.lote_incineracao)
  ).size;

  const lotesIncinerados = new Set(
    dadosFiltrados.filter(i => i.status === "queima_pronta" && i.lote_incineracao).map(i => i.lote_incineracao)
  ).size;

  // 🔥 GRÁFICO 1: Distribuição por Substância (Peso)
  const substancias = [...new Set(dadosFiltrados.map(d => d.substancia))];
  const chartSubstancia = {
    labels: substancias.length > 0 ? substancias : ["Nenhum dado"],
    datasets: [{
      label: 'Peso (g)',
      data: substancias.map(s => dadosFiltrados.filter(d => d.substancia === s).reduce((a, b) => a + Number(b.peso || 0), 0)),
      backgroundColor: ["#007bff", "#ffb000", "#28a745", "#dc3545", "#6f42c1", "#e83e8c"],
      borderWidth: 0
    }]
  };

  // 📊 GRÁFICO 2: Estatística Geral do Sistema (Itens por Status)
  const chartGeral = {
    labels: ["Conferência", "Cofre", "Lotes", "Incinerados"],
    datasets: [{
      label: 'Quantidade de Itens',
      data: [statusCount.conferencia, statusCount.cofre, statusCount.queima, statusCount.incinerado],
      backgroundColor: ["#6c757d", "#007bff", "#ffb000", "#28a745"],
      borderWidth: 0
    }]
  };

  const anosDisponiveis = ["Todos", ...new Set(dados.map(d => new Date(d.data_criacao || d.id).getFullYear().toString()))].sort();
  const meses = [
    { v: "Todos", l: "Todos" }, { v: "1", l: "Janeiro" }, { v: "2", l: "Fevereiro" }, { v: "3", l: "Março" },
    { v: "4", l: "Abril" }, { v: "5", l: "Maio" }, { v: "6", l: "Junho" }, { v: "7", l: "Julho" },
    { v: "8", l: "Agosto" }, { v: "9", l: "Setembro" }, { v: "10", l: "Outubro" }, { v: "11", l: "Novembro" }, { v: "12", l: "Dezembro" }
  ];

  const TopCard = ({ title, value, subtitle, bg, icon }) => (
    <div style={{ background: bg, color: "white", padding: "20px", borderRadius: "8px", flex: 1, display: "flex", flexDirection: "column", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", letterSpacing: "0.5px" }}>{title}</h3>
        <span style={{ fontSize: "20px", opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>{value}</div>
      <div style={{ fontSize: "12px", opacity: 0.9 }}>{subtitle}</div>
    </div>
  );

  const BorderCard = ({ title, value, subtitle, color }) => (
    <div style={{ background: "white", padding: "20px", borderRadius: "6px", flex: 1, borderLeft: `5px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: "12px", fontWeight: "700", color: "#475569", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a" }}>
        {value} <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>{subtitle}</span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "10px" }}>
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <TopCard title="EM CUSTÓDIA (COFRE)" value={formatarPesoDisplay(pesoCount.cofre)} subtitle={`${statusCount.cofre} processos no cofre`} bg="#007bff" icon="🔒" />
        <TopCard title="LOTES EM FORMAÇÃO" value={formatarPesoDisplay(pesoCount.queima)} subtitle={`${lotesEmFormacao} lotes (${statusCount.queima} processos)`} bg="#ffb000" icon="📦" />
        <TopCard title="INCINERADOS NO PERÍODO" value={formatarPesoDisplay(pesoCount.incinerado)} subtitle={`${lotesIncinerados} lotes (${statusCount.incinerado} processos)`} bg="#28a745" icon="🔥" />
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "24px", marginRight: "10px", color: "#10b981" }}>📈</span>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#1e293b" }}>Análise de Custódia</h2>
        <div style={{ marginLeft: "10px", color: "#64748b", fontSize: "14px" }}>6º BPM - Estatística Geral</div>
      </div>

      <div className="card" style={{ padding: "20px" }}>
        <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "15px" }}>
            <span style={{ marginRight: "8px" }}>⚙️</span> Filtros de Pesquisa
          </div>
          <div style={{ display: "flex", gap: "15px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ minWidth: "300px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>PERÍODO (DATA)</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", color: "#1e293b" }} />
                <span style={{ fontSize: "12px", color: "#64748b" }}>até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", color: "#1e293b" }} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>ANO</label>
              <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", color: "#1e293b" }}>
                {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "5px" }}>MÊS</label>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", background: "white", color: "#1e293b" }}>
                {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>
            <button onClick={() => {}} className="btn-green" style={{ padding: "9px 20px" }}>🔍 Filtrar</button>
            <button onClick={() => { setDataInicio(""); setDataFim(""); setFiltroAno("Todos"); setFiltroMes("Todos"); }} style={{ padding: "8px 14px", border: "1px solid #cbd5e1", background: "white", color: "#64748b", borderRadius: "4px", cursor: "pointer" }}>↻</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px" }}>
          <BorderCard title="AGUARDANDO BALANÇA" value={statusCount.conferencia} subtitle="itens" color="#eab308" />
          <BorderCard title="NO COFRE (PESO REAL)" value={statusCount.cofre} subtitle="itens" color="#007bff" />
          <BorderCard title="PESO TOTAL EM CUSTÓDIA" value={formatarPesoDisplay(pesoCount.cofre + pesoCount.queima)} subtitle="" color="#0ea5e9" />
          <BorderCard title="HISTÓRICO INCINERADO" value={statusCount.incinerado} subtitle="itens" color="#28a745" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "0 0 20px 0" }}>Distribuição por Substância (Peso - g)</h3>
            <div style={{ height: "250px" }}>
              <Bar data={chartSubstancia} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "0 0 20px 0" }}>Estatística Geral do Sistema (Quantidade)</h3>
            <div style={{ height: "250px" }}>
              <Bar data={chartGeral} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}