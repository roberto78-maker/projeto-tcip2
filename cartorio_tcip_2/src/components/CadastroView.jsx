import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addApreensao } from "../services/api.js";
import { getUsuario } from "../services/auth.js";
import { VARAS, SUBSTANCIAS, UNIDADES_PM, PATENTES, NATUREZAS, CRIMES_GERAIS } from "../constants/options.js";
import logoBpm from "../assets/brasao.png";
import AutocompleteInput, { saveHistory } from "./AutocompleteInput.jsx";

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
  const [natureza, setNatureza] = useState("DROGAS");
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
    { id: Date.now(), reu: "", substancia: "Maconha", peso: "", unidadePeso: "g", lacre: "" }
  ]);

  const [salvando, setSalvando] = useState(false);

  const upper = (t) => t.toUpperCase();

  const handleNaturezaChange = (novaId) => {
    setNatureza(novaId);
    setCrimesSelecionados([]); // Reseta os crimes selecionados ao mudar de aba
    setFielDepositario(false); // Reseta fiel depositário
    // Se for Ameaça, limpa os materiais ou deixa apenas um placeholder
    if (novaId === "AMEACA" || novaId === "OUTROS") {
        setMateriais([{ id: Date.now(), reu: "", substancia: "APENAS REGISTRO", peso: "0,00", unidadePeso: "g", lacre: "" }]);
    } else if (novaId === "SOM") {
        setMateriais([{ id: Date.now(), reu: "", substancia: "Caixa de Som", peso: "1", unidadePeso: "Unid", lacre: "" }]);
    } else {
        setMateriais([{ id: Date.now(), reu: "", substancia: "Maconha", peso: "", unidadePeso: "g", lacre: "" }]);
    }
  };

  const adicionarMaterial = () => {
    const substanciaPadrao = natureza === "DROGAS" ? "Maconha" : natureza === "SOM" ? "Caixa de Som" : "APENAS REGISTRO";
    setMateriais([...materiais, { id: Date.now(), reu: "", substancia: substanciaPadrao, peso: "", unidadePeso: "g", lacre: "" }]);
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
    const { natureza } = dados;
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

    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text("PRIMEIRO CARTÓRIO - 6ºBPM", centerX, currY, { align: "center" }); currY += 6;
    doc.line(marginX, currY, pageWidth - marginX, currY); currY += 10;

    doc.setFont("helvetica", "bold");
    const titulo = natureza === "DROGAS" ? "RECIBO DE DEPÓSITO DE ENTORPECENTES" 
                 : natureza === "SOM" ? (dados.fielDepositario ? "TERMO DE FIEL DEPOSITÁRIO" : "RECIBO DE DEPÓSITO DE MATERIAIS APREENDIDOS")
                 : "CERTIDÃO DE RECEBIMENTO DE TERMO CIRCUNSTANCIADO";
    
    const anoRecibo = dados.bou.split("/")[0] || new Date().getFullYear();
    const numAleatorio = Math.floor(Math.random() * 900) + 100;
    doc.text(`${titulo} Nº ${numAleatorio}/${anoRecibo}`, centerX, currY, { align: "center" }); currY += 12;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold"); doc.text("BOU:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.bou || "", marginX + 11, currY);
    doc.setFont("helvetica", "bold"); doc.text("PROJUDI:", centerX + 5, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.processo || "", centerX + 25, currY); currY += 7;
    doc.setFont("helvetica", "bold"); doc.text("VARA:", marginX, currY);
    doc.setFont("helvetica", "normal"); doc.text(dados.vara || "", marginX + 13, currY); currY += 12;

    const nomeExibicaoNatureza = natureza === "OUTROS" ? (dados.crimesSelecionados?.join(', ') || "TERMO GERAL") : natureza;
    const acaoCustoia = dados.fielDepositario ? "nomeado FIEL DEPOSITÁRIO (Objeto permanece com proprietário)" : "a custódia";
    const textoBase = `Certifico para os devidos fins que, na data de hoje, recebi do(a) ${dados.patente} ${dados.policial}, RG ${dados.rg}, pertencente à unidade policial ${dados.unidadeOrigem}, ${acaoCustoia} dos itens listados abaixo conforme natureza "${nomeExibicaoNatureza}", para fins de registro e destinação legal.`;
    
    const splitText = doc.splitTextToSize(textoBase, contentWidth);
    doc.text(textoBase, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitText.length * 5) + 5;

    if (natureza !== "AMEACA" && natureza !== "OUTROS") {
        const bodyTable = dados.materiais.map((item, index) => [
          `1.${index + 1}`,
          item.reu || "NÃO IDENTIFICADO",
          item.substancia,
          formatarPesoDisplay(item.peso, item.unidadePeso),
          item.lacre || "N/A"
        ]);

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
        // Para Ameaça, apenas lista os nomes dos noticiados
        const noticiados = dados.materiais.map(m => m.reu || "NÃO IDENTIFICADO").join(", ");
        doc.setFont("helvetica", "bold"); doc.text("NOTICIADO(S): ", marginX, currY);
        doc.setFont("helvetica", "normal"); doc.text(noticiados, marginX + 28, currY);
        currY += 15;
    }

    doc.setFontSize(8);
    const obsText = "Obs: O procedimento foi devidamente registrado no Sistema TCIP. Se houver objetos, estes estão sob guarda da unidade. Se não houver objetos, o processo segue diretamente para o arquivo e baixa.";
    const splitObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(obsText, marginX, currY, { align: "justify", maxWidth: contentWidth });
    currY += (splitObs.length * 4) + 40;

    const lineSize = 70;
    doc.line(marginX, currY, marginX + lineSize, currY);
    doc.setFont("helvetica", "bold"); doc.text(`${dados.patente.toUpperCase()} ${dados.policial.toUpperCase()}`, marginX + (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text(`RG: ${dados.rg}`, marginX + (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Responsável pela Entrega", marginX + (lineSize / 2), currY + 15, { align: "center" });

    const usuario = getUsuario();
    const nomeOperador = usuario?.username?.toUpperCase() || "ADMIN";

    doc.line(pageWidth - marginX - lineSize, currY, pageWidth - marginX, currY);
    doc.setFont("helvetica", "bold"); doc.text(nomeOperador, pageWidth - marginX - (lineSize / 2), currY + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.text("Primeiro Cartório - 6ºBPM", pageWidth - marginX - (lineSize / 2), currY + 10, { align: "center" });
    doc.text("Recebedor / Cartorário", pageWidth - marginX - (lineSize / 2), currY + 15, { align: "center" });

    doc.save(`RECIBO_${dados.bou.replace(/\//g, "-")}.pdf`);
  };

  const salvar = async () => {
    if (salvando) return;

    if (!processo || !bou || !policial) {
      alert("Preencha todos os campos obrigatórios (BOU, PROJUDI, Policial).");
      return;
    }

    setSalvando(true);
    try {
      const promises = materiais.map(async (m) => {
        const p = parseFloat(String(m.peso).replace(",", "."));
        const payload = {
          processo,
          bou,
          reu: m.reu || "NÃO IDENTIFICADO",
          natureza: natureza,
          substancia: natureza === "OUTROS" ? (crimesSelecionados.join(', ') || "TERMO GERAL") : m.substancia,
          peso: isNaN(p) ? 0 : p,
          unidade: m.unidadePeso,
          status: (natureza === "AMEACA" || natureza === "OUTROS" || (natureza === "SOM" && fielDepositario)) ? "arquivado" : "conferencia",
          lacre: m.lacre || "",
          vara: vara || "",
          policial: `${patente} ${policial}`,
          tem_apreensao: (natureza !== "AMEACA" && natureza !== "OUTROS" && !(natureza === "SOM" && fielDepositario))
        };
        return addApreensao(payload);
      });

      await Promise.all(promises);
      await gerarPDF({ processo, bou, materiais, vara, patente, policial, rg, unidadeOrigem, natureza, crimesSelecionados, fielDepositario });

      alert("Procedimento registrado com sucesso!");
      setProcesso("");
      setRg("");
      setPolicial("");
      handleNaturezaChange(natureza);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 🚀 SELEÇÃO DE NATUREZA DO FATO CENTRALIZADA */}
      <div className="card" style={{ padding: "15px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "5px", width: "100%" }}>
          {NATUREZAS.map(n => (
            <button 
              key={n.id}
              onClick={() => handleNaturezaChange(n.id)}
              style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  border: "none",
                  background: natureza === n.id ? "#1e3a8a" : "#fff",
                  color: natureza === n.id ? "#fff" : "#64748b",
                  fontWeight: "700",
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: natureza === n.id ? "0 4px 12px rgba(30, 58, 138, 0.3)" : "none"
              }}
            >
              {n.label}
            </button>
          ))}
        </div>

        {/* Lista de Checkboxes para Natureza 'OUTROS' */}
        {natureza === "OUTROS" && (
            <div style={{ 
                width: "100%", 
                maxWidth: "100%", 
                marginTop: "10px", 
                padding: "20px", 
                background: "#f8fafc", 
                borderRadius: "12px", 
                border: "1px solid #e2e8f0",
                animation: "slideDown 0.3s ease-out" 
            }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#1e3a8a", display: "block", marginBottom: "15px", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px" }}>
                  ⚖️ SELECIONE OS CRIMES DESTE REGISTRO (MÚLTIPLA ESCOLHA):
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
                    {CRIMES_GERAIS.map(cr => (
                        <label key={cr} style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "10px", 
                            fontSize: "12px", 
                            color: "#475569", 
                            cursor: "pointer",
                            padding: "8px",
                            borderRadius: "6px",
                            background: crimesSelecionados.includes(cr) ? "#eff6ff" : "transparent",
                            border: crimesSelecionados.includes(cr) ? "1px solid #3b82f6" : "1px solid transparent",
                            transition: "all 0.2s"
                        }}>
                            <input 
                                type="checkbox" 
                                checked={crimesSelecionados.includes(cr)} 
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setCrimesSelecionados([...crimesSelecionados, cr]);
                                    } else {
                                        setCrimesSelecionados(crimesSelecionados.filter(item => item !== cr));
                                    }
                                }} 
                            />
                            {cr}
                        </label>
                    ))}
                </div>
            </div>
        )}

        {natureza === "SOM" && (
            <div style={{ width: "100%", marginTop: "15px", display: "flex", justifyContent: "center" }}>
                <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px", 
                    background: fielDepositario ? "#fef2f2" : "#f8fafc", 
                    padding: "12px 25px", 
                    borderRadius: "12px", 
                    border: fielDepositario ? "1px solid #fecaca" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.2s"
                }}>
                    <input 
                        type="checkbox" 
                        checked={fielDepositario} 
                        onChange={(e) => setFielDepositario(e.target.checked)}
                        style={{ width: "18px", height: "18px" }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: fielDepositario ? "#dc2626" : "#475569" }}>
                        🛡️ ENTREGAR COMO FIEL DEPOSITÁRIO (Objeto fica com o proprietário)
                    </span>
                </label>
            </div>
        )}
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>
             🛡️ 1. DADOS DA OCORRÊNCIA ({natureza === 'OUTROS' ? (crimesSelecionados.length > 0 ? crimesSelecionados.join(', ') : 'GERAL') : natureza})
          </h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>OPERADOR: {getUsuario()?.username?.toUpperCase()}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <FormGroup label="Data do Fato *"><input type="date" style={inputStyle} value={dataFato} onChange={e => setDataFato(e.target.value)} /></FormGroup>
          <FormGroup label="Nº BOU (AAAA/Seq) *"><input type="text" style={inputStyle} value={bou} onChange={e => setBou(formatarBOU(e.target.value))} /></FormGroup>
          <FormGroup label="PROJUDI *"><input type="text" style={inputStyle} value={processo} onChange={e => setProcesso(formatarProcesso(e.target.value))} /></FormGroup>
          <FormGroup label="Vara Destino *">
            <select style={inputStyle} value={vara} onChange={e => setVara(e.target.value)}>
              <option value="">Selecione...</option>
              {VARAS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </FormGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr 1fr", gap: "20px" }}>
          <FormGroup label="Unidade">
            <select style={inputStyle} value={unidadeOrigem} onChange={e => setUnidadeOrigem(e.target.value)}>
              {UNIDADES_PM.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Graduação">
            <select style={inputStyle} value={patente} onChange={e => setPatente(e.target.value)}>
              {PATENTES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Policial Entregador *">
            <AutocompleteInput
              historyKey="hist_policial"
              value={policial}
              onChange={e => setPolicial(upper(e.target.value))}
              style={inputStyle}
              placeholder="Nome do policial..."
            />
          </FormGroup>
          <FormGroup label="RG *">
            <AutocompleteInput
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
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>👥 2. NOTICIADOS</h2>
          {natureza !== "AMEACA" && (
            <button className="btn-blue" onClick={adicionarMaterial} style={{ fontSize: "12px" }}>+ Adicionar Item</button>
          )}
        </div>

        {materiais.map((m, idx) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", gap: "20px", background: "#f8fafc", padding: "15px", borderRadius: "8px", borderLeft: (natureza === 'DROGAS' ? "4px solid #10b981" : "4px solid #3b82f6"), marginBottom: "10px" }}>
            <FormGroup label="Noticiado/Autor">
              <AutocompleteInput
                historyKey="hist_noticiado"
                value={m.reu}
                onChange={e => updateMaterial(m.id, "reu", upper(e.target.value))}
                style={inputStyle}
                placeholder="Nome completo..."
              />
            </FormGroup>
            
            {natureza === "DROGAS" && (
                <FormGroup label="Substância *">
                  <select style={inputStyle} value={m.substancia} onChange={e => updateMaterial(m.id, "substancia", e.target.value)}>
                    {SUBSTANCIAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormGroup>
            )}

            {natureza === "SOM" && (
                <FormGroup label="Objeto / Equipamento *">
                  <input type="text" style={inputStyle} value={m.substancia} onChange={e => updateMaterial(m.id, "substancia", e.target.value)} placeholder="Ex: Caixa JBL" />
                </FormGroup>
            )}

            {(natureza === "DROGAS" || natureza === "SOM") && (
                <>
                <FormGroup label={natureza === "SOM" ? "Quant." : "Peso Est."}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <input type="text" style={{ ...inputStyle, flex: 2 }} value={m.peso} onChange={e => updateMaterial(m.id, "peso", natureza === "SOM" ? e.target.value : formatarPeso(e.target.value))} />
                    <select style={{ ...inputStyle, flex: 1, padding: "10px 4px" }} value={m.unidadePeso} onChange={e => updateMaterial(m.id, "unidadePeso", e.target.value)}>
                      {natureza === "DROGAS" ? (
                          <><option value="g">g</option><option value="Kg">Kg</option></>
                      ) : (
                          <option value="Unid">Unid</option>
                      )}
                    </select>
                  </div>
                </FormGroup>
                <FormGroup label="Lacre">
                  <input type="text" style={inputStyle} value={m.lacre} onChange={e => updateMaterial(m.id, "lacre", e.target.value)} />
                </FormGroup>
                </>
            )}

            {natureza === "AMEACA" && (
                <div style={{gridColumn: "span 3", display: "flex", alignItems: "center", color: "#64748b", fontStyle: "italic"}}>
                    Nenhum objeto para apreensão neste tipo de processo.
                </div>
            )}

            <button onClick={() => removerMaterial(m.id)} style={{ alignSelf: "center", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "20px" }} title="Remover">×</button>
          </div>
        ))}
      </div>

      <button 
        className="btn-green" 
        onClick={salvar} 
        disabled={salvando}
        style={{ width: "100%", padding: "16px", fontWeight: "800", opacity: salvando ? 0.7 : 1, cursor: salvando ? "not-allowed" : "pointer" }}
      >
        {salvando ? "PROCESSANDO..." : natureza === "DROGAS" ? "FINALIZAR REGISTRO E GERAR RECIBO" : "REGISTRAR TCIP E GERAR RECIBO"}
      </button>
    </div>
  );
}
