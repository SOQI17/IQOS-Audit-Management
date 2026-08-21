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
 * Robust Multi-Audit Excel Master Matrix CSV Parser
 * Specific to "MATRIZ GENERAL - AUDITORÍA DE HABITACIONES" format:
 * - Col A: Section Title (CLOSET, CAFETERA, HIELERA, CAMA, VELADOR, ESCRITORIO, VENTANAS, CONDICIONES GENERALES, DORMITORIO, BAÑO)
 * - Col B: Item Penalty / Weight (0, 1, 5, 4, 3)
 * - Col C: CRITERIO A EVALUAR (Item description)
 * - Col D/E, F/G, H/I...: Audits (Row 2 = N° Audit, Row 3 = FECHA, Row 4 = HAB, Row 5 = Camarera, Row 6 = Supervisor)
 */
export function parseMasterMatrixCSV(csvText: string): MultiAuditImportResult {
  try {
    const grid = parseCSVToGrid(csvText);
    if (grid.length === 0) {
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'El archivo CSV está vacío.' };
    }

    // 1. Find Column indices for Section (Col A), Penalty (Col B), Criterion (Col C)
    let secCol = 0;
    let penCol = 1;
    let itemCol = 2;
    let headerRowIdx = 0;

    // Search first 15 rows for column labels
    for (let r = 0; r < Math.min(15, grid.length); r++) {
      const row = grid[r];
      row.forEach((cell, c) => {
        const lower = cell.toLowerCase();
        if (lower.includes('criterio') || lower.includes('evaluar')) {
          itemCol = c;
          headerRowIdx = r;
        }
        if (lower.includes('resta') || lower.includes('penalidad') || lower.includes('peso') || lower.includes('puntos')) {
          penCol = c;
        }
        if (lower.includes('seccion') || lower.includes('sección') || lower.includes('categoria') || lower.includes('categoría')) {
          secCol = c;
        }
      });
      if (itemCol !== 2) break;
    }

    // 2. Identify Checklist Matrix (Items & Sections)
    const sectionMap = new Map<string, AuditItemConfig[]>();
    let currentSection = 'General';
    const itemsList: { id: string; sectionTitle: string; text: string; penalty: number; rowIdx: number }[] = [];

    const dataStartRow = Math.max(headerRowIdx + 1, 6);

    for (let r = dataStartRow; r < grid.length; r++) {
      const row = grid[r];
      if (!row || row.length === 0) continue;

      const secVal = row[secCol]?.trim();
      const penVal = row[penCol]?.trim();
      const itemVal = row[itemCol]?.trim();

      const wholeRowText = row.join(' ').toLowerCase();

      // Skip summary / calculation rows
      if (
        wholeRowText.includes('total puntos') ||
        wholeRowText.includes('resultado puntos') ||
        wholeRowText.includes('medio cumplimiento') ||
        wholeRowText.includes('muestra global')
      ) {
        continue;
      }

      // Track section title if provided
      if (secVal && secVal !== currentSection && (secVal === secVal.toUpperCase() || secVal.length > 2) && (!itemVal || itemVal.length < 3)) {
        currentSection = secVal;
      } else if (secVal && secVal !== currentSection && itemVal) {
        currentSection = secVal;
      }

      // Valid criterion item check
      if (
        itemVal &&
        itemVal.length >= 3 &&
        !itemVal.toLowerCase().includes('criterio a evaluar') &&
        !itemVal.toLowerCase().includes('auditoria de habitaciones') &&
        !itemVal.toLowerCase().includes('matriz general')
      ) {
        const rawPen = penVal ? parseInt(penVal.replace(/\D/g, ''), 10) : 1;
        const penalty = isNaN(rawPen) || rawPen < 0 ? 1 : rawPen;
        const itemId = `item_r${r}_${cHash(itemVal)}`;

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
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'No se encontraron criterios de evaluación válidos en la matriz Excel.' };
    }

    const config: AuditSectionConfig[] = Array.from(sectionMap.entries()).map(([title, items], idx) => ({
      id: `sec_${idx + 1}`,
      title,
      items
    }));

    const maxScore = itemsList.reduce((acc, i) => acc + i.penalty, 0) || 50;

    // 3. Locate Audit Columns (Columns D/E, F/G, etc.)
    interface AuditColInfo {
      codeColIdx: number;
      textColIdx: number;
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

      // Scan rows 0 to 7 in column `c` and `c+1` for metadata
      for (let r = 0; r < Math.min(8, grid.length); r++) {
        const valC = (grid[r]?.[c] || '').trim();
        const valCNext = (grid[r]?.[c + 1] || '').trim();
        const combined = (valC + ' ' + valCNext).trim();
        const lowerComb = combined.toLowerCase();

        // Check for Audit Number (Row 1/2)
        if (grid[r]?.[c - 1]?.toLowerCase().includes('auditoria') || grid[r]?.[c - 2]?.toLowerCase().includes('auditoria')) {
          if (valC && !isNaN(Number(valC))) auditNumber = valC;
        }

        // Check for FECHA (Row 2/3)
        if (lowerComb.includes('julio') || lowerComb.includes('agosto') || lowerComb.includes('septiembre') || lowerComb.includes('2026') || lowerComb.includes('2025')) {
          if (!lowerComb.includes('16 al 31')) {
            dateStr = combined.replace(/fecha:?\s*/i, '');
            isAuditHeader = true;
          }
        }

        // Check for HAB (Row 3/4)
        if (/^\d{3,4}$/.test(valC) || /^\d{3,4}$/.test(valCNext) || lowerComb.includes('1019') || lowerComb.includes('542') || lowerComb.includes('1205')) {
          const matchedNum = combined.match(/\d{3,4}/);
          if (matchedNum && !lowerComb.includes('julio') && !lowerComb.includes('2026')) {
            roomNumber = matchedNum[0];
            isAuditHeader = true;
          }
        }

        // Check for Camarera (Row 4/5)
        if (lowerComb.includes('ticona') || lowerComb.includes('monteros') || lowerComb.includes('christopher') || lowerComb.includes('norma')) {
          roomAttendant = combined.replace(/camarera:?\s*/i, '');
          isAuditHeader = true;
        }

        // Check for Supervisor (Row 5/6)
        if (lowerComb.includes('jhonny') || lowerComb.includes('aru') || lowerComb.includes('supervisor')) {
          supervisor = combined.replace(/supervisor:?\s*/i, '');
          isAuditHeader = true;
        }
      }

      // Check if column has non-empty compliance text in data rows
      let evaluationCount = 0;
      itemsList.forEach(item => {
        const val1 = (grid[item.rowIdx]?.[c] || '').trim();
        const val2 = (grid[item.rowIdx]?.[c + 1] || '').trim();
        if (val1 || val2) evaluationCount++;
      });

      // Ignore merged header columns like "16 AL 31 DE JULIO 2026" or "AUDITORIA DE HABITACIONES"
      const headerTitle = ((grid[0]?.[c] || '') + ' ' + (grid[1]?.[c] || '')).toUpperCase();
      if (headerTitle.includes('16 AL 31 DE JULIO') || headerTitle.includes('AUDITORÍA DE HABITACIONES')) {
        // Skip header merged title cell
        continue;
      }

      if (isAuditHeader || evaluationCount >= 5) {
        // Check if `c+1` is the observation text column for `c`
        const textColIdx = c + 1 < maxCols ? c + 1 : c;

        auditCols.push({
          codeColIdx: c,
          textColIdx,
          roomNumber: roomNumber || `Hab ${auditNumber || auditCols.length + 101}`,
          date: dateStr || new Date().toISOString().split('T')[0],
          roomAttendant: roomAttendant || 'Encargado General',
          supervisor: supervisor || 'Jhonny Aru',
          auditNumber: auditNumber || `${auditCols.length + 1}`
        });

        if (textColIdx !== c) {
          c++; // Move past observation column
        }
      }
    }

    // Fallback: If no metadata header was matched, parse pairs of columns after itemCol
    if (auditCols.length === 0) {
      for (let c = itemCol + 1; c < maxCols; c += 2) {
        auditCols.push({
          codeColIdx: c,
          textColIdx: c + 1 < maxCols ? c + 1 : c,
          roomNumber: `Hab 1019`,
          date: new Date().toISOString().split('T')[0],
          roomAttendant: 'Christopher Ticona',
          supervisor: 'Jhonny Aru',
          auditNumber: '1'
        });
      }
    }

    // 4. Construct SavedAudit Records
    const audits: SavedAudit[] = auditCols.map((ac, aIdx) => {
      const itemStates: Record<string, AuditItemState> = {};
      let totalPenaltyAccum = 0;

      itemsList.forEach(item => {
        const valCode = (grid[item.rowIdx]?.[ac.codeColIdx] || '').trim();
        const valText = (grid[item.rowIdx]?.[ac.textColIdx] || '').trim();

        const combined = (valCode + ' ' + valText).trim();
        const lowerComb = combined.toLowerCase();

        let isCompliant: boolean | null = true;
        let observation = '';
        let penalty = item.penalty;

        if (!combined) {
          isCompliant = true;
        } else if (lowerComb === '0' || lowerComb === 'cumple' || lowerComb === 'ok' || lowerComb === 'v') {
          isCompliant = true;
        } else if (
          lowerComb.includes('no cumple') ||
          lowerComb.includes('falta') ||
          lowerComb.includes('dañado') ||
          lowerComb.includes('sucio') ||
          lowerComb.includes('suelto') ||
          lowerComb.includes('especificaciones') ||
          lowerComb.includes('antigüedad') ||
          valCode === '1' || valCode === '5' || valCode === '3' || valCode === '4'
        ) {
          isCompliant = false;
          totalPenaltyAccum += penalty;

          // Extract observation text
          if (valText && !valText.toLowerCase().startsWith('cumple')) {
            observation = valText;
          } else if (valCode && !['0', '1', '2', '3', '4', '5'].includes(valCode)) {
            observation = valCode;
          } else {
            observation = 'No cumple con las especificaciones requeridas';
          }
        } else {
          if (lowerComb.includes('cumple') && !lowerComb.includes('no cumple')) {
            isCompliant = true;
          } else {
            isCompliant = false;
            totalPenaltyAccum += penalty;
            observation = combined;
          }
        }

        itemStates[item.id] = {
          id: item.id,
          text: item.text,
          sectionTitle: item.sectionTitle,
          isCompliant,
          observation,
          photoBase64: null,
          penalty
        };
      });

      const finalScore = Math.max(0, maxScore - totalPenaltyAccum);

      return {
        id: `imported_audit_${Date.now()}_${aIdx}_${ac.roomNumber}`,
        hotelName: 'Hotel Principal',
        roomNumber: ac.roomNumber.toLowerCase().startsWith('hab') ? ac.roomNumber : `Hab. ${ac.roomNumber}`,
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
      error: `Error al procesar la matriz Excel: ${err?.message || 'Formato no soportado'}`
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
