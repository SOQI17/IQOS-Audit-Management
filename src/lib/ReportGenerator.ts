import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { AppState, AuditItemState } from '../types';

export const generatePDF = (state: AppState) => {
  const doc = new jsPDF();
  const { audit, config } = state;
  
  // Calculate current score
  let totalPenalty = 0;
  Object.values(audit.itemStates as Record<string, AuditItemState>).forEach(item => {
    if (item.isCompliant === false) {
      totalPenalty += item.penalty;
    }
  });
  const finalScore = Math.max(0, audit.maxScore - totalPenalty);

  doc.setFontSize(20);
  doc.text('Reporte de Auditoría de Habitaciones', 14, 22);

  doc.setFontSize(12);
  doc.text(`Hotel: ${audit.hotelName}`, 14, 32);
  doc.text(`Habitación: ${audit.roomNumber}`, 14, 38);
  doc.text(`Auditor: ${audit.auditorName}`, 14, 44);
  
  let currentY = 50;
  if (audit.roomAttendant) {
    doc.text(`Encargado(a): ${audit.roomAttendant}`, 14, currentY);
    currentY += 6;
  }
  if (audit.supervisor) {
    doc.text(`Supervisor: ${audit.supervisor}`, 14, currentY);
    currentY += 6;
  }
  
  doc.text(`Fecha: ${audit.date}`, 14, currentY);
  currentY += 6;
  doc.text(`Puntaje Final: ${finalScore} / ${audit.maxScore}`, 14, currentY);

  let startY = currentY + 10;

  const tableBody: any[] = [];

  config.forEach(section => {
    tableBody.push([{ content: section.title, colSpan: 4, styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } }]);
    
    section.items.forEach(item => {
      const itemState = audit.itemStates[item.id];
      const status = itemState?.isCompliant === true ? 'Cumple' : (itemState?.isCompliant === false ? 'No Cumple' : 'N/A');
      const penalty = itemState?.isCompliant === false ? `-${itemState.penalty}` : '0';
      const obs = itemState?.observation || '-';
      
      tableBody.push([item.text, status, penalty, obs]);
    });
  });

  autoTable(doc, {
    startY,
    head: [['Ítem', 'Estado', 'Penalidad', 'Observación']],
    body: tableBody,
  });

  // Adding images is tricky in autoTable directly, so we append them at the end.
  let imageY = (doc as any).lastAutoTable.finalY + 15;
  let addedImage = false;

  config.forEach(section => {
    section.items.forEach(item => {
      const itemState = audit.itemStates[item.id];
      if (itemState?.isCompliant === false && itemState.photoBase64) {
        if (!addedImage) {
          doc.addPage();
          imageY = 20;
          doc.setFontSize(14);
          doc.text('Anexo Fotográfico de Fallas', 14, imageY);
          imageY += 10;
          addedImage = true;
        }

        if (imageY > 250) {
          doc.addPage();
          imageY = 20;
        }

        doc.setFontSize(10);
        doc.text(`${section.title} - ${item.text}`, 14, imageY);
        try {
          doc.addImage(itemState.photoBase64, 'JPEG', 14, imageY + 5, 80, 60);
          imageY += 75;
        } catch (e) {
          console.error("Error adding image to PDF", e);
          doc.text("(Error loading image)", 14, imageY + 10);
          imageY += 20;
        }
      }
    });
  });

  doc.save(`Auditoria_${audit.hotelName}_Hab_${audit.roomNumber}.pdf`);
};

export const generateWord = async (state: AppState) => {
  const { audit, config } = state;
  
  let totalPenalty = 0;
  Object.values(audit.itemStates as Record<string, AuditItemState>).forEach(item => {
    if (item.isCompliant === false) {
      totalPenalty += item.penalty;
    }
  });
  const finalScore = Math.max(0, audit.maxScore - totalPenalty);

  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ítem", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Estado", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Penalidad", bold: true })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Observación", bold: true })] })] }),
      ],
    }),
  ];

  config.forEach(section => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: section.title, bold: true })] })],
            columnSpan: 4,
            shading: { fill: "DCDCDC" }
          })
        ]
      })
    );

    section.items.forEach(item => {
      const itemState = audit.itemStates[item.id];
      const status = itemState?.isCompliant === true ? 'Cumple' : (itemState?.isCompliant === false ? 'No Cumple' : 'N/A');
      const penalty = itemState?.isCompliant === false ? `-${itemState.penalty}` : '0';
      const obs = itemState?.observation || '-';

      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(item.text)] }),
            new TableCell({ children: [new Paragraph(status)] }),
            new TableCell({ children: [new Paragraph(penalty)] }),
            new TableCell({ children: [new Paragraph(obs)] }),
          ],
        })
      );
    });
  });

  const photoParagraphs: any[] = [];
  
  config.forEach(section => {
    section.items.forEach(item => {
      const itemState = audit.itemStates[item.id];
      if (itemState?.isCompliant === false && itemState.photoBase64) {
        photoParagraphs.push(new Paragraph({ children: [new TextRun({ text: `${section.title} - ${item.text}`, bold: true })], spacing: { before: 200, after: 100 } }));
        
        try {
          // Extract base64 data
          const base64Data = itemState.photoBase64.split(',')[1];
          const image = new ImageRun({
            data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
            transformation: { width: 300, height: 225 },
            type: 'png'
          });
          photoParagraphs.push(new Paragraph({ children: [image] }));
        } catch (e) {
          console.error("Error formatting image for DOCX", e);
          photoParagraphs.push(new Paragraph("Error loading image for docx"));
        }
      }
    });
  });

  const docChildren: any[] = [
    new Paragraph({ text: "Reporte de Auditoría de Habitaciones", heading: "Heading1" }),
    new Paragraph({ text: `Hotel: ${audit.hotelName}` }),
    new Paragraph({ text: `Habitación: ${audit.roomNumber}` }),
    new Paragraph({ text: `Auditor: ${audit.auditorName}` })
  ];

  if (audit.roomAttendant) {
    docChildren.push(new Paragraph({ text: `Encargado(a): ${audit.roomAttendant}` }));
  }
  if (audit.supervisor) {
    docChildren.push(new Paragraph({ text: `Supervisor: ${audit.supervisor}` }));
  }

  docChildren.push(new Paragraph({ text: `Fecha: ${audit.date}` }));
  docChildren.push(new Paragraph({ children: [new TextRun({ text: `Puntaje Final: ${finalScore} / ${audit.maxScore}`, bold: true })], spacing: { after: 300 } }));
  docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rows }));

  if (photoParagraphs.length > 0) {
    docChildren.push(new Paragraph({ text: "Anexo Fotográfico de Fallas", heading: "Heading2", spacing: { before: 400 } }));
    docChildren.push(...photoParagraphs);
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Auditoria_${audit.hotelName}_Hab_${audit.roomNumber}.docx`);
};
