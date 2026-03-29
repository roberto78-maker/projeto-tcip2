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
  const [modalLote, setModalLote] = useState(null);
  const [arquivoAssinado, setArquivoAssinado] = useState(null);
  const [finalizando, setFinalizando] = useState(false);

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
    doc.text(`DATA: ${dataFormatada}`, margin, 53);

    // Tabela de itens - Mais compacta para caber tudo em uma página
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
      styles: { 
        fontSize: 8.5, 
        font: "helvetica", 
        cellPadding: 2, 
        textColor: [0,0,0], 
        lineColor: [0,0,0],
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        lineWidth: 0.1, 
        fontStyle: "bold",
        fontSize: 9.5
      },
      margin: { left: margin, right: margin },
    });

    // Final Y da tabela
    let finalY = doc.lastAutoTable.finalY + 1;

    // Linha de Totais após a tabela
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${totalProcessos} PROCESSOS`, margin, finalY + 5);
    
    let textoPesoTotal = "";
    if (totalGramas > 0) {
      if (totalGramas >= 1000) textoPesoTotal += `${(totalGramas / 1000).toFixed(3).replace(".", ",")} Kg`;
      else textoPesoTotal += `${totalGramas.toFixed(2).replace(".", ",")} g`;
    }
    if (totalUnidades > 0) {
      if (textoPesoTotal) textoPesoTotal += " | ";
      textoPesoTotal += `${totalUnidades} unidades`;
    }
    doc.text(`TOTAL: ${textoPesoTotal || '0'}`, pageWidth - margin, finalY + 5, { align: "right" });

    // --- POSICIONAMENTO DAS ASSINATURAS E RODAPÉ ---
    // Tentamos manter na mesma página se houver pelo menos 45mm de espaço
    finalY += 12;
    if (finalY > pageHeight - 50) {
      doc.addPage();
      finalY = 30; 
    } else {
      // Posição fixa no rodapé da página para manter padrão
      finalY = pageHeight - 55;
    }

    const lineW = 75;
    const col2X = pageWidth - margin - lineW;
    
    // Linha 1: RESPONSÁVEL (Esquerda) e TESTEMUNHA 01 (Direita)
    doc.setLineWidth(0.1);
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.setFontSize(9);
    doc.text("RESPONSÁVEL", margin + (lineW / 2), finalY + 4, { align: "center" });

    doc.line(col2X, finalY, pageWidth - margin, finalY);
    doc.text("TESTEMUNHA 01", col2X + (lineW / 2), finalY + 4, { align: "center" });

    finalY += 23;
    
    // Linha 2: TESTEMUNHA 02 (Esquerda) e Bloco de Protocolo (Direita)
    doc.line(margin, finalY, margin + lineW, finalY);
    doc.text("TESTEMUNHA 02", margin + (lineW / 2), finalY + 4, { align: "center" });

    // Bloco do Protocolo no Rodapé
    const footerW = 92;
    const footerH = 20;
    const footerX = pageWidth - margin - footerW;
    const footerY = finalY - 10;

    doc.setLineWidth(0.3);
    doc.roundedRect(footerX, footerY, footerW, footerH, 2, 2);
    
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${String(lote.numero).padStart(2, '0')} - PROTOCOLO: ${lote.protocolo}`, footerX + (footerW / 2), footerY + 6, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Certidão emitida via Sistema Eletrônico pelo", footerX + (footerW / 2), footerY + 11, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    const txtAgente = `Agente: ${usuario?.username || 'Sistema'} em ${dataFormatada} às ${horaFormatada}`;
    doc.text(txtAgente, footerX + (footerW / 2), footerY + 16, { align: "center" });

    // Numero do Lote grande no canto Top Right (Header)
    doc.setLineWidth(0.5);
    doc.roundedRect(pageWidth - 46, 12, 31, 14, 2, 2);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`LOTE ${String(lote.numero).padStart(2, '0')}`, pageWidth - 30.5, 21.5, { align: "center" });

    doc.save(`CERTIDAO_LOTE_${lote.numero}.pdf`);
  };

  const handleConfirmarFinalizacao = async () => {
    if (!modalLote) return;
    if (!arquivoAssinado) {
      alert("Por favor, anexe a certidão assinada para concluir.");
      return;
    }

    setFinalizando(true);
    try {
      await finalizarLote(modalLote.id, arquivoAssinado);
      alert("Lote finalizado e documento anexado com sucesso!");
      setModalLote(null);
      setArquivoAssinado(null);
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center" }}>Carregando lotes...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      
      {/* Modal de Finalização (Semelhante ao Itens no Cofre) */}
      {modalLote && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000,
          backdropFilter: "blur(6px)"
        }}>
          <div style={{ background: "white", padding: "40px", borderRadius: "20px", width: "550px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #f1f5f9", paddingBottom: "20px" }}>
              <span style={{ fontSize: "32px", marginRight: "15px" }}>🔥</span>
              <div>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>Finalizar Lote {String(modalLote.numero).padStart(2, '0')}</h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Siga os passos abaixo para concluir a incineração.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: "15px", marginBottom: "30px" }}>
              {/* Passo 1 */}
              <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#143a2b", textTransform: "uppercase" }}>Passo 1</span>
                    <p style={{ margin: "2px 0 0", fontSize: "14px", color: "#334155" }}>Gerar certidão para coleta de assinaturas.</p>
                  </div>
                  <button className="btn-green" onClick={() => gerarCertidaoPDF(modalLote)} style={{ padding: "8px 15px", fontSize: "12px" }}>📄 BAIXAR PDF</button>
                </div>
              </div>

              {/* Passo 2 */}
              <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#143a2b", textTransform: "uppercase" }}>Passo 2</span>
                <p style={{ margin: "2px 0 10px", fontSize: "14px", color: "#334155" }}>Anexar documento assinado (PDF ou Imagem - Máx 2MB).</p>
                <input 
                  type="file" 
                  accept="application/pdf,image/jpeg,image/png" 
                  style={{ width: "100%", fontSize: "13px" }} 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size > 2 * 1024 * 1024) {
                      alert("O arquivo excede o limite de 2MB!");
                      e.target.value = "";
                      setArquivoAssinado(null);
                    } else {
                      setArquivoAssinado(file);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="btn-outline-gray" 
                style={{ flex: 1, padding: "12px", borderRadius: "10px", fontWeight: "600" }} 
                onClick={() => { setModalLote(null); setArquivoAssinado(null); }}
              >
                CANCELAR
              </button>
              <button 
                className="btn-green" 
                style={{ flex: 2, padding: "12px", borderRadius: "10px", fontWeight: "600", background: arquivoAssinado ? "#143a2b" : "#94a3b8" }} 
                onClick={handleConfirmarFinalizacao}
                disabled={!arquivoAssinado || finalizando}
              >
                {finalizando ? "PROCESSANDO..." : "CONCLUIR INCINERAÇÃO"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => setModalLote(lote)}
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