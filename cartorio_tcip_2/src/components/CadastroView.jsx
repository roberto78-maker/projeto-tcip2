import React, { useState } from "react";
import { JUIZADOS, SUBSTANCIAS, UNIDADES_PM, PATENTES, CRIMES_GERAIS } from "../constants/options.js";
import { useCadastroForm } from "../hooks/useCadastroForm.js";
import AutocompleteInput from "./AutocompleteInput.jsx";
import QRCodeModal from "./QRCodeModal.jsx";
import { getPoliciais, addPolicial } from "../services/api.js";

const FormGroup = ({ label, id, children, required, rightElement }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label
      htmlFor={id}
      style={{
        fontSize: "12px",
        fontWeight: "700",
        color: "#475569",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </span>
      {rightElement}
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
  const {
    operador,
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
    salvando,
    showQRModal,
    tokenQR,
    urlQR,
    adicionarMaterial,
    removerMaterial,
    toggleCrime,
    updateMaterialTipo,
    handleColetarAssinatura,
    handleFinalizarComAssinatura,
    handleCancelarQR,
    handleDataFatoChange,
    handleBouChange,
    handleProcessoChange,
    handleVaraChange,
    handleUnidadeOrigemChange,
    handlePatenteChange,
    handlePolicialChange,
    handleRgChange,
    handleSelecionarPolicial,
    handleFielDepositarioChange,
    handleMaterialReuChange,
    handleMaterialSubstanciaChange,
    handleMaterialDescricaoChange,
    handleMaterialPesoChange,
    handleMaterialUnidadeChange,
    handleMaterialLacreChange,
  } = useCadastroForm();

  // Estados do Modal de Cadastro de Policial
  const [showCadastrarPolicial, setShowCadastrarPolicial] = useState(false);
  const [novoPolicial, setNovoPolicial] = useState({
    patente: "SD",
    nome: "",
    rg: "",
    unidade_origem: "RPA",
  });
  const [cadastrandoPolicial, setCadastrandoPolicial] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1e293b", margin: "0", letterSpacing: "1px" }}>
          GESTÃO DE CARTÓRIO - TCIP
        </h1>
      </div>

      <div className="card" style={{ border: "2px solid #3b82f6", background: "#f8fafc", padding: "20px" }}>
        <h3 style={{ margin: "0 0 15px 0", color: "#1e3a8a", fontSize: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          SELECIONE A(S) NATUREZA(S) DO PROCEDIMENTO <span style={{ color: "#ef4444", fontSize: "12px" }}>(OBRIGATÓRIO *)</span>
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
          {CRIMES_GERAIS.map((crime) => {
            const isDestaque = crime === "Perturbação do Sossego: Artigo 42 da LCP" || crime === "Drogas para Consumo Pessoal: Artigo 28 da Lei 11.343/06" || crime === "Ameaça: Artigo 147 do CP" || crime === "Conduzir Veículo sem Habilitação: Artigo 309 do CTB";
            return (
            <label
              key={crime}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
                color: isDestaque ? "#1e293b" : "#475569",
                fontWeight: isDestaque ? "bold" : "normal",
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
              {isDestaque ? <strong>{crime}</strong> : crime}
            </label>
          )})}
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
              onChange={(e) => handleFielDepositarioChange(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span style={{ fontSize: "13px", fontWeight: "700", color: fielDepositario ? "#dc2626" : "#475569" }}>
              ENTREGAR COMO FIEL DEPOSITÁRIO (Objeto fica com o proprietário)
            </span>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>
            1. DADOS DA OCORRÊNCIA ({crimesSelecionados.length > 0 ? crimesSelecionados.join(", ") : "GERAL"})
          </h2>
          <span className="badge" style={{ background: "#1e293b", color: "white" }}>
            OPERADOR: {operador}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: "15px", marginBottom: "20px" }}>
          <FormGroup label="DATA DO FATO *" id="dataFato">
            <input type="date" id="dataFato" name="dataFato" style={inputStyle} value={dataFato} onChange={(e) => handleDataFatoChange(e.target.value)} />
          </FormGroup>

          <FormGroup label="No BOU (AAAA/Seq) *" id="bou">
            <input type="text" id="bou" name="bou" style={inputStyle} value={bou} onChange={(e) => handleBouChange(e.target.value)} />
          </FormGroup>

          <FormGroup label="PROJUDI *" id="processo">
            <input type="text" id="processo" name="processo" style={inputStyle} value={processo} onChange={(e) => handleProcessoChange(e.target.value)} />
          </FormGroup>

          <FormGroup label="JUIZADO DESTINO *" id="vara">
            <select id="vara" name="vara" style={inputStyle} value={vara} onChange={(e) => handleVaraChange(e.target.value)}>
              <option value="">Selecione...</option>
              {JUIZADOS.map((item) => (
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
              onChange={(e) => handleUnidadeOrigemChange(e.target.value)}
            >
              {UNIDADES_PM.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="GRADUAÇÃO *" id="patente">
            <select id="patente" name="patente" style={inputStyle} value={patente} onChange={(e) => handlePatenteChange(e.target.value)}>
              {PATENTES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup
            label="POLICIAL RESPONSÁVEL *"
            id="policial"
            rightElement={
              <button
                type="button"
                onClick={() => setShowCadastrarPolicial(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                + Cadastrar Novo
              </button>
            }
          >
            <AutocompleteInput
              id="policial"
              name="policial"
              value={policial}
              onChange={(e) => handlePolicialChange(e.target.value)}
              style={inputStyle}
              placeholder="Nome do policial..."
              asyncSearch={getPoliciais}
              renderSuggestion={(s) => `${s.patente || ""} ${s.nome} (RG: ${s.rg})`}
              onSelectSuggestion={handleSelecionarPolicial}
            />
          </FormGroup>

          <FormGroup label="RG *" id="rg">
            <AutocompleteInput
              id="rg"
              name="rg"
              value={rg}
              onChange={(e) => handleRgChange(e.target.value)}
              style={inputStyle}
              placeholder="00.000.000-0"
              asyncSearch={getPoliciais}
              renderSuggestion={(s) => `RG: ${s.rg} - ${s.patente || ""} ${s.nome}`}
              onSelectSuggestion={handleSelecionarPolicial}
            />
          </FormGroup>
        </div>
      </div>

      <div className="card" style={{ padding: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "15px" }}>
          <h2 style={{ fontSize: "16px", color: "#1e3a8a", margin: 0 }}>2. NOTICIADOS E APREENSÕES</h2>
          <button className="btn-blue" onClick={adicionarMaterial} style={{ fontSize: "12px" }}>
            + Adicionar Pessoa
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1.5fr 100px 100px 120px 40px", gap: "12px", marginBottom: "10px", padding: "0 10px" }}>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>NOTICIADO / AUTOR</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>TIPO</label>
          <label style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>APREENSÕES</label>
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
                onChange={(e) => handleMaterialReuChange(material.id, e.target.value)}
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
                <option value="SOM">APARELHO DE SOM</option>
                <option value="NENHUM">NENHUM</option>
              </select>

              {material.tipo === "DROGA" ? (
                <select
                  style={{ ...inputStyle, padding: "8px" }}
                  value={material.substancia}
                  onChange={(e) => handleMaterialSubstanciaChange(material.id, e.target.value)}
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
                  onChange={(e) => handleMaterialDescricaoChange(material.id, e.target.value)}
                  placeholder="Descricao..."
                />
              )}

              <input
                type="text"
                style={{ ...inputStyle, padding: "8px" }}
                value={material.peso}
                onChange={(e) => handleMaterialPesoChange(material.id, material.tipo, e.target.value)}
                placeholder="0,00"
              />

              <select
                style={{ ...inputStyle, padding: "8px" }}
                value={material.unidadePeso}
                onChange={(e) => handleMaterialUnidadeChange(material.id, e.target.value)}
              >
                <option value="Unid">Unid</option>
                <option value="g">g</option>
                <option value="Kg">Kg</option>
              </select>

              <input
                type="text"
                style={{ ...inputStyle, padding: "8px" }}
                value={material.lacre}
                onChange={(e) => handleMaterialLacreChange(material.id, e.target.value)}
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
        id="btn-coletar-assinatura"
        className="btn-green"
        onClick={handleColetarAssinatura}
        disabled={salvando}
        style={{
          width: "100%",
          padding: "16px",
          fontWeight: "800",
          fontSize: "15px",
          opacity: salvando ? 0.7 : 1,
          cursor: salvando ? "not-allowed" : "pointer",
          letterSpacing: "1px",
        }}
      >
        {salvando ? "AGUARDE..." : "📱 COLETAR ASSINATURA E GERAR RECIBO"}
      </button>

      {/* Modal do QR Code — exibido ao iniciar coleta de assinatura */}
      {showQRModal && (
        <QRCodeModal
          token={tokenQR}
          urlQr={urlQR}
          bou={bou}
          onSucesso={handleFinalizarComAssinatura}
          onCancelar={handleCancelarQR}
        />
      )}

      {/* Modal de Cadastro de Policial */}
      {showCadastrarPolicial && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              width: "480px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e3a8a", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
              👮 Cadastrar Novo Policial
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <FormGroup label="GRADUAÇÃO *" id="modal-patente">
                  <select
                    id="modal-patente"
                    style={inputStyle}
                    value={novoPolicial.patente}
                    onChange={(e) => setNovoPolicial({ ...novoPolicial, patente: e.target.value })}
                  >
                    {PATENTES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                <FormGroup label="UNIDADE DE ORIGEM *" id="modal-unidade">
                  <select
                    id="modal-unidade"
                    style={inputStyle}
                    value={novoPolicial.unidade_origem}
                    onChange={(e) => setNovoPolicial({ ...novoPolicial, unidade_origem: e.target.value })}
                  >
                    {UNIDADES_PM.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormGroup>
              </div>

              <FormGroup label="NOME DO POLICIAL *" id="modal-nome">
                <input
                  type="text"
                  id="modal-nome"
                  placeholder="Nome de guerra ou completo..."
                  style={inputStyle}
                  value={novoPolicial.nome}
                  onChange={(e) => setNovoPolicial({ ...novoPolicial, nome: e.target.value.toUpperCase() })}
                />
              </FormGroup>

              <FormGroup label="RG *" id="modal-rg">
                <input
                  type="text"
                  id="modal-rg"
                  placeholder="00.000.000-0"
                  style={inputStyle}
                  value={novoPolicial.rg}
                  onChange={(e) => {
                    const formatarRGLocal = (val) => {
                      const d = String(val).replace(/\D/g, "").slice(0, 9);
                      if (d.length <= 2) return d;
                      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
                      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
                      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
                    };
                    setNovoPolicial({ ...novoPolicial, rg: formatarRGLocal(e.target.value) });
                  }}
                />
              </FormGroup>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowCadastrarPolicial(false);
                  setNovoPolicial({ patente: "SD", nome: "", rg: "", unidade_origem: "RPA" });
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                disabled={cadastrandoPolicial}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!novoPolicial.nome.trim()) {
                    alert("Informe o nome do policial.");
                    return;
                  }
                  if (!novoPolicial.rg.trim()) {
                    alert("Informe o RG do policial.");
                    return;
                  }
                  setCadastrandoPolicial(true);
                  try {
                    const salvo = await addPolicial({
                      ...novoPolicial,
                      nome: novoPolicial.nome.toUpperCase().trim(),
                    });
                    handleSelecionarPolicial(salvo);
                    alert("Policial cadastrado e selecionado com sucesso!");
                    setShowCadastrarPolicial(false);
                    setNovoPolicial({ patente: "SD", nome: "", rg: "", unidade_origem: "RPA" });
                  } catch (err) {
                    alert(err.message);
                  } finally {
                    setCadastrandoPolicial(false);
                  }
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#10b981",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                disabled={cadastrandoPolicial}
              >
                {cadastrandoPolicial ? "Cadastrando..." : "Confirmar Cadastro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
