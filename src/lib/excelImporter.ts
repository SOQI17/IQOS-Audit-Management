import { AuditSectionConfig, AuditItemConfig, SavedAudit, AuditItemState } from '../types';

export interface MultiAuditImportResult {
  config: AuditSectionConfig[];
  audits: SavedAudit[];
  totalAuditsImported: number;
  totalSectionsCount: number;
  totalItemsCount: number;
  error: string | null;
}

// Helper to parse CSV lines respecting quotes
export function parseCSVToGrid(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  const sampleLine = lines[0];
  let delimiter = ',';
  if (sampleLine.includes(';') && sampleLine.split(';').length > sampleLine.split(',').length) delimiter = ';';
  if (sampleLine.includes('\t') && sampleLine.split('\t').length > sampleLine.split(',').length) delimiter = '\t';

  return lines.map(rowStr => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  });
}

/**
 * Parses a Multi-Audit Master Matrix CSV (like the user's Excel sheet).
 * Extracts BOTH the Checklist Matrix (sections, items, penalties) AND all past Audits.
 */
export function parseMasterMatrixCSV(csvText: string): MultiAuditImportResult {
  try {
    const grid = parseCSVToGrid(csvText);
    if (grid.length === 0) {
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'El archivo está vacío.' };
    }

    // 1. Locate column indices for Section, Penalty, Criterion
    let secCol = -1;
    let penCol = -1;
    let itemCol = -1;
    let headerRowIdx = -1;

    // Scan first 15 rows for column labels
    for (let r = 0; r < Math.min(15, grid.length); r++) {
      const row = grid[r];
      row.forEach((cell, c) => {
        const lower = cell.toLowerCase();
        if (lower.includes('criterio') || lower.includes('item') || lower.includes('ítem') || lower.includes('evaluar')) {
          itemCol = c;
          headerRowIdx = r;
        }
        if (lower.includes('resta') || lower.includes('penalidad') || lower.includes('peso') || lower.includes('puntos')) {
          penCol = c;
        }
        if (lower.includes('seccion') || lower.includes('sección') || lower.includes('categoria') || lower.includes('categoría') || lower.includes('area') || lower.includes('área')) {
          secCol = c;
        }
      });
      if (itemCol !== -1) break;
    }

    // Default fallbacks if header text not explicitly found
    if (itemCol === -1) itemCol = 2; // Default Col 2 (C)
    if (penCol === -1) penCol = 1;  // Default Col 1 (B)
    if (secCol === -1) secCol = 0;  // Default Col 0 (A)

    // 2. Identify Audit Columns (Columns after itemCol)
    // Find metadata rows: FECHA, HAB / HABITACION, Camarera, Supervisor
    interface AuditColInfo {
      colIdx: number;
      roomNumber: string;
      date: string;
      roomAttendant: string;
      supervisor: string;
      auditorName: string;
    }

    const auditCols: AuditColInfo[] = [];
    const maxCols = Math.max(...grid.map(r => r.length));

    for (let c = itemCol + 1; c < maxCols; c++) {
      let roomNumber = '';
      let dateStr = '';
      let roomAttendant = '';
      let supervisor = '';
      let hasMetadata = false;

      for (let r = 0; r < Math.min(10, grid.length); r++) {
        const rowText = (grid[r]?.[c] || '').trim();
        const rowLabel = (grid[r]?.[c - 1] || grid[r]?.[0] || grid[r]?.[1] || '').toLowerCase();
        const wholeRow = (grid[r] || []).join(' ').toLowerCase();

        if (rowLabel.includes('hab') || wholeRow.includes('hab')) {
          if (rowText && !isNaN(Number(rowText)) || rowText.length > 0) {
            if (!roomNumber && r > 0) roomNumber = rowText;
          }
        }
        if (rowLabel.includes('fecha') || wholeRow.includes('fecha')) {
          if (rowText) dateStr = rowText;
        }
        if (rowLabel.includes('camarera') || rowLabel.includes('attendant') || wholeRow.includes('camarera')) {
          if (rowText) roomAttendant = rowText;
        }
        if (rowLabel.includes('supervisor') || wholeRow.includes('supervisor')) {
          if (rowText) supervisor = rowText;
        }
        if (rowText.length > 0) hasMetadata = true;
      }

      // Check if this column has content down the sheet
      let hasDataRows = false;
      for (let r = Math.max(headerRowIdx + 1, 5); r < grid.length; r++) {
        if (grid[r]?.[c] && grid[r][c].trim() !== '') {
          hasDataRows = true;
          break;
        }
      }

      if (hasMetadata && hasDataRows) {
        auditCols.push({
          colIdx: c,
          roomNumber: roomNumber || `Hab ${auditCols.length + 101}`,
          date: dateStr || new Date().toISOString().split('T')[0],
          roomAttendant: roomAttendant || 'Encargado General',
          supervisor: supervisor || 'Supervisor General',
          auditorName: 'Importación Excel'
        });
      }
    }

    // 3. Extract Checklist Matrix (Sections & Items)
    const sectionMap = new Map<string, AuditItemConfig[]>();
    let currentSection = 'General';
    const itemsList: { id: string; sectionTitle: string; text: string; penalty: number; rowIdx: number }[] = [];

    const dataStartRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 5;

    for (let r = dataStartRow; r < grid.length; r++) {
      const row = grid[r];
      if (!row || row.length === 0) continue;

      const secVal = row[secCol]?.trim();
      const itemVal = row[itemCol]?.trim();
      const penVal = row[penCol]?.trim();

      // Check if summary row
      const lowerRow = row.join(' ').toLowerCase();
      if (lowerRow.includes('total puntos') || lowerRow.includes('resultado puntos') || lowerRow.includes('promedio')) {
        continue;
      }

      if (secVal && secVal !== currentSection && secVal.toUpperCase() === secVal && secVal.length > 2 && !itemVal) {
        currentSection = secVal;
      } else if (secVal && secVal !== currentSection && itemVal) {
        currentSection = secVal;
      }

      if (itemVal && itemVal.length > 1) {
        const rawPen = penVal ? parseInt(penVal.replace(/\D/g, ''), 10) : 1;
        const penalty = isNaN(rawPen) || rawPen < 0 ? 1 : rawPen;
        const itemId = `item_${r}_${cHash(itemVal)}`;

        if (!sectionMap.has(currentSection)) {
          sectionMap.set(currentSection, []);
        }

        const itemObj: AuditItemConfig = {
          id: itemId,
          text: itemVal,
          defaultPenalty: penalty
        };

        sectionMap.get(currentSection)!.push(itemObj);
        itemsList.push({ id: itemId, sectionTitle: currentSection, text: itemVal, penalty, rowIdx: r });
      }
    }

    if (itemsList.length === 0) {
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'No se encontraron ítems válidos en el archivo Excel/CSV.' };
    }

    // Build AuditSectionConfig array
    const config: AuditSectionConfig[] = Array.from(sectionMap.entries()).map(([title, items], idx) => ({
      id: `sec_${idx + 1}`,
      title,
      items
    }));

    // Calculate max score
    const maxScore = itemsList.reduce((acc, i) => acc + i.penalty, 0) || 50;

    // 4. Build SavedAudit objects for each audit column found
    const audits: SavedAudit[] = auditCols.map((ac, aIdx) => {
      const itemStates: Record<string, AuditItemState> = {};
      let totalPenaltyAccum = 0;

      itemsList.forEach(item => {
        const cellVal = (grid[item.rowIdx]?.[ac.colIdx] || '').trim();
        const lowerCell = cellVal.toLowerCase();

        let isCompliant: boolean | null = true;
        let observation = '';
        let penalty = item.penalty;

        if (!cellVal) {
          isCompliant = true; // Default compliant if blank
        } else if (lowerCell === '0' || lowerCell === 'cumple' || lowerCell === 'ok' || lowerCell === 'v') {
          isCompliant = true;
        } else if (lowerCell.startsWith('no cumple') || lowerCell.includes('falta') || lowerCell.includes('dañado') || lowerCell.includes('sucio') || lowerCell === '1' || lowerCell === 'x') {
          isCompliant = false;
          totalPenaltyAccum += penalty;
          observation = cellVal.replace(/^1\s*/, '').replace(/^no cumple\s*/i, '').trim() || cellVal;
        } else {
          // If custom observation text
          if (lowerCell.includes('cumple') && !lowerCell.includes('no cumple')) {
            isCompliant = true;
          } else {
            isCompliant = false;
            totalPenaltyAccum += penalty;
            observation = cellVal;
          }
        }

        itemStates[item.id] = {
          id: item.id,
          isCompliant,
          observation,
          photoBase64: null,
          penalty
        };
      });

      const finalScore = Math.max(0, maxScore - totalPenaltyAccum);

      return {
        id: `imported_audit_${Date.now()}_${aIdx}`,
        hotelName: 'Hotel Principal',
        roomNumber: ac.roomNumber,
        auditorName: ac.auditorName,
        roomAttendant: ac.roomAttendant,
        supervisor: ac.supervisor,
        date: ac.date,
        maxScore,
        finalScore,
        timestamp: Date.now() - (aIdx * 86400000), // space dates slightly if timestamp needed
        itemStates
      };
    });

    return {
      config,
      audits,
      totalAuditsImported: audits.length,
      totalSectionsCount: config.length,
      totalItemsCount: itemsList.length,
      error: null
    };
  } catch (err: any) {
    return {
      config: [], audits: [], totalAuditsImported: 0,
      totalSectionsCount: 0, totalItemsCount: 0,
      error: `Error al procesar la matriz: ${err?.message || 'Formato desconocido'}`
    };
  }
}

function cHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
