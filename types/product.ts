export interface ProductInfo {
  id: string;
  version: number;
  codigo: string;
  nombre_producto: string;
  cantidad_paquetes_por_caja: number;
  peso_por_caja: number;
  peso_promedio_por_paquete: number;
  tipo_empaque: string;
  size_empaque: string;
  sala_origen: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ProductFormData = Omit<ProductInfo, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
