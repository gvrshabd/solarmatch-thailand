/** Review assets are never part of public/ or a normal production build. */
export function stagingDesignAsset(pathname:string){
 if(!pathname.startsWith('/design-review/'))return false;
 // Cloudflare Assets canonicalizes .html to extensionless URLs before serving.
 if(/^\/design-review\/(?:estimate-(?:en|th)(?:\.html)?|open-example\.js)$/.test(pathname))return true;
 return /^\/design-review\/(?:|index\.html|viewer\.(?:js|css)|catalog\.json|evidence\/(?:(?:hero|palms|installer)-source|pexels-license)\.png|images\/(?:viewport-)?(?:prototype|implementation)-[a-z0-9-]+-(?:en|th)-(?:390|1440)\.png|prototype\/(?:|index\.html|(?:app|review-locale)\.js|engine\.min\.js|app\.css|img\/[a-z0-9-]+\.jpg))$/.test(pathname);
}
export const reviewContentSecurityPolicy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; worker-src 'none'";
