// src/config/chariowConfig.ts

export const CHARIOW_PUBLIC_KEY = process.env.REACT_APP_CHARIOW_PUBLIC_KEY || '';
export const CHARIOW_DOMAIN = process.env.REACT_APP_CHARIOW_DOMAIN || 'avjgomms.mychariow.shop';
export const CHARIOW_MODE = process.env.REACT_APP_CHARIOW_MODE || 'test'; // 'test' or 'production'

// Mapping des IDs de produits Chariow configurables par variables d'environnement
export const CHARIOW_PRODUCT_IDS: Record<string, string> = {
  monthly: process.env.REACT_APP_CHARIOW_PRODUCT_MONTHLY || 'prd_612sq612',
  quarterly: process.env.REACT_APP_CHARIOW_PRODUCT_QUARTERLY || 'prd_quarterly',
  annual: process.env.REACT_APP_CHARIOW_PRODUCT_ANNUAL || 'prd_annual',
};

