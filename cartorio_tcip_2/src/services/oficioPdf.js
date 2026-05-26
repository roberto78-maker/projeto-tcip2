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
 * Gera o Ofício de Encaminhamento em formato ABNT.
 */
export async function gerarOficioEncaminhamentoPdf(item) {
  // ── Buscar nome completo do operador ─────────────────────────────────────
  let nomeOperador = "";
  let patenteOperador = "";
  try {
    const perfil = await getUserProfile();
    nomeOperador = perfil.full_name || perfil.username || "OPERADOR";
  } catch {
    const usuario = getUsuario();
    nomeOperador = usuario?.username?.toUpperCase() || "OPERADOR";
  }

  const userLocal = getUsuario();
  const usernameParts = (userLocal?.username || "").split("_");
  if (usernameParts.length >= 2 && nomeOperador === (userLocal?.username || "").toUpperCase()) {
    patenteOperador = usernameParts[0] + ".";
    nomeOperador = usernameParts.slice(1).join(" ");
  }

  // ── Carregar imagens (Brasões) ──────────────────────────────────────────
  const [imgParana, imgPM] = await Promise.all([
    carregarImagem(brasaoParana),
    carregarImagem(brasaoPM),
  ]);

  // ── Configuração ABNT (A4, mm) ──────────────────────────────────────────
  // Margens: Superior 3cm (30mm), Esquerda 3cm (30mm), Direita 2cm (20mm), Inferior 2cm (20mm)
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const marginL = 30;
  const marginR = 20;
  const marginT = 30;
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - marginL - marginR;
  const centerX = marginL + contentWidth / 2;
  let y = marginT;

  doc.setTextColor(0, 0, 0); // Tudo em preto (exigência)

  // ══════════════════════════════════════════════════════════════════════════
  // CABEÇALHO (Brasões e Textos Institucionais)
  // ══════════════════════════════════════════════════════════════════════════

  const headerImgWidth = 22;
  const headerImgHeight = 28;

  // Brasão do Estado do Paraná (esquerdo)
  if (imgParana) {
    try { doc.addImage(imgParana, "PNG", marginL, y - 8, headerImgWidth, headerImgHeight); } catch {}
  }

  // Brasão da PM / 6º BPM (direito)
  if (imgPM) {
    try { doc.addImage(imgPM, "PNG", pageWidth - marginR - headerImgWidth, y - 8, headerImgWidth, headerImgHeight); } catch {}
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ESTADO DO PARANÁ", centerX, y + 2, { align: "center" });
  doc.text("POLÍCIA MILITAR", centerX, y + 7, { align: "center" });
  doc.text("5º COMANDO REGIONAL", centerX, y + 12, { align: "center" });
  doc.text("SEXTO BATALHÃO DE POLÍCIA MILITAR", centerX, y + 17, { align: "center" });
  doc.text("PRIMEIRO CARTORIO - TCIP", centerX, y + 22, { align: "center" });

  y += 30;

  // Linha separadora do cabeçalho
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 8;

  // ══════════════════════════════════════════════════════════════════════════
  // NÚMERO DO OFÍCIO E DATA
  // ══════════════════════════════════════════════════════════════════════════

  const agora = new Date();
  const numOficio = item.numero_oficio || 0;
  const anoOficio = item.ano_oficio || agora.getFullYear();
  const mesExtenso = MESES[agora.getMonth()];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Ofício nº ${String(numOficio).padStart(3, "0")}/${anoOficio}`, marginL, y);
  
  doc.setFont("helvetica", "normal");
  doc.text(
    `Cascavel, ${agora.getDate()} de ${mesExtenso} de ${anoOficio}`,
    pageWidth - marginR,
    y,
    { align: "right" }
  );

  y += 12;

  // ══════════════════════════════════════════════════════════════════════════
  // ASSUNTO E CORPO DO TEXTO
  // ══════════════════════════════════════════════════════════════════════════

  doc.setFont("helvetica", "bold");
  doc.text("ASSUNTO:", marginL, y);
  doc.setFont("helvetica", "normal");
  doc.text("Encaminhamento de objeto apreendido", marginL + 25, y);

  y += 12;

  // Parágrafo com recuo de 1.25 cm (12.5 mm) padrão ABNT
  const recuoParagrafo = 12.5;

  doc.setFont("helvetica", "bold");
  doc.text("Encaminho-lhe o seguinte objeto:", marginL + recuoParagrafo, y);
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
  // Dividir texto se for longo, respeitando a largura do conteúdo menos o recuo
  const descLines = doc.splitTextToSize(descricaoObj, contentWidth - recuoParagrafo);
  doc.text(descLines, marginL + recuoParagrafo, y);
  y += descLines.length * 6 + 6;

  // Linhas de dados (BOU, PROCESSO, RÉU)
  const lineHeight = 8;

  doc.setFont("helvetica", "bold");
  doc.text("BOU:", marginL + recuoParagrafo, y);
  doc.setFont("helvetica", "normal");
  doc.text(item.bou || "NAO INFORMADO", marginL + recuoParagrafo + 12, y);
  y += lineHeight;

  // Formatação do Número do Processo (+ .8.16.0021)
  let procStr = item.processo || "NAO INFORMADO";
  if (procStr !== "NAO INFORMADO" && !procStr.endsWith(".8.16.0021")) {
    procStr = `${procStr}.8.16.0021`;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Nº PROCESSO:", marginL + recuoParagrafo, y);
  doc.setFont("helvetica", "normal");
  doc.text(procStr, marginL + recuoParagrafo + 32, y);
  y += lineHeight;

  doc.setFont("helvetica", "bold");
  doc.text("AUTOR/RÉU:", marginL + recuoParagrafo, y);
  doc.setFont("helvetica", "normal");
  doc.text((item.reu || "NAO INFORMADO").toUpperCase(), marginL + recuoParagrafo + 28, y);

  // ══════════════════════════════════════════════════════════════════════════
  // FECHAMENTO E ASSINATURA
  // ══════════════════════════════════════════════════════════════════════════

  y += 25;

  doc.setFont("helvetica", "normal");
  doc.text("Respeitosamente,", centerX, y, { align: "center" });

  y += 25;
  doc.setFont("helvetica", "bold");
  const assinatura = patenteOperador
    ? `${patenteOperador} ${nomeOperador}`.toUpperCase()
    : nomeOperador.toUpperCase();
  const nameWidth = doc.getTextWidth(assinatura);

  // O risco da assinatura terá a mesma largura que o nome (mínimo de 60mm)
  const sigLineW = Math.max(60, nameWidth);
  const sigLineStartX = centerX - sigLineW / 2;
  doc.line(sigLineStartX, y, sigLineStartX + sigLineW, y);

  y += 5;
  doc.text(assinatura, centerX, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text("CARTORÁRIO", centerX, y, { align: "center" });

  // ══════════════════════════════════════════════════════════════════════════
  // DESTINATÁRIO (Sem carimbo, apenas texto)
  // ══════════════════════════════════════════════════════════════════════════

  // ABNT costuma ter rodapé em 10pt
  const footerY = pageHeight - 20; 

  // Colocar o destinatário próximo ao rodapé
  y = footerY - 28;

  doc.setFont("helvetica", "bold");
  doc.text("Exmo.(A) Sr.(A)", marginL, y);
  y += 6;
  doc.text("Juiz (A) de Direito", marginL, y);
  y += 6;
  doc.text(item.vara || "Juizado Especial Criminal", marginL, y);
  y += 6;
  doc.text("Cascavel - Pr.", marginL, y);

  // ══════════════════════════════════════════════════════════════════════════
  // RODAPÉ (Alinhado à norma, tamanho 10 para diferenciar do corpo 12)
  // ══════════════════════════════════════════════════════════════════════════

  // ABNT costuma ter rodapé em 10pt

  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, pageWidth - marginR, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  doc.text(
    "Rua Flamboyant, 2659 – Recanto Tropical – Cascavel – PR – CEP 85.807-317",
    centerX,
    footerY + 5,
    { align: "center" }
  );
  doc.text(
    "Fone/WhatsApp: (45) 3122 – 4025 | E-mail: 6bpm-1cartorio@pm.pr.gov.br",
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
