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
 * Master Matrix Excel Parser (Specific to "MATRIZ GENERAL - AUDITORÍA DE HABITACIONES")
 * - Col A (index 0): Section Title (CLOSET, CAFETERA, HIELERA, CAMA, VELADOR, ESCRITORIO, VENTANAS, CONDICIONES GENERALES, DORMITORIO, BAÑO)
 * - Col B (index 1): Weight / Penalty (0, 1, 5, 4, 3)
 * - Col C (index 2): Criterion text (CRITERIO A EVALUAR)
 * - Col D/E, F/G, H/I...: Audit pairs (Code column + Status/Obs column)
 */
export function parseMasterMatrixCSV(csvText: string): MultiAuditImportResult {
  try {
    const grid = parseCSVToGrid(csvText);
    if (grid.length === 0) {
      return { config: [], audits: [], totalAuditsImported: 0, totalSectionsCount: 0, totalItemsCount: 0, error: 'El archivo CSV está vacío.' };
    }

    // 1. Column layout detection
    let secCol = 0;
    let penCol = 1;
    let itemCol = 2;
    let headerRowIdx = 0;

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

    // 2. Extract Checklist Items & Sections
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

      // Skip summary / total rows
      if (
        wholeRowText.includes('total puntos') ||
        wholeRowText.includes('resultado puntos') ||
        wholeRowText.includes('medio cumplimiento') ||
        wholeRowText.includes('muestra global')
      ) {
        continue;
      }

      // Update current section
      if (secVal && secVal !== currentSection && (secVal === secVal.toUpperCase() || secVal.length > 2) && (!itemVal || itemVal.length < 3)) {
        currentSection = secVal;
      } else if (secVal && secVal !== currentSection && itemVal) {
        currentSection = secVal;
      }

      // Add item if text is valid
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

    // 3. Step through Audit Columns in Pairs (Starting at column itemCol + 1)
    // Pair 1: Col D (3) & Col E (4)
    // Pair 2: Col F (5) & Col G (6)
    // Pair 3: Col H (7) & Col I (8) ...
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

    for (let c = itemCol + 1; c < maxCols; c += 2) {
      let roomNumber = '';
      let dateStr = '';
      let roomAttendant = '';
      let supervisor = '';
      let auditNumber = '';

      // Check header metadata rows (rows 0 to 6) in column `c` and `c+1`
      for (let r = 0; r < Math.min(7, grid.length); r++) {
        const val1 = (grid[r]?.[c] || '').trim();
        const val2 = (grid[r]?.[c + 1] || '').trim();
        const valComb = (val1 + ' ' + val2).trim();
        const lowerComb = valComb.toLowerCase();

        // Audit Number
        if (!auditNumber && (val1.match(/^\d+$/) || val2.match(/^\d+$/))) {
          const numMatch = valComb.match(/\d+/);
          if (numMatch && r <= 2) auditNumber = numMatch[0];
        }

        // Date (FECHA)
        if (!dateStr && (lowerComb.includes('julio') || lowerComb.includes('agosto') || lowerComb.includes('septiembre') || lowerComb.includes('2026') || lowerComb.includes('2025'))) {
          if (!lowerComb.includes('16 al 31')) {
            dateStr = valComb.replace(/^fecha:?\s*/i, '');
          }
        }

        // Room Number (HAB)
        if (!roomNumber) {
          const numMatch = valComb.match(/\d{3,4}/);
          if (numMatch && !lowerComb.includes('julio') && !lowerComb.includes('2026') && !lowerComb.includes('2025')) {
            roomNumber = numMatch[0];
          } else if (val1.toLowerCase().startsWith('hab') || val2.toLowerCase().startsWith('hab')) {
            roomNumber = valComb.replace(/^hab\.?\s*/i, '');
          }
        }

        // Room Attendant (Camarera)
        if (!roomAttendant && (lowerComb.includes('ticona') || lowerComb.includes('monteros') || lowerComb.includes('christopher') || lowerComb.includes('norma') || lowerComb.includes('camarera'))) {
          if (!lowerComb.includes('auditoria')) {
            roomAttendant = valComb.replace(/^camarera:?\s*/i, '');
          }
        }

        // Supervisor
        if (!supervisor && (lowerComb.includes('jhonny') || lowerComb.includes('aru') || lowerComb.includes('supervisor'))) {
          if (!lowerComb.includes('auditoria')) {
            supervisor = valComb.replace(/^supervisor:?\s*/i, '');
          }
        }
      }

      // Check how many items are evaluated in this pair
      let evaluatedCount = 0;
      itemsList.forEach(item => {
        const v1 = (grid[item.rowIdx]?.[c] || '').trim();
        const v2 = (grid[item.rowIdx]?.[c + 1] || '').trim();
        if (v1 || v2) evaluatedCount++;
      });

      // If at least 1 item evaluated or header fields found, add audit pair
      if (evaluatedCount > 0 || roomNumber || auditNumber) {
        auditCols.push({
          codeColIdx: c,
          textColIdx: c + 1 < maxCols ? c + 1 : c,
          roomNumber: roomNumber || `${auditCols.length + 101}`,
          date: dateStr || new Date().toISOString().split('T')[0],
          roomAttendant: roomAttendant || 'Christopher Ticona',
          supervisor: supervisor || 'Jhonny Aru',
          auditNumber: auditNumber || `${auditCols.length + 1}`
        });
      }
    }

    // 4. Construct SavedAudit Objects
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

          if (valText && !valText.toLowerCase().startsWith('cumple')) {
            observation = valText;
          } else if (valCode && !['0', '1', '2', '3', '4', '5'].includes(valCode)) {
            observation = valCode;
          } else {
            observation = 'No cumple con el criterio de evaluación';
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
        id: `audit_exp_${aIdx}_${ac.roomNumber}_${cHash(ac.date)}`,
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
