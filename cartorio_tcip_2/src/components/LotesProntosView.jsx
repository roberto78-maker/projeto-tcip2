import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getApreensoes, getLotes } from "../services/api.js";
import brasao from "../assets/brasao.png";

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

export default function LotesProntosView() {
  const [apreensoes, setApreensoes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const [dataApreensoes, dataLotes] = await Promise.all([
        getApreensoes({ status: "queima_pronta", fetchAll: true }),
        getLotes()
      ]);
      setApreensoes(dataApreensoes);
      setLotes(dataLotes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar apenas status "queima_pronta"
  const itensProntos = apreensoes.filter(a => a.status === "queima_pronta");

  // Agrupar por lote
  const lotesAgrupados = lotes.map(lote => ({
    ...lote,
    itens: itensProntos.filter(a => a.lote_incineracao === lote.id)
  })).filter(lote => lote.itens.length > 0);

  const gerarCertidaoPDF = async (lote) => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    try {
      const img = new Image();
      img.src = brasao;
      await new Promise(r => img.onload = r);
      doc.addImage(img, 'PNG', margin, 10, 20, 20);
    } catch (e) { }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("POLÍCIA MILITAR DO PARANÁ - 6º BPM", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(9);
    doc.text("PRIMEIRO CARTÓRIO - CASCAVEL", pageWidth / 2, 23, { align: "center" });

    doc.setFontSize(12);
    doc.text("CERTIDÃO DE QUEIMA DE ENTORPECENTES", pageWidth / 2, 32, { align: "center" });
    doc.line(margin, 35, pageWidth - margin, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const textoPrincipal = "Certifico que, em conformidade com as autorizações judiciais, procedeu-se a QUEIMA dos materiais abaixo relacionados:";
    doc.text(textoPrincipal, margin, 45);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`LOTE ${lote.numero} - PROTOCOLO: ${lote.protocolo}`, margin, 52);

    const tableData = lote.itens.map(item => [
      item.bou,
      item.processo,
      item.reu || "NÃO IDENTIFICADO",
      item.substancia,
      `${formatarPesoDisplay(item.peso, item.unidade)}`
    ]);

    autoTable(doc, {
      startY: 58,
      head: [["BOU", "PROCESSO", "NOTICIADO", "DROGAS", "PESO"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8, font: "helvetica", cellPadding: 2 },
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], lineWidth: 0.1, fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });

    let finalY = doc.lastAutoTable.finalY + 30;

    const colWidth = (pageWidth - (margin * 2)) / 2;
    doc.line(margin, finalY, margin + colWidth - 10, finalY);
    doc.text("RESPONSÁVEL", margin + (colWidth / 2) - 5, finalY + 5, { align: "center" });

    doc.line(margin + colWidth + 10, finalY, pageWidth - margin, finalY);
    doc.text("TESTEMUNHA 01", margin + colWidth + 10 + (colWidth / 2) - 5, finalY + 5, { align: "center" });

    finalY += 30;
    doc.line(margin, finalY, margin + colWidth - 10, finalY);
    doc.text("TESTEMUNHA 02", margin + (colWidth / 2) - 5, finalY + 5, { align: "center" });
    doc.text("_______/_______/_______", pageWidth - margin - 40, finalY + 5);

    doc.setDrawColor(220, 38, 38);
    doc.roundedRect(pageWidth - 50, 8, 35, 15, 3, 3);
    doc.setFontSize(16);
    doc.text(`LOTE ${lote.numero.toString().padStart(2, '0')}`, pageWidth - 32.5, 18, { align: "center" });

    doc.save(`QUEIMA_LOTE_${lote.numero}.pdf`);
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>

      <div className="card">
        <h2 className="card-title">Incinerados</h2>
        <p className="card-subtitle">Listagem de lotes finalizados aguardando destruição oficial.</p>
      </div>

      {lotesAgrupados.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Nenhum lote pronto para queima no momento.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "20px" }}>
        {lotesAgrupados.map(lote => (
          <div key={lote.id} className="card" style={{ borderLeft: "5px solid #dc2626" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
              <div>
                <h3 style={{ color: "#dc2626", margin: 0 }}>LOTE {lote.numero.toString().padStart(2, '0')}</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Protocolo: {lote.protocolo}</span>
              </div>
              <span className="badge" style={{ background: "#dc2626", color: "white" }}>
                {lote.itens.length} ITENS
              </span>
            </div>

            <div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "15px", fontSize: "12px", border: "1px solid #f1f5f9", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fef2f2", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px" }}>BOU</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>NOTICIADO</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>PESO</th>
                  </tr>
                </thead>
                <tbody>
                  {lote.itens.map(item => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", fontWeight: "600" }}>{item.bou}</td>
                      <td style={{ padding: "8px", color: "#64748b" }}>{item.reu || "N/I"}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{formatarPesoDisplay(item.peso, item.unidade)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              style={{
                width: "100%",
                background: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "12px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px"
              }}
              onClick={() => gerarCertidaoPDF(lote)}
            >
              🔥 IMPRIMIR CERTIDÃO DE QUEIMA
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
