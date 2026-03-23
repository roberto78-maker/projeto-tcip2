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

  const [unidadeOrigem, setUnidadeOrigem] = useState("1ª CIA");
  const [patente, setPatente] = useState("Soldado");
  const [policial, setPolicial] = useState("");
  const [rg, setRg] = useState("");

  const [reu, setReu] = useState("");
  const [substancia, setSubstancia] = useState("Maconha");
  const [peso, setPeso] = useState("");
  const [unidadePeso, setUnidadePeso] = useState("g");
  const [lacre, setLacre] = useState("");

  const upper = (t) => t.toUpperCase();

  const formatarPeso = (valor) => {
    valor = valor.replace(/\D/g, "");
    valor = (parseInt(valor || "0") / 100).toFixed(2);
    return valor.replace(".", ",");
  };

  // Mascara RG: 00.000.000-0
  const formatarRG = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 9);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}-${d.slice(8)}`;
  };

  // Mascara BOU: AAAA/NNNNNNN - protege o ano
  const anoAtual = new Date().getFullYear().toString();
  const formatarBOU = (v) => {
    // Remove tudo que nao for digito ou barra
    let raw = v.replace(/[^\d/]/g, "");
    // Garante que começa com ano
    if (!raw.startsWith(anoAtual + "/")) {
      raw = anoAtual + "/";
    }
    // Limita a parte apos a barra
    const partes = raw.split("/");
    const seq = (partes[1] || "").replace(/\D/g, "").slice(0, 7);
    return `${anoAtual}/${seq}`;
  };

  // Mascara Processo: 0000000-00.0000
  const formatarProcesso = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 7) return d;
    if (d.length <= 9) return `${d.slice(0,7)}-${d.slice(7)}`;
    if (d.length <= 13) return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9)}`;
    return `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}`;
  };

  // Formata peso para exibição: abaixo de 1000g exibe g, acima exibe Kg
  const formatarPesoDisplay = (valor, unidade) => {
    const num = parseFloat(String(valor).replace(",", ".")) || 0;
    if (["Kg", "kg"].includes(unidade)) {
      return `${num.toFixed(3).replace(".", ",")} Kg`;
    }
    if (["Gr", "g"].includes(unidade)) {
      if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
      return `${num.toFixed(2).replace(".", ",")} g`;
    }
    if (["Mg", "mg"].includes(unidade)) return `${num.toFixed(2).replace(".", ",")} mg`;
    return `${num} ${unidade}`; // Unid ou outros
  };

  const gerarPDF = async (dados) => {
    const doc = new jsPDF();

    // Configurações de Layout
    const marginX = 15; // Margem padrão para alinhar com a tabela
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (marginX * 2); // Largura útil do texto
    const centerX = pageWidth / 2;
    let currY = 15;

    // ----- CABEÇALHO -----
    const img = new Image();
    img.src = logoBpm;

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    try {
      doc.addImage(img, "PNG", centerX - 12, currY, 24, 28);
    } catch (e) {
      console.warn("Brasão não carregado");
    }
    currY += 35;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ESTADO DO PARANÁ", centerX, currY, { align: "center" }); currY += 5;
    doc.text("POLÍCIA MILITAR DO PARANÁ", centerX, currY, { align: "center" }); currY += 5;
    doc.text("6º BATALHÃO DE POLÍCIA MILITAR", centerX, currY, { align: "center" }); currY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Seção de Custódia de Materiais Apreendidos", centerX, currY, { align: "center" }); currY += 6;

    doc.setLineWidth(0.5);
    doc.line(marginX, currY, pageWidth - marginX, currY);
    currY += 10;

    // ----- TÍTULO -----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const anoRecibo = dados.bou.split("/")[0] || new Date().getFullYear();
    const numAleatorio = Math.floor(Math.random() * 900) + 100;
    doc.text(`RECIBO DE DEPÓSITO DE SUBSTÂNCIAS ENTORPECENTES Nº ${numAleatorio}/${anoRecibo}`, centerX, currY, { align: "center" });
    currY += 12;

    // ----- INFORMAÇÕES BÁSICAS (GRID) -----
    doc.setFontSize(10);
    // Coluna 1
    doc.setFont("helvetica", "bold"); doc.text("BOU:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.bou || "", marginX + 11, currY);

    // Coluna 2 (Alinhado à metade da página)
    doc.setFont("helvetica", "bold"); doc.text("PROJUDI:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.processo || "", centerX + 25, currY);
    currY += 7;

    doc.setFont("helvetica", "bold"); doc.text("VARA:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.vara || "", marginX + 13, currY);

    doc.setFont("helvetica", "bold"); doc.text("UNIDADE:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.unidadeOrigem || "", centerX + 26, currY);
    currY += 12;

    // ----- TEXTO DESCRITIVO (JUSTIFICADO E ALINHADO) -----
    doc.setFont("helvetica", "normal");
    const texto = `Certifico para os devidos fins que, na data de hoje, recebi do(a) ${dados.patente} ${dados.policial}, RG ${dados.rg}, pertencente à unidade policial ${dados.unidadeOrigem}, a custódia das substâncias entorpecentes listadas abaixo, apreendida os autos acima referenciados, para fins de armazenamento e posterior incineração mediante ordem judicial.`;

    const splitText = doc.splitTextToSize(texto, contentWidth);

    // Imprimir usando a string bruta para evitar o erro de over-stretching
    doc.text(texto, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitText.length * 4.5) + 5;

    // ----- TABELA DE ITENS -----
    autoTable(doc, {
      startY: currY,
      head: [["Item", "Noticiado/Infrator", "Substância", "Peso/Qtd (Estimado)", "Nº Lacre/Vestígio"]],
      body: [
        ["1.1", dados.reu || "NÃO IDENTIFICADO", dados.substancia, formatarPesoDisplay(dados.peso, dados.unidadePeso), dados.lacre || "N/A"]
      ],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        fontStyle: "bold",
      },
      margin: { left: marginX, right: marginX },
    });

    currY = doc.lastAutoTable.finalY + 10;

    // ----- OBSERVAÇÃO -----
    doc.setFontSize(8);
    const obsText = "Obs: O peso real será aferido em balança de precisão durante a conferência de entrada no cofre, podendo haver variações em relação ao peso estimado declarado no momento da entrega.";
    const splitObs = doc.splitTextToSize(obsText, contentWidth);

    // Imprimir a string bruta para evitar o erro de over-stretching
    doc.text(obsText, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitObs.length * 4) + 5;

    // ----- ASSINATURAS -----
    currY += 45;
    const lineSize = 70;

    // Assinatura Esquerda
    doc.line(marginX, currY, marginX + lineSize, currY);
    doc.setFont("helvetica", "bold");
    doc.text(`${dados.patente.toUpperCase()} ${dados.policial.toUpperCase()}`, marginX + (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`RG: ${dados.rg}`, marginX + (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Responsável pela Entrega", marginX + (lineSize / 2), currY + 15, { align: "center" });

    // Assinatura Direita
    doc.line(pageWidth - marginX - lineSize, currY, pageWidth - marginX, currY);
    doc.setFont("helvetica", "bold");
    doc.text("ADMIN", pageWidth - marginX - (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("6º BPM - Cartório de Custódia", pageWidth - marginX - (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Recebedor / Cartorário", pageWidth - marginX - (lineSize / 2), currY + 15, { align: "center" });

    // ----- RODAPÉ -----
    const dataHora = new Date().toLocaleString("pt-BR").replace(',', ' -');
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Gerado em: ${dataHora}`, pageWidth - marginX, 285, { align: "right" });

    const filename = `RECIBO_${dados.bou.replace(/\//g, "-")}.pdf`;
    doc.save(filename);
  };

  const salvar = async () => {
    if (!processo || !bou || !substancia || !peso || !policial) {
      alert("Preencha os campos obrigatórios (BOU, PROJUDI, Substância, Peso, Policial).");
      return;
    }

    try {
      const payload = {
        processo,
        bou,
        reu,
        substancia,
        peso: parseFloat(peso.replace(",", ".")),
        unidade: unidadePeso,
        status: "conferencia",
        lacre: lacre || "",
        vara: vara || "",
        policial: `${patente} ${policial}` || ""
      };

      await addApreensao(payload);

      // Gera o PDF
      await gerarPDF({
        processo,
        bou,
        reu,
        substancia,
        peso,
        unidadePeso,
        lacre,
        vara,
        patente,
        policial,
        rg,
        unidadeOrigem
      });

      alert("Registro inserido com sucesso na fila de conferência e Recibo Gerado!");

      setBou(`${new Date().getFullYear()}/`);
      setProcesso("");
      setReu("");
      setPolicial("");
      setRg("");
      setPeso("");
      setLacre("");
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar PDF ou salvar no servidor.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* SECTION 1 */}
      <div className="card" style={{ marginBottom: "0", padding: "25px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🛡️</span> 1. DADOS DA OCORRÊNCIA E CUSTÓDIA
          </h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>OPERADOR: {getUsuario()?.username?.toUpperCase() || "SISTEMA"}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <FormGroup label="Data do Fato *">
            <input type="date" style={inputStyle} value={dataFato} onChange={e => setDataFato(e.target.value)} />
          </FormGroup>
          <FormGroup label="Nº BOU (Ano/Sequência) *">
            <input type="text" style={inputStyle} value={bou} onChange={e => setBou(formatarBOU(e.target.value))} placeholder={`${anoAtual}/0000000`} />
          </FormGroup>
          <FormGroup label="Nº PROJUDI (Processo) *">
            <input type="text" style={inputStyle} placeholder="0001234-00.2026" value={processo} onChange={e => setProcesso(formatarProcesso(e.target.value))} />
          </FormGroup>
          <FormGroup label="Vara Destino *">
            <select style={inputStyle} value={vara} onChange={e => setVara(e.target.value)}>
              <option value="">Selecione a Vara...</option>
              <option>3ª VARA ESPECIAL CRIMINAL</option>
              <option>1ª VARA ESPECIAL CRIMINAL</option>
              <option>2ª VARA ESPECIAL CRIMINAL</option>
            </select>
          </FormGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr", gap: "20px" }}>
          <FormGroup label="Unidade/Equipe">
            <select style={inputStyle} value={unidadeOrigem} onChange={e => setUnidadeOrigem(e.target.value)}>
              <option>RPA</option>
              <option>ROCAM</option>
              <option>ROTAM</option>
              <option>CHOQUE</option>
              <option>BOPE</option>
              <option>CAVALARIA</option>
              <option>GOTRAN</option>
              <option>TRANSITO</option>
            </select>
          </FormGroup>
          <FormGroup label="Graduação">
            <select style={inputStyle} value={patente} onChange={e => setPatente(e.target.value)}>
              <option>CEL</option>
              <option>MAJ</option>
              <option>TEN</option>
              <option>CAP</option>
              <option>SGT</option>
              <option>CB</option>
              <option>SD</option>
            </select>
          </FormGroup>
          <FormGroup label="Nome do Policial (Entregador) *">
            <input type="text" style={inputStyle} placeholder="NOME DO POLICIAL" value={policial} onChange={e => setPolicial(upper(e.target.value))} />
          </FormGroup>
          <FormGroup label="RG do Policial *">
            <input type="text" style={inputStyle} placeholder="Ex: 12.528.000-1" value={rg} onChange={e => setRg(formatarRG(e.target.value))} />
          </FormGroup>
        </div>
      </div>

      {/* SECTION 2 */}
      <div className="card" style={{ marginBottom: "0", padding: "25px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>👤</span> 2. NOTICIADOS E MATERIAIS
          </h2>
          <button className="btn-blue" style={{ fontSize: "12px", padding: "6px 12px" }}>+ Adicionar Noticiado/Droga</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "20px", background: "#f8fafc", padding: "15px", borderRadius: "8px", borderLeft: "4px solid #10b981" }}>
          <FormGroup label="Nome do Noticiado">
            <input type="text" style={inputStyle} placeholder="NOME DO PRESO/INFRATOR" value={reu} onChange={e => setReu(upper(e.target.value))} />
          </FormGroup>
          <FormGroup label="Substância *">
            <select style={inputStyle} value={substancia} onChange={e => setSubstancia(e.target.value)}>
              <option>Maconha</option>
              <option>Pé de Maconha</option>
              <option>Crack</option>
              <option>Cocaína</option>
              <option>Ecstasy</option>
              <option>Haxixe</option>
              <option>LSD</option>
              <option>Outro</option>
            </select>
          </FormGroup>
          <FormGroup label="Peso Est. *">
            <div style={{ display: "flex", gap: "4px" }}>
              <input type="text" style={{ ...inputStyle, flex: 2 }} placeholder="0,00" value={peso} onChange={(e) => setPeso(formatarPeso(e.target.value))} />
              <select style={{ ...inputStyle, flex: 1, padding: "10px 4px" }} value={unidadePeso} onChange={e => setUnidadePeso(e.target.value)}>
                <option value="Kg">Kg</option>
                <option value="g">g</option>
                <option value="Unid">Unid</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </FormGroup>
          <FormGroup label="Nº Lacre/Vestígio">
            <input type="text" style={inputStyle} placeholder="Opcional" value={lacre} onChange={e => setLacre(e.target.value)} />
          </FormGroup>
        </div>

      </div>

      <button className="btn-green" onClick={salvar} style={{ width: "100%", padding: "16px", fontSize: "16px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>
        FINALIZAR REGISTRO E GERAR RECIBO
      </button>

    </div>
  );
}