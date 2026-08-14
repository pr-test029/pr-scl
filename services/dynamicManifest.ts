/**
 * Service pour mettre à jour dynamiquement le Web App Manifest,
 * le Favicon, l'Apple Touch Icon et le titre de la page selon l'école connectée.
 */

let currentBlobUrl: string | null = null;

export const updateDynamicAppManifest = (
  appName?: string | null,
  schoolName?: string | null,
  logoUrl?: string | null
): void => {
  if (typeof document === 'undefined') return;

  const displayName = (appName && appName.trim() !== '') 
    ? appName.trim() 
    : (schoolName && schoolName.trim() !== '' ? schoolName.trim() : 'PR-SGS');
  
  const fullTitle = `${displayName} - Gestion Scolaire`;
  const iconSrc = (logoUrl && logoUrl.trim() !== '') ? logoUrl : '/favicon.png';

  // 1. Mise à jour du Titre du Document
  document.title = fullTitle;

  // 2. Mise à jour du Meta Apple Title
  let appleTitleMeta = document.querySelector("meta[name='apple-mobile-web-app-title']") as HTMLMetaElement;
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement('meta');
    appleTitleMeta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(appleTitleMeta);
  }
  appleTitleMeta.content = displayName;

  // 3. Mise à jour du Favicon & Apple Touch Icon
  let favicon = document.querySelector("link[rel='icon'], link[rel='shortcut icon']") as HTMLLinkElement;
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = iconSrc;

  let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = iconSrc;

  // 4. Génération du Web App Manifest dynamique spécifique à l'école
  const manifestObj = {
    name: fullTitle,
    short_name: displayName,
    description: `Système de Gestion Scolaire Professionnel - ${displayName}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#3b82f6',
    icons: [
      {
        src: iconSrc,
        sizes: '192x192 512x512',
        type: iconSrc.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  try {
    const stringManifest = JSON.stringify(manifestObj);
    const blob = new Blob([stringManifest], { type: 'application/manifest+json' });
    const newBlobUrl = URL.createObjectURL(blob);

    let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }

    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
    }
    currentBlobUrl = newBlobUrl;
    manifestLink.href = newBlobUrl;

  } catch (err) {
    console.warn('[DynamicManifest] Failed to update dynamic manifest:', err);
  }
};
