import { AuditSectionConfig, AuditItemConfig, SavedAudit, AuditItemState } from '../types';

export interface MultiAuditImportResult {
  config: AuditSectionConfig[];
  audits: SavedAudit[];
  totalAuditsImported: number;
  totalSectionsCount: number;
  totalItemsCount: number;
  error: string | null;
}

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

    if (itemCol === -1) itemCol = 2; // Default Col 2 (C)
    if (penCol === -1) penCol = 1;  // Default Col 1 (B)
    if (secCol === -1) secCol = 0;  // Default Col 0 (A)

    // 2. Identify Checklist Items first
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

      const lowerRow = row.join(' ').toLowerCase();
      if (lowerRow.includes('total puntos') || lowerRow.includes('resultado puntos') || lowerRow.includes('promedio') || lowerRow.includes('medio cumplimiento')) {
        continue;
      }

      if (secVal && secVal !== currentSection && secVal.toUpperCase() === secVal && secVal.length > 2 && !itemVal) {
        currentSection = secVal;
      } else if (secVal && secVal !== currentSection && itemVal) {
        currentSection = secVal;
      }

      if (itemVal && itemVal.length > 1 && !itemVal.toLowerCase().includes('criterio')) {
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
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'No se encontraron ítems válidos en la matriz Excel.' };
    }

    const config: AuditSectionConfig[] = Array.from(sectionMap.entries()).map(([title, items], idx) => ({
      id: `sec_${idx + 1}`,
      title,
      items
    }));

    const maxScore = itemsList.reduce((acc, i) => acc + i.penalty, 0) || 50;

    // 3. Identify REAL Audit Columns
    // An audit column must have explicit room metadata or audit numbers in rows 0-6
    interface AuditColInfo {
      valColIdx: number;
      obsColIdx?: number;
      roomNumber: string;
      date: string;
      roomAttendant: string;
      supervisor: string;
      auditNumber: string;
    }

    const auditCols: AuditColInfo[] = [];
    const maxCols = Math.max(...grid.map(r => r.length));

    for (let c = itemCol + 1; c < maxCols; c++) {
      let roomNumber = '';
      let dateStr = '';
      let roomAttendant = '';
      let supervisor = '';
      let auditNumber = '';
      let isAuditHeader = false;

      for (let r = 0; r < Math.min(8, grid.length); r++) {
        const cell = (grid[r]?.[c] || '').trim();
        const lowerCell = cell.toLowerCase();

        // Check header row keywords
        if (cell && (cell.match(/^\d+$/) && r <= 3)) {
          auditNumber = cell;
        }
        if (lowerCell.includes('11 de julio') || lowerCell.includes('14 de julio') || lowerCell.includes('2026') || lowerCell.includes('2025') || (lowerCell.includes('julio') && !lowerCell.includes('16 al 31'))) {
          dateStr = cell;
          isAuditHeader = true;
        }
        if (/^\d{3,4}$/.test(cell) || lowerCell.startsWith('hab') || lowerCell.includes('1205') || lowerCell.includes('542')) {
          if (!cell.toLowerCase().includes('auditoria') && !cell.toLowerCase().includes('habitaciones')) {
            roomNumber = cell.replace(/^hab\.?\s*/i, '');
            isAuditHeader = true;
          }
        }
        if (lowerCell.includes('ticona') || lowerCell.includes('monteros') || lowerCell.includes('camarera') || (cell.length > 3 && r === 4)) {
          if (!cell.toLowerCase().includes('auditoria') && !cell.toLowerCase().includes('habitaciones')) {
            roomAttendant = cell;
            isAuditHeader = true;
          }
        }
        if (lowerCell.includes('jhonny') || lowerCell.includes('aru') || lowerCell.includes('supervisor') || (cell.length > 3 && r === 5)) {
          if (!cell.toLowerCase().includes('auditoria') && !cell.toLowerCase().includes('habitaciones')) {
            supervisor = cell;
            isAuditHeader = true;
          }
        }
      }

      // Check if column has non-empty evaluation rows below
      let dataCount = 0;
      itemsList.forEach(item => {
        const v = (grid[item.rowIdx]?.[c] || '').trim();
        if (v) dataCount++;
      });

      // Filter out sheet title merged cells like "AUDITORIA DE HABITACIONES" or "16 AL 31 DE JULIO"
      const colFirstCell = (grid[0]?.[c] || grid[1]?.[c] || '').toUpperCase();
      if (colFirstCell.includes('AUDITORÍA DE HABITACIONES') || colFirstCell.includes('16 AL 31 DE JULIO')) {
        continue;
      }

      if (isAuditHeader || dataCount >= 5) {
        // Look if the next column (c+1) contains observations for this audit
        let obsColIdx: number | undefined = undefined;
        if (c + 1 < maxCols) {
          let obsCount = 0;
          itemsList.forEach(item => {
            const vNext = (grid[item.rowIdx]?.[c + 1] || '').trim().toLowerCase();
            if (vNext.includes('cumple') || vNext.includes('no cumple') || vNext.includes('falta') || vNext.includes('sucio')) {
              obsCount++;
            }
          });
          if (obsCount > 3) {
            obsColIdx = c + 1;
          }
        }

        auditCols.push({
          valColIdx: c,
          obsColIdx,
          roomNumber: roomNumber || `Hab ${auditNumber || auditCols.length + 101}`,
          date: dateStr || new Date().toISOString().split('T')[0],
          roomAttendant: roomAttendant || 'Encargado General',
          supervisor: supervisor || 'Supervisor General',
          auditNumber: auditNumber || `${auditCols.length + 1}`
        });

        if (obsColIdx) {
          c++; // skip observation column in loop
        }
      }
    }

    // 4. Build SavedAudit records
    const audits: SavedAudit[] = auditCols.map((ac, aIdx) => {
      const itemStates: Record<string, AuditItemState> = {};
      let totalPenaltyAccum = 0;

      itemsList.forEach(item => {
        const valCell = (grid[item.rowIdx]?.[ac.valColIdx] || '').trim();
        const obsCell = ac.obsColIdx !== undefined ? (grid[item.rowIdx]?.[ac.obsColIdx] || '').trim() : '';

        const fullText = (valCell + ' ' + obsCell).trim();
        const lowerFull = fullText.toLowerCase();

        let isCompliant: boolean | null = true;
        let observation = '';
        let penalty = item.penalty;

        if (!fullText) {
          isCompliant = true;
        } else if (lowerFull === '0' || lowerFull === 'cumple' || lowerFull === 'ok' || lowerFull === 'v') {
          isCompliant = true;
        } else if (lowerFull.includes('no cumple') || lowerFull.includes('falta') || lowerFull.includes('dañado') || lowerFull.includes('sucio') || lowerFull === '1' || lowerFull === 'x') {
          isCompliant = false;
          totalPenaltyAccum += penalty;
          observation = obsCell || valCell.replace(/^[01]\s*/, '').trim() || 'No cumple con el criterio de evaluación';
        } else {
          if (lowerFull.includes('cumple') && !lowerFull.includes('no cumple')) {
            isCompliant = true;
            if (obsCell && !obsCell.toLowerCase().includes('cumple')) observation = obsCell;
          } else {
            isCompliant = false;
            totalPenaltyAccum += penalty;
            observation = fullText;
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
        id: `imported_audit_${Date.now()}_${aIdx}_${ac.roomNumber.replace(/\D/g, '')}`,
        hotelName: 'Hotel Principal',
        roomNumber: ac.roomNumber.startsWith('Hab') ? ac.roomNumber : `Hab. ${ac.roomNumber}`,
        auditorName: 'Importación Excel',
        roomAttendant: ac.roomAttendant,
        supervisor: ac.supervisor,
        date: ac.date,
        maxScore,
        finalScore,
        timestamp: Date.now() - (aIdx * 86400000),
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
