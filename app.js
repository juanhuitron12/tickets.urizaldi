/* ============================================================================
   CONFIG — Datos del despacho.
   Edita libremente estos valores; se guardan en tu navegador (localStorage)
   y se reflejan tanto en el formulario como en el pie del comprobante.
   ============================================================================ */
const CONFIG = {
  nombreComercial:  "Urizaldi",
  profesionista:    "Lic. Cynthia A. Uribe Zaldívar",
  cedula:           "9880110",
  telefono:         "",              // EDITAR: teléfono de contacto
  whatsapp:         "",              // EDITAR: WhatsApp de contacto
  correo:           "",              // EDITAR: correo de contacto
  ciudad:           "",              // EDITAR: ciudad / plaza
  logo:             "logo.png",      // referencia informativa; la imagen real va embebida arriba
  moneda:           "MXN",
  agradecimiento:   "Gracias por su confianza."
};

/* ============================================================================
   ALMACENAMIENTO LOCAL — claves usadas
   ============================================================================ */
const LS_KEYS = {
  folioCounter: "urizaldi_comprobantes_folioCounter", // {year, seq}
  config:       "urizaldi_comprobantes_config"        // config editable del despacho
};

/* ============================================================================
   UTILIDADES
   ============================================================================ */
function pad4(n){ return String(n).padStart(4,'0'); }

function formatCurrencyMXN(value){
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  const formatted = n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `$${formatted} MXN`;
}

function formatFechaMX(isoDate){
  if(!isoDate) return null;
  const parts = isoDate.split('-');
  if(parts.length !== 3) return isoDate;
  const [y,m,d] = parts;
  return `${d}/${m}/${y}`;
}

function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function nowHHMM(){
  const d = new Date();
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('is-visible'), 2600);
}

/* ============================================================================
   FOLIO — lectura/escritura del consecutivo. Sólo avanza con una acción
   deliberada del usuario ("Generar nuevo"), nunca al cargar la página.
   ============================================================================ */
function readFolioCounter(){
  try{
    const raw = localStorage.getItem(LS_KEYS.folioCounter);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(typeof parsed.year === 'number' && typeof parsed.seq === 'number') return parsed;
    return null;
  }catch(e){ return null; }
}

function writeFolioCounter(counter){
  try{ localStorage.setItem(LS_KEYS.folioCounter, JSON.stringify(counter)); }catch(e){}
}

function peekNextFolio(){
  const year = new Date().getFullYear();
  const stored = readFolioCounter();
  let seq = 1;
  if(stored && stored.year === year) seq = stored.seq + 1;
  return `CP-${year}-${pad4(seq)}`;
}

function commitFolioAdvance(){
  // El folio que estaba mostrándose (p.ej. CP-2026-0001) es el que se acaba
  // de generar: lo marcamos como consumido en el contador, y devolvemos el
  // SIGUIENTE folio para que el formulario, ya limpio, quede listo con él.
  const year = new Date().getFullYear();
  const stored = readFolioCounter();
  let usedSeq = 1;
  if(stored && stored.year === year) usedSeq = stored.seq + 1;
  writeFolioCounter({ year, seq: usedSeq });
  return `CP-${year}-${pad4(usedSeq + 1)}`;
}

/* ============================================================================
   CONFIGURACIÓN DEL DESPACHO — persistencia
   ============================================================================ */
function loadConfigFromStorage(){
  try{
    const raw = localStorage.getItem(LS_KEYS.config);
    if(!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(CONFIG, saved);
  }catch(e){}
}

function saveConfigToStorage(){
  try{
    localStorage.setItem(LS_KEYS.config, JSON.stringify(CONFIG));
  }catch(e){}
}

function populateConfigFields(){
  el('cfgNombreComercial').value = CONFIG.nombreComercial || '';
  el('cfgProfesionista').value   = CONFIG.profesionista || '';
  el('cfgCedula').value          = CONFIG.cedula || '';
  el('cfgTelefono').value        = CONFIG.telefono || '';
  el('cfgWhatsapp').value        = CONFIG.whatsapp || '';
  el('cfgCorreo').value          = CONFIG.correo || '';
  el('cfgCiudad').value          = CONFIG.ciudad || '';
  el('cfgAgradecimiento').value  = CONFIG.agradecimiento || '';
}

function readConfigFieldsIntoConfig(){
  CONFIG.nombreComercial = el('cfgNombreComercial').value.trim();
  CONFIG.profesionista   = el('cfgProfesionista').value.trim();
  CONFIG.cedula          = el('cfgCedula').value.trim();
  CONFIG.telefono        = el('cfgTelefono').value.trim();
  CONFIG.whatsapp        = el('cfgWhatsapp').value.trim();
  CONFIG.correo          = el('cfgCorreo').value.trim();
  CONFIG.ciudad          = el('cfgCiudad').value.trim();
  CONFIG.agradecimiento  = el('cfgAgradecimiento').value.trim();
  saveConfigToStorage();
}

/* ============================================================================
   HELPERS DE DOM
   ============================================================================ */
function el(id){ return document.getElementById(id); }

function setEmpty(node, isEmpty){
  if(!node) return;
  if(isEmpty) node.setAttribute('data-empty','true');
  else node.removeAttribute('data-empty');
}

/* ============================================================================
   VALIDACIÓN
   ============================================================================ */
const REQUIRED_FIELDS = [
  { id:'cliente', wrap:'fieldCliente', label:'Nombre del cliente' },
  { id:'cantidad', wrap:'fieldCantidad', label:'Cantidad pagada' },
  { id:'fecha', wrap:'fieldFecha', label:'Fecha' },
  { id:'folio', wrap:'fieldFolio', label:'Folio' }
];

function resolvedConcepto(){
  const sel = el('concepto').value;
  if(sel === '__otro__') return el('conceptoOtro').value.trim();
  return sel;
}

function validateForm(){
  const errors = [];

  REQUIRED_FIELDS.forEach(f=>{
    const value = el(f.id).value.trim();
    const wrapEl = el(f.wrap);
    if(!value){
      errors.push(f.label);
      wrapEl.classList.add('has-error');
    } else {
      wrapEl.classList.remove('has-error');
    }
  });

  // Concepto (incluye el caso "Otro")
  const conceptoWrap = el('fieldConcepto');
  const conceptoOtroWrap = el('fieldConceptoOtro');
  const conceptoResuelto = resolvedConcepto();
  if(!conceptoResuelto){
    errors.push('Concepto');
    if(el('concepto').value === '__otro__') conceptoOtroWrap.classList.add('has-error');
    else conceptoWrap.classList.add('has-error');
  } else {
    conceptoWrap.classList.remove('has-error');
    conceptoOtroWrap.classList.remove('has-error');
  }

  // Cantidad debe ser numérica y mayor a 0
  const cantidadVal = parseFloat(el('cantidad').value);
  if(el('cantidad').value.trim() && (isNaN(cantidadVal) || cantidadVal <= 0)){
    if(!errors.includes('Cantidad pagada')) errors.push('Cantidad pagada');
    el('fieldCantidad').classList.add('has-error');
  }

  const banner = el('validationBanner');
  const list = el('validationList');
  if(errors.length){
    // quitar duplicados conservando orden
    const unique = [...new Set(errors)];
    list.textContent = unique.join(', ') + '.';
    banner.classList.add('is-visible');
    return false;
  } else {
    banner.classList.remove('is-visible');
    return true;
  }
}

/* ============================================================================
   RENDERIZADO DEL TICKET EN TIEMPO REAL
   ============================================================================ */
function renderTicket(){
  // Folio / fecha / hora
  el('outFolio').textContent = el('folio').value.trim() || '—';
  el('outFecha').textContent = formatFechaMX(el('fecha').value) || '—';
  const hora = el('hora').value.trim();
  el('outHora').textContent = hora || '—';
  setEmpty(el('outHoraRow'), !hora);

  // Cliente / teléfono
  el('outCliente').textContent = el('cliente').value.trim() || '—';
  const tel = el('telefono').value.trim();
  el('outTelefono').textContent = tel ? `Tel. ${tel}` : '';
  setEmpty(el('outTelefono'), !tel);

  // Concepto / detalle
  const concepto = resolvedConcepto();
  el('outConcepto').textContent = concepto || '—';
  const detalle = el('detalle').value.trim();
  el('outDetalle').textContent = detalle;
  setEmpty(el('outDetalleWrap'), !detalle);

  // Importe recibido
  const cantidad = el('cantidad').value;
  const importeFmt = formatCurrencyMXN(cantidad);
  el('outImporte').textContent = importeFmt || '$0.00 MXN';

  // Método / referencia
  el('outMetodo').textContent = el('metodo').value || '—';
  const referencia = el('referencia').value.trim();
  el('outReferencia').textContent = referencia;
  setEmpty(el('outReferenciaRow'), !referencia);

  // Importe acordado / saldo pendiente
  const acordadoRaw = el('importeAcordado').value;
  const acordadoFmt = formatCurrencyMXN(acordadoRaw);
  let saldoRaw = el('saldoPendiente').value;

  // Auto-sugerencia de saldo si hay acordado y el usuario no ha capturado saldo manualmente
  if(acordadoRaw && !saldoRaw && !el('saldoPendiente').dataset.touched){
    const acordadoNum = parseFloat(acordadoRaw);
    const pagadoNum = parseFloat(cantidad) || 0;
    if(!isNaN(acordadoNum)){
      const sugerido = Math.max(acordadoNum - pagadoNum, 0);
      el('saldoPendiente').value = sugerido.toFixed(2);
      saldoRaw = el('saldoPendiente').value;
    }
  }
  const saldoFmt = formatCurrencyMXN(saldoRaw);

  el('outAcordado').textContent = acordadoFmt || '';
  setEmpty(el('outAcordadoRow'), !acordadoFmt);
  el('outSaldo').textContent = saldoFmt || '';
  setEmpty(el('outSaldoRow'), !saldoFmt);
  setEmpty(el('outAcordadoBlock'), !acordadoFmt && !saldoFmt);

  // Observaciones
  const obs = el('observaciones').value.trim();
  el('outObservaciones').textContent = obs;
  setEmpty(el('outObsBlock'), !obs);

  // Agradecimiento (config)
  el('outAgradecimiento').textContent = CONFIG.agradecimiento || 'Gracias por su confianza.';

  // Contacto (config) — cada dato es opcional y se omite si está vacío
  const contactLines = [];
  if(CONFIG.profesionista) contactLines.push(`<b>${escapeHTML(CONFIG.profesionista)}</b>${CONFIG.cedula ? ' · Céd. Prof. ' + escapeHTML(CONFIG.cedula) : ''}`);
  const contactBits = [];
  if(CONFIG.telefono) contactBits.push(`Tel. ${escapeHTML(CONFIG.telefono)}`);
  if(CONFIG.whatsapp) contactBits.push(`WhatsApp ${escapeHTML(CONFIG.whatsapp)}`);
  if(contactBits.length) contactLines.push(contactBits.join(' · '));
  const contactBits2 = [];
  if(CONFIG.correo) contactBits2.push(escapeHTML(CONFIG.correo));
  if(CONFIG.ciudad) contactBits2.push(escapeHTML(CONFIG.ciudad));
  if(contactBits2.length) contactLines.push(contactBits2.join(' · '));
  el('outContacto').innerHTML = contactLines.map(l=>`<div>${l}</div>`).join('');
  setEmpty(el('outContacto'), contactLines.length === 0);

  // Sello PAGADO
  el('ticketStamp').style.display = el('sellosPagado').checked ? 'block' : 'none';
}

/* ============================================================================
   COMPORTAMIENTO DE CAMPOS CONDICIONALES
   ============================================================================ */
function setupConditionalFields(){
  el('concepto').addEventListener('change', ()=>{
    const isOtro = el('concepto').value === '__otro__';
    el('fieldConceptoOtro').style.display = isOtro ? 'block' : 'none';
    if(isOtro) el('conceptoOtro').focus();
    renderTicket();
  });

  const refPlaceholders = {
    'Efectivo': 'Referencia (opcional)',
    'Transferencia': 'Número de operación',
    'Depósito': 'Número de operación',
    'Tarjeta': 'Últimos 4 dígitos',
    'Otro': 'Referencia'
  };
  el('metodo').addEventListener('change', ()=>{
    const m = el('metodo').value;
    el('referencia').placeholder = refPlaceholders[m] || 'Referencia';
    renderTicket();
  });

  el('saldoPendiente').addEventListener('input', ()=>{
    el('saldoPendiente').dataset.touched = 'true';
  });
  el('importeAcordado').addEventListener('input', ()=>{
    // si el usuario cambia el acordado, permitir que se vuelva a sugerir el saldo
    if(!el('saldoPendiente').value) delete el('saldoPendiente').dataset.touched;
  });
}

/* ============================================================================
   PESTAÑAS (móvil)
   ============================================================================ */
function setupTabs(){
  const tabForm = el('tabFormBtn');
  const tabPreview = el('tabPreviewBtn');
  const panelForm = el('panelForm');
  const panelPreview = el('panelPreview');

  tabForm.addEventListener('click', ()=>{
    tabForm.classList.add('is-active'); tabForm.setAttribute('aria-selected','true');
    tabPreview.classList.remove('is-active'); tabPreview.setAttribute('aria-selected','false');
    panelForm.classList.add('is-active');
    panelPreview.classList.remove('is-active');
  });
  tabPreview.addEventListener('click', ()=>{
    tabPreview.classList.add('is-active'); tabPreview.setAttribute('aria-selected','true');
    tabForm.classList.remove('is-active'); tabForm.setAttribute('aria-selected','false');
    panelPreview.classList.add('is-active');
    panelForm.classList.remove('is-active');
  });
}

/* ============================================================================
   ACCIONES PRINCIPALES
   ============================================================================ */
function resetFormForNewTicket(nextFolio){
  el('ticketForm').reset();
  el('folio').value = nextFolio;
  el('fecha').value = todayISO();
  el('hora').value = nowHHMM();
  el('fieldConceptoOtro').style.display = 'none';
  el('sellosPagado').checked = false;
  delete el('saldoPendiente').dataset.touched;
  document.querySelectorAll('.field.has-error').forEach(n=>n.classList.remove('has-error'));
  el('validationBanner').classList.remove('is-visible');
  el('referencia').placeholder = 'Número de operación';
  renderTicket();
}

function handleGenerarNuevo(){
  if(!validateForm()){
    showToast('Completa los campos obligatorios antes de continuar.');
    return;
  }
  const nextFolio = commitFolioAdvance();
  showToast('Comprobante registrado. Listo para uno nuevo.');
  resetFormForNewTicket(nextFolio);
}

function handleLimpiar(){
  resetFormForNewTicket(peekNextFolio());
  showToast('Formulario limpiado.');
}

/* ---- Exportación: aislar el ticket para captura nítida y sin sombra ---- */
async function captureTicketCanvas(){
  await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  const ticketEl = el('ticket');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bone-light').trim() || '#FBF9F5';
  return await html2canvas(ticketEl, {
    scale: 3,
    backgroundColor: bg,
    useCORS: true,
    logging: false
  });
}

function currentFolioForFilename(){
  const raw = el('folio').value.trim() || 'comprobante';
  return raw.replace(/[^a-zA-Z0-9\-_]/g,'_');
}

async function handleDescargarPNG(){
  if(!validateForm()){ showToast('Completa los campos obligatorios antes de descargar.'); return; }
  const btn = el('btnPNG');
  btn.disabled = true;
  try{
    const canvas = await captureTicketCanvas();
    canvas.toBlob((blob)=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${currentFolioForFilename()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 4000);
      showToast('Imagen PNG descargada.');
    }, 'image/png', 1.0);
  }catch(e){
    console.error(e);
    showToast('No se pudo generar la imagen. Intenta de nuevo.');
  }finally{
    btn.disabled = false;
  }
}

async function handleDescargarPDF(){
  if(!validateForm()){ showToast('Completa los campos obligatorios antes de descargar.'); return; }
  const btn = el('btnPDF');
  btn.disabled = true;
  try{
    const canvas = await captureTicketCanvas();
    const imgData = canvas.toDataURL('image/png', 1.0);
    const widthMM = 80;
    const heightMM = widthMM * (canvas.height / canvas.width);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMM, heightMM]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, widthMM, heightMM, undefined, 'FAST');
    pdf.save(`comprobante-${currentFolioForFilename()}.pdf`);
    showToast('PDF descargado.');
  }catch(e){
    console.error(e);
    showToast('No se pudo generar el PDF. Intenta de nuevo.');
  }finally{
    btn.disabled = false;
  }
}

function handleImprimir(){
  if(!validateForm()){ showToast('Completa los campos obligatorios antes de imprimir.'); return; }
  window.print();
}

/* ============================================================================
   LOGO — fallback si la imagen no carga
   ============================================================================ */
function setupLogoFallback(){
  const img = el('ticketLogo');
  img.addEventListener('error', ()=>{
    img.style.display = 'none';
    el('ticketLogoFallback').style.display = 'block';
  });
}

/* ============================================================================
   INICIALIZACIÓN
   ============================================================================ */
function init(){
  loadConfigFromStorage();
  populateConfigFields();
  setupLogoFallback();
  setupTabs();
  setupConditionalFields();

  // Config: guardar en vivo
  ['cfgNombreComercial','cfgProfesionista','cfgCedula','cfgTelefono','cfgWhatsapp','cfgCorreo','cfgCiudad','cfgAgradecimiento']
    .forEach(id=> el(id).addEventListener('input', ()=>{ readConfigFieldsIntoConfig(); renderTicket(); }));

  // Folio inicial (NO incrementa el consecutivo, sólo lo muestra)
  el('folio').value = peekNextFolio();
  el('fecha').value = todayISO();
  el('hora').value = nowHHMM();

  // Actualización en tiempo real: cualquier input/change del formulario
  el('ticketForm').addEventListener('input', renderTicket);
  el('ticketForm').addEventListener('change', renderTicket);
  el('sellosPagado').addEventListener('change', renderTicket);

  // Botones
  el('btnGenerarNuevo').addEventListener('click', handleGenerarNuevo);
  el('btnLimpiar').addEventListener('click', handleLimpiar);
  el('btnPNG').addEventListener('click', handleDescargarPNG);
  el('btnPDF').addEventListener('click', handleDescargarPDF);
  el('btnImprimir').addEventListener('click', handleImprimir);

  renderTicket();
}

document.addEventListener('DOMContentLoaded', init);
