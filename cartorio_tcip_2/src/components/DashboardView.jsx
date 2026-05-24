import React, { useEffect, useState } from "react";
import { getDashboardStats } from "../services/api.js";

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

// ─── Initial state shape mirrors the DashboardStatsView response ──────────────
const EMPTY_STATS = {
  total: 0,
  count_conferencia: 0,
  count_cofre: 0,
  count_incineracao: 0,
  count_queima_pronta: 0,
  count_excluido: 0,
  peso_cofre: 0,
  peso_incineracao: 0,
  peso_queima_pronta: 0,
  count_som: 0,
  count_outros: 0,
  count_facas: 0,
  lotes_em_formacao: 0,
  lotes_incinerados: 0,
};

export default function DashboardView() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // ─── Single request — all aggregation is done server-side ──────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErro(null);
      try {
        const data = await getDashboardStats();
        setStats({ ...EMPTY_STATS, ...data });
      } catch (e) {
        console.error("Erro dashboard:", e);
        setErro("Não foi possível carregar as estatísticas.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // runs once on mount — no re-fetching on internal filter changes

  // ─── Weight formatter ───────────────────────────────────────────────────────
  const formatarPesoDisplay = (gramas) => {
    const g = Number(gramas) || 0;
    return `${g.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} g`;
  };

  // ─── Chart data — built directly from pre-aggregated server fields ──────────
  const chartStatusData = {
    labels: ["Conferência", "Cofre", "Lotes", "Incinerados"],
    datasets: [{
      label: "Quantidade de Itens",
      data: [
        stats.count_conferencia,
        stats.count_cofre,
        stats.count_incineracao,
        stats.count_queima_pronta,
      ],
      backgroundColor: ["#6c757d", "#007bff", "#ffb000", "#28a745"],
      borderWidth: 0,
    }],
  };

  const chartPesoData = {
    labels: ["Cofre", "Lotes (P. Queima)", "Incinerados"],
    datasets: [{
      label: "Peso (g)",
      data: [
        stats.peso_cofre,
        stats.peso_incineracao,
        stats.peso_queima_pronta,
      ],
      backgroundColor: ["#007bff", "#ffb000", "#28a745"],
      borderWidth: 0,
    }],
  };

  // ─── Sub-components ─────────────────────────────────────────────────────────
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

  // ─── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
        <div style={{ fontWeight: "600" }}>Carregando estatísticas...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#dc2626" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
        <div style={{ fontWeight: "600" }}>{erro}</div>
      </div>
    );
  }

  // ─── Totals derived from stats ──────────────────────────────────────────────
  const pesoCustodiaTotal = stats.peso_cofre + stats.peso_incineracao;

  return (
    <div style={{ padding: "10px" }}>
      {/* ── Row 1: Weight cards by stage ────────────────────────────────── */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <TopCard
          title="CUSTÓDIA (DEPÓSITO)"
          value={formatarPesoDisplay(stats.peso_cofre)}
          subtitle={`${stats.count_cofre} itens no depósito`}
          bg="#007bff"
          icon="📦"
        />
        <TopCard
          title="LOTES EM FORMAÇÃO"
          value={formatarPesoDisplay(stats.peso_incineracao)}
          subtitle={`${stats.lotes_em_formacao} lotes (${stats.count_incineracao} itens)`}
          bg="#ffb000"
          icon="⚖️"
        />
        <TopCard
          title="INCINERADOS NO PERÍODO"
          value={formatarPesoDisplay(stats.peso_queima_pronta)}
          subtitle={`${stats.lotes_incinerados} lotes (${stats.count_queima_pronta} itens)`}
          bg="#28a745"
          icon="🔥"
        />
      </div>

      {/* ── Row 2: Special item type cards ──────────────────────────────── */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <TopCard
          title="APARELHOS DE SOM"
          value={stats.count_som}
          subtitle="recebidos no período"
          bg="#8b5cf6"
          icon="🔊"
        />
        <TopCard
          title="FACAS / ARMAS BRANCAS"
          value={stats.count_facas}
          subtitle="recebidas no período"
          bg="#ef4444"
          icon="🗡️"
        />
        <TopCard
          title="OUTROS OBJETOS"
          value={stats.count_outros}
          subtitle="registrados no período"
          bg="#64748b"
          icon="⚙️"
        />
      </div>

      {/* ── Section title ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <span style={{ fontSize: "24px", marginRight: "10px", color: "#10b981" }}>📈</span>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#1e293b" }}>Análise de Custódia</h2>
        <div style={{ marginLeft: "10px", color: "#64748b", fontSize: "14px" }}>6º BPM — Estatística Geral</div>
      </div>

      {/* ── Stats card ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: "20px" }}>
        {/* Summary row */}
        <div style={{ display: "flex", gap: "15px", marginBottom: "30px", background: "#f8fafc", padding: "15px", borderRadius: "8px" }}>
          <BorderCard
            title="AGUARDANDO CONFERÊNCIA"
            value={stats.count_conferencia}
            subtitle="itens"
            color="#eab308"
          />
          <BorderCard
            title="NO DEPÓSITO"
            value={stats.count_cofre}
            subtitle="itens"
            color="#007bff"
          />
          <BorderCard
            title="PESO TOTAL EM CUSTÓDIA"
            value={formatarPesoDisplay(pesoCustodiaTotal)}
            subtitle=""
            color="#0ea5e9"
          />
          <BorderCard
            title="HISTÓRICO INCINERADO"
            value={stats.count_queima_pronta}
            subtitle="itens"
            color="#28a745"
          />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "0 0 20px 0" }}>
              Peso por Estágio de Custódia (g)
            </h3>
            <div style={{ height: "250px" }}>
              <Bar
                data={chartPesoData}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b", margin: "0 0 20px 0" }}>
              Estatística Geral do Sistema (Quantidade)
            </h3>
            <div style={{ height: "250px" }}>
              <Bar
                data={chartStatusData}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>
        </div>

        {/* Total footer */}
        <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div></div>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Total de registros no sistema: <strong style={{ color: "#1e293b" }}>{stats.total}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}