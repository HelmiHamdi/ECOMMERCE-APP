import PDFDocument from "pdfkit";
import { Response } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export type SupportedCurrency = "USD" | "EUR" | "TND" | "SAR";
export type Language = "en" | "fr" | "ar" | "es" | "it" | "de";

interface InvoiceOrder {
  orderNumber:  string;
  createdAt:    Date;
  currency?:    SupportedCurrency;
  rate?:        number;
  lang?:        Language;          // ← langue choisie côté frontend
  items: {
    // 👇 CORRECTION — product peut être null (item lié à un produit supprimé)
    // OU absent/undefined (offre "libre" sans produit, après populate mongoose)
    product?:  { name: string; images?: string[] } | null;
    name?:     string;
    image?:    string;
    quantity:  number;
    price:     number;
    size?:     string;
    offerId?:    string | null;    // 👈 AJOUT — traçabilité (non affiché sur le PDF)
    offerTitle?: string | null;    // 👈 AJOUT — fallback de nom pour une offre libre
  }[];
  shippingAddress: {
    street:  string;
    city:    string;
    state:   string;
    zipCode: string;
    country: string;
  };
  user:         { name?: string; email?: string; phone?: string } | null;
  subtotal:     number;
  shippingCost: number;
  tax:          number;
  totalAmount:  number;
  paymentStatus: string;
}

// ================================================================
// I18N — Dictionnaire des textes statiques de la facture
// ================================================================
type Dict = {
  invoiceTitle: string;
  orderPrefix: string;
  issuedOn: string;
  currencyLabel: string;
  statusLabel: string;
  statusPaid: string;
  statusPending: string;
  statusFailed: string;
  billedTo: string;
  shippingAddress: string;
  name: string;
  defaultClient: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  colArticle: string;
  colSize: string;
  colQty: string;
  colPrice: string;
  colTotal: string;
  deletedProduct: string;
  imgNA: string;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  signature: string;
  thankYou: string;
  footerBrand: string;
  footerDescription: string;
  footerLine2: string;
  sizeDash: string;
};

const TRANSLATIONS: Record<Language, Dict> = {
  fr: {
    invoiceTitle: "FACTURE",
    orderPrefix: "N°",
    issuedOn: "Date d'émission",
    currencyLabel: "Devise",
    statusLabel: "STATUT",
    statusPaid: "Payé",
    statusPending: "En attente",
    statusFailed: "Échoué",
    billedTo: "Facturé à",
    shippingAddress: "Adresse de livraison",
    name: "NOM",
    defaultClient: "Client",
    email: "EMAIL",
    phone: "TÉLÉPHONE",
    street: "RUE",
    city: "VILLE",
    country: "PAYS",
    colArticle: "ARTICLE",
    colSize: "TAILLE",
    colQty: "QTÉ",
    colPrice: "PRIX",
    colTotal: "TOTAL",
    deletedProduct: "Produit supprimé",
    imgNA: "N/A",
    subtotal: "Sous-total",
    shipping: "Livraison",
    tax: "Taxe",
    total: "TOTAL",
    signature: "SIGNATURE AUTORISÉE",
    thankYou: "Merci pour votre commande !",
    footerBrand: "Ines Shop",
    footerDescription: "Cette facture a été générée automatiquement",
    footerLine2: "Pour toute question concernant cette facture, contactez notre service client.",
    sizeDash: "—",
  },
  en: {
    invoiceTitle: "INVOICE",
    orderPrefix: "No.",
    issuedOn: "Issue date",
    currencyLabel: "Currency",
    statusLabel: "STATUS",
    statusPaid: "Paid",
    statusPending: "Pending",
    statusFailed: "Failed",
    billedTo: "Billed to",
    shippingAddress: "Shipping address",
    name: "NAME",
    defaultClient: "Customer",
    email: "EMAIL",
    phone: "PHONE",
    street: "STREET",
    city: "CITY",
    country: "COUNTRY",
    colArticle: "ITEM",
    colSize: "SIZE",
    colQty: "QTY",
    colPrice: "PRICE",
    colTotal: "TOTAL",
    deletedProduct: "Deleted product",
    imgNA: "N/A",
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "Tax",
    total: "TOTAL",
    signature: "AUTHORIZED SIGNATURE",
    thankYou: "Thank you for your order!",
    footerBrand: "Ines Shop",
    footerDescription: "This invoice was generated automatically",
    footerLine2: "For any question about this invoice, please contact our customer service.",
    sizeDash: "—",
  },
  ar: {
    invoiceTitle: "فاتورة",
    orderPrefix: "رقم",
    issuedOn: "تاريخ الإصدار",
    currencyLabel: "العملة",
    statusLabel: "الحالة",
    statusPaid: "مدفوعة",
    statusPending: "قيد الانتظار",
    statusFailed: "فشلت",
    billedTo: "الفوترة إلى",
    shippingAddress: "عنوان التوصيل",
    name: "الاسم",
    defaultClient: "الزبون",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    street: "الشارع",
    city: "المدينة",
    country: "البلد",
    colArticle: "المنتج",
    colSize: "المقاس",
    colQty: "الكمية",
    colPrice: "السعر",
    colTotal: "المجموع",
    deletedProduct: "منتج محذوف",
    imgNA: "غير متوفر",
    subtotal: "المجموع الفرعي",
    shipping: "التوصيل",
    tax: "الضريبة",
    total: "المجموع الكلي",
    signature: "التوقيع المعتمد",
    thankYou: "شكراً لطلبكم!",
    footerBrand: "Ines Shop",
    footerDescription: "تم إنشاء هذه الفاتورة تلقائياً",
    footerLine2: "لأي استفسار حول هذه الفاتورة، يرجى الاتصال بخدمة العملاء.",
    sizeDash: "—",
  },
  es: {
    invoiceTitle: "FACTURA",
    orderPrefix: "N.º",
    issuedOn: "Fecha de emisión",
    currencyLabel: "Moneda",
    statusLabel: "ESTADO",
    statusPaid: "Pagado",
    statusPending: "Pendiente",
    statusFailed: "Fallido",
    billedTo: "Facturado a",
    shippingAddress: "Dirección de envío",
    name: "NOMBRE",
    defaultClient: "Cliente",
    email: "CORREO",
    phone: "TELÉFONO",
    street: "CALLE",
    city: "CIUDAD",
    country: "PAÍS",
    colArticle: "ARTÍCULO",
    colSize: "TALLA",
    colQty: "CANT.",
    colPrice: "PRECIO",
    colTotal: "TOTAL",
    deletedProduct: "Producto eliminado",
    imgNA: "N/D",
    subtotal: "Subtotal",
    shipping: "Envío",
    tax: "Impuesto",
    total: "TOTAL",
    signature: "FIRMA AUTORIZADA",
    thankYou: "¡Gracias por su pedido!",
    footerBrand: "Ines Shop",
    footerDescription: "Esta factura fue generada automáticamente",
    footerLine2: "Para cualquier pregunta sobre esta factura, contacte con nuestro servicio de atención al cliente.",
    sizeDash: "—",
  },
  it: {
    invoiceTitle: "FATTURA",
    orderPrefix: "N.",
    issuedOn: "Data di emissione",
    currencyLabel: "Valuta",
    statusLabel: "STATO",
    statusPaid: "Pagato",
    statusPending: "In attesa",
    statusFailed: "Fallito",
    billedTo: "Fatturato a",
    shippingAddress: "Indirizzo di spedizione",
    name: "NOME",
    defaultClient: "Cliente",
    email: "EMAIL",
    phone: "TELEFONO",
    street: "VIA",
    city: "CITTÀ",
    country: "PAESE",
    colArticle: "ARTICOLO",
    colSize: "TAGLIA",
    colQty: "QTÀ",
    colPrice: "PREZZO",
    colTotal: "TOTALE",
    deletedProduct: "Prodotto eliminato",
    imgNA: "N/D",
    subtotal: "Subtotale",
    shipping: "Spedizione",
    tax: "Imposta",
    total: "TOTALE",
    signature: "FIRMA AUTORIZZATA",
    thankYou: "Grazie per il tuo ordine!",
    footerBrand: "Ines Shop",
    footerDescription: "Questa fattura è stata generata automaticamente",
    footerLine2: "Per qualsiasi domanda su questa fattura, contatta il nostro servizio clienti.",
    sizeDash: "—",
  },
  de: {
    invoiceTitle: "RECHNUNG",
    orderPrefix: "Nr.",
    issuedOn: "Ausstellungsdatum",
    currencyLabel: "Währung",
    statusLabel: "STATUS",
    statusPaid: "Bezahlt",
    statusPending: "Ausstehend",
    statusFailed: "Fehlgeschlagen",
    billedTo: "Rechnung an",
    shippingAddress: "Lieferadresse",
    name: "NAME",
    defaultClient: "Kunde",
    email: "E-MAIL",
    phone: "TELEFON",
    street: "STRASSE",
    city: "STADT",
    country: "LAND",
    colArticle: "ARTIKEL",
    colSize: "GRÖSSE",
    colQty: "MENGE",
    colPrice: "PREIS",
    colTotal: "GESAMT",
    deletedProduct: "Gelöschtes Produkt",
    imgNA: "N/V",
    subtotal: "Zwischensumme",
    shipping: "Versand",
    tax: "Steuer",
    total: "GESAMT",
    signature: "AUTORISIERTE UNTERSCHRIFT",
    thankYou: "Danke für Ihre Bestellung!",
    footerBrand: "Ines Shop",
    footerDescription: "Diese Rechnung wurde automatisch erstellt",
    footerLine2: "Bei Fragen zu dieser Rechnung wenden Sie sich bitte an unseren Kundenservice.",
    sizeDash: "—",
  },
};

// Locale pour le formatage de date
const DATE_LOCALES: Record<Language, string> = {
  fr: "fr-FR",
  en: "en-US",
  ar: "ar-TN",
  es: "es-ES",
  it: "it-IT",
  de: "de-DE",
};

const SUPPORTED_LANGS: Language[] = ["en", "fr", "ar", "es", "it", "de"];

// Symboles par défaut côté backend (fallback)
const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  TND: "DT",
  USD: "$",
  EUR: "€",
  SAR: "ر.س",
};

// Taux de fallback si le frontend n'envoie pas le taux
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  TND: 1,
  USD: 0.32,
  EUR: 0.30,
  SAR: 1.20,
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

// Police arabe à fournir (Noto Sans Arabic conseillée) — nécessaire car
// Helvetica ne sait pas afficher les caractères arabes dans PDFKit.
const ARABIC_FONT_REGULAR = path.join(__dirname, "fonts", "NotoSansArabic-Regular.ttf");
const ARABIC_FONT_BOLD    = path.join(__dirname, "fonts", "NotoSansArabic-Bold.ttf");

function formatStatus(status: string, t: Dict): { label: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s.includes("paid") || s.includes("payé") || s.includes("paye") || s.includes("pagad") || s.includes("bezahlt") || s.includes("مدفوع"))
    return { label: t.statusPaid, color: COLORS.greenStatus, bg: COLORS.greenStatusBg };
  if (s.includes("pending") || s.includes("attente") || s.includes("pendiente") || s.includes("attesa") || s.includes("ausstehend") || s.includes("انتظار"))
    return { label: t.statusPending, color: COLORS.amberStatus, bg: COLORS.amberStatusBg };
  if (s.includes("fail") || s.includes("échou") || s.includes("refus") || s.includes("fallid") || s.includes("fehlgeschlagen") || s.includes("فشل"))
    return { label: t.statusFailed, color: COLORS.redStatus, bg: COLORS.redStatusBg };
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
  // ✅ LANGUE
  // lang vient du frontend (ex: query param ?lang=fr, transmis dans order.lang)
  // ================================================================
  const lang: Language = SUPPORTED_LANGS.includes(order.lang as Language)
    ? (order.lang as Language)
    : "fr";
  const t = TRANSLATIONS[lang];
  const dateLocale = DATE_LOCALES[lang];
  const isRTL = lang === "ar";

  // ================================================================
  // ✅ DEVISE & CONVERSION
  // ================================================================
  const currency = order.currency ?? "TND";
  const rate     = order.rate ?? FALLBACK_RATES[currency];
  const symbol   = CURRENCY_SYMBOLS[currency];

  const convert = (amountTND: number): string =>
    (amountTND * rate).toFixed(2);

  // Pré-chargement images — fonctionne pour un produit classique (item.image
  // ou item.product.images[0]) COMME pour une offre libre (item.image seul,
  // car item.product est absent/null dans ce cas)
  const imageBuffers: (Buffer | null)[] = await Promise.all(
    order.items.map(async (item) => {
      const url = item.image ?? (Array.isArray(item.product?.images)
        ? item.product!.images![0] : null);
      return url ? fetchImageBuffer(url) : null;
    })
  );

  const doc          = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const pageWidth    = doc.page.width;
  const pageHeight   = doc.page.height;
  const marginX      = 50;
  const contentWidth = pageWidth - marginX * 2;
  const FOOTER_RESERVE = 110;

  // ================================================================
  // ✅ POLICES — enregistrement de la police arabe si nécessaire
  // ================================================================
  let FONT_REGULAR = "Helvetica";
  let FONT_BOLD    = "Helvetica-Bold";
  if (isRTL) {
    // IMPORTANT : pdfkit ne lit le fichier .ttf qu'au premier doc.font(...),
    // pas au moment de registerFont(). Si le fichier est absent, l'erreur
    // surviendrait donc plus tard, APRÈS l'envoi des en-têtes PDF, ce qui
    // casse la réponse HTTP en plein streaming (ERR_INVALID_RESPONSE côté
    // client). On vérifie donc l'existence du fichier AVANT d'enregistrer
    // la police, pour ne jamais tenter de la charger si elle n'existe pas.
    const hasArabicFonts =
      fs.existsSync(ARABIC_FONT_REGULAR) && fs.existsSync(ARABIC_FONT_BOLD);

    if (hasArabicFonts) {
      try {
        doc.registerFont("Arabic",      ARABIC_FONT_REGULAR);
        doc.registerFont("Arabic-Bold", ARABIC_FONT_BOLD);
        FONT_REGULAR = "Arabic";
        FONT_BOLD    = "Arabic-Bold";
      } catch {
        // Sécurité supplémentaire : en cas d'échec malgré tout, on reste
        // sur Helvetica (les caractères arabes ne s'afficheront pas
        // correctement, mais le PDF sera généré sans planter).
      }
    }
    // Si les fichiers sont absents, on garde Helvetica : le PDF sera généré
    // (sans planter) mais le texte arabe n'affichera pas les bons glyphes
    // tant que les polices ne sont pas ajoutées sur le serveur (voir plus bas).
  }
  const alignStart = isRTL ? "right" : "left";
  const alignEnd   = isRTL ? "left"  : "right";
  // Le logo reste toujours épinglé à gauche, quelle que soit la langue —
  // le texte d'en-tête doit donc TOUJOURS s'aligner à droite pour ne
  // jamais le chevaucher (contrairement à alignEnd, qui s'inverserait
  // en arabe et viendrait recouvrir le logo).
  const headerAlign = "right";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=facture-${order.orderNumber}.pdf`);
  doc.pipe(res);

  // Filet de sécurité : si une erreur survient pendant le streaming (après
  // l'envoi des en-têtes), on ne peut plus renvoyer un res.status(500).json
  // proprement — on ferme juste le flux pour éviter une réponse HTTP cassée.
  doc.on("error", (err) => {
    console.error("Erreur génération PDF facture:", err);
    try { res.end(); } catch { /* noop */ }
  });

  // ================================================================
  // EN-TÊTE
  // ================================================================
  const headerHeight = 130;
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.navy);
  try { doc.image(LOGO_PATH, marginX, 22, { width: 86, height: 86 }); } catch {}

  doc.fillColor(COLORS.white).font(FONT_BOLD).fontSize(26)
    .text(t.invoiceTitle, marginX, 34, { width: contentWidth, align: headerAlign });

  doc.fillColor(COLORS.orange).font(FONT_BOLD).fontSize(11)
    .text(`${t.orderPrefix} ${order.orderNumber}`, marginX, 66, { width: contentWidth, align: headerAlign });

  doc.fillColor("#9fb3d6").font(FONT_REGULAR).fontSize(9)
    .text(
      `${t.issuedOn} : ${new Date(order.createdAt).toLocaleDateString(dateLocale, {
        day: "2-digit", month: "long", year: "numeric",
      })}`,
      marginX, 83, { width: contentWidth, align: headerAlign }
    );

  doc.fillColor(COLORS.orange).font(FONT_BOLD).fontSize(9)
    .text(`${t.currencyLabel} : ${symbol}`, marginX, 110, { width: contentWidth, align: headerAlign });

  // ================================================================
  // STATUT
  // ================================================================
  const status = formatStatus(order.paymentStatus, t);
  let y = headerHeight + 24;

  doc.fillColor(status.bg).roundedRect(marginX, y, 150, 22, 4).fill();
  doc.fillColor(status.color).font(FONT_BOLD).fontSize(9)
    .text(`${t.statusLabel} : ${status.label.toUpperCase()}`, marginX, y + 6, { width: 150, align: "center" });

  // ================================================================
  // BLOCS FACTURÉ À / LIVRAISON
  // ================================================================
  y += 45;
  const colWidth = (contentWidth - 20) / 2;
  const col1X    = marginX;
  const col2X    = marginX + colWidth + 20;
  const blockTop = y;

  function sectionLabel(text: string, x: number, top: number) {
    doc.fillColor(COLORS.orange).font(FONT_BOLD).fontSize(10)
      .text(text.toUpperCase(), x, top, { width: colWidth, characterSpacing: 0.5, align: alignStart });
    doc.moveTo(x, top + 16).lineTo(x + colWidth, top + 16)
      .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  }

  function fieldLine(label: string, value: string, x: number, top: number): number {
    if (!value) return top;
    doc.fillColor(COLORS.textGray).font(FONT_BOLD).fontSize(9).text(label, x, top, { width: colWidth, align: alignStart });
    doc.fillColor(COLORS.textDark).font(FONT_REGULAR).fontSize(10)
      .text(value, x, top + 12, { width: colWidth, align: alignStart });
    return top + 12 + doc.heightOfString(value, { width: colWidth }) + 10;
  }

  sectionLabel(t.billedTo, col1X, blockTop);
  let y1 = blockTop + 28;
  y1 = fieldLine(t.name,  order.user?.name  || t.defaultClient, col1X, y1);
  if (order.user?.email) y1 = fieldLine(t.email, order.user.email,  col1X, y1);
  if (order.user?.phone) y1 = fieldLine(t.phone, order.user.phone,  col1X, y1);

  sectionLabel(t.shippingAddress, col2X, blockTop);
  let y2 = blockTop + 28;
  y2 = fieldLine(t.street, order.shippingAddress.street, col2X, y2);
  y2 = fieldLine(t.city,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`,
    col2X, y2);
  y2 = fieldLine(t.country, order.shippingAddress.country, col2X, y2);

  y = Math.max(y1, y2) + 15;

  // ================================================================
  // TABLEAU DES ARTICLES
  // ================================================================
  const IMG_SIZE    = 48;
  const IMG_PADDING = 6;
  const ROW_HEIGHT  = IMG_SIZE + IMG_PADDING * 2;

  // Largeurs des colonnes (indépendantes de la direction de lecture)
  const COL_WIDTHS = {
    img:     IMG_SIZE + IMG_PADDING * 2,
    article: 170,
    size:    55,
    qty:     45,
    price:   80,
  };
  const totalColWidth =
    contentWidth - COL_WIDTHS.img - COL_WIDTHS.article - COL_WIDTHS.size - COL_WIDTHS.qty - COL_WIDTHS.price;

  // En LTR, l'ordre visuel (gauche → droite) est : image, article, taille, qté, prix, total.
  // En RTL, on inverse cet ordre pour qu'un lecteur arabe rencontre d'abord le
  // produit (à droite) puis, en lisant vers la gauche, arrive au total en dernier —
  // exactement comme en LTR mais en miroir.
  const columnOrder: Array<keyof typeof COL_WIDTHS | "total"> = isRTL
    ? ["total", "price", "qty", "size", "article", "img"]
    : ["img", "article", "size", "qty", "price", "total"];

  const colWidthsFull = { ...COL_WIDTHS, total: totalColWidth };

  const cols: Record<"img" | "article" | "size" | "qty" | "price" | "total", { x: number; w: number }> =
    {} as any;
  {
    let curX = marginX;
    for (const key of columnOrder) {
      const w = colWidthsFull[key];
      cols[key] = { x: curX, w };
      curX += w;
    }
  }

  function drawTableHeader(headerY: number) {
    doc.rect(marginX, headerY, contentWidth, 26).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font(FONT_BOLD).fontSize(9);
    doc.text(t.colArticle, cols.article.x, headerY + 9, { width: cols.article.w, align: alignStart });
    doc.text(t.colSize,    cols.size.x,    headerY + 9, { width: cols.size.w,      align: "center" });
    doc.text(t.colQty,     cols.qty.x,     headerY + 9, { width: cols.qty.w,       align: "center" });
    doc.text(t.colPrice,   cols.price.x,   headerY + 9, { width: cols.price.w,     align: "right"  });
    doc.text(t.colTotal,   cols.total.x,   headerY + 9, { width: cols.total.w - 10, align: "right" });
  }

  const tableHeaderY = y;
  drawTableHeader(tableHeaderY);
  y = tableHeaderY + 26;

  let currentTableHeaderY = tableHeaderY;

  order.items.forEach((item, idx) => {
    // 👇 CORRECTION — ordre de fallback du nom :
    // 1) snapshot item.name (toujours rempli, produit ou offre libre)
    // 2) item.product?.name (si jamais item.name était vide malgré tout)
    // 3) item.offerTitle (offre libre sans produit)
    // 4) t.deletedProduct en dernier recours
    const name       = item.name || item.product?.name || item.offerTitle || t.deletedProduct;
    const nameHeight = doc.heightOfString(name, { width: cols.article.w - 10 });
    const rowHeight  = Math.max(ROW_HEIGHT, nameHeight + 20);

    if (y + rowHeight > pageHeight - FOOTER_RESERVE - 80) {
      doc.rect(marginX, currentTableHeaderY, contentWidth, y - currentTableHeaderY)
        .lineWidth(1).strokeColor(COLORS.navy).stroke();

      doc.addPage();
      y = 30;
      drawTableHeader(y);
      currentTableHeaderY = y;
      y += 26;
    }

    if (idx % 2 === 1) doc.rect(marginX, y, contentWidth, rowHeight).fill(COLORS.rowAlt);

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
      doc.fillColor(COLORS.textGray).font(FONT_REGULAR).fontSize(7)
        .text(t.imgNA, imgX, imgY + IMG_SIZE / 2 - 4, { width: IMG_SIZE, align: "center" });
    }

    const textY = y + (rowHeight - 22) / 2;

    doc.fillColor(COLORS.textDark).font(FONT_BOLD).fontSize(9)
      .text(name, cols.article.x, textY, { width: cols.article.w - 10, align: alignStart });

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLORS.textDark);
    doc.text(item.size || t.sizeDash,   cols.size.x,  textY + 2, { width: cols.size.w,  align: "center" });
    doc.text(String(item.quantity),     cols.qty.x,   textY + 2, { width: cols.qty.w,   align: "center" });

    doc.text(`${convert(item.price)} ${symbol}`,              cols.price.x, textY + 2, { width: cols.price.w,     align: "right" });
    doc.font(FONT_BOLD).fillColor(COLORS.navy)
      .text(`${convert(item.price * item.quantity)} ${symbol}`, cols.total.x, textY + 2, { width: cols.total.w - 10, align: "right" });

    y += rowHeight;

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y)
      .lineWidth(0.5).strokeColor(COLORS.borderGray).stroke();
  });

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
      .font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10)
      .text(label, totalsX, ty, { width: totalsW - 90, align: alignStart });
    doc.fillColor(bold ? COLORS.navy : COLORS.textDark)
      .font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(10)
      .text(value, totalsX + totalsW - 90, ty, { width: 90, align: "right" });
    ty += 18;
  }

  totalLine(t.subtotal, `${convert(order.subtotal)} ${symbol}`);
  totalLine(t.shipping,  `${convert(order.shippingCost)} ${symbol}`);
  if (order.tax > 0) totalLine(t.tax, `${convert(order.tax)} ${symbol}`);

  ty += 4;
  doc.moveTo(totalsX, ty).lineTo(totalsX + totalsW, ty)
    .lineWidth(1).strokeColor(COLORS.borderGray).stroke();
  ty += 10;

  doc.rect(totalsX - 12, ty - 8, totalsW + 12, 32).fill(COLORS.navy);
  doc.fillColor(COLORS.white).font(FONT_BOLD).fontSize(12)
    .text(t.total, totalsX, ty, { width: totalsW - 90, align: alignStart });
  doc.fillColor(COLORS.orange).font(FONT_BOLD).fontSize(13)
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

  doc.fillColor(COLORS.textGray).font(FONT_BOLD).fontSize(8)
    .text(t.signature, signatureX, fSigLabelY, {
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
  doc.fillColor(COLORS.navy).font(FONT_BOLD).fontSize(11)
    .text(t.thankYou, marginX, fFooterY + 14, { width: contentWidth, align: "center" });
  doc.fillColor(COLORS.textGray).font("Helvetica-Bold").fontSize(8.5)
    .text(t.footerBrand, marginX, fFooterY + 32, { width: contentWidth, align: "center" });
  doc.fillColor(COLORS.textGray).font(FONT_REGULAR).fontSize(8.5)
    .text(t.footerDescription, marginX, fFooterY + 44, { width: contentWidth, align: "center" });
  doc.fillColor(COLORS.textGray).font(FONT_REGULAR).fontSize(8)
    .text(t.footerLine2, marginX, fFooterY + 58, { width: contentWidth, align: "center" });

  doc.end();
}