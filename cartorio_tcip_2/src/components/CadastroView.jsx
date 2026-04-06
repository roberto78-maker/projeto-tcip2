import React, { useState } from "react";
import { getUsuario } from "../services/auth.js";
import { VARAS, SUBSTANCIAS, UNIDADES_PM, PATENTES, CRIMES_GERAIS } from "../constants/options.js";
import AutocompleteInput from "./AutocompleteInput.jsx";
import {
  atualizarMaterialPorTipo,
  criarEstadoInicialCadastro,
  criarMaterialPadrao,
  formatarBOU,
  formatarPeso,
  formatarProcesso,
  formatarRG,
  salvarCadastro,
  upper,
} from "../services/cadastroWorkflow.js";

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

export default function CadastroView() {
  const [form, setForm] = useState(criarEstadoInicialCadastro);
  const [salvando, setSalvando] = useState(false);

  const {
    crimesSelecionados,
    fielDepositario,
    dataFato,
    bou,
    processo,
    vara,
    unidadeOrigem,
    patente,
    policial,
    rg,
    materiais,
  } = form;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const adicionarMaterial = () => {
    setForm((current) => ({
      ...current,
      materiais: [...current.materiais, criarMaterialPadrao()],
    }));
  };

  const removerMaterial = (id) => {
    if (materiais.length <= 1) return;

    setForm((current) => ({
      ...current,
      materiais: current.materiais.filter((material) => material.id !== id),
    }));
  };

  const updateMaterial = (id, field, value) => {
    setForm((current) => ({
      ...current,
      materiais: current.materiais.map((material) =>
        material.id === id ? { ...material, [field]: value } : material
      ),
    }));
  };

  const updateMaterialTipo = (id, tipo) => {
    setForm((current) => ({
      ...current,
      materiais: current.materiais.map((material) =>
        material.id === id ? atualizarMaterialPorTipo(material, tipo) : material
      ),
    }));
  };

  const toggleCrime = (crime, checked) => {
    if (checked) {
      updateField("crimesSelecionados", [...crimesSelecionados, crime]);
      return;
    }

    updateField(
      "crimesSelecionados",
      crimesSelecionados.filter((item) => item !== crime)
    );
  };

  const handleSalvar = async () => {
    if (salvando) return;

    setSalvando(true);
    try {
      const { mensagem, proximoEstado } = await salvarCadastro(form);
      alert(mensagem);
      setForm(proximoEstado);
    } catch (err) {
      console.error(err);
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "0", letterSpacing: "1px" }}>
          GESTAO DE CARTORIO - TCIP
        </h1>
      </div>

      <div className="card" style={{ border: "2px solid #3b82f6", background: "#f8fafc", padding: "20px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          SELECIONE A(S) NATUREZA(S) DO PROCEDIMENTO <span style={{ color: "#ef4444", fontSize: "12px" }}>(OBRIGATORIO *)</span>
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "8px",
            maxHeight: "250px",
            overflowY: "auto",
            paddingRight: "10px",
          }}
        >
          {CRIMES_GERAIS.map((crime) => (
            <label
              key={crime}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: "#475569",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                background: crimesSelecionados.includes(crime) ? "#eff6ff" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={crimesSelecionados.includes(crime)}
                onChange={(e) => toggleCrime(crime, e.target.checked)}
              />
              {crime}
            </label>
          ))}
        </div>

        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "15px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: fielDepositario ? "#fef2f2" : "#f8fafc",
              padding: "12px 25px",
              borderRadius: "12px",
              border: fielDepositario ? "1px solid #fecaca" : "1px solid #e2e8f0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={fielDepositario}
              onChange={(e) => updateField("fielDepositario", e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span style={{ fontSize: "13px", fontWeight: "700", color: fielDepositario ? "#dc2626" : "#475569" }}>
              ENTREGAR COMO FIEL DEPOSITARIO (Objeto fica com o proprietario)
            </span>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>
            1. DADOS DA OCORRENCIA ({crimesSelecionados.length > 0 ? crimesSelecionados.join(", ") : "GERAL"})
          </h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>
            OPERADOR: {getUsuario()?.username?.toUpperCase()}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: "15px", marginBottom: "20px" }}>
          <FormGroup label="DATA DO FATO *" id="dataFato">
            <input type="date" id="dataFato" name="dataFato" style={inputStyle} value={dataFato} onChange={(e) => updateField("dataFato", e.target.value)} />
          </FormGroup>

          <FormGroup label="No BOU (AAAA/Seq) *" id="bou">
            <input type="text" id="bou" name="bou" style={inputStyle} value={bou} onChange={(e) => updateField("bou", formatarBOU(e.target.value))} />
          </FormGroup>

          <FormGroup label="PROJUDI *" id="processo">
            <input
              type="text"
              id="processo"
              name="processo"
              style={inputStyle}
              value={processo}
              onChange={(e) => updateField("processo", formatarProcesso(e.target.value))}
            />
          </FormGroup>

          <FormGroup label="VARA DESTINO *" id="vara">
            <select id="vara" name="vara" style={inputStyle} value={vara} onChange={(e) => updateField("vara", e.target.value)}>
              <option value="">Selecione...</option>
              {VARAS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2.5fr 1.5fr", gap: "15px" }}>
          <FormGroup label="UNIDADE DE ORIGEM *" id="unidadeOrigem">
            <select
              id="unidadeOrigem"
              name="unidadeOrigem"
              style={inputStyle}
              value={unidadeOrigem}
              onChange={(e) => updateField("unidadeOrigem", e.target.value)}
            >
              {UNIDADES_PM.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="GRADUACAO *" id="patente">
            <select id="patente" name="patente" style={inputStyle} value={patente} onChange={(e) => updateField("patente", e.target.value)}>
              {PATENTES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="POLICIAL ENTREGADOR *" id="policial">
            <AutocompleteInput
              id="policial"
              name="policial"
              historyKey="hist_policial"
              value={policial}
              onChange={(e) => updateField("policial", upper(e.target.value))}
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
              onChange={(e) => updateField("rg", formatarRG(e.target.value))}
              style={inputStyle}
              placeholder="00.000.000-0"
            />
          </FormGroup>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>2. NOTICIADOS E APREENSOES</h2>
          <button className="btn-blue" onClick={adicionarMaterial} style={{ fontSize: "12px" }}>
            + Adicionar Pessoa
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 100px 100px 120px 40px", gap: "12px", marginBottom: "10px", padding: "0 10px" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>NOTICIADO / AUTOR</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>TIPO</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>APREENSAO / DROGA</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>QUANT. / PESO</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>UNID.</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>No LACRE</label>
          <div></div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {materiais.map((material) => (
            <div
              key={material.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1.5fr 100px 100px 120px 40px",
                gap: "12px",
                alignItems: "center",
                background: "#f8fafc",
                padding: "8px 10px",
                borderRadius: "8px",
                borderLeft:
                  material.tipo === "DROGA"
                    ? "4px solid #10b981"
                    : material.tipo === "SOM"
                      ? "4px solid #f59e0b"
                      : "4px solid #3b82f6",
              }}
            >
              <AutocompleteInput
                historyKey="hist_noticiado"
                value={material.reu}
                onChange={(e) => updateMaterial(material.id, "reu", upper(e.target.value))}
                style={{ ...inputStyle, padding: "8px" }}
                placeholder="Nome..."
              />

              <select
                id={`tipo-${material.id}`}
                name={`tipo-${material.id}`}
                style={{ ...inputStyle, padding: "8px" }}
                value={material.tipo}
                onChange={(e) => updateMaterialTipo(material.id, e.target.value)}
              >
                <option value="OBJETO">OBJETO</option>
                <option value="DROGA">DROGA</option>
                <option value="SOM">SOM</option>
                <option value="NENHUM">NENHUM</option>
              </select>

              {material.tipo === "DROGA" ? (
                <select
                  style={{ ...inputStyle, padding: "8px" }}
                  value={material.substancia}
                  onChange={(e) => updateMaterial(material.id, "substancia", e.target.value)}
                >
                  {SUBSTANCIAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  style={{ ...inputStyle, padding: "8px" }}
                  value={material.substancia}
                  onChange={(e) => updateMaterial(material.id, "substancia", upper(e.target.value))}
                  placeholder="Descricao..."
                />
              )}

              <input
                type="text"
                style={{ ...inputStyle, padding: "8px" }}
                value={material.peso}
                onChange={(e) =>
                  updateMaterial(
                    material.id,
                    "peso",
                    material.tipo === "DROGA" ? formatarPeso(e.target.value) : e.target.value
                  )
                }
                placeholder="0,00"
              />

              <select
                style={{ ...inputStyle, padding: "8px" }}
                value={material.unidadePeso}
                onChange={(e) => updateMaterial(material.id, "unidadePeso", e.target.value)}
              >
                <option value="Unid">Unid</option>
                <option value="g">g</option>
                <option value="Kg">Kg</option>
              </select>

              <input
                type="text"
                style={{ ...inputStyle, padding: "8px" }}
                value={material.lacre}
                onChange={(e) => updateMaterial(material.id, "lacre", e.target.value)}
                placeholder="Lacre..."
              />

              <button
                onClick={() => removerMaterial(material.id)}
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "20px", fontWeight: "bold" }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        className="btn-green"
        onClick={handleSalvar}
        disabled={salvando}
        style={{ width: "100%", padding: "16px", fontWeight: "800", opacity: salvando ? 0.7 : 1, cursor: salvando ? "not-allowed" : "pointer" }}
      >
        {salvando ? "PROCESSANDO..." : "FINALIZAR CADASTRO E GERAR RECIBO"}
      </button>
    </div>
  );
}
