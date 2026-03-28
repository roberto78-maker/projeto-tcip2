import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getApreensoes, getLotes, finalizarLote } from "../services/api.js";
import { getUsuario } from "../services/auth.js";
import brasao from "../assets/brasao.png";

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

export default function ProntoQueimaView() {
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
        getApreensoes({ status: "incineracao", fetchAll: true }),
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

  // Filtrar apenas o que já está em status incineracao
  const itensParaIncinerar = apreensoes.filter(a => a.status === "incineracao");

  // Agrupar itens por lote_incineracao (ID)
  const lotesAgrupados = lotes.map(lote => ({
    ...lote,
    itens: itensParaIncinerar.filter(a => a.lote_incineracao === lote.id)
  })).filter(lote => lote.itens.length > 0);

  const gerarCertidaoPDF = async (lote) => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usuario = getUsuario();
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR');

    // Cálculos de Totais
    const totalProcessos = lote.itens.length;
    let totalGramas = 0;
    let totalUnidades = 0;

    lote.itens.forEach(item => {
      const p = parseFloat(String(item.peso).replace(",", ".")) || 0;
      const uni = String(item.unidade).toLowerCase();
      if (uni.includes("g") || uni.includes("kg")) {
        // Converte kg para gramas para o total se for o caso, ou mantém se o user preferir
        if (uni.includes("kg")) totalGramas += p * 1000;
        else totalGramas += p;
      } else {
        totalUnidades += p;
      }
    });

    // Configuração de Cor Global (Preto)
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    
    // Header com Logo
    try {
      const img = new Image();
      img.src = brasao;
      await new Promise(r => img.onload = r);
      doc.addImage(img, 'PNG', margin, 10, 18, 18);
    } catch(e) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("POLÍCIA MILITAR DO PARANÁ - 6º BPM", pageWidth / 2, 16, { align: "center" });
    doc.setFontSize(8);
    doc.text("PRIMEIRO CARTÓRIO - CASCAVEL", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(11);
    doc.text("CERTIDÃO DE INCINERAÇÃO DE ENTORPECENTES", pageWidth / 2, 28, { align: "center" });
    doc.line(margin, 31, pageWidth - margin, 31);

    // Corpo do Texto
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const textoPrincipal = "Certifico que, em conformidade com as autorizações judiciais, procedeu-se a incineração dos materiais abaixo:";
    doc.text(textoPrincipal, margin, 38);

    doc.setFont("helvetica", "bold");
    doc.text(`DATA: ${dataFormatada}`, margin, 43);

    // Tabela de itens
    const tableData = lote.itens.map(item => [
      item.bou,
      item.processo,
      item.reu || "NÃO IDENTIFICADO",
      item.substancia,
      `${formatarPesoDisplay(item.peso, item.unidade)}`
    ]);

    autoTable(doc, {
      startY: 48,
      head: [["BOU", "PROCESSO", "NOTICIADO", "DROGAS", "PESO"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 7, font: "helvetica", cellPadding: 1.5, textColor: [0,0,0], lineColor: [0,0,0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });

    let finalY = doc.lastAutoTable.finalY;

    // Linha de Totais após a tabela
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setLineWidth(0.1);
    doc.rect(margin, finalY, pageWidth - (margin * 2), 7);
    doc.text(`TOTAL: ${totalProcessos} PROCESSOS`, margin + 2, finalY + 5);
    
    let textoPesoTotal = "";
    if (totalGramas > 0) {
      if (totalGramas >= 1000) textoPesoTotal += `${(totalGramas/1000).toFixed(3).replace(".",",")} Kg`;
      else textoPesoTotal += `${totalGramas.toFixed(2).replace(".",",")} g`;
    }
    if (totalUnidades > 0) {
      if (textoPesoTotal) textoPesoTotal += " | ";
      textoPesoTotal += `${totalUnidades} unidades`;
    }
    doc.text(`TOTAL: ${textoPesoTotal || '0'}`, pageWidth - margin - 2, finalY + 5, { align: "right" });

    finalY += 25;

    // Assinaturas (Conforme Modelo)
    const lineW = 60;
    const centerX = pageWidth / 2;
    
    // Responsável Meio
    doc.line(centerX - (lineW/2), finalY, centerX + (lineW/2), finalY);
    doc.text("RESPONSÁVEL", centerX, finalY + 4, { align: "center" });

    // Testemunha 01 Lado Direito
    doc.line(pageWidth - margin - lineW, finalY, pageWidth - margin, finalY);
    doc.text("TESTEMUNHA 01", pageWidth - margin - (lineW/2), finalY + 4, { align: "center" });

    finalY += 20;
    // Testemunha 02 Lado Esquerdo
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.text("TESTEMUNHA 02", margin + (lineW/2), finalY + 4, { align: "center" });

    // Bloco do Protocolo no Rodapé (Direita)
    const footerW = 85;
    const footerH = 15;
    const footerX = pageWidth - margin - footerW;
    const footerY = doc.internal.pageSize.getHeight() - margin - footerH;

    doc.setLineWidth(0.2);
    doc.rect(footerX, footerY, footerW, footerH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${lote.numero} - PROTOCOLO: ${lote.protocolo}`, footerX + (footerW/2), footerY + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("Certidão emitida via Sistema Eletrônico pelo", footerX + (footerW/2), footerY + 8, { align: "center" });
    doc.text(`Agente: ${usuario?.username || 'Sistema'} em ${dataFormatada} às ${horaFormatada}`, footerX + (footerW/2), footerY + 11, { align: "center" });

    // Numero do Lote grande no canto Top Right
    doc.setLineWidth(0.5);
    doc.roundedRect(pageWidth - 45, 10, 30, 12, 2, 2);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${lote.numero.toString().padStart(2, '0')}`, pageWidth - 30, 18, { align: "center" });

    doc.save(`CERTIDAO_LOTE_${lote.numero}.pdf`);
  };

  const handleFinalizarLote = async (lote) => {
    if (lote.itens.length < 20) {
      alert(`Lote precisa de 20 itens. Atual: ${lote.itens.length}`);
      return;
    }
    
    if (!confirm(`Finalizar lote ${lote.numero} com ${lote.itens.length} itens?`)) {
      return;
    }

    try {
      await finalizarLote(lote.id);
      alert("Lote finalizada com sucesso!");
      carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Carregando lotes...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      
      <div className="card">
        <h2 className="card-title">Lotes</h2>
        <p className="card-subtitle">Listagem de materiais agrupados em lotes de 20 para destruição oficial.</p>
      </div>

      {lotesAgrupados.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
          Nenhum lote formado no momento. Envie itens do cofre para incineração para iniciar um lote.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "20px" }}>
        {lotesAgrupados.map(lote => (
          <div key={lote.id} className="card" style={{ borderLeft: "5px solid #143a2b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
              <div>
                <h3 style={{ color: "#143a2b", margin: 0 }}>LOTE {lote.numero.toString().padStart(2, '0')}</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Protocolo: {lote.protocolo}</span>
              </div>
              <span className="badge" style={{ background: "#f1f5f9", color: "#1e293b" }}>
                {lote.itens.length} / 20 PROCESSOS
              </span>
            </div>

            <div style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "15px", fontSize: "12px", border: "1px solid #f1f5f9", borderRadius: "6px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
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

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="btn-green" 
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => gerarCertidaoPDF(lote)}
              >
                📄 IMPRIMIR
              </button>
              <button 
                style={{ 
                  flex: 1, 
                  background: lote.itens.length >= 20 ? "#dc2626" : "#94a3b8",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px",
                  cursor: lote.itens.length >= 20 ? "pointer" : "not-allowed",
                  fontWeight: "600"
                }}
                onClick={() => handleFinalizarLote(lote)}
                disabled={lote.itens.length < 20}
              >
                ✅ FINALIZAR
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}