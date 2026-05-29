const encoder = new TextEncoder()

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
    }
    table[index] = value >>> 0
  }
  return table
})()

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff
  bytes.forEach((byte) => {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0)
  })
  return (crc ^ 0xffffffff) >>> 0
}

const uint16 = (value: number): number[] => [value & 0xff, (value >>> 8) & 0xff]

const uint32 = (value: number): number[] => [
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
]

const xmlEscape = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const columnName = (index: number): string => {
  let value = index + 1
  let name = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

const toInlineStringCell = (rowIndex: number, columnIndex: number, value: unknown): string =>
  `<c r="${columnName(columnIndex)}${rowIndex}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`

const createWorksheetXml = (rows: Array<Record<string, unknown>>): string => {
  const headers = Object.keys(rows[0] ?? { 结果: '' })
  const headerRow = `<row r="1">${headers.map((header, index) => toInlineStringCell(1, index, header)).join('')}</row>`
  const bodyRows = rows.map((row, rowIndex) => {
    const excelRowIndex = rowIndex + 2
    return `<row r="${excelRowIndex}">${headers.map((header, index) => toInlineStringCell(excelRowIndex, index, row[header])).join('')}</row>`
  })
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:${columnName(Math.max(headers.length - 1, 0))}${Math.max(rows.length + 1, 1)}"/>`,
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>',
    '<sheetFormatPr defaultRowHeight="18"/>',
    `<sheetData>${headerRow}${bodyRows.join('')}</sheetData>`,
    '</worksheet>',
  ].join('')
}

const workbookFiles = (rows: Array<Record<string, unknown>>): Array<{ path: string; content: string }> => [
  {
    path: '[Content_Types].xml',
    content: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
      '</Types>',
    ].join(''),
  },
  {
    path: '_rels/.rels',
    content: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
      '</Relationships>',
    ].join(''),
  },
  {
    path: 'xl/workbook.xml',
    content: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      '<sheets><sheet name="广告数据" sheetId="1" r:id="rId1"/></sheets>',
      '</workbook>',
    ].join(''),
  },
  {
    path: 'xl/_rels/workbook.xml.rels',
    content: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '</Relationships>',
    ].join(''),
  },
  {
    path: 'xl/styles.xml',
    content: [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>',
      '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>',
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>',
      '</styleSheet>',
    ].join(''),
  },
  {
    path: 'xl/worksheets/sheet1.xml',
    content: createWorksheetXml(rows),
  },
]

const concatBytes = (parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)
  let offset = 0
  parts.forEach((part) => {
    output.set(part, offset)
    offset += part.length
  })
  return output
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return btoa(binary)
}

export const createXlsxBytes = (rows: Array<Record<string, unknown>>): Uint8Array => {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  workbookFiles(rows).forEach((file) => {
    const nameBytes = encoder.encode(file.path)
    const contentBytes = encoder.encode(file.content)
    const checksum = crc32(contentBytes)
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
    ])
    localParts.push(localHeader, nameBytes, contentBytes)

    const centralHeader = new Uint8Array([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(offset),
    ])
    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.length + nameBytes.length + contentBytes.length
  })

  const centralDirectory = concatBytes(centralParts)
  const endOfCentralDirectory = new Uint8Array([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(workbookFiles(rows).length),
    ...uint16(workbookFiles(rows).length),
    ...uint32(centralDirectory.length),
    ...uint32(offset),
    ...uint16(0),
  ])
  return concatBytes([...localParts, centralDirectory, endOfCentralDirectory])
}

export const createXlsxDataUrl = (rows: Array<Record<string, unknown>>): string =>
  `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${toBase64(createXlsxBytes(rows))}`

export const buildAdDownloadFileName = (source: string, timestamp: string): string =>
  `${source}_${timestamp.replaceAll(/[-: ]/g, '').replace('T', '_').slice(0, 15)}.xlsx`
