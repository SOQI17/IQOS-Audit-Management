import { AuditSectionConfig } from './types';

export const defaultSections: AuditSectionConfig[] = [
  {
    id: 's1',
    title: 'Área de Descanso',
    items: [
      { id: 'i1', text: 'Estado y tensión de sábanas/almohadas', defaultPenalty: 2 },
      { id: 'i2', text: 'Pulcritud e inspección bajo la cama', defaultPenalty: 3 },
      { id: 'i3', text: 'Respaldo y cabecera sin polvo ni daños', defaultPenalty: 1 },
    ],
  },
  {
    id: 's2',
    title: 'Minibar y Estación de Café',
    items: [
      { id: 'i4', text: 'Inventario completo', defaultPenalty: 2 },
      { id: 'i5', text: 'Fechas de caducidad vigentes', defaultPenalty: 5 },
      { id: 'i6', text: 'Limpieza interna del minibar', defaultPenalty: 2 },
      { id: 'i7', text: 'Estado de tazas y cristalería', defaultPenalty: 2 },
    ],
  },
  {
    id: 's3',
    title: 'Baño y Amenidades',
    items: [
      { id: 'i8', text: 'Higiene de grifería y mamparas', defaultPenalty: 4 },
      { id: 'i9', text: 'Sellos de desinfección en inodoro', defaultPenalty: 5 },
      { id: 'i10', text: 'Estado y conteo de lencería/toallas', defaultPenalty: 2 },
      { id: 'i11', text: 'Kit de amenidades completo', defaultPenalty: 1 },
    ],
  },
  {
    id: 's4',
    title: 'Clóset y Seguridad',
    items: [
      { id: 'i12', text: 'Funcionamiento de la caja fuerte', defaultPenalty: 5 },
      { id: 'i13', text: 'Planchador y plancha limpios', defaultPenalty: 2 },
      { id: 'i14', text: 'Ganchos estandarizados y completos', defaultPenalty: 1 },
      { id: 'i15', text: 'Presencia de batas y zapatillas', defaultPenalty: 2 },
    ],
  },
  {
    id: 's5',
    title: 'Estructura, Clima e Iluminación',
    items: [
      { id: 'i16', text: 'Funcionamiento de aire acondicionado/termostato', defaultPenalty: 4 },
      { id: 'i17', text: 'Pulcritud y estado de cortinas blackout', defaultPenalty: 3 },
      { id: 'i18', text: 'Estado de enchufes', defaultPenalty: 4 },
      { id: 'i19', text: 'Funcionamiento de luminarias', defaultPenalty: 2 },
    ],
  }
];
