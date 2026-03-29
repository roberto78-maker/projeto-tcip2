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
      startY: 59,
      head: [["BOU", "PROCESSO", "NOTICIADO", "DROGAS", "PESO"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8.5, font: "helvetica", cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0] },
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], lineWidth: 0.1, fontStyle: "bold", fontSize: 9.5 },
      margin: { left: margin, right: margin },
    });

    // Final Y da tabela
    let finalY = doc.lastAutoTable.finalY + 1;

    // Linha de Totais (Simplificada)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${lote.itens.length} ITENS`, margin, finalY + 5);
    doc.text(`PROTOCOLO: ${lote.protocolo}`, pageWidth - margin, finalY + 5, { align: "right" });

    // --- POSICIONAMENTO DAS ASSINATURAS E RODAPÉ ---
    // Tentamos manter na mesma página se houver pelo menos 45mm de espaço
    finalY += 12;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (finalY > pageHeight - 50) {
      doc.addPage();
      finalY = 30;
    } else {
      // Posição fixa no rodapé da página para manter padrão
      finalY = pageHeight - 55;
    }

    const lineW = 75;
    const col2X = pageWidth - margin - lineW;

    // Linha 1
    doc.setLineWidth(0.1);
    doc.setDrawColor(0, 0, 0); // Reset color to black for signatures
    doc.setTextColor(0, 0, 0);
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.setFontSize(9);
    doc.text("RESPONSÁVEL", margin + (lineW / 2), finalY + 4, { align: "center" });

    doc.line(col2X, finalY, pageWidth - margin, finalY);
    doc.text("TESTEMUNHA 01", col2X + (lineW / 2), finalY + 4, { align: "center" });

    finalY += 23;

    // Linha 2
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.text("TESTEMUNHA 02", margin + (lineW / 2), finalY + 4, { align: "center" });

    // Data/Protocolo Box (Rodapé)
    const footerW = 92;
    const footerH = 20;
    const footerX = pageWidth - margin - footerW;
    const footerY = finalY - 10;

    doc.setLineWidth(0.3);
    doc.roundedRect(footerX, footerY, footerW, footerH, 2, 2);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${lote.numero.toString().padStart(2, '0')}`, footerX + (footerW / 2), footerY + 6, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Protocolo: ${lote.protocolo}`, footerX + (footerW / 2), footerY + 11, { align: "center" });
    doc.text(`Incineração realizada em ____/____/____`, footerX + (footerW / 2), footerY + 16, { align: "center" });

    // LOTE box no topo (Header)
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
    doc.roundedRect(pageWidth - 46, 12, 31, 14, 2, 2);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${lote.numero.toString().padStart(2, '0')}`, pageWidth - 30.5, 21.5, { align: "center" });

    doc.save(`QUEIMA_LOTE_${lote.numero}.pdf`);
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Carregando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>

      <div className="card">
        <h2 className="card-title">Incinerados</h2>
      </div>

      {lotesAgrupados.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Nenhum lote finalizado encontrado.
        </div>
      )}

      {lotesAgrupados.length > 0 && (
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ textAlign: "left", padding: "18px", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700" }}>Nº do Lote</th>
                <th style={{ textAlign: "left", padding: "18px", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700" }}>Protocolo</th>
                <th style={{ textAlign: "left", padding: "18px", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700" }}>Data da Incineração</th>
                <th style={{ textAlign: "left", padding: "18px", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700" }}>Hora</th>
                <th style={{ textAlign: "center", padding: "18px", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: "700" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {lotesAgrupados.map(lote => {
                const dataObj = new Date(lote.data_criacao);
                const dataFormatada = dataObj.toLocaleDateString("pt-BR");
                const horaFormatada = dataObj.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
                
                // Pega o arquivo do primeiro item do lote
                const arquivoUrl = lote.itens[0]?.arquivo_pdf_url || lote.itens[0]?.arquivo_pdf;

                return (
                  <tr key={lote.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "all 0.2s" }} className="table-row-hover">
                    <td style={{ padding: "18px", fontWeight: "700", color: "#1e293b" }}>
                      LOTE {String(lote.numero).padStart(2, '0')}
                    </td>
                    <td style={{ padding: "18px", fontWeight: "700", color: "#dc2626" }}>
                      {lote.protocolo}
                    </td>
                    <td style={{ padding: "18px", color: "#475569" }}>
                      {dataFormatada}
                    </td>
                    <td style={{ padding: "18px", color: "#475569" }}>
                      {horaFormatada}
                    </td>
                    <td style={{ padding: "18px", textAlign: "center" }}>
                      {arquivoUrl ? (
                         <a 
                           href={arquivoUrl} 
                           target="_blank" 
                           rel="noreferrer"
                           className="btn-green"
                           style={{ padding: "8px 15px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                         >
                           👁️ VISUALIZAR ASSINADO
                         </a>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Sem arquivo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
