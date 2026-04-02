import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AgendamentoRow {
  ticketNumber?: string | null;
  id: number;
  customerName?: string | null;
  customerPhone?: string | null;
  vehicleInterest?: string | null;
  sellerId: number;
  scheduledDate?: number | null;
  notes?: string | null;
  attendanceStatus?: string | null;
  status?: string | null;
  [key: string]: any;
}

interface ExportOptions {
  records: AgendamentoRow[];
  sellerMap: Map<number, string>;
  title?: string;
  sellerName?: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(2);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

export function exportAgendamentosPDF(options: ExportOptions) {
  const { records, sellerMap, title, sellerName } = options;
  const now = Date.now();

  if (records.length === 0) return false;

  // Separate rescue vs active
  const rescues = records.filter(
    (r) =>
      r.attendanceStatus === "no_show" ||
      (r.scheduledDate && now - r.scheduledDate > FORTY_EIGHT_HOURS)
  );
  const actives = records.filter((r) => !rescues.includes(r));

  // Create PDF in landscape for better table fit
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const headerText = title || "Relatório de Agendamentos";
  doc.text(headerText, 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Gerado em: ${dateStr}`, 14, 21);
  if (sellerName) {
    doc.text(`Vendedor: ${sellerName}`, 14, 26);
  }
  doc.text(
    `Total: ${records.length} agendamentos (${rescues.length} resgates, ${actives.length} ativos)`,
    14,
    sellerName ? 31 : 26
  );

  // Divider line
  const startY = sellerName ? 34 : 29;
  doc.setDrawColor(220, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(14, startY, pageWidth - 14, startY);

  let currentY = startY + 4;

  const tableColumns = [
    { header: "Ticket", dataKey: "ticket" },
    { header: "Cliente", dataKey: "cliente" },
    { header: "Telefone", dataKey: "telefone" },
    { header: "Veículo", dataKey: "veiculo" },
    { header: "Vendedor", dataKey: "vendedor" },
    { header: "Agendado", dataKey: "agendado" },
    { header: "Obs", dataKey: "obs" },
  ];

  function mapRows(rows: AgendamentoRow[]) {
    return rows.map((r) => ({
      ticket: r.ticketNumber || `#A${String(r.id).padStart(3, "0")}`,
      cliente: r.customerName || "-",
      telefone: r.customerPhone || "-",
      veiculo: r.vehicleInterest || "-",
      vendedor: sellerMap.get(r.sellerId) || "?",
      agendado: r.scheduledDate ? formatDate(r.scheduledDate) : "-",
      obs: r.notes || "-",
    }));
  }

  // Rescue section
  if (rescues.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 50, 50);
    doc.text(`RESGATES (${rescues.length})`, 14, currentY + 4);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      columns: tableColumns,
      body: mapRows(rescues),
      theme: "grid",
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        fillColor: [255, 243, 205],
        textColor: [60, 60, 60],
      },
      alternateRowStyles: {
        fillColor: [255, 248, 225],
      },
      columnStyles: {
        ticket: { cellWidth: 18 },
        cliente: { cellWidth: 30 },
        telefone: { cellWidth: 30 },
        veiculo: { cellWidth: 35 },
        vendedor: { cellWidth: 25 },
        agendado: { cellWidth: 28 },
        obs: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        // Footer on each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Kafka Rank - Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 40;
  }

  // Active section
  if (actives.length > 0) {
    // Check if we need a new page
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 15;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(39, 174, 96);
    doc.text(`ATIVOS (${actives.length})`, 14, currentY + 4);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      columns: tableColumns,
      body: mapRows(actives),
      theme: "grid",
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [60, 60, 60],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        ticket: { cellWidth: 18 },
        cliente: { cellWidth: 30 },
        telefone: { cellWidth: 30 },
        veiculo: { cellWidth: 35 },
        vendedor: { cellWidth: 25 },
        agendado: { cellWidth: 28 },
        obs: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data: any) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Kafka Rank - Página ${data.pageNumber} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      },
    });
  }

  // Update page numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Kafka Rank - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  // Generate filename
  const dateFileName = new Date()
    .toLocaleDateString("pt-BR")
    .replace(/\//g, "-");
  const fileName = sellerName
    ? `Agendamentos_${sellerName}_${dateFileName}.pdf`
    : `Agendamentos_${dateFileName}.pdf`;

  // Save/download the PDF
  doc.save(fileName);
  return true;
}
