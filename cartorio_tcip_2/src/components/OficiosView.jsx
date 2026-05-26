import React, { useState } from "react";
import { addOficioPersonalizado } from "../services/api";
import { gerarOficioPersonalizadoPdf } from "../services/oficioPersonalizadoPdf";

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
  color: "#1e293b",
};

function OficiosView() {
  const [formData, setFormData] = useState({
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
      const dadosComNumero = await addOficioPersonalizado(formData);
      
      // Gera o PDF
      await gerarOficioPersonalizadoPdf(dadosComNumero);
      
      // Limpa formulário após gerar
      setFormData({
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
    <div style={{ padding: "10px", paddingBottom: "50px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "24px", margin: 0, fontWeight: "700" }}>📄 Gerador de Ofícios</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Criação de ofícios com numeração integrada e formatação ABNT automática.
          </p>
        </div>
      </div>

      <div className="card">
        {erro && (
          <div 
            style={{ 
              marginBottom: "15px", 
              padding: "10px 15px", 
              background: "#fef2f2", 
              color: "#b91c1c", 
              borderRadius: "6px", 
              border: "1px solid #fca5a5",
              fontSize: "13px",
              fontWeight: "600"
            }}
          >
            ⚠️ {erro}
          </div>
        )}
        
        <form onSubmit={handleGerarOficio} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <FormGroup label="Assunto" id="assunto" required>
            <input
              type="text"
              id="assunto"
              name="assunto"
              value={formData.assunto}
              onChange={handleChange}
              placeholder="Ex: Encaminhamento de Laudo Pericial"
              required
              style={inputStyle}
            />
          </FormGroup>

          <FormGroup label="Texto Base" id="texto" required>
            <textarea
              id="texto"
              name="texto"
              value={formData.texto}
              onChange={handleChange}
              placeholder="Digite o conteúdo do ofício aqui..."
              required
              rows="8"
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </FormGroup>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <FormGroup label="Forma de Tratamento" id="tratamento">
              <input
                type="text"
                id="tratamento"
                name="tratamento"
                value={formData.tratamento}
                onChange={handleChange}
                placeholder="Ex: Exmo.(A) Sr.(A)"
                style={inputStyle}
              />
            </FormGroup>
            
            <FormGroup label="Cargo do Destinatário" id="cargo_destinatario">
              <input
                type="text"
                id="cargo_destinatario"
                name="cargo_destinatario"
                value={formData.cargo_destinatario}
                onChange={handleChange}
                placeholder="Ex: Juiz de Direito"
                style={inputStyle}
              />
            </FormGroup>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "15px" }}>
            <FormGroup label="Órgão de Destino" id="orgao_destino">
              <input
                type="text"
                id="orgao_destino"
                name="orgao_destino"
                value={formData.orgao_destino}
                onChange={handleChange}
                placeholder="Ex: Juizado Especial Criminal"
                style={inputStyle}
              />
            </FormGroup>
            
            <FormGroup label="Cidade de Destino" id="cidade_destino">
              <input
                type="text"
                id="cidade_destino"
                name="cidade_destino"
                value={formData.cidade_destino}
                onChange={handleChange}
                placeholder="Ex: Cascavel - Pr."
                style={inputStyle}
              />
            </FormGroup>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="submit"
              className="btn-blue"
              disabled={gerando}
              style={{
                padding: "12px 24px",
                fontWeight: "bold",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "45px"
              }}
            >
              {gerando && <span className="spinner"></span>}
              {gerando ? "Gerando..." : "📄 Gerar Ofício (PDF)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OficiosView;
