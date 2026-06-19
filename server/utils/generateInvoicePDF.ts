import PDFDocument from "pdfkit";
import { Response } from "express";

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
  user: { name?: string; email?: string } | null;
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  paymentStatus: string;
}

export function generateInvoicePDF(order: InvoiceOrder, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=facture-${order.orderNumber}.pdf`
  );
  doc.pipe(res);

  // En-tête
  doc.fontSize(20).font("Helvetica-Bold").text("INES SHOP", 50, 50);
  doc.fontSize(10).font("Helvetica").text("Facture", 50, 75);

  doc
    .fontSize(10)
    .text(`N° de commande : ${order.orderNumber}`, 350, 50, { align: "right" })
    .text(`Date : ${new Date(order.createdAt).toLocaleDateString("fr-FR")}`, 350, 65, { align: "right" })
    .text(`Statut paiement : ${order.paymentStatus}`, 350, 80, { align: "right" });

  // Infos client
  doc.fontSize(12).font("Helvetica-Bold").text("Facturé à :", 50, 130);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(order.user?.name || "Client", 50, 148)
    .text(order.user?.email || "", 50, 162)
    .text(order.shippingAddress.street, 50, 176)
    .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`, 50, 190)
    .text(order.shippingAddress.country, 50, 204);

  // Tableau des articles
  const tableTop = 250;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Article", 50, tableTop);
  doc.text("Taille", 280, tableTop);
  doc.text("Qté", 340, tableTop);
  doc.text("Prix unit.", 390, tableTop);
  doc.text("Total", 470, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

  let y = tableTop + 25;
  doc.font("Helvetica").fontSize(10);

  order.items.forEach((item) => {
    const lineTotal = item.price * item.quantity;
    doc.text(item.product?.name || "Produit supprimé", 50, y, { width: 220 });
    doc.text(item.size || "-", 280, y);
    doc.text(String(item.quantity), 340, y);
    doc.text(`${item.price.toFixed(2)} DT`, 390, y);
    doc.text(`${lineTotal.toFixed(2)} DT`, 470, y);
    y += 22;
  });

  doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke();
  y += 20;

  // Totaux
  doc.font("Helvetica").fontSize(10);
  doc.text("Sous-total :", 390, y);
  doc.text(`${order.subtotal.toFixed(2)} DT`, 470, y);
  y += 16;
  doc.text("Livraison :", 390, y);
  doc.text(`${order.shippingCost.toFixed(2)} DT`, 470, y);
  y += 16;

  if (order.tax > 0) {
    doc.text("Taxe :", 390, y);
    doc.text(`${order.tax.toFixed(2)} DT`, 470, y);
    y += 16;
  }

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total :", 390, y);
  doc.text(`${order.totalAmount.toFixed(2)} DT`, 470, y);

  doc.fontSize(8).font("Helvetica").text("Merci pour votre commande !", 50, 750, { align: "center", width: 495 });

  doc.end();
}