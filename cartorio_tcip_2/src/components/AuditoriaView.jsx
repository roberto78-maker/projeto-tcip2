import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRelatorioIncineracao } from "../services/api";
import logoBpm from "../assets/brasao.png";
import { VARAS, SUBSTANCIAS } from "../constants/options.js";

export default function AuditoriaView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
    vara: "",
    substancia: "",
    status: "",
    bou: "",
    processo: "",
    reu: ""
  });

  const buscarRelatorio = async () => {
    setLoading(true);
    try {
      const res = await getRelatorioIncineracao(filtros);
      setData(res);
    } catch (e) {
      alert("Erro ao buscar registros no radar.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarRelatorio();
    // eslint-disable-next-line
  }, []);

  const formatarPesoDisplay = (gramas) => {
    if (!gramas) return "-";
    if (gramas >= 1000) return `${(gramas / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${gramas.toFixed(2).replace(".", ",")} g`;
  };

  const handleDownload = async () => {
    if (!data || !data.detalhado) return;

    const doc = new jsPDF();
    const marginX = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    let currY = 15;

    // Logo
    const img = new Image();
    img.src = logoBpm;
    await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
    try { doc.addImage(img, "PNG", marginX, currY, 20, 24); } catch (e) { }

    // Header Text
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("POLÍCIA MILITAR DO PARANÁ - 6º BPM", centerX + 10, currY + 8, { align: "center" });
    
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("PRIMEIRO CARTÓRIO - CASCAVEL", centerX + 10, currY + 14, { align: "center" });

    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("RASTREAMENTO DE DADOS DO CARTÓRIO", centerX + 10, currY + 22, { align: "center" });

    currY += 38;

    // Período
    const dtInicio = filtros.data_inicio ? filtros.data_inicio.split("-").reverse().join("/") : "Início";
    const dtFim = filtros.data_fim ? filtros.data_fim.split("-").reverse().join("/") : new Date().toLocaleDateString("pt-BR");
    
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("PERÍODO: ", marginX, currY);
    doc.setFont("helvetica", "normal");
    doc.text(`${dtInicio} à ${dtFim}`, marginX + 22, currY);
    
    currY += 10;

    // Tabela
    const bodyTable = data.detalhado.map(item => [
      item.bou || "S/N",
      item.processo || "S/N",
      item.substancia || "-",
      formatarPesoDisplay(item.peso),
      item.status_label || item.status
    ]);

    autoTable(doc, {
      startY: currY,
      head: [["BOU", "PROCESSO", "SUBSTÂNCIA", "VOLUME/PESO", "LOCAL/STATUS"]],
      body: bodyTable,
      theme: "grid",
      headStyles: {
        fillColor: [198, 40, 40], // Vermelho similar ao modelo (#C62828)
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center"
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: "middle"
      },
      columnStyles: {
        0: { halign: "center" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center" }
      },
      margin: { left: marginX, right: marginX }
    });

    // FOOTER DE TOTAIS (Conforme modelo)
    const totalItens = data.detalhado.length;
    const pesoTotal = data.detalhado.reduce((acc, item) => acc + Number(item.weight || item.peso || 0), 0);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      body: [[
        `TOTAL ITENS: ${String(totalItens).padStart(2, '0')}`,
        `PESO TOTAL: ${formatarPesoDisplay(pesoTotal)}`
      ]],
      theme: "grid",
      styles: {
        fontSize: 10,
        fontStyle: "bold",
        cellPadding: 5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: "center",
        valign: "middle",
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0]
      },
      margin: { left: marginX, right: marginX }
    });

    const dataHora = new Date().toLocaleString("pt-BR").replace(',', ' -');
    doc.setFontSize(8); doc.setFont("helvetica", "italic");
    doc.text(`Gerado em: ${dataHora}`, pageWidth - marginX, 285, { align: "right" });

    doc.save(`Relatorio_Radar_${new Date().getTime()}.pdf`);
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleLimparFiltros = () => {
    setFiltros({
      data_inicio: "", data_fim: "", vara: "", substancia: "",
      status: "", bou: "", processo: "", reu: ""
    });
  };

  return (
    <div style={{ padding: "10px", paddingBottom: "50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "700" }}>🔎 Radar e Buscas de Processos (Auditoria)</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Pesquisa global avançada para encontrar onde cada droga ou processo se encontra no sistema.
          </p>
        </div>
      </div>

      {/* FILTROS (MECANISMO DE BUSCA AVANÇADA) */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "15px" }}>Filtros de Garimpo (Opcionais)</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Droga / Substância:</label>
            <select name="substancia" value={filtros.substancia} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todas as Drogas</option>
              {SUBSTANCIAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Localização / Status atual:</label>
            <select name="status" value={filtros.status} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todos os Locais</option>
              <option value="conferencia">Aguardando Balança</option>
              <option value="cofre">No Cofre</option>
              <option value="incineracao">Lotes (Em Formação)</option>
              <option value="queima_pronta">Já Incinerados</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Vara Judicial:</label>
            <select name="vara" value={filtros.vara} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todas as Varas</option>
              {VARAS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nº do Processo:</label>
            <input type="text" name="processo" placeholder="Buscar por Processo..." value={filtros.processo} onChange={handleFiltroChange} className="input-tcip" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nº Boletim (BOU):</label>
            <input type="text" name="bou" placeholder="Buscar por BOU..." value={filtros.bou} onChange={handleFiltroChange} className="input-tcip" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Autor / Réu:</label>
            <input type="text" name="reu" placeholder="Nome do autor..." value={filtros.reu} onChange={handleFiltroChange} className="input-tcip" />
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Registrado entre (Data Início):</label>
            <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange} className="input-tcip" />
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>E (Data Fim):</label>
            <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange} className="input-tcip" />
          </div>

        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "15px" }}>
          <button onClick={buscarRelatorio} className="btn-tcip primary" style={{ height: "40px", padding: "0 25px" }} disabled={loading}>
            {loading ? "Buscando..." : "🔍 Buscar no Sistema"}
          </button>
          <button onClick={handleLimparFiltros} className="btn-tcip secondary" style={{ height: "40px", padding: "0 20px" }}>
            Limpar Filtros
          </button>
          
          <div style={{ flex: 1 }}></div>

          <button onClick={handleDownload} className="btn-tcip success" style={{ height: "40px", padding: "0 25px" }} disabled={!data || data.detalhado.length === 0}>
            ⬇️ EXPORTAR RESULTADO (PDF)
          </button>
        </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="card">
        <h3 style={{ fontSize: "16px", color: "#334155", marginBottom: "15px", fontWeight: "600" }}>
          Resultados da Busca (Radar) 
          {data && <span style={{fontSize: "13px", color: "#64748b", marginLeft: "10px", fontWeight: "400"}}>- Foram encontrados {data.detalhado.length} registros</span>}
        </h3>
        
        {loading && !data ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Garimpando registros na base de dados...</div>
        ) : !data ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Utilize os filtros acima para iniciar a busca.</div>
        ) : (
          <div className="tcip-table-container">
            <table className="tcip-table">
              <thead>
                <tr>
                  <th>Nº Processo | BOU</th>
                  <th>Autor/Réu</th>
                  <th>Substância | Peso</th>
                  <th>Localização (Status)</th>
                  <th>Vara</th>
                  <th>Data Registro</th>
                </tr>
              </thead>
              <tbody>
                {data.detalhado.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                      Ops, nenhum processo encontrado com as exatas informações pesquisadas acima.
                    </td>
                  </tr>
                ) : (
                  data.detalhado.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>Pr: {item.processo || "S/N"}</div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>BOU: {item.bou || "S/N"}</div>
                      </td>
                      <td style={{ fontSize: "13px", color: "#475569" }}>
                        {item.reu || "-"}
                      </td>
                      <td>
                        <span className="badge amber" style={{ display: "inline-block", marginBottom: "4px" }}>
                          {item.substancia || "-"}
                        </span>
                        <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "13px" }}>
                          {formatarPesoDisplay(item.peso)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${item.status_label === 'No Cofre' ? 'blue' : item.status_label === 'Incinerado' ? 'green' : 'gray'}`}>
                          {item.status_label}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px", color: "#475569" }}>{item.vara || "-"}</td>
                      <td style={{ fontSize: "13px", color: "#475569" }}>{item.data ? item.data.split("-").reverse().join("/") : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {data && data.detalhado.length > 0 && (
                <tfoot style={{ background: "#f1f5f9", fontWeight: "bold" }}>
                  <tr>
                    <td colSpan="2" style={{ padding: "15px", textAlign: "left", fontSize: "14px", color: "#1e293b" }}>
                      TOTAL DE PROCESSOS: {String(data.detalhado.length).padStart(2, '0')}
                    </td>
                    <td colSpan="2" style={{ padding: "15px", textAlign: "left", fontSize: "14px", color: "#1e293b" }}>
                      PESO TOTAL: {formatarPesoDisplay(data.detalhado.reduce((acc, item) => acc + Number(item.peso || 0), 0))}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
