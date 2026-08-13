// src/lib/chariow.ts

import { useEffect } from 'react';
import { CHARIOW_PUBLIC_KEY, CHARIOW_DOMAIN, CHARIOW_MODE } from '../config/chariowConfig';

/**
 * Dynamically load the Chariow widget script only once.
 */
export const useChariowScript = () => {
  useEffect(() => {
    if (document.getElementById('chariow-widget-script')) return;
    const script = document.createElement('script');
    script.id = 'chariow-widget-script';
    script.src = 'https://js.chariowcdn.com/v1/widget.min.js';
    script.async = true;
    document.head.appendChild(script);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://js.chariowcdn.com/v1/widget.min.css';
    document.head.appendChild(link);
    return () => {
      // cleanup not strictly necessary for a singleton script
    };
  }, []);
};

/**
 * Initialise a Chariow widget inside a container element.
 * containerId must refer to a div that already exists in the DOM.
 */
export const initChariowWidget = (productId: string, containerId: string) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Chariow container ${containerId} not found`);
    return;
  }
  container.setAttribute('data-product-id', productId);
  container.setAttribute('data-store-domain', CHARIOW_DOMAIN);
  container.setAttribute('data-style', 'tap');
  container.setAttribute('data-border-style', 'rounded');
  container.setAttribute('data-cta-width', 'xs');
  container.setAttribute('data-background-color', '#FFFFFF');
  container.setAttribute('data-cta-animation', 'none');
  container.setAttribute('data-locale', 'fr');
  container.setAttribute('data-primary-color', '#0047AB');
  // The external script will automatically transform the div into a widget.
};
