import PDFDocument from "pdfkit";
import { Response } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export type SupportedCurrency = "USD" | "EUR" | "TND";

interface InvoiceOrder {
  orderNumber:  string;
  createdAt:    Date;
  currency?:    SupportedCurrency;
  rate?:        number;   // ← taux envoyé par le frontend (ex: 0.32 pour USD)
  items: {
    product:   { name: string; images?: string[] } | null;
    name?:     string;
    image?:    string;
    quantity:  number;
    price:     number;   // stocké en TND
    size?:     string;
  }[];
  shippingAddress: {
    street:  string;
    city:    string;
    state:   string;
    zipCode: string;
    country: string;
  };
  user:         { name?: string; email?: string; phone?: string } | null;
  subtotal:     number;   // en TND
  shippingCost: number;   // en TND
  tax:          number;   // en TND
  totalAmount:  number;   // en TND
  paymentStatus: string;
}

// Symboles par défaut côté backend (fallback)
const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  TND: "DT",
  USD: "$",
  EUR: "€",
};

// Taux de fallback si le frontend n'envoie pas le taux
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  TND: 1,
  USD: 0.32,
  EUR: 0.30,
};

const COLORS = {
  navy:          "#0e1f3d",
  orange:        "#f5a623",
  white:         "#ffffff",
  textDark:      "#1f2937",
  textGray:      "#6b7280",
  borderGray:    "#e5e7eb",
  rowAlt:        "#f7f8fb",
  greenStatus:   "#15803d",
  greenStatusBg: "#dcfce7",
  redStatus:     "#b91c1c",
  redStatusBg:   "#fee2e2",
  amberStatus:   "#b45309",
  amberStatusBg: "#fef3c7",
};

const LOGO_PATH      = path.join(__dirname, "logo.png");
const SIGNATURE_PATH = path.join(__dirname, "signature.png");

function formatStatus(status: string): { label: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s.includes("paid") || s.includes("payé") || s.includes("paye"))
    return { label: "Payé", color: COLORS.greenStatus, bg: COLORS.greenStatusBg };
  if (s.includes("pending") || s.includes("attente"))
    return { label: "En attente", color: COLORS.amberStatus, bg: COLORS.amberStatusBg };
  if (s.includes("fail") || s.includes("échou") || s.includes("refus"))
    return { label: "Échoué", color: COLORS.redStatus, bg: COLORS.redStatusBg };
  return { label: status, color: COLORS.textGray, bg: COLORS.rowAlt };
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch { return null; }
}

export async function generateInvoicePDF(order: InvoiceOrder, res: Response) {

  // ================================================================
  // ✅ DEVISE & CONVERSION
  // currency  = "USD" | "EUR" | "TND"  → vient du frontend via query param
  // rate      = taux envoyé par le frontend (ex: 0.32 pour USD)
  //             si absent → fallback sur les taux du backend
  // symbol    = "$" | "€" | "DT"
  // convert() = multiplie le montant TND par le taux → donne le montant
  //             dans la devise choisie, formaté en string
  // ================================================================
  const currency = order.currency ?? "TND";
  const rate     = order.rate ?? FALLBACK_RATES[currency];
  const symbol   = CURRENCY_SYMBOLS[currency];

  const convert = (amountTND: number): string =>
    (amountTND * rate).toFixed(2);

  // Pré-chargement images
  const imageBuffers: (Buffer | null)[] = await Promise.all(
    order.items.map(async (item) => {
      const url = item.image ?? (Array.isArray((item.product as any)?.images)
        ? (item.product as any).images[0] : null);
      return url ? fetchImageBuffer(url) : null;
    })
  );

  const doc          = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const pageWidth    = doc.page.width;
  const pageHeight   = doc.page.height;
  const marginX      = 50;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_RESERVE = 110;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=facture-${order.orderNumber}.pdf`);
  doc.pipe(res);

  // ================================================================
  // EN-TÊTE
  // ================================================================
  const headerHeight = 130;
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.navy);
  try { doc.image(LOGO_PATH, marginX, 22, { width: 86, height: 86 }); } catch {}

  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(26)
    .text("FACTURE", marginX, 34, { width: contentWidth, align: "right" });

  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(11)
    .text(`N° ${order.orderNumber}`, marginX, 66, { width: contentWidth, align: "right" });

  doc.fillColor("#9fb3d6").font("Helvetica").fontSize(9)
    .text(
      `Date d'émission : ${new Date(order.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric",
      })}`,
      marginX, 83, { width: contentWidth, align: "right" }
    );

  // Devise affichée dans l'en-tête
  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(9)
    .text(`Devise : ${symbol}`, marginX, 110, { width: contentWidth, align: "right" });

  // ================================================================
  // STATUT
  // ================================================================
  const status = formatStatus(order.paymentStatus);
  let y = headerHeight + 24;

  doc.fillColor(status.bg).roundedRect(marginX, y, 150, 22, 4).fill();
  doc.fillColor(status.color).font("Helvetica-Bold").fontSize(9)
    .text(`STATUT : ${status.label.toUpperCase()}`, marginX, y + 6, { width: 150, align: "center" });

  // ================================================================
  // BLOCS FACTURÉ À / LIVRAISON
  // ================================================================
  y += 45;
  const colWidth = (contentWidth - 20) / 2;
  const col1X    = marginX;
  const col2X    = marginX + colWidth + 20;
  const blockTop = y;

  function sectionLabel(text: string, x: number, top: number) {
    doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(10)
      .text(text.toUpperCase(), x, top, { characterSpacing: 0.5 });
    doc.moveTo(x, top + 16).lineTo(x + colWidth, top + 16)
      .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  }

  function fieldLine(label: string, value: string, x: number, top: number): number {
    if (!value) return top;
    doc.fillColor(COLORS.textGray).font("Helvetica-Bold").fontSize(9).text(label, x, top);
    doc.fillColor(COLORS.textDark).font("Helvetica").fontSize(10)
      .text(value, x, top + 12, { width: colWidth });
    return top + 12 + doc.heightOfString(value, { width: colWidth }) + 10;
  }

  sectionLabel("Facturé à", col1X, blockTop);
  let y1 = blockTop + 28;
  y1 = fieldLine("NOM",        order.user?.name  || "Client", col1X, y1);
  if (order.user?.email) y1 = fieldLine("EMAIL",     order.user.email,  col1X, y1);
  if (order.user?.phone) y1 = fieldLine("TÉLÉPHONE", order.user.phone,  col1X, y1);

  sectionLabel("Adresse de livraison", col2X, blockTop);
  let y2 = blockTop + 28;
  y2 = fieldLine("RUE",  order.shippingAddress.street, col2X, y2);
  y2 = fieldLine("VILLE",
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`,
    col2X, y2);
  y2 = fieldLine("PAYS", order.shippingAddress.country, col2X, y2);

  y = Math.max(y1, y2) + 15;

  // ================================================================
  // TABLEAU DES ARTICLES
  // ================================================================
  const IMG_SIZE    = 48;
  const IMG_PADDING = 6;
  const ROW_HEIGHT  = IMG_SIZE + IMG_PADDING * 2;

  const cols = {
    img:     { x: marginX,                                    w: IMG_SIZE + IMG_PADDING * 2 },
    article: { x: marginX + IMG_SIZE + IMG_PADDING * 2,       w: 170 },
    size:    { x: marginX + IMG_SIZE + IMG_PADDING * 2 + 170, w: 55  },
    qty:     { x: marginX + IMG_SIZE + IMG_PADDING * 2 + 225, w: 45  },
    price:   { x: marginX + IMG_SIZE + IMG_PADDING * 2 + 270, w: 80  },
    total:   {
      x: marginX + IMG_SIZE + IMG_PADDING * 2 + 350,
      w: contentWidth - (IMG_SIZE + IMG_PADDING * 2) - 350,
    },
  };

  // Helper : dessiner l'en-tête du tableau
  function drawTableHeader(headerY: number) {
    doc.rect(marginX, headerY, contentWidth, 26).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(9);
    doc.text("ARTICLE", cols.article.x, headerY + 9, { width: cols.article.w });
    doc.text("TAILLE",  cols.size.x,    headerY + 9, { width: cols.size.w,      align: "center" });
    doc.text("QTÉ",     cols.qty.x,     headerY + 9, { width: cols.qty.w,       align: "center" });
    doc.text("PRIX",    cols.price.x,   headerY + 9, { width: cols.price.w,     align: "right"  });
    doc.text("TOTAL",   cols.total.x,   headerY + 9, { width: cols.total.w - 10, align: "right" });
  }

  const tableHeaderY = y;
  drawTableHeader(tableHeaderY);
  y = tableHeaderY + 26;

  let currentTableHeaderY = tableHeaderY; // pour la bordure finale

  order.items.forEach((item, idx) => {
    const name       = item.name || item.product?.name || "Produit supprimé";
    const nameHeight = doc.heightOfString(name, { width: cols.article.w - 10 });
    const rowHeight  = Math.max(ROW_HEIGHT, nameHeight + 20);

    // Nouvelle page si nécessaire
    if (y + rowHeight > pageHeight - FOOTER_RESERVE - 80) {
      // Fermer le tableau courant
      doc.rect(marginX, currentTableHeaderY, contentWidth, y - currentTableHeaderY)
        .lineWidth(1).strokeColor(COLORS.navy).stroke();

      doc.addPage();
      y = 30;
      drawTableHeader(y);
      currentTableHeaderY = y;
      y += 26;
    }

    // Fond alterné
    if (idx % 2 === 1) doc.rect(marginX, y, contentWidth, rowHeight).fill(COLORS.rowAlt);

    // Image clippée
    const imgX = cols.img.x + IMG_PADDING;
    const imgY = y + (rowHeight - IMG_SIZE) / 2;
    const imgBuffer = imageBuffers[idx];
    if (imgBuffer) {
      try {
        doc.save();
        doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE).clip();
        doc.image(imgBuffer, imgX, imgY, { width: IMG_SIZE, height: IMG_SIZE, cover: [IMG_SIZE, IMG_SIZE] });
        doc.restore();
      } catch {
        doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE).fill("#e5e7eb");
      }
    } else {
      doc.rect(imgX, imgY, IMG_SIZE, IMG_SIZE).fillAndStroke("#f3f4f6", COLORS.borderGray);
      doc.fillColor(COLORS.textGray).font("Helvetica").fontSize(7)
        .text("N/A", imgX, imgY + IMG_SIZE / 2 - 4, { width: IMG_SIZE, align: "center" });
    }

    // Texte centré verticalement
    const textY = y + (rowHeight - 22) / 2;

    doc.fillColor(COLORS.textDark).font("Helvetica-Bold").fontSize(9)
      .text(name, cols.article.x, textY, { width: cols.article.w - 10 });

    doc.font("Helvetica").fontSize(9).fillColor(COLORS.textDark);
    doc.text(item.size || "—",       cols.size.x,  textY + 2, { width: cols.size.w,  align: "center" });
    doc.text(String(item.quantity),  cols.qty.x,   textY + 2, { width: cols.qty.w,   align: "center" });

    // ✅ Montants convertis dans la devise active
    doc.text(`${convert(item.price)} ${symbol}`,              cols.price.x, textY + 2, { width: cols.price.w,     align: "right" });
    doc.font("Helvetica-Bold").fillColor(COLORS.navy)
      .text(`${convert(item.price * item.quantity)} ${symbol}`, cols.total.x, textY + 2, { width: cols.total.w - 10, align: "right" });

    y += rowHeight;

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y)
      .lineWidth(0.5).strokeColor(COLORS.borderGray).stroke();
  });

  // Bordure finale du tableau
  doc.rect(marginX, currentTableHeaderY, contentWidth, y - currentTableHeaderY)
    .lineWidth(1).strokeColor(COLORS.navy).stroke();

  y += 20;

  // ================================================================
  // BLOC TOTAUX
  // ================================================================
  const totalsBlockHeight = 80 + (order.tax > 0 ? 18 : 0);
  if (y + totalsBlockHeight > pageHeight - FOOTER_RESERVE) {
    doc.addPage();
    y = 40;
  }

  const totalsW = 230;
  const totalsX = marginX + contentWidth - totalsW;
  let   ty      = y;

  function totalLine(label: string, value: string, bold = false) {
    doc.fillColor(bold ? COLORS.textDark : COLORS.textGray)
      .font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10)
      .text(label, totalsX, ty, { width: totalsW - 90 });
    doc.fillColor(bold ? COLORS.navy : COLORS.textDark)
      .font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10)
      .text(value, totalsX + totalsW - 90, ty, { width: 90, align: "right" });
    ty += 18;
  }

  // ✅ Totaux convertis
  totalLine("Sous-total", `${convert(order.subtotal)} ${symbol}`);
  totalLine("Livraison",  `${convert(order.shippingCost)} ${symbol}`);
  if (order.tax > 0) totalLine("Taxe", `${convert(order.tax)} ${symbol}`);

  ty += 4;
  doc.moveTo(totalsX, ty).lineTo(totalsX + totalsW, ty)
    .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  ty += 10;

  doc.rect(totalsX - 12, ty - 8, totalsW + 12, 32).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(12)
    .text("TOTAL", totalsX, ty, { width: totalsW - 90 });
  // ✅ Total final converti
  doc.fillColor(COLORS.orange).font("Helvetica-Bold").fontSize(13)
    .text(`${convert(order.totalAmount)} ${symbol}`, totalsX + totalsW - 90, ty - 1, {
      width: 90, align: "right",
    });

  ty += 24;

  // ================================================================
  // SIGNATURE
  // ================================================================
  const signatureWidth  = 110;
  const signatureHeight = signatureWidth * (1086 / 1448);
  const signatureX      = totalsX + totalsW - signatureWidth;

  const defaultFooterY  = pageHeight - 90;
  const signatureLineY  = Math.max(defaultFooterY - 22, ty + 40 + 14 + 4 + signatureHeight);
  const signatureImgY   = signatureLineY - 4 - signatureHeight;
  const signatureLabelY = signatureImgY - 14;
  const footerY         = Math.max(defaultFooterY, signatureLineY + 22);

  const available = (pageHeight - 12) - ty;
  const needed    = (footerY + 58) - ty;

  let fSigLabelY = signatureLabelY, fSigImgY = signatureImgY,
      fSigLineY  = signatureLineY,  fFooterY  = footerY,
      fSigW      = signatureWidth,  fSigH     = signatureHeight;

  if (needed > available && needed > 0) {
    const scale    = Math.max(available / needed, 0.55);
    const compress = (v: number) => ty + (v - ty) * scale;
    fSigLabelY = compress(signatureLabelY);
    fSigImgY   = compress(signatureImgY);
    fSigLineY  = compress(signatureLineY);
    fFooterY   = compress(footerY);
    if (scale < 0.85) { fSigW = signatureWidth * 0.85; fSigH = signatureHeight * 0.85; }
  }

  doc.fillColor(COLORS.textGray).font("Helvetica-Bold").fontSize(8)
    .text("SIGNATURE AUTORISÉE", signatureX, fSigLabelY, {
      width: fSigW, align: "center", characterSpacing: 0.3,
    });
  try { doc.image(SIGNATURE_PATH, signatureX, fSigImgY, { width: fSigW, height: fSigH }); } catch {}
  doc.moveTo(signatureX, fSigLineY).lineTo(signatureX + fSigW, fSigLineY)
    .lineWidth(0.5).strokeColor(COLORS.borderGray).stroke();

  // ================================================================
  // PIED DE PAGE
  // ================================================================
  doc.moveTo(marginX, fFooterY).lineTo(marginX + contentWidth, fFooterY)
    .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(11)
    .text("Merci pour votre commande !", marginX, fFooterY + 14, { width: contentWidth, align: "center" });
  doc.fillColor(COLORS.textGray).font("Helvetica").fontSize(8.5)
    .text("Ines Shop — Cette facture a été générée automatiquement", marginX, fFooterY + 32, { width: contentWidth, align: "center" });
  doc.fillColor(COLORS.textGray).font("Helvetica").fontSize(8)
    .text("Pour toute question concernant cette facture, contactez notre service client.", marginX, fFooterY + 46, { width: contentWidth, align: "center" });

  doc.end();
}