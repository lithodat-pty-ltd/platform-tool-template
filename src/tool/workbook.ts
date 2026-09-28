import { TABLE_SUBTITLE, type SampleTable } from "./sampleTable";

/** Workbook bytes matching the column layout, fonts, and rules of the sample table. */
export function sampleTableToXlsx(table: SampleTable): Uint8Array {
  const sheet = sheetXml(table);
  const files: Array<{ name: string; text: string }> = [
    { name: "[Content_Types].xml", text: contentTypes() },
    { name: "_rels/.rels", text: rootRels() },
    { name: "docProps/core.xml", text: coreProps() },
    { name: "docProps/app.xml", text: appProps() },
    { name: "xl/workbook.xml", text: workbookXml() },
    { name: "xl/_rels/workbook.xml.rels", text: workbookRels() },
    { name: "xl/styles.xml", text: stylesXml() },
    { name: "xl/worksheets/sheet1.xml", text: sheet },
  ];
  return zipStore(files.map((file) => ({ name: file.name, data: encode(file.text) })));
}

function sheetXml(table: SampleTable): string {
  const rows: string[] = [];
  rows.push(rowXml(1, [textCell("A1", 1, table.title)]));
  rows.push(rowXml(2, [textCell("A2", 2, TABLE_SUBTITLE)]));
  rows.push(
    rowXml(4, [
      textCell("A4", 3, "Sample"),
      textCell("B4", 3, "IGSN"),
      textCell("C4", 4, "Latitude (°)"),
      textCell("D4", 4, "Longitude (°)"),
      textCell("E4", 4, "Elevation (m)"),
      textCell("F4", 4, "Depth (m)"),
      textCell("G4", 3, "Location"),
    ]),
  );

  const last = table.rows.length - 1;
  table.rows.forEach((record, index) => {
    const line = index + 5;
    const bottom = index === last;
    const text = bottom ? 9 : 5;
    const coord = bottom ? 10 : 6;
    const whole = bottom ? 11 : 7;
    const depth = bottom ? 12 : 8;
    const cells = [
      textCell(`A${line}`, text, record.sample),
      textCell(`B${line}`, text, record.igsn),
      record.latitude == null ? "" : numberCell(`C${line}`, coord, record.latitude, 5),
      record.longitude == null ? "" : numberCell(`D${line}`, coord, record.longitude, 5),
      record.elevation == null ? "" : numberCell(`E${line}`, whole, record.elevation, 0),
      record.depth ? textCell(`F${line}`, depth, record.depth) : "",
      textCell(`G${line}`, text, record.location),
    ].filter(Boolean);
    rows.push(rowXml(line, cells));
  });

  const footnoteStart = table.rows.length + 6;
  table.footnotes.forEach((note, index) => {
    const line = footnoteStart + index;
    rows.push(rowXml(line, [textCell(`A${line}`, 13, note)]));
  });

  const endRow = footnoteStart + Math.max(table.footnotes.length - 1, 0);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:G${endRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A1" sqref="A1"/></sheetView></sheetViews><sheetFormatPr baseColWidth="8" defaultRowHeight="15"/><cols><col width="8.5" customWidth="1" min="1" max="1"/><col width="19.5" customWidth="1" min="2" max="2"/><col width="11.5" customWidth="1" min="3" max="3"/><col width="11.5" customWidth="1" min="4" max="4"/><col width="11.5" customWidth="1" min="5" max="5"/><col width="15.5" customWidth="1" min="6" max="6"/><col width="15.5" customWidth="1" min="7" max="7"/></cols><sheetData>${rows.join("")}</sheetData><pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/><pageSetup orientation="portrait" paperSize="9" fitToHeight="0" fitToWidth="1"/></worksheet>`;
}

function textCell(ref: string, style: number, value: string): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function numberCell(ref: string, style: number, value: number, places: number): string {
  return `<c r="${ref}" s="${style}" t="n"><v>${value.toFixed(places)}</v></c>`;
}

function rowXml(index: number, cells: readonly string[]): string {
  return `<row r="${index}">${cells.join("")}</row>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function contentTypes(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function rootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Samples" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function workbookRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
}

function coreProps(): string {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>EarthBank</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function appProps(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>EarthBank sample table</Application></Properties>`;
}

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00000"/></numFmts><fonts count="6"><font><name val="Calibri"/><family val="2"/><sz val="11"/></font><font><name val="Helvetica Neue"/><b/><sz val="10"/></font><font><name val="Helvetica Neue"/><sz val="9"/></font><font><name val="Helvetica Neue"/><b/><sz val="8"/></font><font><name val="Helvetica Neue"/><sz val="8"/></font><font><name val="Helvetica Neue"/><color rgb="FF57544C"/><sz val="7"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="medium"><color rgb="FF12110E"/></top><bottom style="thin"><color rgb="FF12110E"/></bottom><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FF12110E"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="14"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="bottom" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="bottom" wrapText="1"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf><xf numFmtId="164" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="1" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf><xf numFmtId="164" fontId="4" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="1" fontId="4" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf><xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs></styleSheet>`;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** CRC-32 (ISO-HDLC). The check vector is crc32("123456789") = 0xCBF43926. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc ^= data[index] ?? 0;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files: readonly { name: string; data: Uint8Array }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encode(file.name);
    const checksum = crc32(file.data);
    const local = header(0x04034b50, 30, name.length, checksum, file.data.length, offset);
    locals.push(local, name, file.data);
    central.push(header(0x02014b50, 46, name.length, checksum, file.data.length, offset), name);
    offset += local.length + name.length + file.data.length;
  }
  const centralBytes = concat(central);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, centralBytes.length, true);
  view.setUint32(16, offset, true);
  return concat([...locals, centralBytes, end]);
}

function header(signature: number, size: number, nameLength: number, checksum: number, length: number, offset: number): Uint8Array {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  view.setUint16(4, 20, true);
  if (size === 46) view.setUint16(6, 20, true);
  const methodAt = size === 46 ? 10 : 8;
  view.setUint16(methodAt, 0, true);
  const crcAt = size === 46 ? 16 : 14;
  view.setUint32(crcAt, checksum, true);
  view.setUint32(crcAt + 4, length, true);
  view.setUint32(crcAt + 8, length, true);
  view.setUint16(crcAt + 12, nameLength, true);
  if (size === 46) view.setUint32(42, offset, true);
  return bytes;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
