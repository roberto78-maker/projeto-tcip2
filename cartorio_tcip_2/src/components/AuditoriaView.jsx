import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRelatorioIncineracao } from "../services/api";
import { getUsuario } from "../services/auth";
import logoBpm from "../assets/brasao.png";
import { JUIZADOS, SUBSTANCIAS, CRIMES_GERAIS } from "../constants/options.js";

export default function AuditoriaView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filtros, setFiltros] = useState({
    data_inicio: "",
    data_fim: "",
    vara: "",
    substancia: "",
    natureza: "",
    status: "",
    bou: "",
    processo: "",
    reu: "",
    crime: ""
  });

  const buscarRelatorio = async () => {
    setLoading(true);
    try {
      const res = await getRelatorioIncineracao(filtros);
      setData(res);
      setCurrentPage(1);
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

  const formatarPesoDisplay = (valor, unidade) => {
    if (unidade === "Unid") return `${valor} Unid.`;
    const num = parseFloat(String(valor).replace(",", ".")) || 0;
    if (["Kg", "kg"].includes(unidade)) return `${num.toFixed(3).replace(".", ",")} Kg`;
    if (["Gr", "g"].includes(unidade) || !unidade) {
      if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ",")} Kg`;
      return `${num.toFixed(2).replace(".", ",")} g`;
    }
    if (["Mg", "mg"].includes(unidade)) return `${num.toFixed(2).replace(".", ",")} mg`;
    return `${num.toFixed(2).replace(".", ",")} ${unidade}`;
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

    // Header
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("POLÍCIA MILITAR DO PARANÁ - 6º BPM", centerX + 10, currY + 8, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("PRIMEIRO CARTÓRIO - CASCAVEL", centerX + 10, currY + 14, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("RASTREAMENTO DE DADOS DO CARTÓRIO", centerX + 10, currY + 22, { align: "center" });
    currY += 38;

    // Período e filtros usados
    const dtInicio = filtros.data_inicio ? filtros.data_inicio.split("-").reverse().join("/") : "Início";
    const dtFim = filtros.data_fim ? filtros.data_fim.split("-").reverse().join("/") : new Date().toLocaleDateString("pt-BR");
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("PERÍODO: ", marginX, currY);
    doc.setFont("helvetica", "normal");
    doc.text(`${dtInicio} à ${dtFim}`, marginX + 22, currY);
    currY += 10;

    // ---- Detecta o modo do relatório ----
    const isDrogas = filtros.natureza === "DROGAS" || (!filtros.natureza && filtros.substancia && filtros.substancia !== "__NENHUMA__");
    const isObjetos = ["SOM", "OUTROS", "AMEACA"].includes(filtros.natureza) || filtros.substancia === "__NENHUMA__";

    // ---- Coluna do PDF muda por tipo ----
    let tableHead, tableBody;

    if (isDrogas) {
      tableHead = [["BOU", "PROCESSO", "RÉU / AUTOR", "SUBSTÂNCIA", "PESO / VOLUME", "STATUS"]];
      tableBody = data.detalhado.map(item => [
        item.bou || "S/N",
        item.processo || "S/N",
        (item.reu || "-").toUpperCase(),
        (item.substancia || "-").toUpperCase(),
        formatarPesoDisplay(item.peso, item.unidade),
        item.status_label || item.status
      ]);
    } else {
      // Objetos: sem coluna de peso
      tableHead = [["BOU", "PROCESSO", "RÉU / AUTOR", "OBJETO / ITEM", "QUANTIDADE", "STATUS"]];
      tableBody = data.detalhado.map(item => [
        item.bou || "S/N",
        item.processo || "S/N",
        (item.reu || "-").toUpperCase(),
        (item.substancia || item.natureza || "-").toUpperCase(),
        `${item.peso ? item.peso : "01"} ${item.unidade || "Unid"}.`,
        item.status_label || item.status
      ]);
    }

    autoTable(doc, {
      startY: currY,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [198, 40, 40], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, valign: "middle" },
      columnStyles: { 0: { halign: "center" }, 1: { halign: "center" }, 2: { halign: "left" }, 3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" } },
      margin: { left: marginX, right: marginX }
    });

    // ---- RESUMO DINÂMICO: Drogas vs Objetos ----
    const totalItens = data.detalhado.length;
    const nomesDetidos = data.detalhado.map(i => i.reu).filter(r => r && r.trim() !== "" && r.trim() !== "-");
    const reusUnicos = new Set(nomesDetidos.map(nome => nome.toUpperCase().trim())).size;
    const totalProcessos = new Set(data.detalhado.map(i => i.processo).filter(Boolean)).size;

    let resumos = [];
    let tituloResumo = "RESUMO GERAL DA BUSCA";

    if (isDrogas) {
      // Peso total de drogas
      let pesoTotal = 0;
      data.detalhado.forEach(i => {
        if (i.natureza !== "DROGAS" || i.unidade === "Unid") return;
        const p = parseFloat(String(i.peso).replace(",", ".")) || 0;
        const uni = String(i.unidade).toLowerCase();
        if (uni.includes("kg")) {
          pesoTotal += p * 1000;
        } else if (uni.includes("mg")) {
          pesoTotal += p / 1000;
        } else {
          pesoTotal += p;
        }
      });
      tituloResumo = "RESUMO - ANÁLISE DE ENTORPECENTES";
      resumos = [
        [`TOTAL DE PROCESSOS (BOLETINS): ${String(totalProcessos).padStart(2, "0")}`],
        [`PESSOAS DETIDAS / IDENTIFICADAS: ${String(reusUnicos).padStart(2, "0")}`],
        [`TOTAL DROGAS APREENDIDAS: ${String(totalItens).padStart(2, "0")} registros`],
        [`PESO TOTAL: ${formatarPesoDisplay(pesoTotal, "g")}`],
        [`RELATÓRIO GERADO POR: ${getUsuario()?.username?.toUpperCase() || "SISTEMA"}`]
      ];
    } else if (isObjetos) {
      // Objetos: sem peso, apenas contagem de volumes/unidades
      const countSom = data.detalhado.filter(i => i.natureza === "SOM").length;
      const countArmas = data.detalhado.filter(i => i.substancia && (i.substancia.toLowerCase().includes("faca") || i.substancia.toLowerCase().includes("facão"))).length;
      const countOutros = totalItens - countSom - countArmas;

      const tipoLabel = filtros.natureza === "SOM" ? "APARELHOS DE SOM" : filtros.natureza === "OUTROS" ? "OBJETOS DIVERSOS" : "OBJETOS APREENDIDOS";
      tituloResumo = `RESUMO - ${tipoLabel}`;
      resumos = [
        [`TOTAL DE PROCESSOS (BOLETINS): ${String(totalProcessos).padStart(2, "0")}`],
        [`PESSOAS DETIDAS / IDENTIFICADAS: ${String(reusUnicos).padStart(2, "0")}`],
        [`TOTAL DE OBJETOS APREENDIDOS: ${String(totalItens).padStart(2, "00")}`]
      ];
      if (countSom > 0) resumos.push([`APARELHOS / CAIXAS DE SOM: ${String(countSom).padStart(2, "0")} Unid.`]);
      if (countArmas > 0) resumos.push([`FACAS / ARMAS BRANCAS: ${String(countArmas).padStart(2, "0")} Unid.`]);
      if (countOutros > 0 && filtros.natureza === "OUTROS") resumos.push([`OUTROS VARIADOS: ${String(countOutros).padStart(2, "0")} Unid.`]);
      resumos.push([`RELATÓRIO GERADO POR: ${getUsuario()?.username?.toUpperCase() || "SISTEMA"}`]);
    } else {
      // Geral (sem natureza definida)
      let pesoTotal = 0;
      data.detalhado.forEach(i => {
        if (i.natureza === "DROGAS" && i.unidade !== "Unid") {
          const p = parseFloat(String(i.peso).replace(",", ".")) || 0;
          const uni = String(i.unidade).toLowerCase();
          if (uni.includes("kg")) {
            pesoTotal += p * 1000;
          } else if (uni.includes("mg")) {
            pesoTotal += p / 1000;
          } else {
            pesoTotal += p;
          }
        }
      });

      resumos = [
        [`TOTAL DE PROCESSOS: ${String(totalProcessos).padStart(2, "0")}`],
        [`PESSOAS IDENTIFICADAS: ${String(reusUnicos).padStart(2, "0")}`],
        [`TOTAL DE ITENS: ${String(totalItens).padStart(2, "0")}`],
        ...(pesoTotal > 0 ? [[`PESO TOTAL (DROGAS): ${formatarPesoDisplay(pesoTotal, "g")}`]] : []),
        [`RELATÓRIO GERADO POR: ${getUsuario()?.username?.toUpperCase() || "SISTEMA"}`]
      ];
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      head: [[tituloResumo]],
      body: resumos,
      theme: "grid",
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
      styles: { fontSize: 10, fontStyle: "bold", cellPadding: 4, lineColor: [0, 0, 0], lineWidth: 0.1, halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [0, 0, 0] },
      margin: { left: marginX, right: marginX }
    });

    const totalPages = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    const hashProtocolo = Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + new Date().getTime().toString().slice(-4);

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      
      const username = getUsuario()?.username?.toUpperCase() || "SISTEMA";
      const dataHora = new Date().toLocaleString("pt-BR").replace(",", " -");
      const footerText = `Gerado por ${username} em ${dataHora} | Protocolo: ${hashProtocolo}`;
      const pageNum = `Página ${String(i).padStart(2, "0")} de ${String(totalPages).padStart(2, "0")}`;
      
      doc.text(footerText, marginX, pageHeight - 10);
      doc.text(pageNum, pageWidth - marginX, pageHeight - 10, { align: "right" });
    }

    doc.save(`Relatorio_Radar_${hashProtocolo}.pdf`);
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const handleLimparFiltros = () => {
    setFiltros({
      data_inicio: "", data_fim: "", vara: "", substancia: "", natureza: "",
      status: "", bou: "", processo: "", reu: "", crime: ""
    });
  };

  const getStats = () => {
    if (!data || !data.detalhado) return null;
    const det = data.detalhado;
    const totalItens = det.length;
    const totalProcessos = new Set(det.filter(i => i.processo).map(i => i.processo)).size;
    const reusUnicos = new Set(det.filter(i => i.reu && i.reu !== "-").map(i => i.reu.trim().toUpperCase())).size;
    
    let pesoTotal = 0;
    det.forEach(i => {
      if (i.natureza === "DROGAS" && i.unidade !== "Unid") {
        const p = parseFloat(String(i.peso).replace(",", ".")) || 0;
        const uni = String(i.unidade).toLowerCase();
        if (uni.includes("kg")) {
          pesoTotal += p * 1000;
        } else if (uni.includes("mg")) {
          pesoTotal += p / 1000;
        } else {
          pesoTotal += p;
        }
      }
    });

    const countSom = det.filter(i => i.natureza === "SOM").length;
    const countArmas = det.filter(i => i.substancia && (i.substancia.toLowerCase().includes("faca") || i.substancia.toLowerCase().includes("facão"))).length;

    return { totalItens, totalProcessos, reusUnicos, pesoTotal, countSom, countArmas };
  };

  const stats = getStats();

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data?.detalhado ? data.detalhado.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = data?.detalhado ? Math.ceil(data.detalhado.length / itemsPerPage) : 0;

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
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

      {/* FILTROS */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#334155", marginBottom: "15px" }}>Filtros de Garimpo (Opcionais)</h3>
        
        <div className="auditoria-filtros-grid">
          
          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Natureza / Tipo:</label>
            <select name="natureza" value={filtros.natureza} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todas</option>
              <option value="DROGAS">💊 Somente Drogas</option>
              <option value="SOM">🔊 Aparelhos de Som</option>
              <option value="OUTROS">⚙️ Outros Objetos (Facas, etc)</option>
              <option value="AMEACA">⚖️ Sem Apreensão (Ameaça/TCIP)</option>
            </select>
          </div>

          <div className="auditoria-filtro-coluna auditoria-filtro-crime">
             <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>⚖️ Filtrar por Crime (Artigos):</label>
             <select name="crime" value={filtros.crime} onChange={handleFiltroChange} className="input-tcip auditoria-select-crime">
               <option value="">Todos os Crimes</option>
               {CRIMES_GERAIS.map(cr => (
                 <option
                   key={cr}
                   value={cr}
                   style={cr === "Perturbação do Sossego: Artigo 42 da LCP" ? { fontWeight: "bold" } : {}}
                 >
                   {cr}
                 </option>
               ))}
             </select>
          </div>

          <div className="auditoria-filtro-coluna auditoria-filtro-palavra">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Palavra-Chave (Substância / Objeto):</label>
            <input
              list="substancias-list"
              name="substancia"
              value={filtros.substancia}
              onChange={handleFiltroChange}
              placeholder="Ex: Maconha, Faca, Caixa de Som..."
              className="input-tcip"
            />
            <datalist id="substancias-list">
              <option value="__NENHUMA__">∅ Nenhuma (Só Objetos)</option>
              {SUBSTANCIAS.map(s => <option key={s} value={s}>{s}</option>)}
            </datalist>
          </div>

          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Localização / Status atual:</label>
            <select name="status" value={filtros.status} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todos os Locais</option>
              <option value="conferencia">Aguardando Conferência</option>
              <option value="cofre">No Cofre</option>
              <option value="incineracao">Lotes (Em Formação)</option>
              <option value="queima_pronta">Já Incinerados</option>
              <option value="excluido">Excluídos / Cancelados</option>
              <option value="arquivado">Arquivados (Diversos / Ameaça)</option>
            </select>
          </div>

          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Juizado:</label>
            <select name="vara" value={filtros.vara} onChange={handleFiltroChange} className="input-tcip">
              <option value="">Todos os Juizados</option>
              {JUIZADOS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nº do Processo:</label>
            <input type="text" name="processo" placeholder="Buscar por Processo..." value={filtros.processo} onChange={handleFiltroChange} className="input-tcip" />
          </div>

          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nº Boletim (BOU):</label>
            <input type="text" name="bou" placeholder="Buscar por BOU..." value={filtros.bou} onChange={handleFiltroChange} className="input-tcip" />
          </div>

          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Autor / Réu:</label>
            <input type="text" name="reu" placeholder="Nome do autor..." value={filtros.reu} onChange={handleFiltroChange} className="input-tcip" />
          </div>
          
          <div className="auditoria-filtro-coluna">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Ocorrido entre (Data do Fato):</label>
            <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange} className="input-tcip" />
          </div>
          
          <div className="auditoria-filtro-coluna">
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

      {/* RESUMO E STATS */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
          <div className="card" style={{ padding: "15px", backgroundColor: "#f8fafc", textAlign: "center", borderLeft: "4px solid #1e293b" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Processos</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>{String(stats.totalProcessos).padStart(2, '0')}</div>
          </div>
          <div className="card" style={{ padding: "15px", backgroundColor: "#f8fafc", textAlign: "center", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Réus / Detidos</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>{String(stats.reusUnicos).padStart(2, '0')}</div>
          </div>
          <div className="card" style={{ padding: "15px", backgroundColor: "#f8fafc", textAlign: "center", borderLeft: "4px solid #eab308" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total de Itens</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>{String(stats.totalItens).padStart(2, '0')}</div>
          </div>
          {stats.pesoTotal > 0 && (
            <div className="card" style={{ padding: "15px", backgroundColor: "#f0fdf4", textAlign: "center", borderLeft: "4px solid #10b981" }}>
              <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600", textTransform: "uppercase" }}>Peso Estimado (Drogas)</div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#166534" }}>{formatarPesoDisplay(stats.pesoTotal, 'g')}</div>
            </div>
          )}
          {(stats.countSom > 0 || stats.countArmas > 0) && (
            <div className="card" style={{ padding: "15px", backgroundColor: "#fffbeb", textAlign: "center", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", textTransform: "uppercase" }}>Objetos / Armas</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#b45309" }}>
                {stats.countSom > 0 && <span>🔊 {stats.countSom} Som </span>}
                {stats.countArmas > 0 && <span>🔪 {stats.countArmas} Armas</span>}
              </div>
            </div>
          )}
        </div>
      )}

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
                  <th>Natureza</th>
                  <th>Nº Processo | BOU</th>
                  <th>Autor / Réu</th>
                  <th>Substância / Objeto</th>
                  <th>Localização (Status)</th>
                  <th>Anexo</th>
                  <th>Juizado</th>
                  <th>Data do Fato</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                      Ops, nenhum processo encontrado com as exatas informações pesquisadas acima.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item) => {
                    const natMap = {
                        "DROGAS": { label: "💊 DROGAS", color: "#10b981" },
                        "SOM": { label: "🔊 SOM", color: "#3b82f6" },
                        "AMEACA": { label: "⚖️ TCIP", color: "#64748b" }
                    };
                    const natInfo = natMap[item.natureza] || { label: "📝 OUTROS", color: "#94a3b8" };

                    return (
                      <tr key={item.id}>
                        <td>
                           <span className="badge" style={{ background: natInfo.color, color: "white", fontSize: "10px" }}>
                             {natInfo.label}
                           </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>Pr: {item.processo || "S/N"}</div>
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>BOU: {item.bou || "S/N"}</div>
                        </td>
                        <td style={{ fontSize: "13px", color: "#475569", textTransform: "uppercase" }}>
                          {item.reu || "-"}
                        </td>
                        <td>
                          <span className="badge amber" style={{ display: "inline-block", marginBottom: "4px", textTransform: "uppercase" }}>
                            {item.substancia || "-"}
                          </span>
                          <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "13px" }}>
                            {item.natureza === 'AMEACA' ? "Sem Apreensão" : formatarPesoDisplay(item.peso, item.unidade)}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${item.status_label.includes('Excluído') ? 'red' : item.status_label === 'No Cofre' ? 'blue' : (item.status_label === 'Incinerado' || item.status === 'queima_pronta') ? 'green' : 'gray'}`}>
                            {item.status_label}
                          </span>
                          {item.motivo_exclusao && (
                            <div style={{ marginTop: "5px", fontSize: "11px", color: "#ef4444", fontWeight: "bold", background: "#fef2f2", padding: "4px", borderRadius: "4px", maxWidth: "200px" }}>
                              Motivo: {item.motivo_exclusao}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.arquivo_pdf_url ? (
                            <a 
                              href={item.arquivo_pdf_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "4px", 
                                padding: "6px 10px", 
                                borderRadius: "6px", 
                                backgroundColor: "#f0fdf4", 
                                border: "1px solid #bbf7d0", 
                                color: "#166534", 
                                fontWeight: "700", 
                                fontSize: "11px", 
                                textDecoration: "none",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                              title="Visualizar PDF anexado"
                            >
                              📄 VER PDF
                            </a>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>
                              Nenhum
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "13px", color: "#475569" }}>{item.vara || "-"}</td>
                        <td style={{ fontSize: "13px", color: "#475569" }}>{item.data ? item.data.split("-").reverse().join("/") : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {data && data.detalhado.length > 0 && (
                <tfoot style={{ background: "#f1f5f9", fontWeight: "bold" }}>
                  <tr>
                    <td colSpan="2" style={{ padding: "15px", textAlign: "left", fontSize: "14px", color: "#1e293b" }}>
                      TOTAL DE PROCESSOS: {String(data.detalhado.length).padStart(2, '0')}
                    </td>
                    <td colSpan="6" style={{ padding: "15px", textAlign: "left", fontSize: "12px", color: "#64748b" }}>
                        * Relatórios de peso total devem ser consultados individualmente por natureza de crime.
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", borderTop: "1px solid #e2e8f0", background: "white", borderBottomLeftRadius: "8px", borderBottomRightRadius: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, data.detalhado.length)} de {data.detalhado.length} registros
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 16px", borderRadius: "6px",
                      border: "1px solid #cbd5e1", background: currentPage === 1 ? "#f1f5f9" : "white",
                      color: currentPage === 1 ? "#94a3b8" : "#334155", fontWeight: "600", fontSize: "13px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer", transition: "all 0.2s",
                    }}
                  >
                    Anterior
                  </button>
                  <span style={{ padding: "8px 12px", fontSize: "13px", fontWeight: "700", color: "#0f172a", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "8px 16px", borderRadius: "6px",
                      border: "1px solid #cbd5e1", background: currentPage === totalPages ? "#f1f5f9" : "white",
                      color: currentPage === totalPages ? "#94a3b8" : "#334155", fontWeight: "600", fontSize: "13px",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer", transition: "all 0.2s",
                    }}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
