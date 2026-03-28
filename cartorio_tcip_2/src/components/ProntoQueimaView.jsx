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
    const pageHeight = doc.internal.pageSize.getHeight();
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
      doc.addImage(img, 'PNG', margin, 10, 22, 22);
    } catch(e) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("POLÍCIA MILITAR DO PARANÁ - 6º BPM", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text("PRIMEIRO CARTÓRIO - CASCAVEL", pageWidth / 2, 24, { align: "center" });
    
    doc.setFontSize(14);
    doc.text("CERTIDÃO DE INCINERAÇÃO DE ENTORPECENTES", pageWidth / 2, 35, { align: "center" });
    doc.setLineWidth(0.3);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Corpo do Texto
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const textoPrincipal = "Certifico que, em conformidade com as autorizações judiciais, procedeu-se a incineração dos materiais abaixo:";
    doc.text(textoPrincipal, margin, 48);

    doc.setFont("helvetica", "bold");
    doc.text(`DATA: ${dataFormatada}`, margin, 55);

    // Tabela de itens - Aumentada para ocupar mais espaço
    const tableData = lote.itens.map(item => [
      item.bou,
      item.processo,
      item.reu || "NÃO IDENTIFICADO",
      item.substancia,
      `${formatarPesoDisplay(item.peso, item.unidade)}`
    ]);

    autoTable(doc, {
      startY: 62,
      head: [["BOU", "PROCESSO", "NOTICIADO", "DROGAS", "PESO"]],
      body: tableData,
      theme: "grid",
      styles: { 
        fontSize: 9, 
        font: "helvetica", 
        cellPadding: 3, 
        textColor: [0,0,0], 
        lineColor: [0,0,0],
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        lineWidth: 0.1, 
        fontStyle: "bold",
        fontSize: 10
      },
      margin: { left: margin, right: margin },
    });

    // Final Y da tabela
    finalY = doc.lastAutoTable.finalY + 2;

    // Linha de Totais após a tabela (estilo simplificado sem bordas pesadas)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${totalProcessos} PROCESSOS`, margin, finalY + 6);
    
    let textoPesoTotal = "";
    if (totalGramas > 0) {
      if (totalGramas >= 1000) textoPesoTotal += `${(totalGramas / 1000).toFixed(3).replace(".", ",")} Kg`;
      else textoPesoTotal += `${totalGramas.toFixed(2).replace(".", ",")} g`;
    }
    if (totalUnidades > 0) {
      if (textoPesoTotal) textoPesoTotal += " | ";
      textoPesoTotal += `${totalUnidades} unidades`;
    }
    doc.text(`TOTAL: ${textoPesoTotal || '0'}`, pageWidth - margin, finalY + 6, { align: "right" });

    // --- POSICIONAMENTO DAS ASSINATURAS E RODAPÉ ---
    // Calculamos se precisamos de nova página (Assinaturas precisam de ~50mm)
    finalY += 15;
    if (finalY > pageHeight - 65) {
      doc.addPage();
      finalY = 30; 
    } else {
      // Se couber, empurramos para o final da página para manter o padrão do modelo
      finalY = pageHeight - 65;
    }

    const lineW = 75;
    const col2X = pageWidth - margin - lineW;
    
    // Linha 1: RESPONSÁVEL (Esquerda) e TESTEMUNHA 01 (Direita)
    doc.setLineWidth(0.1);
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.text("RESPONSÁVEL", margin + (lineW / 2), finalY + 5, { align: "center" });

    doc.line(col2X, finalY, pageWidth - margin, finalY);
    doc.text("TESTEMUNHA 01", col2X + (lineW / 2), finalY + 5, { align: "center" });

    finalY += 28;
    
    // Linha 2: TESTEMUNHA 02 (Esquerda) e Bloco de Protocolo (Direita)
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.text("TESTEMUNHA 02", margin + (lineW / 2), finalY + 5, { align: "center" });

    // Bloco do Protocolo no Rodapé (Alinhado à TESTEMUNHA 02)
    const footerW = 95;
    const footerH = 22;
    const footerX = pageWidth - margin - footerW;
    const footerY = finalY - 12; // Alinhado visualmente com a linha da TESTEMUNHA 02

    doc.setLineWidth(0.3);
    doc.roundedRect(footerX, footerY, footerW, footerH, 2, 2);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${String(lote.numero).padStart(2, '0')} - PROTOCOLO: ${lote.protocolo}`, footerX + (footerW / 2), footerY + 6, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Certidão emitida via Sistema Eletrônico pelo", footerX + (footerW / 2), footerY + 12, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    const txtAgente = `Agente: ${usuario?.username || 'Sistema'} em ${dataFormatada} às ${horaFormatada}`;
    doc.text(txtAgente, footerX + (footerW / 2), footerY + 17, { align: "center" });

    // Numero do Lote grande no canto Top Right (Header)
    doc.setLineWidth(0.5);
    doc.roundedRect(pageWidth - 48, 12, 33, 15, 3, 3);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${lote.numero.toString().padStart(2, '0')}`, pageWidth - 31.5, 22, { align: "center" });

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