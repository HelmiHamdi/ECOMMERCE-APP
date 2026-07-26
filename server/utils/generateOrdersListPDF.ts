import PDFDocument from "pdfkit";
import { Response } from "express";

// ================================================================
// STATUTS — libellés + couleurs (même logique que la facture)
// ================================================================
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  placed:     { label: "Placée",       color: "#1e40af", bg: "#dbeafe" },
  processing: { label: "En traitement", color: "#b45309", bg: "#fef3c7" },
  shipped:    { label: "Expédiée",     color: "#0369a1", bg: "#e0f2fe" },
  delivered:  { label: "Livrée",       color: "#15803d", bg: "#dcfce7" },
  cancelled:  { label: "Annulée",      color: "#b91c1c", bg: "#fee2e2" },
};

const COLORS = {
  navy:       "#0e1f3d",
  orange:     "#f5a623",
  white:      "#ffffff",
  textDark:   "#1f2937",
  textGray:   "#6b7280",
  borderGray: "#e5e7eb",
  rowAlt:     "#f7f8fb",
};

const FONT_REGULAR = "Helvetica";
const FONT_BOLD    = "Helvetica-Bold";

function statusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status,
      color: COLORS.textGray,
      bg: COLORS.rowAlt,
    }
  );
}

export const generateOrdersListPDF = async (orders: any[], res: Response) => {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });

  const pageWidth    = doc.page.width;
  const pageHeight   = doc.page.height;
  const marginX      = 40;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_RESERVE = 70;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="commandes-${Date.now()}.pdf"`
  );
  doc.pipe(res);

  doc.on("error", (err) => {
    console.error("Erreur génération PDF liste des commandes:", err);
    try { res.end(); } catch { /* noop */ }
  });

  // ================================================================
  // EN-TÊTE
  // ================================================================
  const headerHeight = 90;
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.navy);

  doc.fillColor(COLORS.white).font(FONT_BOLD).fontSize(22)
    .text("LISTE DES COMMANDES", marginX, 24, { width: contentWidth, align: "left" });

  doc.fillColor(COLORS.orange).font(FONT_BOLD).fontSize(9)
    .text(
      `Généré le ${new Date().toLocaleString("fr-FR")}`,
      marginX, 56, { width: contentWidth, align: "left" }
    );

  doc.fillColor("#9fb3d6").font(FONT_REGULAR).fontSize(9)
    .text(
      `${orders.length} commande(s)`,
      marginX, 56, { width: contentWidth, align: "right" }
    );

  let y = headerHeight + 24;

  // ================================================================
  // TABLEAU
  // ================================================================
  const cols = {
    num:    { x: marginX,       w: 100 },
    date:   { x: marginX + 100, w: 65 },
    client: { x: marginX + 165, w: 115 },
    phone:  { x: marginX + 280, w: 85 },
    status: { x: marginX + 365, w: 90 },
    total:  { x: marginX + 455, w: contentWidth - 455 },
  };

  const ROW_HEIGHT = 26;

  function drawTableHeader(headerY: number) {
    doc.rect(marginX, headerY, contentWidth, ROW_HEIGHT).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font(FONT_BOLD).fontSize(9);
    doc.text("N° FACTURE", cols.num.x + 8,    headerY + 9, { width: cols.num.w - 8 });
    doc.text("DATE",       cols.date.x,       headerY + 9, { width: cols.date.w });
    doc.text("CLIENT",     cols.client.x,     headerY + 9, { width: cols.client.w });
    doc.text("TÉLÉPHONE",  cols.phone.x,      headerY + 9, { width: cols.phone.w });
    doc.text("STATUT",     cols.status.x,     headerY + 9, { width: cols.status.w, align: "center" });
    doc.text("TOTAL",      cols.total.x,      headerY + 9, { width: cols.total.w - 10, align: "right" });
  }

  const tableHeaderY = y;
  drawTableHeader(tableHeaderY);
  y = tableHeaderY + ROW_HEIGHT;
  let currentTableHeaderY = tableHeaderY;

  orders.forEach((order, idx) => {
    if (y + ROW_HEIGHT > pageHeight - FOOTER_RESERVE) {
      doc.rect(marginX, currentTableHeaderY, contentWidth, y - currentTableHeaderY)
        .lineWidth(1).strokeColor(COLORS.navy).stroke();

      doc.addPage();
      y = 30;
      drawTableHeader(y);
      currentTableHeaderY = y;
      y += ROW_HEIGHT;
    }

    if (idx % 2 === 1) doc.rect(marginX, y, contentWidth, ROW_HEIGHT).fill(COLORS.rowAlt);

    const textY = y + 8;
    const meta  = statusMeta(order.orderStatus);

    doc.fillColor(COLORS.textDark).font(FONT_BOLD).fontSize(9)
      .text(order.orderNumber || `#${order._id?.toString().slice(-8)}`, cols.num.x + 8, textY, {
        width: cols.num.w - 8,
        lineBreak: false,
        ellipsis: true,
      });

    doc.font(FONT_REGULAR).fillColor(COLORS.textDark)
      .text(new Date(order.createdAt).toLocaleDateString("fr-FR"), cols.date.x, textY, {
        width: cols.date.w,
        lineBreak: false,
      });

    doc.text(order.customer?.name || "N/A", cols.client.x, textY, {
      width: cols.client.w, lineBreak: false, ellipsis: true,
    });
    doc.text(order.customer?.phone || "N/A", cols.phone.x, textY, {
      width: cols.phone.w, lineBreak: false, ellipsis: true,
    });

    // Badge de statut
    const badgeW = cols.status.w - 16;
    const badgeX = cols.status.x + 8;
    const badgeY = y + 4;
    doc.fillColor(meta.bg).roundedRect(badgeX, badgeY, badgeW, ROW_HEIGHT - 8, 4).fill();
    doc.fillColor(meta.color).font(FONT_BOLD).fontSize(8)
      .text(meta.label.toUpperCase(), badgeX, badgeY + 6, { width: badgeW, align: "center" });

    doc.font(FONT_BOLD).fillColor(COLORS.navy).fontSize(9.5)
      .text(`${(order.totalAmount ?? 0).toFixed(2)} TND`, cols.total.x, textY, {
        width: cols.total.w - 10, align: "right",
        lineBreak: false,
      });

    y += ROW_HEIGHT;
    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y)
      .lineWidth(0.5).strokeColor(COLORS.borderGray).stroke();
  });

  doc.rect(marginX, currentTableHeaderY, contentWidth, y - currentTableHeaderY)
    .lineWidth(1).strokeColor(COLORS.navy).stroke();

  // ================================================================
  // PIED DE PAGE
  // ================================================================
  const footerY = pageHeight - 50;
  doc.moveTo(marginX, footerY).lineTo(marginX + contentWidth, footerY)
    .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  doc.fillColor(COLORS.textGray).font(FONT_REGULAR).fontSize(8)
    .text("Ines Shop — Document généré automatiquement", marginX, footerY + 12, {
      width: contentWidth, align: "center",
    });

  doc.end();
};