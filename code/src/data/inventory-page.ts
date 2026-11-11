// EXPORTS: ISkincareProduct, MOCK_PRODUCTS
export interface ISkincareProduct {
  id: string
  name: string
  brand?: string
  category: 'cleanser' | 'toner_lotion' | 'serum' | 'cream' | 'suncreen' | 'mask' | 'other'
  volume: string
  quantity: number
  openDate: string
  expiryDate: string
  note?: string
  status: 'normal' | 'expiring_soon' | 'expired' | 'used_up'
  source: 'mock' | 'user'
}

export const MOCK_PRODUCTS: ISkincareProduct[] = [
  {
    id: '1',
    name: '氨基酸洁面乳',
    brand: '芙丽芳丝',
    category: 'cleanser',
    volume: '100g',
    quantity: 70,
    openDate: '2024-01-15',
    expiryDate: '2025-06-01',
    note: '温和不刺激',
    status: 'normal',
    source: 'mock',
  },
  {
    id: '2',
    name: '保湿精华液',
    brand: '兰蔻',
    category: 'serum',
    volume: '30ml',
    quantity: 25,
    openDate: '2023-11-20',
    expiryDate: '2024-12-15',
    note: '小黑瓶肌底精华',
    status: 'expiring_soon',
    source: 'mock',
  },
  {
    id: '3',
    name: '清爽防晒霜',
    brand: '安热沙',
    category: 'suncreen',
    volume: '60ml',
    quantity: 100,
    openDate: '2024-03-01',
    expiryDate: '2026-03-01',
    note: 'SPF50+ PA++++',
    status: 'normal',
    source: 'mock',
  },
]