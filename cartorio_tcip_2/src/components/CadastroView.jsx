import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addApreensao } from "../services/api.js";
import { getUsuario } from "../services/auth.js";
import { VARAS, SUBSTANCIAS, UNIDADES_PM, PATENTES, CRIMES_GERAIS } from "../constants/options.js";
import logoBpm from "../assets/brasao.png";
import AutocompleteInput, { saveHistory } from "./AutocompleteInput.jsx";

const FormGroup = ({ label, id, children, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label htmlFor={id} style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>
      {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
    </label>
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
   const [natureza, setNatureza] = useState("GERAL");
   const [crimesSelecionados, setCrimesSelecionados] = useState([]);
  const [fielDepositario, setFielDepositario] = useState(false);
  
  const [dataFato, setDataFato] = useState("");
  const [bou, setBou] = useState(`${new Date().getFullYear()}/`);
  const [processo, setProcesso] = useState("");
  const [vara, setVara] = useState("");

  const [unidadeOrigem, setUnidadeOrigem] = useState("RPA");
  const [patente, setPatente] = useState("SD");
  const [policial, setPolicial] = useState("");
  const [rg, setRg] = useState("");

   const [materiais, setMateriais] = useState([
    { id: Date.now(), reu: "", tipo: "OBJETO", substancia: "", peso: "1", unidadePeso: "Unid", lacre: "" }
  ]);

  const [salvando, setSalvando] = useState(false);

  const upper = (t) => t.toUpperCase();

   const adicionarMaterial = () => {
    setMateriais([...materiais, { id: Date.now(), reu: "", tipo: "OBJETO", substancia: "", peso: "1", unidadePeso: "Unid", lacre: "" }]);
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

  const formatarRG = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 9);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
  };

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

  const formatarProcesso = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 13);
    if (d.length <= 7) return d;
    if (d.length <= 9) return `${d.slice(0, 7)}-${d.slice(7)}`;
    if (d.length <= 13) return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9)}`;
    return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}`;
  };

  const formatarPesoDisplay = (valor, unidade) => {
    if (unidade === "Unid") return `${valor} Unid.`;
    const num = parseFloat(String(valor).replace(",", ".")) || 0;
    if (["Kg", "kg"].includes(unidade)) return `${num.toFixed(3).replace(".", ",")} Kg`;
    if (["Gr", "g"].includes(unidade)) {
      if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
      return `${num.toFixed(2).replace(".", ",")} g`;
    }
    return `${num.toFixed(2).replace(".", ",")} ${unidade}`;
  };

  const gerarPDF = async (dados) => {
    const { natureza, crimesSelecionados, materiais, fielDepositario, bou, vara, patente, policial, rg, unidadeOrigem, processo } = dados;
    const doc = new jsPDF();
    const marginX = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (marginX * 2);
    const centerX = pageWidth / 2;
    let currY = 15;

    const img = new Image();
    img.src = logoBpm;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

    // 🏛️ CABEÇALHO (Centralizado conforme modelo)
    try { doc.addImage(img, "PNG", marginX, currY, 20, 24); } catch (e) { }
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("ESTADO DO PARANÁ", centerX, currY + 5, { align: "center" });
    doc.text("POLÍCIA MILITAR", centerX, currY + 10, { align: "center" });
    doc.text("5º COMANDO REGIONAL DE POLÍCIA MILITAR", centerX, currY + 15, { align: "center" });
    doc.text("6º BATALHÃO DE POLÍCIA MILITAR", centerX, currY + 20, { align: "center" });
    doc.text("PRIMEIRO CARTÓRIO - TCIP", centerX, currY + 25, { align: "center" });
    
    currY += 32;
    doc.line(marginX, currY, pageWidth - marginX, currY); currY += 10;

    // 📜 TÍTULO (Padronizado conforme modelo)
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    const tituloDoc = "RECIBO DE OBJETOS APREENDIDOS";
    const anoRecibo = bou.split("/")[0] || new Date().getFullYear();
    const numAleatorio = Math.floor(Math.random() * 900) + 100;
    doc.text(`${tituloDoc} Nº ${numAleatorio}/${anoRecibo}`, centerX, currY, { align: "center" }); currY += 12;

    // 📋 DADOS GERAIS
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold"); doc.text("BOU:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(bou || "", marginX + 11, currY);
    doc.setFont("helvetica", "bold"); doc.text("PROJUDI:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(processo || "", centerX + 25, currY); currY += 7;
    doc.setFont("helvetica", "bold"); doc.text("VARA:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(vara || "", marginX + 13, currY); currY += 12;

    // ✍️ CERTIFICAÇÃO E NATUREZA
    const listaCrimesCalculada = [...new Set(crimesSelecionados)];
    const acaoCustoia = fielDepositario ? "nomeado FIEL DEPOSITÁRIO (Objeto permanece com proprietário)" : "a custódia";
    const textoBase = `Certifico para os devidos fins que, na data de hoje, recebi do(a) ${patente} ${policial}, RG ${rg}, pertencente à unidade policial ${unidadeOrigem}, ${acaoCustoia} dos itens listados abaixo conforme a natureza constatada:`;
    
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(textoBase, contentWidth);
    doc.text(textoBase, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitText.length * 5) + 5;

    // ⚡ LISTA DE NATUREZAS (Apenas crimes, Fonte 10pt para combinar)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    listaCrimesCalculada.forEach(crime => {
        doc.text(`✓ ${crime}`, marginX + 5, currY);
        currY += 4;
    });
    currY += 8;

    // 📦 TABELA DE MATERIAIS (Unificada - Mostra todos para auditoria)
    if (materiais.length > 0) {
        const bodyTable = materiais.map((item, index) => {
            let descFinal = "";
            if (item.tipo === "NENHUM") {
                descFinal = "(S/ APREENSÃO FÍSICA)";
            } else {
                const prefixo = item.tipo === 'DROGA' ? 'DROGA - ' : item.tipo === 'SOM' ? 'SOM - ' : 'OBJETO - ';
                descFinal = `${prefixo}${item.substancia}`;
            }

            return [
                `1.${index + 1}`,
                item.reu || "NÃO IDENTIFICADO",
                descFinal,
                item.tipo === "NENHUM" ? "0 Uni." : formatarPesoDisplay(item.peso, item.unidadePeso),
                item.lacre || "N/A"
            ];
        });

        autoTable(doc, {
            startY: currY,
            head: [["Item", "Noticiado/Infrator", "Objeto/Substância", "Qtd/Peso", "Nº Lacre"]],
            body: bodyTable,
            theme: "grid",
            styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], fontStyle: "bold" },
            margin: { left: marginX, right: marginX },
        });
        currY = doc.lastAutoTable.finalY + 10;
    } else {
        const noticiados = dados.materiais.map(m => m.reu || "NÃO IDENTIFICADO").join(", ");
        doc.setFont("helvetica", "bold"); doc.text("NOTICIADO(S): ", marginX, currY);
        doc.setFont("helvetica", "normal"); doc.text(noticiados, marginX + 28, currY);
        currY += 8;
        doc.setFont("helvetica", "bold"); 
        doc.text("OBSERVAÇÃO: NÃO HOUVE OBJETOS APREENDIDOS NESTE PROCEDIMENTO.", marginX, currY);
        currY += 12;
    }

    // 📝 OBSERVAÇÕES
    doc.setFontSize(8);
    const obsText = "Obs: O material coletado é de responsabilidade exclusiva da equipe policial signatária, na qual os entorpecentes são recebidos mediante embalagem de custódia com lacre discriminado. Os demais objetos que compõem o termo, como aparelhos de som e facas, serão recebidos no estado em que se encontram no momento da entrega a este cartório.";
    const splitObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(obsText, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitObs.length * 4) + 40;

    // 🖊️ ASSINATURAS
    const lineSize = 70;
    doc.line(marginX, currY, marginX + lineSize, currY);
    doc.setFont("helvetica", "bold"); doc.text(`${patente.toUpperCase()} ${policial.toUpperCase()}`, marginX + (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text(`RG: ${rg}`, marginX + (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Responsável pela Entrega", marginX + (lineSize / 2), currY + 15, { align: "center" });

    const usuario = getUsuario();
    const nomeOperador = usuario?.username?.toUpperCase() || "ADMIN";

    doc.line(pageWidth - marginX - lineSize, currY, pageWidth - marginX, currY);
    doc.setFont("helvetica", "bold"); doc.text(nomeOperador, pageWidth - marginX - (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text("Primeiro Cartório - TCIP", pageWidth - marginX - (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Recebedor / Cartorário", pageWidth - marginX - (lineSize / 2), currY + 15, { align: "center" });

    // 🕒 RODAPÉ COM DATA/HORA (PROTOCOLO)
    doc.setFontSize(7);
    const agora = new Date();
    const dataHora = agora.toLocaleDateString("pt-BR") + " - " + agora.toLocaleTimeString("pt-BR");
    const protocolo = `PROTOCOLADO: #${numAleatorio}/${anoRecibo}`;
    doc.text(`Gerado em: ${dataHora} - ${protocolo}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 10, { align: "right" });
    
    doc.save(`RECIBO_${bou.replace(/\//g, "-")}.pdf`);
  };

  const salvar = async () => {
    if (salvando) return;

    // 🚩 Validação de Segurança (Campos Obrigatórios solicitados pelo usuário)
    if (crimesSelecionados.length === 0) return alert("⚠️ Selecione pelo menos um CRIME para prosseguir.");
    if (!dataFato) return alert("⚠️ Informe a DATA DO FATO.");
    if (!bou || bou.length < 8) return alert("⚠️ Informe o Nº BOU completo.");
    if (!processo) return alert("⚠️ Informe o Nº PROJUDI.");
    if (!vara) return alert("⚠️ Selecione a VARA criminal.");
    if (!unidadeOrigem) return alert("⚠️ Selecione a UNIDADE de origem.");
    if (!patente) return alert("⚠️ Selecione a GRADUAÇÃO do policial.");
    if (!policial) return alert("⚠️ Informe o NOME do Policial Entregador.");
    if (!rg) return alert("⚠️ Informe o RG do policial.");

    // Validação da Lista de Materiais
    for (const [index, m] of materiais.entries()) {
        const itemNum = index + 1;
        if (!m.reu) return alert(`⚠️ Item ${itemNum}: Informe o NOTICIADO / AUTOR.`);
        if (!m.tipo) return alert(`⚠️ Item ${itemNum}: Selecione o TIPO.`);
        if (m.tipo !== "NENHUM" && !m.substancia) return alert(`⚠️ Item ${itemNum}: Informe a APREENSÃO / SUBSTÂNCIA.`);
        if (!m.peso || m.peso === "0" || m.peso === "0,00") return alert(`⚠️ Item ${itemNum}: Informe a QUANTIA / PESO.`);
    }

    setSalvando(true);
    try {
      // 🔄 Salvamento Sequencial: Evita travamentos de banco (DB Locked)
      // e garante que se um falhar, o processo pare imediatamente.
      for (const m of materiais) {
        const p = parseFloat(String(m.peso).replace(",", "."));
        const payload = {
          processo,
          bou,
          reu: m.reu || "NÃO IDENTIFICADO",
          natureza: m.tipo === "DROGA" ? "DROGAS" : (m.tipo === "SOM" ? "SOM" : m.tipo === "NENHUM" ? "AMEACA" : "OUTROS"),
          substancia: m.substancia || (m.tipo === "NENHUM" ? "NÃO HÁ APREENSÃO" : ""), 
          descricao: (crimesSelecionados && crimesSelecionados.length > 0) ? crimesSelecionados.join(', ') : "TERMO GERAL",
          peso: isNaN(p) ? 0 : p,
          unidade: m.unidadePeso,
          status: (m.tipo === "NENHUM" || (m.tipo !== "DROGA" && (!m.substancia || fielDepositario))) ? "arquivado" : "conferencia",
          lacre: m.lacre || "",
          vara: vara || "",
          policial: `${patente} ${policial}`
        };

        await addApreensao(payload);
      }

      const temAlgumaDroga = materiais.some(m => m.tipo === "DROGA");
      const naturezaGeral = temAlgumaDroga ? "DROGAS" : "OUTROS";
      await gerarPDF({ processo, bou, materiais, vara, patente, policial, rg, unidadeOrigem, natureza: naturezaGeral, crimesSelecionados, fielDepositario });

      alert("Procedimento registrado com sucesso!");
      setProcesso("");
      setRg("");
      setPolicial("");
      setCrimesSelecionados([]);
      setMateriais([{ id: Date.now(), reu: "", tipo: "OBJETO", substancia: "", peso: "1", unidadePeso: "Unid", lacre: "" }]);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "0", letterSpacing: "1px" }}>GESTÃO DE CARTÓRIO - TCIP</h1>
      </div>

      <div className="card" style={{ border: "2px solid #3b82f6", background: "#f8fafc", padding: "20px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          ⚖️ SELECIONE A(S) NATUREZA(S) DO PROCEDIMENTO <span style={{ color: "#ef4444", fontSize: "12px" }}>(OBRIGATÓRIO *)</span>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px", maxHeight: "250px", overflowY: "auto", paddingRight: "10px" }}>
            {CRIMES_GERAIS.map(cr => (
                <label key={cr} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#475569", cursor: "pointer", padding: "6px", borderRadius: "6px", background: crimesSelecionados.includes(cr) ? "#eff6ff" : "transparent" }}>
                    <input type="checkbox" checked={crimesSelecionados.includes(cr)} onChange={(e) => {
                        if (e.target.checked) setCrimesSelecionados([...crimesSelecionados, cr]);
                        else setCrimesSelecionados(crimesSelecionados.filter(item => item !== cr));
                    }} />
                    {cr}
                </label>
            ))}
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", background: fielDepositario ? "#fef2f2" : "#f8fafc", padding: "12px 25px", borderRadius: "12px", border: fielDepositario ? "1px solid #fecaca" : "1px solid #e2e8f0", cursor: "pointer" }}>
                <input type="checkbox" checked={fielDepositario} onChange={(e) => setFielDepositario(e.target.checked)} style={{ width: "18px", height: "18px" }} />
                <span style={{ fontSize: "13px", fontWeight: "700", color: fielDepositario ? "#dc2626" : "#475569" }}>
                    🛡️ ENTREGAR COMO FIEL DEPOSITÁRIO (Objeto fica com o proprietário)
                </span>
            </label>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>
             🛡️ 1. DADOS DA OCORRÊNCIA ({crimesSelecionados.length > 0 ? crimesSelecionados.join(', ') : 'GERAL'})
          </h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>OPERADOR: {getUsuario()?.username?.toUpperCase()}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: "15px", marginBottom: "20px" }}>
          <FormGroup label="DATA DO FATO *" id="dataFato"><input type="date" id="dataFato" name="dataFato" style={inputStyle} value={dataFato} onChange={e => setDataFato(e.target.value)} /></FormGroup>
          <FormGroup label="Nº BOU (AAAA/Seq) *" id="bou"><input type="text" id="bou" name="bou" style={inputStyle} value={bou} onChange={e => setBou(formatarBOU(e.target.value))} /></FormGroup>
          <FormGroup label="PROJUDI *" id="processo"><input type="text" id="processo" name="processo" style={inputStyle} value={processo} onChange={e => setProcesso(formatarProcesso(e.target.value))} /></FormGroup>
          <FormGroup label="VARA DESTINO *" id="vara">
            <select id="vara" name="vara" style={inputStyle} value={vara} onChange={e => setVara(e.target.value)}>
              <option value="">Selecione...</option>
              {VARAS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </FormGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2.5fr 1.5fr", gap: "15px" }}>
          <FormGroup label="UNIDADE DE ORIGEM *" id="unidadeOrigem">
            <select id="unidadeOrigem" name="unidadeOrigem" style={inputStyle} value={unidadeOrigem} onChange={e => setUnidadeOrigem(e.target.value)}>
              {UNIDADES_PM.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="GRADUAÇÃO *" id="patente">
            <select id="patente" name="patente" style={inputStyle} value={patente} onChange={e => setPatente(e.target.value)}>
              {PATENTES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="POLICIAL ENTREGADOR *" id="policial">
            <AutocompleteInput
              id="policial"
              name="policial"
              historyKey="hist_policial"
              value={policial}
              onChange={e => setPolicial(upper(e.target.value))}
              style={inputStyle}
              placeholder="Nome do policial..."
            />
          </FormGroup>
          <FormGroup label="RG *" id="rg">
            <AutocompleteInput
              id="rg"
              name="rg"
              historyKey="hist_rg"
              value={rg}
              onChange={e => setRg(formatarRG(e.target.value))}
              style={inputStyle}
              placeholder="00.000.000-0"
            />
          </FormGroup>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>👥 2. NOTICIADOS E APREENSOES</h2>
          <button className="btn-blue" onClick={adicionarMaterial} style={{ fontSize: "12px" }}>+ Adicionar Pessoa</button>
        </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 100px 100px 120px 40px", gap: "12px", marginBottom: "10px", padding: "0 10px" }}>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>NOTICIADO / AUTOR</label>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>TIPO</label>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>APREENSÃO / DROGA</label>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>QUANT. / PESO</label>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>UNID.</label>
            <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Nº LACRE</label>
            <div></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
           {materiais.map((m, idx) => (
            <div key={m.id} style={{ 
                display: "grid", 
                gridTemplateColumns: "1.5fr 1fr 1.5fr 100px 100px 120px 40px", 
                gap: "12px", 
                alignItems: "center", 
                background: "#f8fafc", 
                padding: "8px 10px", 
                borderRadius: "8px", 
                borderLeft: (m.tipo === 'DROGA' ? "4px solid #10b981" : m.tipo === 'SOM' ? "4px solid #f59e0b" : "4px solid #3b82f6") 
            }}>
                 <AutocompleteInput
                  historyKey="hist_noticiado"
                  value={m.reu}
                  onChange={e => updateMaterial(m.id, "reu", upper(e.target.value))}
                  style={{ ...inputStyle, padding: "8px" }}
                  placeholder="Nome..."
                />

                <select 
                  id={`tipo-${m.id}`} 
                  name={`tipo-${m.id}`} 
                  style={{ ...inputStyle, padding: "8px" }} 
                  value={m.tipo} 
                  onChange={e => {
                    const tipo = e.target.value;
                    let substancia = "";
                    let unidade = "Unid";
                    let peso = m.peso;

                    if (tipo === "DROGA") {
                        substancia = "Maconha";
                        unidade = "g";
                    } else if (tipo === "SOM") {
                        substancia = "Caixa de Som";
                        unidade = "Unid";
                    } else if (tipo === "NENHUM") {
                        substancia = "NÃO HÁ APREENSÃO";
                        unidade = "Unid";
                        peso = "0";
                    }
                    setMateriais(materiais.map(item => item.id === m.id ? { ...item, tipo, substancia, unidadePeso: unidade, peso } : item));
                }}>
                    <option value="OBJETO">⚙️ OBJETO</option>
                    <option value="DROGA">💊 DROGA</option>
                    <option value="SOM">🔊 SOM</option>
                    <option value="NENHUM">🚫 NENHUM</option>
                </select>

                {m.tipo === "DROGA" ? (
                    <select style={{ ...inputStyle, padding: "8px" }} value={m.substancia} onChange={e => updateMaterial(m.id, "substancia", e.target.value)}>
                        {SUBSTANCIAS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                ) : (
                    <input 
                      type="text" 
                      style={{ ...inputStyle, padding: "8px" }} 
                      value={m.substancia} 
                      onChange={e => updateMaterial(m.id, "substancia", upper(e.target.value))} 
                      placeholder="Descrição..." 
                    />
                )}

                <input 
                  type="text" 
                  style={{ ...inputStyle, padding: "8px" }} 
                  value={m.peso} 
                  onChange={e => updateMaterial(m.id, "peso", m.tipo === 'DROGA' ? formatarPeso(e.target.value) : e.target.value)} 
                  placeholder="0,00"
                />

                <select style={{ ...inputStyle, padding: "8px" }} value={m.unidadePeso} onChange={e => updateMaterial(m.id, "unidadePeso", e.target.value)}>
                  <option value="Unid">Unid</option>
                  <option value="g">g</option>
                  <option value="Kg">Kg</option>
                </select>

                <input 
                  type="text" 
                  style={{ ...inputStyle, padding: "8px" }} 
                  value={m.lacre} 
                  onChange={e => updateMaterial(m.id, "lacre", e.target.value)} 
                  placeholder="Lacre..."
                />

              <button onClick={() => removerMaterial(m.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "20px", fontWeight: "bold" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      <button 
        className="btn-green" 
        onClick={salvar} 
        disabled={salvando}
        style={{ width: "100%", padding: "16px", fontWeight: "800", opacity: salvando ? 0.7 : 1, cursor: salvando ? "not-allowed" : "pointer" }}
      >
         {salvando ? "PROCESSANDO..." : "FINALIZAR CADASTRO E GERAR RECIBO"}
      </button>
    </div>
  );
}
