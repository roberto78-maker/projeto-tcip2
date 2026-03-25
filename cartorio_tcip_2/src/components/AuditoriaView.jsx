import React, { useState, useEffect } from "react";
import { getRelatorioIncineracao, downloadRelatorioPdf } from "../services/api";

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

  const handleDownload = async () => {
    try {
      await downloadRelatorioPdf(filtros);
    } catch (e) {
      alert("Erro ao baixar PDF oficial do radar.");
    }
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

  const formatarPesoDisplay = (gramas) => {
    if (!gramas) return "-";
    if (gramas >= 1000) return `${(gramas / 1000).toFixed(3).replace(".", ",")} Kg`;
    return `${gramas.toFixed(2).replace(".", ",")} g`;
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
              <option value="Maconha">Maconha</option>
              <option value="Cocaína">Cocaína</option>
              <option value="Crack">Crack</option>
              <option value="Haxixe">Haxixe</option>
              <option value="MDMA">MDMA</option>
              <option value="Ecstasy">Ecstasy</option>
              <option value="LSD">LSD</option>
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
              <option value="1ª VARA ESPECIAL CRIMINAL">1ª VARA ESPECIAL CRIMINAL</option>
              <option value="2ª VARA ESPECIAL CRIMINAL">2ª VARA ESPECIAL CRIMINAL</option>
              <option value="3ª VARA ESPECIAL CRIMINAL">3ª VARA ESPECIAL CRIMINAL</option>
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
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
