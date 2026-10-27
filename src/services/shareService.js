export async function shareContent(data) {
 let supported = false;
 try {supported = typeof navigator.share === 'function' && (typeof navigator.canShare !== 'function' || navigator.canShare(data));} catch { /* Usar portapapeles si no valida. */ }
 if (supported) {
  try {await navigator.share(data);return 'Compartido.';}
  catch(error) {if(error.name==='AbortError')return 'Compartir cancelado.';}
 }
 if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible. Copia el texto de la vista previa manualmente.');
 try {await navigator.clipboard.writeText([data.title,data.text,data.url].filter(Boolean).join('\n'));}
 catch {throw new Error('No se pudo copiar. Selecciona el texto de la vista previa y cópialo manualmente.');}
 return 'Contenido copiado al portapapeles.';
}
