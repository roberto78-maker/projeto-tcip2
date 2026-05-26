import React, { useState } from "react";
import { api } from "../services/api";
import { gerarOficioPersonalizadoPdf } from "../services/oficioPersonalizadoPdf";

function OficiosView() {
  const [formData, setFormData] = useState({
    bou: "",
    assunto: "",
    texto: "",
    tratamento: "Exmo.(A) Sr.(A)",
    cargo_destinatario: "Juiz (A) de Direito",
    orgao_destino: "Juizado Especial Criminal",
    cidade_destino: "Cascavel - Pr."
  });
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGerarOficio = async (e) => {
    e.preventDefault();
    if (!formData.assunto || !formData.texto) {
      setErro("Assunto e Texto são obrigatórios.");
      return;
    }
    
    setGerando(true);
    setErro(null);
    try {
      // Salva no backend para gerar o número sequencial
      const res = await api.post("/oficios/", formData);
      const dadosComNumero = res.data;
      
      // Gera o PDF
      await gerarOficioPersonalizadoPdf(dadosComNumero);
      
      // Limpa formulário após gerar
      setFormData({
        bou: "",
        assunto: "",
        texto: "",
        tratamento: "Exmo.(A) Sr.(A)",
        cargo_destinatario: "Juiz (A) de Direito",
        orgao_destino: "Juizado Especial Criminal",
        cidade_destino: "Cascavel - Pr."
      });
      alert(`Ofício nº ${dadosComNumero.numero_oficio}/${dadosComNumero.ano_oficio} gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      setErro("Erro ao gerar ofício. Verifique a conexão com o servidor.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="view-container fade-in">
      <div className="header-actions">
        <h2 className="title">
          <span style={{ fontSize: "24px", marginRight: "10px" }}>📄</span>
          Gerador de Ofícios
        </h2>
      </div>

      <div className="card-custom">
        {erro && <div className="alert-error" style={{ marginBottom: "15px", padding: "10px", background: "#fef2f2", color: "#991b1b", borderRadius: "5px", border: "1px solid #f87171" }}>{erro}</div>}
        
        <form onSubmit={handleGerarOficio} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Referência / BOU (Opcional)</label>
              <input
                type="text"
                name="bou"
                value={formData.bou}
                onChange={handleChange}
                placeholder="Ex: 2026/1234567"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Assunto *</label>
              <input
                type="text"
                name="assunto"
                value={formData.assunto}
                onChange={handleChange}
                placeholder="Ex: Encaminhamento de Laudo Pericial"
                required
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Texto Base *</label>
            <textarea
              name="texto"
              value={formData.texto}
              onChange={handleChange}
              placeholder="Digite o conteúdo do ofício aqui..."
              required
              rows="8"
              style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Forma de Tratamento</label>
              <input
                type="text"
                name="tratamento"
                value={formData.tratamento}
                onChange={handleChange}
                placeholder="Ex: Exmo.(A) Sr.(A)"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Cargo do Destinatário</label>
              <input
                type="text"
                name="cargo_destinatario"
                value={formData.cargo_destinatario}
                onChange={handleChange}
                placeholder="Ex: Juiz de Direito"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Órgão de Destino</label>
              <input
                type="text"
                name="orgao_destino"
                value={formData.orgao_destino}
                onChange={handleChange}
                placeholder="Ex: Juizado Especial Criminal"
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "5px", color: "#cbd5e1", fontWeight: "bold" }}>Cidade de Destino</label>
              <input
                type="text"
                name="cidade_destino"
                value={formData.cidade_destino}
                onChange={handleChange}
                placeholder="Ex: Cascavel - Pr."
                style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #334155", background: "#1e293b", color: "white" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button
              type="submit"
              disabled={gerando}
              style={{
                background: gerando ? "#94a3b8" : "#3b82f6",
                color: "white",
                padding: "12px 24px",
                borderRadius: "5px",
                border: "none",
                cursor: gerando ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              {gerando ? "⏳ Gerando..." : "📄 Gerar Ofício (PDF)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OficiosView;
