import PDFDocument from "pdfkit";
import { Response } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InvoiceOrder {
  orderNumber: string;
  createdAt: Date;
  items: {
    product: { name: string } | null;
    quantity: number;
    price: number;
    size?: string;
  }[];
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  user: { name?: string; email?: string; phone?: string } | null;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  paymentStatus: string;
}

// ---- Palette inspirée du logo Ines Shop ----
const COLORS = {
  navy: "#0e1f3d", // fond bleu marine du logo
  navyLight: "#16294f",
  orange: "#f5a623", // orange du logo / texte "Shop"
  orangeDark: "#e8821a",
  blue: "#2f9fe8", // bleu du "S"
  white: "#ffffff",
  textDark: "#1f2937",
  textGray: "#6b7280",
  borderGray: "#e5e7eb",
  rowAlt: "#f7f8fb",
  greenStatus: "#15803d",
  greenStatusBg: "#dcfce7",
  redStatus: "#b91c1c",
  redStatusBg: "#fee2e2",
  amberStatus: "#b45309",
  amberStatusBg: "#fef3c7",
};

const LOGO_PATH = path.join(__dirname, "logo.png");
const SIGNATURE_PATH = path.join(__dirname, "signature.png");

function formatStatus(status: string): { label: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s.includes("paid") || s.includes("payé") || s.includes("paye")) {
    return { label: "Payé", color: COLORS.greenStatus, bg: COLORS.greenStatusBg };
  }
  if (s.includes("pending") || s.includes("attente")) {
    return { label: "En attente", color: COLORS.amberStatus, bg: COLORS.amberStatusBg };
  }
  if (s.includes("fail") || s.includes("échou") || s.includes("refus")) {
    return { label: "Échoué", color: COLORS.redStatus, bg: COLORS.redStatusBg };
  }
  return { label: status, color: COLORS.textGray, bg: COLORS.rowAlt };
}

export function generateInvoicePDF(order: InvoiceOrder, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const pageWidth = doc.page.width; // 595.28
  const marginX = 50;
  const contentWidth = pageWidth - marginX * 2;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=facture-${order.orderNumber}.pdf`
  );
  doc.pipe(res);

  // =========================================================
  // EN-TÊTE — bandeau bleu marine avec logo
  // =========================================================
  const headerHeight = 130;
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.navy);

  // Logo (carré avec texte intégré "Ines Shop")
  try {
    doc.image(LOGO_PATH, marginX, 22, { width: 86, height: 86 });
  } catch {
    // si le logo est introuvable, on continue sans bloquer la génération
  }

  // Titre FACTURE aligné à droite
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(26)
    .text("FACTURE", marginX, 34, { width: contentWidth, align: "right" });

  doc
    .fillColor(COLORS.orange)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`N° ${order.orderNumber}`, marginX, 66, { width: contentWidth, align: "right" });

  doc
    .fillColor("#9fb3d6")
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Date d'émission : ${new Date(order.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      marginX,
      83,
      { width: contentWidth, align: "right" }
    );

  // =========================================================
  // BANDE STATUT PAIEMENT (juste sous l'en-tête)
  // =========================================================
  const status = formatStatus(order.paymentStatus);
  let y = headerHeight + 24;

  doc.fillColor(status.bg).roundedRect(marginX, y, 150, 22, 4).fill();
  doc
    .fillColor(status.color)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(`STATUT : ${status.label.toUpperCase()}`, marginX, y + 6, {
      width: 150,
      align: "center",
    });

  // =========================================================
  // BLOCS "FACTURÉ À" / "LIVRAISON"
  // =========================================================
  y += 45;
  const colWidth = (contentWidth - 20) / 2;
  const col1X = marginX;
  const col2X = marginX + colWidth + 20;
  const blockTop = y;

  function sectionLabel(text: string, x: number, top: number) {
    doc
      .fillColor(COLORS.orange)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(text.toUpperCase(), x, top, { characterSpacing: 0.5 });
    doc
      .moveTo(x, top + 16)
      .lineTo(x + colWidth, top + 16)
      .lineWidth(1)
      .strokeColor(COLORS.borderGray)
      .stroke();
  }

  function fieldLine(label: string, value: string, x: number, top: number): number {
    if (!value) return top;
    doc
      .fillColor(COLORS.textGray)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(label, x, top, { continued: false });
    doc
      .fillColor(COLORS.textDark)
      .font("Helvetica")
      .fontSize(10)
      .text(value, x, top + 12, { width: colWidth });
    return top + 12 + doc.heightOfString(value, { width: colWidth }) + 10;
  }

  // -- Colonne 1 : Facturé à --
  sectionLabel("Facturé à", col1X, blockTop);
  let y1 = blockTop + 28;
  y1 = fieldLine("NOM", order.user?.name || "Client", col1X, y1);
  if (order.user?.email) y1 = fieldLine("EMAIL", order.user.email, col1X, y1);
  if (order.user?.phone) y1 = fieldLine("TÉLÉPHONE", order.user.phone, col1X, y1);

  // -- Colonne 2 : Livraison --
  sectionLabel("Adresse de livraison", col2X, blockTop);
  let y2 = blockTop + 28;
  y2 = fieldLine("RUE", order.shippingAddress.street, col2X, y2);
  y2 = fieldLine(
    "VILLE",
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`,
    col2X,
    y2
  );
  y2 = fieldLine("PAYS", order.shippingAddress.country, col2X, y2);

  y = Math.max(y1, y2) + 15;

  // =========================================================
  // TABLEAU DES ARTICLES
  // =========================================================
  const tableTop = y;
  const cols = {
    article: { x: marginX, w: 215 },
    size: { x: marginX + 215, w: 60 },
    qty: { x: marginX + 275, w: 50 },
    price: { x: marginX + 325, w: 85 },
    total: { x: marginX + 410, w: contentWidth - 410 },
  };

  // En-tête du tableau
  doc.rect(marginX, tableTop, contentWidth, 26).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(9);
  doc.text("ARTICLE", cols.article.x + 10, tableTop + 9);
  doc.text("TAILLE", cols.size.x, tableTop + 9, { width: cols.size.w, align: "center" });
  doc.text("QTÉ", cols.qty.x, tableTop + 9, { width: cols.qty.w, align: "center" });
  doc.text("PRIX UNIT.", cols.price.x, tableTop + 9, { width: cols.price.w, align: "right" });
  doc.text("TOTAL", cols.total.x, tableTop + 9, { width: cols.total.w - 10, align: "right" });

  y = tableTop + 26;
  doc.font("Helvetica").fontSize(9.5);

  order.items.forEach((item, idx) => {
    const lineTotal = item.price * item.quantity;
    const name = item.product?.name || "Produit supprimé";
    const rowHeight = Math.max(
      24,
      doc.heightOfString(name, { width: cols.article.w - 20 }) + 12
    );

    // Fond alterné (zebra)
    if (idx % 2 === 1) {
      doc.rect(marginX, y, contentWidth, rowHeight).fill(COLORS.rowAlt);
    }

    doc.fillColor(COLORS.textDark).font("Helvetica").fontSize(9.5);
    doc.text(name, cols.article.x + 10, y + 7, { width: cols.article.w - 20 });
    doc.text(item.size || "—", cols.size.x, y + 7, { width: cols.size.w, align: "center" });
    doc.text(String(item.quantity), cols.qty.x, y + 7, { width: cols.qty.w, align: "center" });
    doc.text(`${item.price.toFixed(2)} DT`, cols.price.x, y + 7, {
      width: cols.price.w,
      align: "right",
    });
    doc
      .font("Helvetica-Bold")
      .text(`${lineTotal.toFixed(2)} DT`, cols.total.x, y + 7, {
        width: cols.total.w - 10,
        align: "right",
      });

    y += rowHeight;

    // Ligne de séparation fine
    doc
      .moveTo(marginX, y)
      .lineTo(marginX + contentWidth, y)
      .lineWidth(0.5)
      .strokeColor(COLORS.borderGray)
      .stroke();
  });

  // Bordure extérieure du tableau
  doc
    .rect(marginX, tableTop, contentWidth, y - tableTop)
    .lineWidth(1)
    .strokeColor(COLORS.navy)
    .stroke();

  y += 20;

  // =========================================================
  // BLOC TOTAUX (aligné à droite, mis en valeur)
  // =========================================================
  const totalsW = 230;
  const totalsX = marginX + contentWidth - totalsW;
  let ty = y;

  function totalLine(label: string, value: string, bold = false, big = false) {
    doc
      .fillColor(bold ? COLORS.textDark : COLORS.textGray)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(big ? 12 : 10)
      .text(label, totalsX, ty, { width: totalsW - 90 });
    doc
      .fillColor(bold ? COLORS.navy : COLORS.textDark)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(big ? 12 : 10)
      .text(value, totalsX + totalsW - 90, ty, { width: 90, align: "right" });
    ty += big ? 22 : 18;
  }

  totalLine("Sous-total", `${order.subtotal.toFixed(2)} DT`);
  totalLine("Livraison", `${order.shippingCost.toFixed(2)} DT`);
  if (order.tax > 0) {
    totalLine("Taxe", `${order.tax.toFixed(2)} DT`);
  }

  ty += 4;
  doc
    .moveTo(totalsX, ty)
    .lineTo(totalsX + totalsW, ty)
    .lineWidth(1)
    .strokeColor(COLORS.borderGray)
    .stroke();
  ty += 10;

  // Bandeau total final mis en valeur
  doc.rect(totalsX - 12, ty - 8, totalsW + 12, 32).fill(COLORS.navy);
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("TOTAL", totalsX, ty, { width: totalsW - 90 });
  doc
    .fillColor(COLORS.orange)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(`${order.totalAmount.toFixed(2)} DT`, totalsX + totalsW - 90, ty - 1, {
      width: 90,
      align: "right",
    });

  // `ty` marque maintenant le bas du bandeau TOTAL (utile pour la suite)
  ty += 24;

  // =========================================================
  // SIGNATURE — placée TOUJOURS sous le bloc total (ty),
  // avec une marge de sécurité minimale. Si le contenu est court,
  // elle reste proche du bas de page comme avant ; si le contenu
  // est long (beaucoup d'articles), elle descend avec lui pour ne
  // JAMAIS chevaucher le bandeau TOTAL.
  // =========================================================
  const signatureWidth = 110;
  const signatureHeight = signatureWidth * (1086 / 1448); // ratio réel de l'image
  const signatureX = totalsX + totalsW - signatureWidth;
  const signatureBottomGap = 22; // distance entre la signature et la ligne du pied de page

  const minGapAfterTotals = 40; // espace minimum garanti après le bandeau TOTAL
  const signatureLabelHeight = 14; // hauteur réservée au libellé "SIGNATURE AUTORISÉE"

  // Position "idéale" si on collait au bas de page (cas contenu court)
  const defaultFooterY = doc.page.height - 90;
  const defaultSignatureLineY = defaultFooterY - signatureBottomGap;

  // Position minimale obligatoire si le tableau est long
  const minSignatureLineY =
    ty + minGapAfterTotals + signatureLabelHeight + 4 + signatureHeight;

  // On prend toujours la position la plus basse des deux,
  // pour ne jamais empiéter sur les totaux.
  const signatureLineY = Math.max(defaultSignatureLineY, minSignatureLineY);
  const signatureImgY = signatureLineY - 4 - signatureHeight;
  const signatureLabelY = signatureImgY - 14;

  // Le pied de page suit la signature s'il a dû descendre,
  // sinon il garde sa position fixe habituelle.
  const footerY = Math.max(defaultFooterY, signatureLineY + signatureBottomGap);

  // =========================================================
  // GARANTIE UNE SEULE PAGE : si signature + pied de page
  // dépassent le bas de la feuille A4, on compresse tout le
  // bloc (signature + footer) verticalement avec un facteur
  // d'échelle pour que ça rentre toujours sur la page, au lieu
  // de créer une deuxième page.
  // =========================================================
  const pageBottomLimit = doc.page.height - 12; // marge de sécurité basse
  const footerBlockBottom = footerY + 46 + 12; // dernier texte du footer + marge
  const availableSpace = pageBottomLimit - ty;
  const neededSpace = footerBlockBottom - ty;

  let finalSignatureLabelY = signatureLabelY;
  let finalSignatureImgY = signatureImgY;
  let finalSignatureLineY = signatureLineY;
  let finalFooterY = footerY;
  let finalSignatureHeight = signatureHeight;
  let finalSignatureWidth = signatureWidth;

  if (neededSpace > availableSpace && neededSpace > 0) {
    // Facteur de compression appliqué à l'espacement (pas au texte)
    const scale = Math.max(availableSpace / neededSpace, 0.55);

    const compress = (value: number) => ty + (value - ty) * scale;

    finalSignatureLabelY = compress(signatureLabelY);
    finalSignatureImgY = compress(signatureImgY);
    finalSignatureLineY = compress(signatureLineY);
    finalFooterY = compress(footerY);

    // On réduit légèrement la signature elle-même si la compression est forte,
    // pour garder un espacement propre autour du texte/image.
    if (scale < 0.85) {
      finalSignatureWidth = signatureWidth * 0.85;
      finalSignatureHeight = signatureHeight * 0.85;
    }
  }

  doc
    .fillColor(COLORS.textGray)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("SIGNATURE AUTORISÉE", signatureX, finalSignatureLabelY, {
      width: finalSignatureWidth,
      align: "center",
      characterSpacing: 0.3,
    });

  try {
    doc.image(SIGNATURE_PATH, signatureX, finalSignatureImgY, {
      width: finalSignatureWidth,
      height: finalSignatureHeight,
    });
  } catch {
    // si la signature est introuvable, on continue sans bloquer la génération
  }

  // petit trait sous la signature (ligne de validation)
  doc
    .moveTo(signatureX, finalSignatureLineY)
    .lineTo(signatureX + finalSignatureWidth, finalSignatureLineY)
    .lineWidth(0.5)
    .strokeColor(COLORS.borderGray)
    .stroke();

  // =========================================================
  // PIED DE PAGE
  // =========================================================
  doc
    .moveTo(marginX, finalFooterY)
    .lineTo(marginX + contentWidth, finalFooterY)
    .lineWidth(1)
    .strokeColor(COLORS.borderGray)
    .stroke();

  doc
    .fillColor(COLORS.navy)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("Merci pour votre commande !", marginX, finalFooterY + 14, {
      width: contentWidth,
      align: "center",
    });

  doc
    .fillColor(COLORS.textGray)
    .font("Helvetica")
    .fontSize(8.5)
    .text(
      "Ines Shop — Cette facture a été générée automatiquement",
      marginX,
      finalFooterY + 32,
      { width: contentWidth, align: "center" }
    );

  doc
    .fillColor(COLORS.textGray)
    .font("Helvetica")
    .fontSize(8)
    .text(
      "Pour toute question concernant cette facture, contactez notre service client.",
      marginX,
      finalFooterY + 46,
      { width: contentWidth, align: "center" }
    );

  doc.end();
}