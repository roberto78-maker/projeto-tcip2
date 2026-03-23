import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from "recharts";

function ReportSummary({ apreensoes }) {

  const conferencia = apreensoes.filter(a => a.status === "conferencia").length;
  const deposito = apreensoes.filter(a => a.status === "cofre").length;
  const incineracao = apreensoes.filter(a => a.status === "queima").length;

  const total = apreensoes.length;

  const data = [
    { name: "Conferência", value: conferencia },
    { name: "Depósito", value: deposito },
    { name: "Incineração", value: incineracao }
  ];

  const COLORS = ["#0284c7", "#ca8a04", "#dc2626"];

  const pesoTotal = apreensoes.reduce((soma, a) => {
    return soma + Number(a.peso || 0);
  }, 0);

  const card = (titulo, valor, cor) => ({
    background: cor,
    color: "white",
    padding: "20px",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "bold"
  });

  return (
    <div>

      {/* CARDS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "15px",
        marginBottom: "20px"
      }}>

        <div style={card("Total", total, "#1e293b")}>
          <div>Total</div>
          <div style={{ fontSize: "22px" }}>{total}</div>
        </div>

        <div style={card("Conferência", conferencia, "#0284c7")}>
          <div>Conferência</div>
          <div style={{ fontSize: "22px" }}>{conferencia}</div>
        </div>

        <div style={card("Depósito", deposito, "#ca8a04")}>
          <div>Depósito</div>
          <div style={{ fontSize: "22px" }}>{deposito}</div>
        </div>

        <div style={card("Incineração", incineracao, "#dc2626")}>
          <div>Incineração</div>
          <div style={{ fontSize: "22px" }}>{incineracao}</div>
        </div>

      </div>

      {/* GRÁFICO */}
      <div style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        border: "1px solid #ddd",
        display: "flex",
        justifyContent: "center"
      }}>

        <PieChart width={400} height={300}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>

      </div>

      {/* PESO */}
      <div style={{
        marginTop: "20px",
        background: "#f8fafc",
        padding: "15px",
        borderRadius: "10px",
        border: "1px solid #ddd",
        textAlign: "center"
      }}>
        <strong>Peso Total:</strong> {pesoTotal}
      </div>

    </div>
  );
}

export default ReportSummary;