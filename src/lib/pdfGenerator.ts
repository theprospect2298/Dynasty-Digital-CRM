import { jsPDF } from 'jspdf';
import { Invoice, Client, AppSettings, ClientPerformanceEntry } from '../types';
import { formatCurrency, formatDate, formatMonthLabel, calculateCostPerLead, calculateROAS } from './calculations';

export function createInvoicePdf(
  invoice: Invoice,
  client: Client,
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28
  const margin = 40;
  const contentWidth = pageWidth - margin * 2; // 515.28

  // Palette
  const primaryColor = [24, 26, 42]; // #181A2A deep navy
  const accentColor = [61, 90, 254]; // #3D5AFE dynasty royal blue
  const cyanColor = [34, 211, 238]; // #22D3EE bright cyan
  const textColor = [30, 41, 59]; // #1E293B slate 800
  const mutedColor = [100, 116, 139]; // #64748B slate 500
  const lightBg = [248, 250, 252]; // #F8FAFC
  const borderLine = [226, 232, 240]; // #E2E8F0

  // Status colors
  let statusBg = [241, 245, 249];
  let statusTextColor = [71, 85, 105];
  if (invoice.status === 'Paid') {
    statusBg = [220, 252, 231]; // light emerald
    statusTextColor = [22, 101, 52];
  } else if (invoice.status === 'Overdue') {
    statusBg = [254, 226, 226]; // light rose
    statusTextColor = [185, 28, 28];
  } else if (invoice.status === 'Sent') {
    statusBg = [224, 242, 254]; // light sky
    statusTextColor = [3, 105, 161];
  }

  // 1. Top Decorative Brand Bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // 2. Header Area
  let y = 48;

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.agencyName || 'DYNASTY DIGITAL', margin, y);

  // Agency Tagline
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Performance Digital Marketing & Web Engineering', margin, y);

  // Agency details
  y += 13;
  const contactLine = `${settings.email}  •  ${settings.phone}  •  ${settings.location || 'South Florida'}`;
  doc.text(contactLine, margin, y);

  // Right Header: INVOICE & Meta
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INVOICE', rightX, 48, { align: 'right' });

  // Invoice Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(invoice.invoiceNumber, rightX, 64, { align: 'right' });

  // Status Badge
  const statusBadgeWidth = 64;
  const statusBadgeHeight = 16;
  const statusBadgeX = rightX - statusBadgeWidth;
  const statusBadgeY = 72;
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(statusBadgeX, statusBadgeY, statusBadgeWidth, statusBadgeHeight, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(statusTextColor[0], statusTextColor[1], statusTextColor[2]);
  doc.text(
    invoice.status.toUpperCase(),
    statusBadgeX + statusBadgeWidth / 2,
    statusBadgeY + 11,
    { align: 'center' }
  );

  // Divider
  y = 96;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(1);
  doc.line(margin, y, rightX, y);

  // 3. Billing Info Grid (2 columns: Billed To / Invoice Details)
  y = 114;
  const colWidth = contentWidth / 2;

  // Left: BILLED TO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('BILLED TO', margin, y);

  y += 13;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(client.businessName || 'Valued Client', margin, y);

  y += 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  if (client.contactName) {
    doc.text(`Attn: ${client.contactName}`, margin, y);
    y += 12;
  }
  if (client.email) {
    doc.text(client.email, margin, y);
    y += 12;
  }
  if (client.phone) {
    doc.text(client.phone, margin, y);
    y += 12;
  }
  if (client.address || client.city) {
    const addr = [client.address, client.city].filter(Boolean).join(', ');
    doc.text(addr, margin, y);
    y += 12;
  }

  // Right Column: Dates
  const col2X = margin + colWidth + 20;
  let dateY = 114;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('INVOICE DETAILS', col2X, dateY);

  dateY += 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Issue Date:', col2X, dateY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(formatDate(invoice.issueDate), rightX, dateY, { align: 'right' });

  dateY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Due Date:', col2X, dateY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(invoice.status === 'Overdue' ? statusTextColor[0] : textColor[0], invoice.status === 'Overdue' ? statusTextColor[1] : textColor[1], invoice.status === 'Overdue' ? statusTextColor[2] : textColor[2]);
  doc.text(formatDate(invoice.dueDate), rightX, dateY, { align: 'right' });

  if (invoice.paidDate) {
    dateY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Payment Received:', col2X, dateY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(formatDate(invoice.paidDate), rightX, dateY, { align: 'right' });
  }

  dateY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Payment Terms:', col2X, dateY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Due on Receipt / Net 15', rightX, dateY, { align: 'right' });

  // 4. Line Items Table
  y = Math.max(y, dateY) + 20;

  // Table Header
  const tableHeaderHeight = 22;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION / SERVICE', margin + 10, y + 14);
  doc.text('QTY', rightX - 160, y + 14, { align: 'center' });
  doc.text('RATE', rightX - 90, y + 14, { align: 'right' });
  doc.text('AMOUNT', rightX - 10, y + 14, { align: 'right' });

  y += tableHeaderHeight;

  // Line Items
  invoice.lineItems.forEach((item, index) => {
    const isEven = index % 2 === 0;
    const rowHeight = 26;

    if (isEven) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y + rowHeight, rightX, y + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    // Truncate long descriptions if needed
    const descText = item.description || 'Professional Digital Marketing Service';
    const splitDesc = doc.splitTextToSize(descText, contentWidth - 210);
    doc.text(splitDesc[0], margin + 10, y + 16);

    doc.text(String(item.quantity || 1), rightX - 160, y + 16, { align: 'center' });
    doc.text(formatCurrency(item.unitPrice), rightX - 90, y + 16, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.total), rightX - 10, y + 16, { align: 'right' });

    y += rowHeight;
  });

  // 5. Totals Section (Right-aligned)
  y += 16;
  const totalsBoxWidth = 220;
  const totalsLeftX = rightX - totalsBoxWidth;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Subtotal:', totalsLeftX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(formatCurrency(invoice.subtotal), rightX - 10, y, { align: 'right' });

  if (invoice.discount && invoice.discount > 0) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Discount:', totalsLeftX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text(`-${formatCurrency(invoice.discount)}`, rightX - 10, y, { align: 'right' });
  }

  if (invoice.tax && invoice.tax > 0) {
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Tax / Processing:', totalsLeftX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(formatCurrency(invoice.tax), rightX - 10, y, { align: 'right' });
  }

  // Total Due Highlight Box
  y += 14;
  const highlightHeight = 32;
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(totalsLeftX - 6, y - 4, totalsBoxWidth + 6, highlightHeight, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DUE:', totalsLeftX + 6, y + 17);

  doc.setFontSize(13);
  doc.text(formatCurrency(invoice.total), rightX - 8, y + 17, { align: 'right' });

  // 6. Payment Instructions & Notes (Left Side or Full Width)
  y += highlightHeight + 24;

  const instructions =
    invoice.paymentInstructions ||
    `Payment Methods: Automated ACH / Credit Card via Stripe Portal. Wire & ACH bank details available upon request. Make checks or remit transfers to Dynasty Digital LLC.`;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'F');
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PAYMENT INSTRUCTIONS & REMITTANCE', margin + 12, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  const splitInstr = doc.splitTextToSize(instructions, contentWidth - 24);
  doc.text(splitInstr, margin + 12, y + 29);

  if (invoice.notes) {
    y += 66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('NOTES', margin, y);

    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    const splitNotes = doc.splitTextToSize(invoice.notes, contentWidth);
    doc.text(splitNotes, margin, y);
  }

  // 7. Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(borderLine[0], borderLine[1], borderLine[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 12, rightX, footerY - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(
    `Thank you for choosing ${settings.agencyName || 'Dynasty Digital'}. For questions or support, email ${settings.email}`,
    margin,
    footerY
  );
  doc.text(`${invoice.invoiceNumber}  •  Page 1 of 1`, rightX, footerY, { align: 'right' });

  return doc;
}

export function downloadInvoicePdf(
  invoice: Invoice,
  client: Client,
  settings: AppSettings
) {
  const doc = createInvoicePdf(invoice, client, settings);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/**
 * Generate a strict one-page executive monthly performance summary PDF
 * in Dynasty Digital branding.
 */
export function createPerformanceReportPdf(
  entry: ClientPerformanceEntry,
  client: Client,
  settings: AppSettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 36;
  const contentWidth = pageWidth - margin * 2; // 523.28 pt
  const rightX = pageWidth - margin;

  // Colors
  const darkNavy = [15, 17, 30]; // #0F111E
  const deepCardBg = [248, 250, 252]; // #F8FAFC
  const borderSlate = [226, 232, 240]; // #E2E8F0
  const brandRoyal = [61, 90, 254]; // #3D5AFE
  const brandCyan = [6, 182, 212]; // #06B6D4
  const emeraldGreen = [16, 185, 129]; // #10B981
  const textDark = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const textLight = [241, 245, 249]; // #F1F5F9

  // 1. Top Decorative Brand Bar (Dynasty Digital Gradient simulation)
  doc.setFillColor(brandRoyal[0], brandRoyal[1], brandRoyal[2]);
  doc.rect(0, 0, pageWidth * 0.6, 6, 'F');
  doc.setFillColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, 6, 'F');

  // 2. Header Area
  let y = 38;

  // Left: Agency Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(settings.agencyName ? settings.agencyName.toUpperCase() : 'DYNASTY DIGITAL', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.text('MONTHLY CLIENT PERFORMANCE & GROWTH REPORT', margin, y + 11);

  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const agencyContact = `${settings.location || 'South Florida'}  •  ${settings.website || 'dynastysites.net'}  •  ${settings.phone || '(954) 294-3230'}`;
  doc.text(agencyContact, margin, y + 21);

  // Right: Client Details & Reporting Month Badge
  const monthDisplay = formatMonthLabel(entry.month).toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(client.businessName, rightX, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Contact: ${client.contactName || 'Primary Contact'}  •  Generated: ${formatDate(new Date().toISOString().split('T')[0])}`,
    rightX,
    y + 11,
    { align: 'right' }
  );

  // Month Period Badge
  const badgeWidth = 120;
  const badgeHeight = 16;
  const badgeX = rightX - badgeWidth;
  const badgeY = y + 17;
  doc.setFillColor(brandRoyal[0], brandRoyal[1], brandRoyal[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`PERIOD: ${monthDisplay}`, badgeX + badgeWidth / 2, badgeY + 11, { align: 'center' });

  // Divider Line
  y += 40;
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.setLineWidth(0.75);
  doc.line(margin, y, rightX, y);

  // 3. Section 1: Paid Advertising Performance
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandRoyal[0], brandRoyal[1], brandRoyal[2]);
  doc.text('1. PAID ADVERTISING PERFORMANCE & ATTRIBUTION', margin, y);

  y += 7;
  // 6 KPI Metric Tiles (2 rows of 3)
  const colGap = 8;
  const tileWidth = (contentWidth - colGap * 2) / 3;
  const tileHeight = 44;

  const costPerLeadVal = entry.costPerLead || calculateCostPerLead(entry.adSpend, entry.leads);
  const roasVal = entry.roas || calculateROAS(entry.revenueFromAds, entry.adSpend);

  interface KpiTile {
    label: string;
    value: string;
    subtext: string;
    valueColor: number[];
    isHighlighted?: boolean;
  }

  const adKpisRow1: KpiTile[] = [
    {
      label: 'TOTAL AD SPEND',
      value: formatCurrency(entry.adSpend),
      subtext: 'Paid directly to ad platforms',
      valueColor: darkNavy,
    },
    {
      label: 'LEADS GENERATED',
      value: `${entry.leads} Leads`,
      subtext: 'Verified phone & web inquiries',
      valueColor: brandRoyal,
    },
    {
      label: 'COST PER LEAD (CPL)',
      value: formatCurrency(costPerLeadVal),
      subtext: 'Auto-calculated: Spend ÷ Leads',
      valueColor: costPerLeadVal > 0 && costPerLeadVal < 60 ? emeraldGreen : brandRoyal,
    },
  ];

  const adKpisRow2: KpiTile[] = [
    {
      label: 'BOOKED JOBS',
      value: `${entry.bookedJobs} Jobs`,
      subtext: entry.leads > 0 ? `${Math.round((entry.bookedJobs / entry.leads) * 100)}% Lead Conversion Rate` : 'Client-reported bookings',
      valueColor: darkNavy,
    },
    {
      label: 'CLIENT REVENUE FROM ADS',
      value: formatCurrency(entry.revenueFromAds),
      subtext: 'Client-reported closed job revenue',
      valueColor: emeraldGreen,
    },
    {
      label: 'RETURN ON AD SPEND (ROAS)',
      value: `${roasVal}x ROAS`,
      subtext: `${roasVal >= 4 ? 'Exceptional Return' : roasVal >= 2.5 ? 'Strongly Profitable' : 'Campaign Active'}`,
      valueColor: roasVal >= 3 ? emeraldGreen : brandRoyal,
      isHighlighted: true,
    },
  ];

  const drawKpiRow = (rowItems: KpiTile[], rowY: number) => {
    rowItems.forEach((kpi, idx) => {
      const boxX = margin + idx * (tileWidth + colGap);
      doc.setFillColor(kpi.isHighlighted ? 240 : deepCardBg[0], kpi.isHighlighted ? 253 : deepCardBg[1], kpi.isHighlighted ? 244 : deepCardBg[2]);
      doc.setDrawColor(kpi.isHighlighted ? emeraldGreen[0] : borderSlate[0], kpi.isHighlighted ? emeraldGreen[1] : borderSlate[1], kpi.isHighlighted ? emeraldGreen[2] : borderSlate[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, rowY, tileWidth, tileHeight, 4, 4, 'FD');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(kpi.label, boxX + 8, rowY + 11);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(kpi.valueColor[0], kpi.valueColor[1], kpi.valueColor[2]);
      doc.text(kpi.value, boxX + 8, rowY + 26);

      // Subtext
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(kpi.subtext, boxX + 8, rowY + 37);
    });
  };

  drawKpiRow(adKpisRow1, y);
  y += tileHeight + 6;
  drawKpiRow(adKpisRow2, y);
  y += tileHeight + 14;

  // 4. Section 2: Google Business Profile (GBP) Local Search
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.text('2. GOOGLE BUSINESS PROFILE & LOCAL SEARCH (GBP)', margin, y);

  y += 7;
  const totalGbp = (entry.gbpCalls || 0) + (entry.gbpDirectionRequests || 0) + (entry.gbpWebsiteClicks || 0);
  const gbpKpis = [
    {
      label: 'PHONE CALLS GENERATED',
      value: `${entry.gbpCalls || 0} Calls`,
      subtext: 'Direct outbound calls from Google listing',
      color: brandRoyal,
    },
    {
      label: 'DIRECTION REQUESTS',
      value: `${entry.gbpDirectionRequests || 0} Requests`,
      subtext: 'High-intent foot traffic / navigation',
      color: darkNavy,
    },
    {
      label: 'WEBSITE CLICKS FROM GBP',
      value: `${entry.gbpWebsiteClicks || 0} Visits`,
      subtext: 'Organic profile visitors to site',
      color: brandCyan,
    },
  ];

  gbpKpis.forEach((kpi, idx) => {
    const boxX = margin + idx * (tileWidth + colGap);
    doc.setFillColor(deepCardBg[0], deepCardBg[1], deepCardBg[2]);
    doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, y, tileWidth, tileHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(kpi.label, boxX + 8, y + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, boxX + 8, y + 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(kpi.subtext, boxX + 8, y + 37);
  });

  // GBP Summary pill
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Total High-Intent Local Customer Actions: ${totalGbp} this month`,
    rightX,
    y - 2,
    { align: 'right' }
  );

  y += tileHeight + 14;

  // 5. Section 3: What We Changed This Month
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandRoyal[0], brandRoyal[1], brandRoyal[2]);
  doc.text('3. WHAT WE CHANGED & EXECUTED THIS MONTH', margin, y);

  y += 6;
  const narrativeBoxHeight = 110;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, narrativeBoxHeight, 4, 4, 'FD');

  // Blue vertical left accent line
  doc.setFillColor(brandRoyal[0], brandRoyal[1], brandRoyal[2]);
  doc.roundedRect(margin, y, 3.5, narrativeBoxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('OPTIMIZATIONS, CAMPAIGN ADJUSTMENTS & CREATIVE REFRESHES', margin + 12, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const whatChangedText =
    entry.whatWeChanged ||
    'Continuous campaign management, ad creative rotation, search term negative keyword filtering, and Google Business Profile weekly updates.';
  const splitWhatChanged = doc.splitTextToSize(whatChangedText, contentWidth - 24);
  doc.text(splitWhatChanged.slice(0, 8), margin + 12, y + 26, { lineHeightFactor: 1.35 });

  y += narrativeBoxHeight + 12;

  // 6. Section 4: Next Month's Strategic Plan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.text("4. NEXT MONTH'S STRATEGIC ROADMAP & GROWTH PLAN", margin, y);

  y += 6;
  const planBoxHeight = 100;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, planBoxHeight, 4, 4, 'FD');

  // Cyan vertical left accent line
  doc.setFillColor(brandCyan[0], brandCyan[1], brandCyan[2]);
  doc.roundedRect(margin, y, 3.5, planBoxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('STRATEGIC FOCUS, BUDGET ALLOCATION & UPCOMING INITIATIVES', margin + 12, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const nextMonthText =
    entry.nextMonthPlan ||
    'Scale top performing campaigns, test seasonal promotion creatives, expand retargeting audience window, and implement review generation workflow.';
  const splitPlan = doc.splitTextToSize(nextMonthText, contentWidth - 24);
  doc.text(splitPlan.slice(0, 7), margin + 12, y + 26, { lineHeightFactor: 1.35 });

  // 7. Footer
  const footerY = pageHeight - 26;
  doc.setDrawColor(borderSlate[0], borderSlate[1], borderSlate[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, rightX, footerY - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    `Prepared by Dynasty Digital  •  South Florida  •  Confidential & Proprietary  •  ${settings.email || 'info@dynastysites.net'}`,
    margin,
    footerY
  );
  doc.text(
    `${client.businessName} - ${monthDisplay}  •  Page 1 of 1`,
    rightX,
    footerY,
    { align: 'right' }
  );

  return doc;
}

export function downloadPerformanceReportPdf(
  entry: ClientPerformanceEntry,
  client: Client,
  settings: AppSettings
) {
  const doc = createPerformanceReportPdf(entry, client, settings);
  const safeBusiness = client.businessName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Dynasty_Digital_Performance_${safeBusiness}_${entry.month}.pdf`);
}
