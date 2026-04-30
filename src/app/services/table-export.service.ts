import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

type ExportCellValue = string | number | null | undefined;
type ExportAlignment = 'left' | 'center' | 'right';

export type ExportSummaryItem = {
  label: string;
  value: string | number;
};

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => ExportCellValue;
  align?: ExportAlignment;
  width?: number;
};

export type ExportTableConfig<T> = {
  title: string;
  subtitle?: string;
  fileNameBase: string;
  sheetName: string;
  rows: readonly T[];
  columns: readonly ExportColumn<T>[];
  summary?: readonly ExportSummaryItem[];
};

@Injectable({ providedIn: 'root' })
export class TableExportService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  async exportToExcel<T>(config: ExportTableConfig<T>): Promise<void> {
    this.assertConfig(config);

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(config.sheetName);
    const headerFill = '153A64';
    const borderColor = 'D3DEEB';
    const softFill = 'F5F8FC';
    const body = this.toCellMatrix(config);
    const columnCount = config.columns.length;
    const titleRow = worksheet.addRow([config.title]);
    const subtitleRow = worksheet.addRow([this.buildSubtitle(config.subtitle)]);

    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);
    worksheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, columnCount);

    titleRow.height = 24;
    titleRow.getCell(1).font = {
      name: 'Inter',
      size: 16,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerFill },
    };
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    subtitleRow.height = 19;
    subtitleRow.getCell(1).font = {
      name: 'Inter',
      size: 10,
      italic: true,
      color: { argb: '5A6E89' },
    };
    subtitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    worksheet.addRow([]);

    for (const item of config.summary ?? []) {
      const row = worksheet.addRow([item.label, this.toDisplayValue(item.value)]);
      row.getCell(1).font = { name: 'Inter', size: 10, bold: true, color: { argb: headerFill } };
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'EAF1F8' },
      };
      row.getCell(1).border = this.excelBorder(borderColor);
      row.getCell(2).font = { name: 'Inter', size: 10, bold: true, color: { argb: '16263F' } };
      row.getCell(2).border = this.excelBorder(borderColor);
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

      if (columnCount > 2) {
        worksheet.mergeCells(row.number, 2, row.number, columnCount);
      }
    }

    worksheet.addRow([]);

    const headerRow = worksheet.addRow(config.columns.map((column) => column.header));
    headerRow.eachCell((cell) => {
      cell.font = {
        name: 'Inter',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerFill },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.excelBorder(borderColor);
    });

    body.forEach((values, index) => {
      const row = worksheet.addRow(values);
      row.height = 22;
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: 'Inter', size: 10, color: { argb: '16263F' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: config.columns[columnNumber - 1]?.align ?? 'left',
          wrapText: true,
        };
        cell.border = this.excelBorder(borderColor);
        if (index % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: softFill },
          };
        }
      });
    });

    worksheet.columns = config.columns.map((column, index) => ({
      width: this.resolveColumnWidth(column, body.map((row) => row[index] ?? '')),
    }));
    worksheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: columnCount },
    };
    worksheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      this.buildFileName(config.fileNameBase, 'xlsx'),
    );
  }

  async exportToPdf<T>(config: ExportTableConfig<T>): Promise<void> {
    this.assertConfig(config);

    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const summaryBottom = this.drawPdfHeader(doc, config, pageWidth);

    autoTable(doc, {
      startY: summaryBottom + 18,
      head: [config.columns.map((column) => column.header)],
      body: this.toCellMatrix(config),
      margin: { top: 32, right: 36, bottom: 34, left: 36 },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        overflow: 'linebreak',
        lineColor: [219, 228, 241],
        textColor: [22, 38, 63],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [21, 58, 100],
        textColor: [255, 255, 255],
        lineColor: [211, 222, 235],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 248, 252],
      },
      columnStyles: Object.fromEntries(
        config.columns.map((column, index) => [index, { halign: column.align ?? 'left' }]),
      ),
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 110, 137);
      doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 36, pageHeight - 14, {
        align: 'right',
      });
    }

    doc.save(this.buildFileName(config.fileNameBase, 'pdf'));
  }

  private assertConfig<T>(config: ExportTableConfig<T>): void {
    if (config.columns.length === 0) {
      throw new Error('Nenhuma coluna foi configurada para a exportacao.');
    }
    if (config.rows.length === 0) {
      throw new Error('Nenhum dado disponivel para exportar.');
    }
  }

  private buildSubtitle(customSubtitle?: string): string {
    const timestamp = `Exportado em ${this.formatTimestamp(new Date())}`;
    return customSubtitle ? `${customSubtitle} • ${timestamp}` : timestamp;
  }

  private buildFileName(baseName: string, extension: 'xlsx' | 'pdf'): string {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return `${baseName}-${stamp}.${extension}`;
  }

  private toCellMatrix<T>(config: ExportTableConfig<T>): string[][] {
    return config.rows.map((row) =>
      config.columns.map((column) => this.toDisplayValue(column.value(row))),
    );
  }

  private toDisplayValue(value: ExportCellValue): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }

  private resolveColumnWidth<T>(
    column: ExportColumn<T>,
    values: readonly string[],
  ): number {
    if (column.width) return column.width;

    const maxLength = Math.max(
      column.header.length,
      ...values.map((value) =>
        value
          .split(/\r?\n/)
          .reduce((current, line) => Math.max(current, line.length), 0),
      ),
    );
    return Math.min(Math.max(maxLength + 2, 14), 34);
  }

  private excelBorder(color: string) {
    return {
      top: { style: 'thin' as const, color: { argb: color } },
      right: { style: 'thin' as const, color: { argb: color } },
      bottom: { style: 'thin' as const, color: { argb: color } },
      left: { style: 'thin' as const, color: { argb: color } },
    };
  }

  private drawPdfHeader<T>(
    doc: import('jspdf').jsPDF,
    config: ExportTableConfig<T>,
    pageWidth: number,
  ): number {
    doc.setFillColor(21, 58, 100);
    doc.roundedRect(36, 28, pageWidth - 72, 52, 12, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(config.title, 52, 50);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(this.buildSubtitle(config.subtitle), 52, 67);

    if (!config.summary?.length) {
      return 88;
    }

    const palette = [
      { fill: [232, 244, 237] as const, accent: [47, 143, 91] as const, text: [32, 97, 61] as const },
      { fill: [234, 241, 248] as const, accent: [21, 58, 100] as const, text: [21, 58, 100] as const },
      { fill: [253, 244, 223] as const, accent: [199, 145, 26] as const, text: [130, 93, 5] as const },
      { fill: [253, 236, 235] as const, accent: [201, 72, 72] as const, text: [135, 42, 42] as const },
    ];
    const cardsPerRow = Math.min(config.summary.length, 4);
    const gap = 10;
    const totalWidth = pageWidth - 72;
    const cardWidth = (totalWidth - gap * (cardsPerRow - 1)) / cardsPerRow;
    const cardHeight = 54;
    const startY = 94;

    config.summary.forEach((item, index) => {
      const rowIndex = Math.floor(index / cardsPerRow);
      const columnIndex = index % cardsPerRow;
      const x = 36 + columnIndex * (cardWidth + gap);
      const y = startY + rowIndex * (cardHeight + gap);
      const colors = palette[index % palette.length];

      doc.setFillColor(colors.fill[0], colors.fill[1], colors.fill[2]);
      doc.setDrawColor(211, 222, 235);
      doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, 'FD');
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.rect(x, y, cardWidth, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(this.toDisplayValue(item.value), x + 14, y + 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 110, 137);
      doc.text(item.label, x + 14, y + 44);
    });

    return startY + Math.ceil(config.summary.length / cardsPerRow) * (cardHeight + gap) - gap;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const view = this.document.defaultView;
    if (!view) {
      throw new Error('A janela do navegador nao esta disponivel para iniciar o download.');
    }

    const url = view.URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  }

  private formatTimestamp(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
