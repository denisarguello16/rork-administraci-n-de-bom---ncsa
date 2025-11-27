export interface BOMRecord {
  id: string;
  version: number;
  codigo_sku: string;
  descripcion_sku: string;
  categoria_insumo: string;
  codigo_insumo: string;
  descripcion_insumo: string;
  cantidad_requerida: number;
  cantidad_piezas_por_caja: number;
  consumo_por_caja: number;
  unidad_medida: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type BOMFormData = Omit<BOMRecord, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
