// Alta precisión para localizar una fuga; espera máxima de 10 s y una lectura
// de hasta 30 s para reducir consumo y evitar bloquear el formulario.
export const POSITION_OPTIONS = {enableHighAccuracy:true, timeout:10000, maximumAge:30000};
export function readPosition() {
 return new Promise((resolve,reject)=>{
  if (!navigator.geolocation) return reject(new Error('Este navegador no ofrece ubicación. Escribe una dirección.'));
  navigator.geolocation.getCurrentPosition(({coords,timestamp})=>resolve({latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,timestamp}),reject,POSITION_OPTIONS);
 });
}
export function locationError(error) {
 return ({1:'Permiso denegado. Escribe una dirección. Para habilitarlo, abre los permisos del sitio desde el icono junto a la dirección del navegador, permite Ubicación y vuelve a intentarlo.',2:'Ubicación no disponible: no se pudo obtener señal. Escribe una dirección o reintenta.',3:'Se agotó el tiempo de espera de ubicación. Escribe una dirección o reintenta.'})[error.code] || error.message || 'No se pudo obtener la ubicación.';
}
export async function permissionState() {
 try {return await navigator.permissions.query({name:'geolocation'});} catch {return null;}
}
