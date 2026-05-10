import jsPDF from "jspdf";
import { getUserProfile } from "./api.js";
import { getUsuario } from "./auth.js";
import brasaoPM from "../assets/brasao.png";
import brasaoParana from "../assets/brasao_parana.png";

/**
 * Meses em português para composição da data por extenso
 */
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/**
 * Chave do localStorage para o contador sequencial do ofício.
 * Próximo número a usar é armazenado aqui.
 */
const OFICIO_COUNTER_KEY = "oficio_numero_sequencial";

/**
 * Obtém o próximo número sequencial do ofício e incrementa o contador.
 * Se não existir, inicializa em 97 (conforme orientação do cartorário).
 */
function getProximoNumeroOficio() {
  const atual = parseInt(localStorage.getItem(OFICIO_COUNTER_KEY) || "97", 10);
  localStorage.setItem(OFICIO_COUNTER_KEY, String(atual + 1));
  return atual;
}

/**
 * Carrega uma imagem e retorna uma Promise que resolve quando estiver pronta.
 */
function carregarImagem(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Gera o Ofício de Encaminhamento de Objeto Apreendido em PDF.
 * Modelo fielmente baseado no documento oficial do 1º Cartório - TCIP / 6º BPM.
 *
 * @param {Object} item - O objeto da apreensão vindo da API (item da triagem)
 *   Campos usados: bou, processo, reu, substancia, peso, unidade, vara
 */
export async function gerarOficioEncaminhamentoPdf(item) {
  // ── Buscar nome completo do operador do backend ──────────────────────────
  let nomeOperador = "";
  let patenteOperador = "";
  try {
    const perfil = await getUserProfile();
    nomeOperador = perfil.full_name || perfil.username || "OPERADOR";
  } catch {
    const usuario = getUsuario();
    nomeOperador = usuario?.username?.toUpperCase() || "OPERADOR";
  }

  // Tenta extrair a patente do username (ex: "Cb_Roberto" → patente "Cb.", nome "Roberto")
  const userLocal = getUsuario();
  const usernameParts = (userLocal?.username || "").split("_");
  if (usernameParts.length >= 2 && nomeOperador === (userLocal?.username || "").toUpperCase()) {
    patenteOperador = usernameParts[0] + ".";
    nomeOperador = usernameParts.slice(1).join(" ");
  }

  // ── Carregar ambas as imagens ──────────────────────────────────────────
  const [imgParana, imgPM] = await Promise.all([
    carregarImagem(brasaoParana),
    carregarImagem(brasaoPM),
  ]);

  const doc = new jsPDF();
  const marginX = 25;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  const centerX = pageWidth / 2;
  let y = 22;

  // ══════════════════════════════════════════════════════════════════════════
  // CABEÇALHO — Brasão do Paraná (esquerda) + Texto + Brasão PM (direita)
  // ══════════════════════════════════════════════════════════════════════════

  // Brasão do Estado do Paraná (esquerdo)
  if (imgParana) {
    try { doc.addImage(imgParana, "PNG", marginX, y - 2, 20, 24); } catch {}
  }

  // Brasão da PM / 6º BPM (direito)
  if (imgPM) {
    try { doc.addImage(imgPM, "PNG", pageWidth - marginX - 20, y - 2, 20, 24); } catch {}
  }

  // Texto central do cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ESTADO DO PARANÁ", centerX, y + 4, { align: "center" });
  doc.setFontSize(10);
  doc.text("POLÍCIA MILITAR", centerX, y + 9, { align: "center" });
  doc.text("5º COMANDO REGIONAL", centerX, y + 14, { align: "center" });
  doc.setFontSize(9);
  doc.text("SEXTO BATALHÃO DE POLÍCIA MILITAR", centerX, y + 19, { align: "center" });

  y += 28;

  // Linha separadora
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 10;

  // ══════════════════════════════════════════════════════════════════════════
  // NÚMERO DO OFÍCIO (sequencial) + DATA POR EXTENSO
  // ══════════════════════════════════════════════════════════════════════════

  const agora = new Date();
  const numOficio = getProximoNumeroOficio();
  const anoOficio = agora.getFullYear();
  const mesExtenso = MESES[agora.getMonth()];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Ofício nº ${String(numOficio).padStart(3, "0")}/${anoOficio}`, marginX, y);
  doc.text(
    `Cascavel, ${agora.getDate()} de ${mesExtenso} de ${anoOficio}`,
    pageWidth - marginX,
    y,
    { align: "right" }
  );

  y += 16;

  // ══════════════════════════════════════════════════════════════════════════
  // ASSUNTO
  // ══════════════════════════════════════════════════════════════════════════

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ASSUNTO:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text("Encaminhamento de objeto apreendido", marginX + 24, y);

  y += 14;

  // ══════════════════════════════════════════════════════════════════════════
  // CORPO DO OFÍCIO
  // ══════════════════════════════════════════════════════════════════════════

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Encaminho-lhe o seguinte objeto:", marginX, y);
  y += 10;

  // Descrição do objeto
  const pesoNum = parseFloat(String(item.peso || 0).replace(",", "."));
  const unidade = item.unidade || "";
  let pesoDisplay = "";
  if (unidade === "Unid") {
    pesoDisplay = `${Math.round(pesoNum).toString().padStart(2, "0")} Unid.`;
  } else {
    pesoDisplay = `${pesoNum.toFixed(2).replace(".", ",")} ${unidade}`;
  }
  const descricaoObj = `${pesoDisplay} - ${(item.substancia || "NAO INFORMADO").toUpperCase()}`;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const descLines = doc.splitTextToSize(descricaoObj, contentWidth - 20);
  doc.text(descLines, marginX + 15, y);
  y += descLines.length * 5 + 8;

  // BOU
  doc.setFont("helvetica", "bold");
  doc.text("BOU:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(item.bou || "", marginX + 13, y);
  y += 7;

  // Nº PROCESSO
  doc.setFont("helvetica", "bold");
  doc.text("Nº PROCESSO:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(item.processo || "", marginX + 36, y);
  y += 7;

  // AUTOR/RÉU
  doc.setFont("helvetica", "bold");
  doc.text("AUTOR/RÉU:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text((item.reu || "NAO INFORMADO").toUpperCase(), marginX + 32, y);

  // ══════════════════════════════════════════════════════════════════════════
  // RESPEITOSAMENTE
  // ══════════════════════════════════════════════════════════════════════════

  y += 35;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Respeitosamente,", centerX, y, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // ASSINATURA DO CARTORÁRIO (sem brasão abaixo)
  // ══════════════════════════════════════════════════════════════════════════

  y += 30;

  // Linha de assinatura
  const sigLineW = 65;
  const sigLineStartX = centerX - sigLineW / 2;
  doc.line(sigLineStartX, y, sigLineStartX + sigLineW, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const assinatura = patenteOperador
    ? `${patenteOperador} ${nomeOperador}`.toUpperCase()
    : nomeOperador.toUpperCase();
  doc.text(assinatura, centerX, y, { align: "center" });

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("CARTORÁRIO", centerX, y, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // DESTINATÁRIO (esquerda) + SELO/CARIMBO (direita) — lado a lado
  // ══════════════════════════════════════════════════════════════════════════

  y += 20;

  // Selo/Carimbo PM à direita (posicionado no mesmo nível do destinatário)
  const seloX = pageWidth - marginX - 35;
  const seloY = y - 5;
  if (imgPM) {
    try { doc.addImage(imgPM, "PNG", seloX, seloY, 30, 36); } catch {}
  }

  // Destinatário à esquerda
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Exmo.(A) Sr.(A)", marginX, y);
  y += 6;
  doc.text("Juiz (A) de Direito", marginX, y);
  y += 6;
  doc.text(item.vara || "Vara Especial Criminal", marginX, y);
  y += 6;
  doc.text("Cascavel – Pr.", marginX, y);

  // ══════════════════════════════════════════════════════════════════════════
  // RODAPÉ — linha + endereço + contato (fundo da página)
  // ══════════════════════════════════════════════════════════════════════════

  const footerY = pageHeight - 22;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text(
    "Rua Pernambuco, 2063 – Recanto Tropical – Cascavel – PR – CEP 85.810-271",
    centerX,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "Fone/WhatsApp: (45) 3321 – 4621 | E-mail: 6bpm-1cartorio@pm.pr.gov.br",
    centerX,
    footerY + 10,
    { align: "center" }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SALVAR PDF
  // ══════════════════════════════════════════════════════════════════════════

  const bouFormatado = (item.bou || "SEM-BOU").replace(/\//g, "-");
  doc.save(`OFICIO_APREENSAO_${bouFormatado}.pdf`);
}
