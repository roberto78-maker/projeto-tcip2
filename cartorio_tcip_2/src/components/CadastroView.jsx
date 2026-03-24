import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addApreensao } from "../services/api.js";
import { getUsuario } from "../services/auth.js";
import logoBpm from "../assets/brasao.png";

const FormGroup = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  width: "100%",
  boxSizing: "border-box",
  background: "white",
  color: "#1e293b"
};

export default function CadastroView() {
  const [dataFato, setDataFato] = useState("");
  const [bou, setBou] = useState(`${new Date().getFullYear()}/`);
  const [processo, setProcesso] = useState("");
  const [vara, setVara] = useState("");

  const [unidadeOrigem, setUnidadeOrigem] = useState("RPA");
  const [patente, setPatente] = useState("SD");
  const [policial, setPolicial] = useState("");
  const [rg, setRg] = useState("");

  // Estado para Múltiplas Substâncias / Noticiados
  const [materiais, setMateriais] = useState([
    { id: Date.now(), reu: "", substancia: "Maconha", peso: "", unidadePeso: "g", lacre: "" }
  ]);

  const upper = (t) => t.toUpperCase();

  const adicionarMaterial = () => {
    setMateriais([...materiais, { id: Date.now(), reu: "", substancia: "Maconha", peso: "", unidadePeso: "g", lacre: "" }]);
  };

  const removerMaterial = (id) => {
    if (materiais.length > 1) {
      setMateriais(materiais.filter(m => m.id !== id));
    }
  };

  const updateMaterial = (id, field, value) => {
    setMateriais(materiais.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const formatarPeso = (valor) => {
    valor = valor.replace(/\D/g, "");
    valor = (parseInt(valor || "0") / 100).toFixed(2);
    return valor.replace(".", ",");
  };

  // Mascara RG: 00.000.000-0
  const formatarRG = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 9);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
  };

  // Mascara BOU: AAAA/NNNNNNN - protege o ano
  const anoAtual = new Date().getFullYear().toString();
  const formatarBOU = (v) => {
    let raw = v.replace(/[^\d/]/g, "");
    if (!raw.startsWith(anoAtual + "/")) {
      raw = anoAtual + "/";
    }
    const partes = raw.split("/");
    const seq = (partes[1] || "").replace(/\D/g, "").slice(0, 7);
    return `${anoAtual}/${seq}`;
  };

  // Mascara Processo: 0000000-00.0000
  const formatarProcesso = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 7) return d;
    if (d.length <= 9) return `${d.slice(0, 7)}-${d.slice(7)}`;
    if (d.length <= 13) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9)}`;
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}`;
  };

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

  const gerarPDF = async (dados) => {
    const doc = new jsPDF();
    const marginX = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (marginX * 2);
    const centerX = pageWidth / 2;
    let currY = 15;

    const img = new Image();
    img.src = logoBpm;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

    try { doc.addImage(img, "PNG", centerX - 12, currY, 24, 28); } catch (e) { }
    currY += 35;

    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("ESTADO DO PARANÁ", centerX, currY, { align: "center" }); currY += 5;
    doc.text("POLÍCIA MILITAR DO PARANÁ", centerX, currY, { align: "center" }); currY += 5;
    doc.text("6º BATALHÃO DE POLÍCIA MILITAR", centerX, currY, { align: "center" }); currY += 5;

    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text("Seção de Custódia de Materiais Apreendidos", centerX, currY, { align: "center" }); currY += 6;
    doc.line(marginX, currY, pageWidth - marginX, currY); currY += 10;

    doc.setFont("helvetica", "bold");
    const anoRecibo = dados.bou.split("/")[0] || new Date().getFullYear();
    const numAleatorio = Math.floor(Math.random() * 900) + 100;
    doc.text(`RECIBO DE DEPÓSITO DE SUBSTÂNCIAS ENTORPECENTES Nº ${numAleatorio}/${anoRecibo}`, centerX, currY, { align: "center" }); currY += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold"); doc.text("BOU:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.bou || "", marginX + 11, currY);
    doc.setFont("helvetica", "bold"); doc.text("PROJUDI:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.processo || "", centerX + 25, currY); currY += 7;
    doc.setFont("helvetica", "bold"); doc.text("VARA:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.vara || "", marginX + 13, currY);
    doc.setFont("helvetica", "bold"); doc.text("UNIDADE:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.unidadeOrigem || "", centerX + 26, currY); currY += 12;

    const texto = `Certifico para os devidos fins que, na data de hoje, recebi do(a) ${dados.patente} ${dados.policial}, RG ${dados.rg}, pertencente à unidade policial ${dados.unidadeOrigem}, a custódia das substâncias entorpecentes listadas abaixo, apreendida os autos acima referenciados, para fins de armazenamento e posterior incineração mediante ordem judicial.`;
    const splitText = doc.splitTextToSize(texto, contentWidth);
    doc.text(texto, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitText.length * 4.5) + 5;

    const bodyTable = dados.materiais.map((item, index) => [
      `1.${index + 1}`,
      item.reu || "NÃO IDENTIFICADO",
      item.substancia,
      formatarPesoDisplay(item.peso, item.unidadePeso),
      item.lacre || "N/A"
    ]);

    autoTable(doc, {
      startY: currY,
      head: [["Item", "Noticiado/Infrator", "Substância", "Peso/Qtd (Estimado)", "Nº Lacre/Vestígio"]],
      body: bodyTable,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
      margin: { left: marginX, right: marginX },
    });

    currY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    const obsText = "Obs: O peso real será aferido em balança de precisão durante a conferência de entrada no cofre, podendo haver variações em relação ao peso estimado declarado no momento da entrega.";
    const splitObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(obsText, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitObs.length * 4) + 40;

    const lineSize = 70;
    doc.line(marginX, currY, marginX + lineSize, currY);
    doc.setFont("helvetica", "bold"); doc.text(`${dados.patente.toUpperCase()} ${dados.policial.toUpperCase()}`, marginX + (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text(`RG: ${dados.rg}`, marginX + (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Responsável pela Entrega", marginX + (lineSize / 2), currY + 15, { align: "center" });

    doc.line(pageWidth - marginX - lineSize, currY, pageWidth - marginX, currY);
    doc.setFont("helvetica", "bold"); doc.text("ADMIN", pageWidth - marginX - (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text("6º BPM - Cartório de Custódia", pageWidth - marginX - (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Recebedor / Cartorário", pageWidth - marginX - (lineSize / 2), currY + 15, { align: "center" });

    const dataHora = new Date().toLocaleString("pt-BR").replace(',', ' -');
    doc.setFontSize(8); doc.setFont("helvetica", "italic");
    doc.text(`Gerado em: ${dataHora}`, pageWidth - marginX, 285, { align: "right" });

    doc.save(`RECIBO_${dados.bou.replace(/\//g, "-")}.pdf`);
  };

  const salvar = async () => {
    // 1. Validação
    if (!processo || !bou || !policial) {
      alert("Preencha todos os campos da ocorrência (BOU, PROJUDI, Policial).");
      return;
    }

    // Verifica se todos os materiais têm peso
    const materialIncompleto = materiais.find(m => !m.peso || m.peso === "0,00");
    if (materialIncompleto) {
      alert("Todos os materiais/noticiados devem ter um peso preenchido.");
      return;
    }

    try {
      console.log("Iniciando salvamento de", materiais.length, "itens...");

      // 2. Salva cada material como um registro individual no backend
      const promises = materiais.map(async (m) => {
        const p = parseFloat(String(m.peso).replace(",", "."));
        if (isNaN(p)) throw new Error(`Peso inválido para o item ${m.reu}`);

        const payload = {
          processo,
          bou,
          reu: m.reu || "NÃO IDENTIFICADO",
          substancia: m.substancia,
          peso: p,
          unidade: m.unidadePeso,
          status: "conferencia",
          lacre: m.lacre || "",
          vara: vara || "",
          policial: `${patente} ${policial}`
        };

        console.log("Enviando payload:", payload);
        return addApreensao(payload);
      });

      await Promise.all(promises);
      console.log("Todos os itens foram salvos no banco de dados.");

      // 3. Geração do PDF
      try {
        console.log("Iniciando geração do PDF...");
        await gerarPDF({ processo, bou, materiais, vara, patente, policial, rg, unidadeOrigem });
        console.log("PDF gerado com sucesso.");
      } catch (pdfErr) {
        console.error("Erro PDF:", pdfErr);
        alert("Os dados foram salvos, mas houve um erro ao gerar o PDF: " + pdfErr.message);
      }

      alert("Registros inseridos com sucesso e Recibo Gerado!");

      // Limpa formulário
      setProcesso("");
      setRg("");
      setMateriais([{ id: Date.now(), reu: "", substancia: "Maconha", peso: "", unidadePeso: "g", lacre: "" }]);

    } catch (err) {
      console.error("Erro Geral Salvar:", err);
      alert("Não foi possível finalizar o registro: " + (err.message || "Erro desconhecido"));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>🛡️ 1. DADOS DA OCORRÊNCIA</h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>OPERADOR: {getUsuario()?.username?.toUpperCase()}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <FormGroup label="Data do Fato *"><input type="date" style={inputStyle} value={dataFato} onChange={e => setDataFato(e.target.value)} /></FormGroup>
          <FormGroup label="Nº BOU *"><input type="text" style={inputStyle} value={bou} onChange={e => setBou(formatarBOU(e.target.value))} /></FormGroup>
          <FormGroup label="PROJUDI *"><input type="text" style={inputStyle} value={processo} onChange={e => setProcesso(formatarProcesso(e.target.value))} /></FormGroup>
          <FormGroup label="Vara Destino *">
            <select style={inputStyle} value={vara} onChange={e => setVara(e.target.value)}>
              <option value="">Selecione...</option>
              <option>1ª VARA ESPECIAL CRIMINAL</option><option>2ª VARA ESPECIAL CRIMINAL</option><option>3ª VARA ESPECIAL CRIMINAL</option>
            </select>
          </FormGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr", gap: "20px" }}>
          <FormGroup label="Unidade">
            <select style={inputStyle} value={unidadeOrigem} onChange={e => setUnidadeOrigem(e.target.value)}>
              <option>RPA</option><option>ROCAM</option><option>ROTAM</option><option>CHOQUE</option><option>BOPE</option><option>CAVALARIA</option><option>BPRV</option><option>BPMOA</option><option>GOTRAN</option><option>BPEC</option><option>TRANSITO</option>
            </select>
          </FormGroup>
          <FormGroup label="Graduação">
            <select style={inputStyle} value={patente} onChange={e => setPatente(e.target.value)}>
              <option>CEL</option><option>MAJ</option><option>CAP</option><option>SGT</option><option>CB</option><option>SD</option><option>TEN</option><option>ASP</option><option>AL</option>
            </select>
          </FormGroup>
          <FormGroup label="Policial Entregador *"><input type="text" style={inputStyle} value={policial} onChange={e => setPolicial(upper(e.target.value))} /></FormGroup>
          <FormGroup label="RG *"><input type="text" style={inputStyle} value={rg} onChange={e => setRg(formatarRG(e.target.value))} /></FormGroup>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>👤 2. NOTICIADOS E MATERIAIS</h2>
          <button className="btn-blue" onClick={adicionarMaterial} style={{ fontSize: "12px" }}>+ Adicionar Noticiado/Droga</button>
        </div>

        {materiais.map((m, idx) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", gap: "20px", background: "#f8fafc", padding: "15px", borderRadius: "8px", borderLeft: "4px solid #10b981", marginBottom: "10px" }}>
            <FormGroup label="Noticiado"><input type="text" style={inputStyle} value={m.reu} onChange={e => updateMaterial(m.id, "reu", upper(e.target.value))} /></FormGroup>
            <FormGroup label="Substância *">
              <select style={inputStyle} value={m.substancia} onChange={e => updateMaterial(m.id, "substancia", e.target.value)}>
                <option>Maconha</option><option>Crack</option><option>Cocaína</option><option>Ecstasy</option><option>Haxixe</option><option>LSD</option><option>Pé de Maconha</option>
              </select>
            </FormGroup>
            <FormGroup label="Peso Est. *">
              <div style={{ display: "flex", gap: "4px" }}>
                <input type="text" style={{ ...inputStyle, flex: 2 }} value={m.peso} onChange={e => updateMaterial(m.id, "peso", formatarPeso(e.target.value))} />
                <select style={{ ...inputStyle, flex: 1, padding: "10px 4px" }} value={m.unidadePeso} onChange={e => updateMaterial(m.id, "unidadePeso", e.target.value)}>
                  <option value="g">g</option><option value="Kg">Kg</option><option value="Unid">Unid</option>
                </select>
              </div>
            </FormGroup>
            <FormGroup label="Lacre"><input type="text" style={inputStyle} value={m.lacre} onChange={e => updateMaterial(m.id, "lacre", e.target.value)} /></FormGroup>
            <button onClick={() => removerMaterial(m.id)} style={{ alignSelf: "center", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "20px" }} title="Remover">×</button>
          </div>
        ))}
      </div>

      <button className="btn-green" onClick={salvar} style={{ width: "100%", padding: "16px", fontWeight: "700" }}>
        FINALIZAR REGISTRO E GERAR RECIBO
      </button>
    </div>
  );
}