import React, { useState, useRef, useMemo } from "react";
import { updateApreensao, destinarIncineracao, removerPdf } from "../services/api.js";
import { usePagedList } from "../hooks/usePagedList.js";

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

// ─── Build the backend filter object for the current tab ──────────────────────
// All filtering happens in Django. The frontend never scans a local array.
function buildFilters(abaAtiva, busca, page) {
  const f = { status: "cofre" };
  if (abaAtiva === "DROGAS") {
    f.natureza = "DROGAS";
  } else {
    f.excluir_natureza = "DROGAS";
    // 🔍 Exibe todos os objetos (Som, Veículos, etc.) que não são drogas
  }
  if (busca.trim()) f.search = busca.trim();
  if (page) f.page = page;
  return f;
}

export default function CofreView() {
  // ─── Filter state ─────────────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState(() => {
    const savedTab = localStorage.getItem("deposito_tab");
    if (savedTab) {
      localStorage.removeItem("deposito_tab");
      return savedTab;
    }
    return "DROGAS";
  });
  const [busca, setBusca]       = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ─── Misc ─────────────────────────────────────────────────────────────────
  const [obsVisivel, setObsVisivel] = useState(null);
  const debounceRef = useRef(null);

  // ─── Derived filters — memoised so the object reference is stable
  // as long as abaAtiva, busca and currentPage haven't actually changed.
  // This prevents usePagedList from re-fetching on unrelated renders.
  const filters = useMemo(
    () => buildFilters(abaAtiva, busca, currentPage),
    [abaAtiva, busca, currentPage]
  );

  // ─── Paginated data from hook (cache-aware) ───────────────────────────────
  // - On first render: fetches page 1, caches result
  // - On tab/search change: resets list, fetches new page 1 (cache if warm)
  // - On navigate-away + return: hook re-mounts → cache hit → instant render
  const {
    itens,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    erro,
    carregarMais,
    recarregar,   // invalidates cache + reloads — call after mutations
  } = usePagedList(filters);

  // ─── Tab switch: update state; the useMemo + hook handle the rest ─────────
  const handleAbaChange = (novaAba) => {
    setAbaAtiva(novaAba);
    setCurrentPage(1);
  };

  // ─── Search: debounce 400 ms before updating state ────────────────────────
  const handleBuscaChange = (valor) => {
    setBusca(valor);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBusca(valor);
      setCurrentPage(1);
    }, 400);
  };

  // ─── Individual actions — all call recarregar() afterwards ───────────────
  const handleFileUpload = async (id, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("arquivo_pdf", file);
      const user    = JSON.parse(localStorage.getItem("usuario_logado") || "{}");
      const baseUrl = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${baseUrl}/api/apreensoes/${id}/upload_pdf/`, {
        method:  "POST",
        headers: user.access ? { Authorization: `Bearer ${user.access}` } : {},
        body:    formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao fazer upload.");
      }
      alert("Documento anexado com sucesso!");
      recarregar(); // cache-invalidate + reload
    } catch (e) {
      alert(e.message || "Erro ao fazer upload.");
    }
  };

  const handleRemoverPdf = async (id) => {
    if (!window.confirm("Deseja realmente remover o PDF anexado?")) return;
    try {
      await removerPdf(id);
      alert("PDF removido com sucesso!");
      recarregar();
    } catch (e) {
      alert(e.message || "Erro ao remover PDF.");
    }
  };

  const enviarParaIncineracao = async (id) => {
    try {
      await destinarIncineracao(id);
      alert("Item destinado aos Lotes de Incineração!");
      recarregar();
    } catch (e) {
      alert(e.message || "Erro ao destinar para incineração");
    }
  };

  const liberarObjeto = async (id) => {
    if (!window.confirm("Deseja realmente confirmar a LIBERAÇÃO deste objeto?")) return;
    try {
      await updateApreensao(id, { status: "arquivado" });
      alert("Item liberado e arquivado com sucesso!");
      recarregar();
    } catch (e) {
      alert("Erro ao liberar item.");
    }
  };

  // ─── Derived values ───────────────────────────────────────────────────────
  const corAba  = abaAtiva === "DROGAS" ? "#10b981" : "#3b82f6";
  const shown   = itens.length;

  return (
    <div className="card" style={{ padding: "0", overflow: "hidden" }}>

      {/* Observation modal */}
      {obsVisivel && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "16px", width: "500px" }}>
            <h3 style={{ marginBottom: "15px" }}>📌 Observação de Entrada</h3>
            <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", marginBottom: "20px", whiteSpace: "pre-wrap" }}>
              {obsVisivel.observacao_cofre || "Nenhuma observação."}
            </div>
            <button className="btn-blue" style={{ width: "100%" }} onClick={() => setObsVisivel(null)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "25px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px" }}>📦 Central de Custódia / Depósito</h2>
            <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>
              Gerencie entorpecentes e materiais apreendidos separadamente.
              {totalCount !== null && !loading && (
                <span style={{ marginLeft: "12px", fontWeight: "600", color: corAba }}>
                  {shown} de {totalCount} registro{totalCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          {/* Search — debounced, triggers backend ?search= filter */}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              placeholder="🔍 Buscar BOU, Noticiado ou Substância..."
              value={busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              style={{ padding: "10px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "290px" }}
            />
            {busca && (
              <button
                onClick={() => { setBusca(""); if (debounceRef.current) clearTimeout(debounceRef.current); }}
                style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", color: "#64748b" }}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "5px" }}>
          {[
            { id: "DROGAS",  label: "💊 ENTORPECENTES", cor: "#10b981" },
            { id: "OBJETOS", label: "📢 OBJETOS DIVERSOS", cor: "#3b82f6" },
          ].map(({ id, label, cor }) => (
            <button
              key={id}
              onClick={() => handleAbaChange(id)}
              style={{
                padding: "12px 25px", borderRadius: "8px 8px 0 0", border: "none",
                cursor: "pointer", fontWeight: "700", fontSize: "13px", transition: "all 0.2s",
                background: abaAtiva === id ? cor : "#e2e8f0",
                color:      abaAtiva === id ? "white" : "#475569",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "25px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
            <div style={{ fontWeight: "600" }}>Carregando...</div>
          </div>
        )}

        {!loading && erro && (
          <div style={{ textAlign: "center", padding: "40px", color: "#dc2626" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⚠️</div>
            <div style={{ fontWeight: "600" }}>{erro}</div>
            <button className="btn-blue" style={{ marginTop: "15px" }} onClick={recarregar}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && (
          <div className="table-container">
            <table className="tcip-table">
              <thead>
                <tr style={{ background: abaAtiva === "DROGAS" ? "#f0fdf4" : "#eff6ff" }}>
                  <th>Entrada</th>
                  <th>BOU / Processo</th>
                  <th>{abaAtiva === "DROGAS" ? "Drogas / Noticiado" : "Material / Noticiado"}</th>
                  <th>Qtd/Peso</th>
                  <th style={{ textAlign: "center" }}>OBS.</th>
                  <th>Documentos</th>
                  <th style={{ textAlign: "right" }}>AÇÕES DE FLUXO</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>
                      {busca
                        ? `Nenhum resultado para "${busca}" nesta categoria.`
                        : "Nenhum item encontrado nesta categoria."}
                    </td>
                  </tr>
                )}

                {itens.map((item) => {
                  const hasPDF = !!item.arquivo_pdf_url;
                  const pdfUrl = item.arquivo_pdf_url || null;
                  const hasObs = !!item.observacao_cofre;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontSize: "12px" }}>
                        {new Date(item.data_criacao).toLocaleDateString("pt-BR")}
                      </td>
                      <td>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.bou}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{item.processo}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", textTransform: "uppercase", color: abaAtiva === "DROGAS" ? "#059669" : "#2563eb" }}>
                          {item.substancia ? item.substancia.toUpperCase() : ""}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{item.reu}</div>
                      </td>
                      <td style={{ fontWeight: "600" }}>
                        {formatarPesoDisplay(item.peso, item.unidade)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {hasObs
                          ? <button onClick={() => setObsVisivel(item)} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "15px", cursor: "pointer", fontSize: "10px", padding: "4px 10px" }}>VER</button>
                          : "—"}
                      </td>
                      <td>
                        {hasPDF ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#10b981", fontWeight: "700", textDecoration: "none" }}>
                              📄 VER PDF
                            </a>
                            <button
                              onClick={() => handleRemoverPdf(item.id)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "12px", padding: 0 }}
                              title="Remover PDF"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <label style={{ cursor: "pointer", color: "#3b82f6", fontSize: "11px", fontWeight: "700" }}>
                            📎 ANEXAR
                            <input
                              type="file"
                              accept="application/pdf"
                              style={{ display: "none" }}
                              onChange={(e) => handleFileUpload(item.id, e.target.files[0])}
                            />
                          </label>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {abaAtiva === "DROGAS" ? (
                          <button
                            className="btn-blue"
                            onClick={() => enviarParaIncineracao(item.id)}
                            disabled={!hasPDF}
                            style={{ background: hasPDF ? "#8b5cf6" : "#cbd5e1", fontSize: "11px" }}
                          >
                            🔥 INCINERAÇÃO
                          </button>
                        ) : (
                          <button
                            className="btn-green"
                            onClick={() => liberarObjeto(item.id)}
                            style={{ background: "#2563eb", fontSize: "11px" }}
                          >
                            📦 LIBERAR / DAR BAIXA
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Load more */}
            {(hasMore || loadingMore) && (
              <div style={{ textAlign: "center", paddingTop: "24px" }}>
                <button
                  onClick={carregarMais}
                  disabled={loadingMore}
                  style={{
                    padding: "10px 32px", borderRadius: "8px",
                    border:   `2px solid ${corAba}`, background: "white",
                    color:    corAba, fontWeight: "700", fontSize: "13px",
                    cursor:   loadingMore ? "not-allowed" : "pointer",
                    opacity:  loadingMore ? 0.6 : 1, transition: "all 0.2s",
                  }}
                >
                  {loadingMore
                    ? "⏳ Carregando..."
                    : `📄 Carregar mais (${totalCount - shown} restantes)`}
                </button>
              </div>
            )}

            {/* End of list */}
            {!hasMore && !loading && itens.length > 0 && (
              <div style={{ textAlign: "center", paddingTop: "20px", fontSize: "12px", color: "#94a3b8" }}>
                ✓ Todos os {shown} registro{shown !== 1 ? "s" : ""} carregados.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
