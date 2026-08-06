const ExcelJS = require('exceljs');

// Builder generik: satu sheet ringkasan (opsional, key-value) + satu sheet tabel detail.
// Dipakai oleh semua endpoint /api/reports/:jenis/export supaya format file konsisten.
async function sendExcelReport(res, { filename, title, summary, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dashboard Inventory iPhone';
  workbook.created = new Date();

  if (summary && summary.length) {
    const sheet = workbook.addWorksheet('Ringkasan');
    sheet.addRow([title]).font = { bold: true, size: 14 };
    sheet.addRow([]);
    summary.forEach(({ label, value }) => {
      const row = sheet.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    });
    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 24;
  }

  const detail = workbook.addWorksheet('Detail');
  detail.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 18 }));
  detail.getRow(1).font = { bold: true };
  rows.forEach((r) => detail.addRow(r));
  columns.forEach((c, idx) => {
    if (c.format === 'currency') {
      detail.getColumn(idx + 1).numFmt = '#,##0';
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { sendExcelReport };
