import jsPDF from "jspdf";
import { getUserProfile } from "./api.js";
import { getUsuario } from "./auth.js";
import logoBpm from "../assets/brasao.png";

/**
 * Meses em português para composição da data por extenso
 */
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * Gera o Ofício de Encaminhamento de Objeto Apreendido em PDF.
 *
 * @param {Object} item - O objeto da apreensão vindo da API (item da triagem)
 *   Campos usados: bou, processo, reu, substancia, peso, unidade, vara, descricao
 */
export async function gerarOficioEncaminhamentoPdf(item) {
  // ── Buscar nome completo do operador do backend ──────────────────────────
  let nomeOperador = "";
  let patenteOperador = "";
  try {
    const perfil = await getUserProfile();
    nomeOperador = perfil.full_name || perfil.username || "OPERADOR";
  } catch {
    // Fallback: usa o username do localStorage
    const usuario = getUsuario();
    nomeOperador = usuario?.username?.toUpperCase() || "OPERADOR";
  }

  // Tenta extrair a patente do username (ex: "Cb_Roberto" → patente "Cb.", nome "Roberto")
  const userLocal = getUsuario();
  const usernameParts = (userLocal?.username || "").split("_");
  if (usernameParts.length >= 2 && nomeOperador === (userLocal?.username || "").toUpperCase()) {
    // Se o full_name não foi configurado, monta a partir do username
    patenteOperador = usernameParts[0] + ".";
    nomeOperador = usernameParts.slice(1).join(" ");
  }

  const doc = new jsPDF();
  const marginX = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  let y = 20;

  // ── Carregar brasão ────────────────────────────────────────────────────
  const img = new Image();
  img.src = logoBpm;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
  });

  // ── CABEÇALHO ──────────────────────────────────────────────────────────
  // Brasão esquerdo
  try {
    doc.addImage(img, "PNG", marginX + 5, y, 22, 26);
  } catch {}
  // Brasão direito
  try {
    doc.addImage(img, "PNG", pageWidth - marginX - 27, y, 22, 26);
  } catch {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ESTADO DO PARANA", centerX, y + 8, { align: "center" });
  doc.setFontSize(10);
  doc.text("POLICIA MILITAR", centerX, y + 14, { align: "center" });
  doc.text("5o COMANDO REGIONAL", centerX, y + 20, { align: "center" });
  doc.text("SEXTO BATALHAO DE POLICIA MILITAR", centerX, y + 26, { align: "center" });

  y += 36;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 10;

  // ── NÚMERO DO OFÍCIO E DATA ────────────────────────────────────────────
  const agora = new Date();
  const numOficio = Math.floor(Math.random() * 900) + 100;
  const anoOficio = agora.getFullYear();
  const mesExtenso = MESES[agora.getMonth()];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Oficio no ${String(numOficio).padStart(3, "0")}/${anoOficio}`, marginX, y);
  doc.text(
    `Cascavel, ${agora.getDate()} de ${mesExtenso} de ${anoOficio}`,
    pageWidth - marginX,
    y,
    { align: "right" }
  );

  y += 16;

  // ── ASSUNTO ────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ASSUNTO: ", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text("Encaminhamento de objeto apreendido", marginX + 25, y);

  y += 12;

  // ── CORPO DO OFÍCIO ────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.text("Encaminho-lhe o seguinte objeto:", marginX, y);
  y += 10;

  // Descrição do objeto (substancia + peso + unidade)
  const pesoDisplay = item.peso
    ? `${parseFloat(String(item.peso).replace(",", ".")).toFixed(2).replace(".", ",")} ${item.unidade || ""}`
    : "";
  const descricaoObj = `${pesoDisplay ? pesoDisplay + " - " : ""}${(item.substancia || "NAO INFORMADO").toUpperCase()}`;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38); // Vermelho para dados do cadastro
  doc.setFontSize(10);
  const descLines = doc.splitTextToSize(descricaoObj, contentWidth - 10);
  doc.text(descLines, marginX + 10, y);
  y += descLines.length * 6 + 6;

  // BOU
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("BOU: ", marginX, y);
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "normal");
  doc.text(item.bou || "", marginX + 12, y);
  y += 7;

  // Nº PROCESSO
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("No PROCESSO: ", marginX, y);
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "normal");
  doc.text(item.processo || "", marginX + 34, y);
  y += 7;

  // AUTOR/RÉU
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("AUTOR/REU: ", marginX, y);
  doc.setTextColor(220, 38, 38);
  doc.setFont("helvetica", "normal");
  doc.text((item.reu || "NAO INFORMADO").toUpperCase(), marginX + 29, y);

  doc.setTextColor(0, 0, 0); // Reset cor

  y += 40;

  // ── RESPEITOSAMENTE ────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Respeitosamente,", centerX, y, { align: "center" });

  y += 30;

  // ── ASSINATURA DO CARTORÁRIO ───────────────────────────────────────────
  const lineWidth = 70;
  const lineStartX = centerX - lineWidth / 2;
  doc.line(lineStartX, y, lineStartX + lineWidth, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const assinatura = patenteOperador
    ? `${patenteOperador} ${nomeOperador}`.toUpperCase()
    : nomeOperador.toUpperCase();
  doc.text(assinatura, centerX, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("CARTORARIO", centerX, y, { align: "center" });

  y += 20;

  // ── SELO / BRASÃO CENTRAL ──────────────────────────────────────────────
  try {
    doc.addImage(img, "PNG", centerX - 15, y, 30, 36);
  } catch {}

  y += 42;

  // ── DESTINATÁRIO ───────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Exmo.(A) Sr.(A)", marginX, y);
  y += 6;
  doc.text("Juiz (A) de Direito", marginX, y);
  y += 6;
  doc.setTextColor(220, 38, 38);
  doc.text(item.vara || "Vara Especial Criminal", marginX, y);
  doc.setTextColor(0, 0, 0);
  y += 6;
  doc.text("Cascavel - Pr.", marginX, y);

  // ── RODAPÉ ─────────────────────────────────────────────────────────────
  const footerY = pageHeight - 20;
  doc.setDrawColor(100);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Rua Pernambuco, 2063 - Regiao do Lago - Cascavel - PR - CEP 85.810-271",
    centerX,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "Fone/WhatsApp: (45) 3321-4621 | Email: 6bpm-1cartorio@pm.pr.gov.br",
    centerX,
    footerY + 10,
    { align: "center" }
  );

  // ── SALVAR ─────────────────────────────────────────────────────────────
  const bouFormatado = (item.bou || "SEM-BOU").replace(/\//g, "-");
  doc.save(`OFICIO_APREENSAO_${bouFormatado}.pdf`);
}
