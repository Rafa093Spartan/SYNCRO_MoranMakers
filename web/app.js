/* SYNCRO — prototipo de demostración académica. Datos y permisos ficticios. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const state = { view:'home', role:'student', student:'ALUMNO-DEMO', data:null, selected:null, career:'', semester:'', q:'', officialQ:'', officialField:'all', teacher:'', officialCareer:'', officialMode:'table', historyVersion:'latest', historyData:null, uploadName:'', uploadBase64:'', checked:null, busy:false, draftName:'Mi horario', wish:[], alternatives:[], objective:'libres', saturday:false, theme:(()=>{try{return localStorage.getItem('syncro-theme')||'dark'}catch{return 'dark'}})(), sidebarCollapsed:false };
  const titles = {home:'RESUMEN',student:'MI PLANIFICADOR',official:'HORARIOS OFICIALES',admin:'ADMINISTRACIÓN',stats:'ESTADÍSTICAS PILOTO'};
  const mins = t => {let a=String(t||'').split(':').map(Number);return a[0]*60+a[1]};
  const overlap=(a,b)=>a.day===b.day&&mins(a.start)<mins(b.end)&&mins(b.start)<mins(a.end);
  const niceDate = s => s || 'Sin fecha';
  const p = (txt,type='info') => `<div class="alert ${type}"><span class="sym">${type==='good'?'✓':type==='warning'?'⚠':type==='bad'?'✕':'ⓘ'}</span><div>${txt}</div></div>`;
  const badge=(s,type='')=>`<span class="pill ${type}">${esc(s)}</span>`;
  function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),4000)}
  async function api(path,body){
    const r=await fetch('/api'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const out=await r.json();if(!r.ok)throw new Error(out.error||out.avisos?.map(x=>x.texto).join(' · ')||'Operación fallida');return out;
  }
  async function refresh(){
    state.data=await api('/bootstrap?student='+encodeURIComponent(state.student));
    const validIds=new Set(state.data.sections.map(x=>x.id));
    if(state.selected===null)state.selected=Array.isArray(state.data.saved)?state.data.saved.filter(id=>validIds.has(id)):[];
    else state.selected=state.selected.filter(id=>validIds.has(id));
    const careers=[...new Set(state.data.sections.map(x=>x.career))];
    if(!careers.includes(state.career))state.career=careers.find(c=>c.includes('Ingeniería'))||careers[0]||'';
    render();
  }
  function navigate(view){state.view=view;state.q='';state.officialQ='';state.checked=null;render();window.scrollTo({top:0,behavior:'instant'})}
  function render(){
    if(!state.data){$('#content').innerHTML='<div class="loading">Conectando con SYNCRO…</div>';return}
    document.documentElement.dataset.theme=state.theme;document.body.classList.toggle('sidebar-compact',state.sidebarCollapsed);
    $('#breadcrumb').textContent=titles[state.view];$('#role').value=state.role;
    const studentSel=$('#demo-student');if(studentSel){studentSel.value=state.student;studentSel.hidden=state.role!=='student'}
    const themeBtn=$('#theme-toggle');if(themeBtn)themeBtn.title=state.theme==='dark'?'Activar tema claro':'Activar tema oscuro';
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));
    const views={home,student,official,admin,stats};$('#content').innerHTML=views[state.view]();
    wirePage();
  }
  function head(k,title,detail,aside=''){
    return `<div class="head"><div><div class="eyebrow">${k}</div><h1>${title}</h1><p class="lead">${detail}</p></div>${aside}</div>`;
  }
  function home(){
    const d=state.data,v=d.version,n=d.sections.length,students=[...new Set(d.sections.map(x=>x.career))].length,pending=d.proposals.filter(x=>x.state==='pendiente').length;
    return `<div class="hero"><div class="eyebrow">TU UNIVERSIDAD, MEJOR ORGANIZADA</div><h1>Una sola versión de tus horarios. Más claridad para todos.</h1><p class="lead">Conecta la validación administrativa con la planeación del semestre. Detecta cruces, revisa materias y evita consultar archivos desactualizados.</p><div class="actions"><button class="btn primary" data-nav="student">Probar planificador →</button><button class="btn" data-nav="admin">Explorar administración</button></div></div>
    <div class="status-line">${badge('Entorno de demostración','warn')}${badge('Periodo '+(v?.period||'—'))}<span class="muted" style="font-size:12px">Última publicación ficticia: ${esc(niceDate(v?.published_at))}</span></div>
    <div class="cards"><div class="card"><span class="corner">▤</span><div class="metric">${n}</div><div class="label">Bloques académicos publicados</div><small>De ejemplo, en la versión interna ${v?.id||'—'}</small></div>
    <div class="card"><span class="corner">◫</span><div class="metric">${students}</div><div class="label">Carreras del conjunto de prueba</div><small>Ampliable por periodos y facultades</small></div>
    <div class="card"><span class="corner">⇧</span><div class="metric">${pending}</div><div class="label">Propuestas pendientes</div><small>No son información oficial universitaria</small></div></div>
    <div class="section-title"><h2>De un Excel a un horario confiable</h2><span>Flujo clave del proyecto</span></div>
    <div class="steps"><div class="step"><b>01</b><h3>Cargar Excel</h3><p>Jefatura registra una propuesta de horarios.</p></div><div class="step"><b>02</b><h3>Validar cruces</h3><p>El sistema identifica datos inválidos, docentes y aulas ocupadas.</p></div><div class="step"><b>03</b><h3>Aprobar</h3><p>Control Escolar acepta únicamente una propuesta válida.</p></div><div class="step"><b>04</b><h3>Consultar y planear</h3><p>El estudiante construye su borrador desde la última publicación.</p></div></div>
    <div class="section-title"><h2>Demostración sugerida</h2></div><div class="columns"><div class="module"><h3>⓵ Detectar un problema real</h3><p>Sube el archivo <strong>SYNCRO_ejemplo_con_errores.xlsx</strong>. El prototipo marcará los cruces y no permitirá convertirlo en una propuesta aprobable.</p><button class="btn small" data-nav="admin">Ir a carga de horarios</button></div><div class="module"><h3>⓶ Resolverlo y planificar</h3><p>Importa el Excel válido, publícalo desde el perfil de Control Escolar y demuestra el simulador estudiantil, con alertas en tiempo real.</p><button class="btn small" data-nav="student">Ver simulador</button></div></div>`;
  }
  function filteredRows(){
    return state.data.sections.filter(x=>x.career===state.career&&(!state.semester||String(x.semester)===String(state.semester))&&(!state.q||[x.subject,x.teacher,x.group_name,x.room].join(' ').toLocaleLowerCase().includes(state.q.toLocaleLowerCase())));
  }
  function clashesFor(row){
    const chosen=state.data.sections.filter(x=>state.selected.includes(x.id));
    let hard=[],soft=[];
    for(const c of chosen){
      if(c.subject.toLocaleLowerCase()===row.subject.toLocaleLowerCase())hard.push(`Ya agregaste otra sección de ${row.subject}.`);
      if(overlap(row,c))hard.push(`Cruce con ${c.subject} (${row.day}, ${row.start}–${row.end}).`);
      else if(row.day===c.day&&row.campus!==c.campus){
        let gap=null;
        if(mins(row.start)>=mins(c.end))gap=mins(row.start)-mins(c.end);
        else if(mins(c.start)>=mins(row.end))gap=mins(c.start)-mins(row.end);
        if(gap!==null&&gap<20)soft.push(`Solo ${gap} minutos para cambiar de ${c.campus} a ${row.campus}, entre ${c.subject} y ${row.subject}.`);
      }
    }
    return {hard,soft};
  }
  function currentAlerts(){
    const chosen=state.data.sections.filter(x=>state.selected.includes(x.id));let out=[];
    for(let i=0;i<chosen.length;i++)for(let j=i+1;j<chosen.length;j++){
      const a=chosen[i],b=chosen[j];
      if(overlap(a,b))out.push({type:'bad',text:`${a.subject} se cruza con ${b.subject}.`});
      else if(a.day===b.day&&a.campus!==b.campus){
        let gap=mins(a.start)>=mins(b.end)?mins(a.start)-mins(b.end):mins(b.start)>=mins(a.end)?mins(b.start)-mins(a.end):null;
        if(gap!==null&&gap<20)out.push({type:'warning',text:`Atención: ${gap} min de traslado entre ${a.subject} y ${b.subject} (distintos campus).`});
      }
    }
    return out;
  }
  function groupKey(r){return [r.career,r.semester,r.subject,r.group_name,r.teacher].map(x=>String(x).toLocaleLowerCase()).join('|')}
  function courses(){const groups=new Map();for(const r of state.data.sections){const key=groupKey(r);if(!groups.has(key))groups.set(key,{key,base:r,rows:[]});groups.get(key).rows.push(r)}return [...groups.values()]}
  function chosenRows(){return state.data.sections.filter(r=>state.selected.includes(r.id))}
  function chosenCourses(){return courses().filter(g=>g.rows.every(r=>state.selected.includes(r.id)))}
  function collision(group){
    const old=chosenRows().filter(r=>!group.rows.some(x=>x.id===r.id));const hard=[],soft=[];
    for(const a of group.rows)for(const b of old){
      if(a.career===b.career&&a.subject.toLocaleLowerCase()===b.subject.toLocaleLowerCase()&&groupKey(a)!==groupKey(b))hard.push('Ya seleccionaste otro grupo de '+a.subject+'.');
      if(overlap(a,b))hard.push('Cruce el '+a.day+': '+a.subject+' y '+b.subject+' ('+a.start+'–'+a.end+').');
      else if(a.day===b.day&&a.campus!==b.campus){
        let gap=mins(a.start)>=mins(b.end)?mins(a.start)-mins(b.end):mins(b.start)>=mins(a.end)?mins(b.start)-mins(a.end):null;
        if(gap!==null&&gap<20)soft.push('Traslado ajustado: '+gap+' min entre '+b.subject+' y '+a.subject+'.');
      }
    }
    return {hard:[...new Set(hard)],soft:[...new Set(soft)]};
  }
  function fmtTime(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
  function metrics(rows){
    const ds=[...new Set(rows.map(x=>x.day))],total=rows.reduce((sum,r)=>sum+mins(r.end)-mins(r.start),0);let gaps=0;
    for(const day of ds){const x=rows.filter(r=>r.day===day).sort((a,b)=>mins(a.start)-mins(b.start));for(let i=1;i<x.length;i++)gaps+=Math.max(0,mins(x[i].start)-mins(x[i-1].end))}
    return {days:ds.length,total,gaps};
  }
  function week(rows){
    const activeDays=state.saturday?days:days.slice(0,5);
    const start=7*60,end=Math.max(19*60,...rows.map(r=>mins(r.end))),px=1.03,height=(end-start)*px;
    const marks=Array.from({length:Math.ceil((end-start)/60)+1},(_,i)=>`<span class="time-mark" style="top:${i*60*px}px">${fmtTime(start+i*60)}</span>`).join('');
    const hour=`<div class="time-col" style="height:${height}px">${marks}</div>`;
    const blocks=activeDays.map(day=>`<div class="day-col" style="height:${height}px;background-size:100% ${60*px}px">${rows.filter(x=>x.day===day).map(r=>{
      const y=(mins(r.start)-start)*px,h=Math.max(30,(mins(r.end)-mins(r.start))*px-4),idx=[...new Set(courses().map(g=>g.base.subject))].indexOf(r.subject)%7;
      return `<button class="class-block color-${idx}" type="button" title="${esc(r.subject+' · '+r.teacher+' · '+r.room)}" style="top:${y+2}px;height:${h}px" data-detail="${r.id}"><strong>${esc(r.subject)}</strong><small>${esc(r.start)}–${esc(r.end)}</small><small>${esc(r.group_name)} · ${esc(r.room)}</small></button>`;
    }).join('')}</div>`).join('');
    return `<div class="timeline" role="region" aria-label="Horario semanal" tabindex="0"><div class="week" style="grid-template-columns:56px repeat(${activeDays.length},minmax(135px,1fr));min-width:${56+activeDays.length*135}px"><div class="wh">HORA</div>${activeDays.map(x=>`<div class="wh">${x.toUpperCase()}</div>`).join('')}${hour}${blocks}</div></div>`;
  }
  function student(){
    const d=state.data,all=courses(),catalog=all.filter(g=>g.base.career===state.career&&(!state.semester||String(g.base.semester)===state.semester)&&(!state.q||[g.base.subject,g.base.teacher,g.base.group_name].join(' ').toLocaleLowerCase().includes(state.q.toLocaleLowerCase())));
    const chosen=chosenRows(),selectedCourses=chosenCourses(),m=metrics(chosen),issues=currentAlerts();
    const careers=[...new Set(d.sections.map(x=>x.career))],semesters=[...new Set(d.sections.filter(x=>x.career===state.career).map(x=>x.semester))].sort((a,b)=>a-b);
    const uniqueSubjects=[...new Set(all.filter(x=>x.base.career===state.career).map(g=>g.base.subject))].sort();
    const catalogHTML=catalog.map(g=>{const r=g.base,added=g.rows.every(x=>state.selected.includes(x.id)),check=added?{hard:[],soft:[]}:collision(g);
      return `<article class="course-row ${added?'selected':''}"><div class="course-info"><div class="course-name">${esc(r.subject)}</div><div class="course-detail">Grupo ${esc(r.group_name)} · ${esc(r.teacher)}</div><div class="course-detail">${g.rows.map(x=>`${esc(x.day.slice(0,3))} ${esc(x.start)}–${esc(x.end)}`).join(' · ')}</div><div class="course-meta">${esc(r.campus)} · ${esc(r.room)} · Semestre ${r.semester}</div>${check.hard.length?'<span class="mini-tag bad">Se cruza con tu selección</span>':''}</div><button class="btn ${added?'ghost':'primary'} small" data-group="${esc(g.key)}" aria-label="${added?'Quitar':'Agregar'} ${esc(r.subject)}">${added?'✓ Agregada':'+ Agregar'}</button></article>`}).join('')||'<div class="empty">No se encontraron materias para estos filtros.</div>';
    const draftCards=(d.drafts||[]).map(x=>`<div class="draft-item"><div><strong>${esc(x.name)}</strong><small>${esc(x.saved_at)} · versión #${x.version_id} · ${x.ids.length} bloques</small>${x.vigente?'':'<span class="mini-tag warn">Desactualizado</span>'}</div><div class="actions"><button class="btn small" data-load-draft="${esc(x.name)}" ${!x.vigente?'disabled title="Corresponde a una versión anterior"':''}>Abrir</button><button class="btn small ghost" data-delete-draft="${esc(x.name)}" aria-label="Eliminar borrador">✕</button></div></div>`).join('');
    return `${head('MI ESPACIO ACADÉMICO','Diseña tu próximo semestre','Selecciona materias, comprueba conflictos en tiempo real y conserva varios borradores. No equivale a una inscripción.',badge('Periodo '+d.version.period,'green'))}
    <div class="metric-strip"><div class="stat-tile"><span>Asignaturas</span><strong>${selectedCourses.length}</strong><small>grupos seleccionados</small></div><div class="stat-tile"><span>Horas de clase</span><strong>${(m.total/60).toFixed(m.total%60?1:0)}</strong><small>semanales</small></div><div class="stat-tile"><span>Días de asistencia</span><strong>${m.days}</strong><small>de lunes a sábado</small></div><div class="stat-tile"><span>Horas libres</span><strong>${(m.gaps/60).toFixed(m.gaps%60?1:0)}</strong><small>entre clases</small></div></div>
    <div class="planner-layout"><div class="module catalog"><div class="module-top"><h3>Catálogo de asignaturas</h3><span class="muted">${catalog.length} grupos</span></div><div class="stack" style="gap:10px"><label class="field">Carrera<select id="career">${careers.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><div class="fields"><label class="field grow">Semestre<select id="semester"><option value="">Todos</option>${semesters.map(x=>`<option value="${x}">${x}º</option>`).join('')}</select></label><label class="field grow">Buscar<input id="subject-search" placeholder="Materia, docente o grupo" value="${esc(state.q)}"></label></div></div><div class="course-list">${catalogHTML}</div></div>
    <div class="module schedule-area"><div class="module-top"><div><h3>Horario semanal</h3><div class="muted" style="font-size:12px">Vista interactiva · ${esc(d.version.label)}</div></div><label class="toggle-label"><input type="checkbox" id="show-saturday" ${state.saturday?'checked':''}> Incluir sábado</label></div>
    ${chosen.length?week(chosen):`<div class="calendar-empty"><div class="empty-icon">▦</div><h3>Tu calendario está listo</h3><p>Agrega materias desde el catálogo para visualizar su distribución durante la semana.</p></div>`}
    ${issues.length?`<div class="issue-list">${issues.map(i=>p(esc(i.text),i.type)).join('')}</div>`:chosen.length?p('Tu selección no presenta cruces de horario.','good'):''}
    <div class="save-panel"><label class="field grow">Nombre del borrador<input id="draft-name" maxlength="32" value="${esc(state.draftName)}" placeholder="Ej. Plan A - sin viernes"></label><div class="actions"><button class="btn primary" data-action="save" ${!chosen.length?'disabled':''}>Guardar borrador</button><button class="btn" data-action="export" ${!chosen.length?'disabled':''}>↓ CSV</button><button class="btn" data-action="print" ${!chosen.length?'disabled':''}>⎙ PDF / Imprimir</button><button class="btn ghost" data-action="clear" ${!chosen.length?'disabled':''}>Limpiar</button></div></div>
    ${draftCards?`<div class="draft-list"><h3>Mis borradores guardados</h3>${draftCards}</div>`:''}<p class="modal-muted" style="margin-top:16px">Los traslados se señalan si hay menos de 20 minutos entre campus diferentes. Es una regla de demostración, no una estimación geográfica real.</p></div></div>
    <div class="module suggestions"><div class="module-top"><div><h3>✦ Generador de alternativas</h3><p>Marca las asignaturas que deseas cursar; SYNCRO buscará combinaciones válidas de grupos.</p></div>${badge('Sin inteligencia artificial','green')}</div><div class="wish-list">${uniqueSubjects.map(x=>`<label class="wish"><input type="checkbox" data-wish="${esc(x)}" ${state.wish.includes(x)?'checked':''}><span>${esc(x)}</span></label>`).join('')}</div><div class="fields" style="margin-top:15px"><label class="field">Optimizar por<select id="goal"><option value="libres">Menos horas libres</option><option value="dias">Menos días en campus</option><option value="temprano">Inicio más temprano</option></select></label><button class="btn primary" data-action="suggest" ${!state.wish.length?'disabled':''}>Generar opciones</button></div>
    ${state.alternatives.length?`<div class="suggest-grid">${state.alternatives.map((x,i)=>`<div class="suggest-card"><div class="module-top"><strong>Alternativa ${i+1}</strong>${badge(x.metricas.dias+' días','green')}</div><p>${fmtTime(x.metricas.minutos_clase)} h:min de clase · ${fmtTime(x.metricas.minutos_libres)} libres</p>${x.advertencias?.length?'<small class="warn-text">'+esc(x.advertencias.join(' · '))+'</small>':'<small>Sin advertencias de traslado</small>'}<button class="btn small primary" data-apply="${i}">Usar este horario</button></div>`).join('')}</div>`:state.suggestedEmpty?'<div class="alert warning">No existe una combinación sin cruces para las materias seleccionadas. Prueba otra selección.</div>':''}</div>`;
  }
  function official(){
    const d=state.data,source=state.historyData||{version:d.version,sections:d.sections},v=source.version;
    const careers=[...new Set(source.sections.map(r=>r.career))];
    const rows=source.sections.filter(r=>{
      const value=state.officialQ.toLocaleLowerCase(),src=state.officialField==='subject'?r.subject:state.officialField==='teacher'?r.teacher:state.officialField==='group'?r.group_name:[r.subject,r.teacher,r.group_name,r.career,r.room].join(' ');
      return src.toLocaleLowerCase().includes(value)&&(!state.officialCareer||r.career===state.officialCareer)&&(state.role!=='teacher'||!state.teacher||r.teacher===state.teacher);
    });
    const teachers=[...new Set(source.sections.map(x=>x.teacher))].sort();
    const table=`<div class="table-scroll"><table class="data-table"><thead><tr><th>Materia / carrera</th><th>Grupo</th><th>Docente</th><th>Día y hora</th><th>Salón / campus</th><th>Cupo teórico</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.subject)}</strong><small>${esc(r.career)} · ${r.semester}.º semestre</small></td><td>${esc(r.group_name)}</td><td>${esc(r.teacher)}</td><td>${esc(r.day)}<small>${esc(r.start)}–${esc(r.end)}</small></td><td>${esc(r.room)}<small>${esc(r.campus)}</small></td><td>${r.capacity}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No hay resultados para los filtros seleccionados.</td></tr>'}</tbody></table></div>`;
    return `${head('FUENTE CENTRALIZADA','Horarios publicados','Consulta por carrera, materia, docente y grupo. Puedes examinar versiones históricas del prototipo.',badge(state.historyData?'Versión histórica #'+v.id:'Versión vigente #'+v.id,state.historyData?'warn':'green'))}
    <div class="module"><div class="module-top"><div class="status-line">${badge('Periodo '+v.period)}<span class="muted">Actualización: ${esc(v.published_at)} · ${esc(v.label)}</span></div><div class="actions"><button class="btn small ${state.officialMode==='table'?'primary':''}" data-official-mode="table">☷ Tabla</button><button class="btn small ${state.officialMode==='calendar'?'primary':''}" data-official-mode="calendar">▦ Calendario</button></div></div>
    <div class="filter-grid"><label class="field grow">Buscar<input id="official-search" placeholder="Ej. Bases de Datos, 5A…" value="${esc(state.officialQ)}"></label><label class="field">Campo<select id="official-field"><option value="all">Todos</option><option value="subject">Materia</option><option value="teacher">Docente</option><option value="group">Grupo</option></select></label><label class="field">Carrera<select id="official-career"><option value="">Todas las carreras</option>${careers.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label><label class="field">Versión<select id="history-version"><option value="latest">Última publicación</option>${d.versions.map(x=>`<option value="${x.id}">#${x.id} · ${esc(x.period)}${x.id===d.version.id?' (actual)':''}</option>`).join('')}</select></label>${state.role==='teacher'?`<label class="field">Docente<select id="teacher-filter"><option value="">Todos</option>${teachers.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>`:''}</div>
    <div style="margin-top:20px">${state.officialMode==='table'?table:rows.length?week(rows):'<div class="empty">Sin bloques para mostrar.</div>'}</div><div class="module-foot"><span>${rows.length} de ${source.sections.length} bloques mostrados. Los cupos son ficticios, no disponibilidad real.</span><button class="btn small" data-action="official-export">↓ Exportar CSV</button></div></div>`;
  }
  function admin(){
    const d=state.data,admin=state.role==='admin',school=state.role==='school',allow=admin||school;
    const workflow=`<div class="steps"><div class="step"><b>1</b><h3>Adjuntar</h3><p>Importa un Excel siguiendo las columnas de la plantilla.</p></div><div class="step"><b>2</b><h3>Verificar</h3><p>Valida formato, traslapes de docentes, salones y grupos.</p></div><div class="step"><b>3</b><h3>Crear propuesta</h3><p>Los errores bloquean la importación; no afectan la versión vigente.</p></div><div class="step"><b>4</b><h3>Publicar</h3><p>Control Escolar cambia la versión consultable conservando historial.</p></div></div>`;
    const checked=state.checked;
    return `${head('MÓDULO ADMINISTRATIVO','Validación y publicación','Demuestra el flujo institucional: cargar una propuesta, detectar errores y autorizar una nueva versión sin sobrescribir la anterior.',badge(state.role==='school'?'Vista: Control Escolar':state.role==='admin'?'Vista: Jefatura':'Vista: solo consulta','warn'))}
    ${!allow?p('Cambia el selector «Vista de» a Jefatura de carrera o Control Escolar para probar el proceso administrativo. Son roles de interfaz simulados, no autenticación institucional.','warning'):''}
    ${workflow}<div class="columns" style="margin-top:19px"><div class="module"><h3>01 · Carga y revisión del archivo</h3><p>Seleccione un archivo de horarios con extensión .xlsx (hasta 3 MB y 500 filas).</p>
    <div class="upload-box"><div style="font-size:30px;color:var(--blue)">⇧</div><p><strong>Selecciona tu archivo Excel</strong></p><input id="upload-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ${!admin?'disabled':''} aria-label="Archivo Excel de horarios"><small>${esc(state.uploadName||'Ningún archivo seleccionado')}</small></div>
    <div class="actions" style="margin-top:15px"><button class="btn primary" id="validate-file" data-action="validate" ${!admin||!state.uploadBase64||state.busy?'disabled':''}>Validar archivo</button><button class="btn" data-action="import" ${!admin||!checked?.valido||state.busy?'disabled':''}>Crear propuesta</button></div>
    <div class="actions" style="margin-top:11px"><a class="btn small ghost" href="/api/template">↓ Descargar plantilla vacía</a><a class="btn small ghost" href="/api/sample-errors">↓ Excel con errores</a><a class="btn small ghost" href="/api/sample-valid">↓ Excel válido</a><a class="btn small ghost" href="/api/sample-extended">↓ Excel ampliado · grupos alternativos</a></div>
    ${checked?`<div style="margin-top:19px">${checked.valido?p(`Archivo correcto: ${checked.filas} registros listos para crear propuesta.`, 'good'):p(`Se encontraron ${checked.total_errores} problemas. Corrige el archivo antes de continuar.`, 'bad')}
    ${checked.errores?.length?`<div class="mini-list">${checked.errores.slice(0,10).map(x=>`<div class="mini-item"><div><strong>Fila ${esc(x.fila)}</strong><small>${esc(x.problema)}</small></div>${badge('Corregir','bad')}</div>`).join('')}</div>`:''}</div>`:''}</div>
    <div class="module"><h3>02 · Revisión de propuestas</h3><p>En esta demostración, solo la vista de Control Escolar permite publicar una propuesta ya validada.</p>
    <div class="mini-list">${d.proposals.length?d.proposals.map(x=>`<div class="mini-item"><div><strong>Propuesta #${x.id}</strong><small>${esc(x.period)} · ${esc(x.summary)} · ${esc(x.created_at)}</small><div style="margin-top:7px">${badge(x.state==='pendiente'?'Pendiente de aprobación':'Publicada',x.state==='pendiente'?'warn':'green')}</div></div>${x.state==='pendiente'?`<div class="actions"><button class="btn small primary" data-publish="${x.id}" ${!school||state.busy?'disabled':''}>Aprobar y publicar</button><button class="btn small ghost" data-cancel="${x.id}" ${!admin||state.busy?'disabled':''}>Cancelar</button></div>`:''}</div>`).join(''):'<div class="empty">Sin propuestas. Usa un Excel válido para crear una.</div>'}</div>
    ${p('La publicación se realiza únicamente desde una propuesta válida. Al publicar, los borradores del periodo anterior no se consideran vigentes automáticamente.','info')}</div></div>
    <div class="section-title"><h2>Historial de versiones</h2><span>Evita publicaciones contradictorias</span></div><div class="module"><div class="table-scroll"><table class="data-table"><thead><tr><th>Versión</th><th>Periodo</th><th>Publicación</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>${d.versions.map((v,i)=>`<tr><td>#${v.id}</td><td>${esc(v.period)}</td><td>${esc(v.published_at)}</td><td>${esc(v.label)}</td><td>${badge(i===0?'Consultable':'Histórica',i===0?'green':'')}</td></tr>`).join('')}</tbody></table></div><div class="actions" style="justify-content:flex-end;margin-top:15px"><button class="btn danger small" data-action="reset">Restablecer datos de demo</button></div></div><div class="section-title"><h2>Bitácora de acciones</h2><span>Eventos locales de demostración</span></div><div class="module"><div class="audit-list">${(d.audit||[]).map(x=>`<div class="audit-entry"><span class="audit-dot"></span><div><strong>${esc(x.event)}</strong><small>${esc(x.detail)}</small></div><time>${esc(x.at)}</time></div>`).join('')||'<p>Sin eventos registrados.</p>'}</div></div>`;
  }
  function stats(){
    const d=state.data,counts=Object.entries(d.stats).map(([id,n])=>({row:d.sections.find(x=>x.id===Number(id)),n})).filter(x=>x.row).sort((a,b)=>b.n-a.n),max=Math.max(1,...counts.map(x=>x.n));
    const byCareer={};for(const x of counts){byCareer[x.row.career]=(byCareer[x.row.career]||0)+x.n}
    const overall=counts.reduce((s,x)=>s+x.n,0);
    return `${head('INTELIGENCIA ACADÉMICA','Indicadores del piloto','Datos experimentales calculados a partir de los últimos borradores de perfiles de demostración. No representan solicitudes reales de inscripción.',badge('Estadísticas simuladas','warn'))}
    <div class="metric-strip"><div class="stat-tile"><span>Borradores activos</span><strong>${d.stats_drafts||0}</strong><small>por perfil y nombre</small></div><div class="stat-tile"><span>Asignaciones elegidas</span><strong>${overall}</strong><small>selecciones de bloques</small></div><div class="stat-tile"><span>Materias distintas</span><strong>${new Set(counts.map(x=>x.row.subject)).size}</strong><small>en borradores guardados</small></div><div class="stat-tile"><span>Versión analizada</span><strong>#${d.version.id}</strong><small>sin datos oficiales</small></div></div>
    <div class="columns"><div class="module"><div class="module-top"><h3>Materias más seleccionadas</h3>${badge('Demanda piloto')}</div>${counts.length?counts.slice(0,12).map(x=>`<div class="stat-row"><div><strong>${esc(x.row.subject)}</strong><div class="modal-muted">${esc(x.row.group_name)} · ${esc(x.row.career)}</div></div><div class="bar-bg"><div class="bar-fill" style="width:${x.n/max*100}%"></div></div><strong style="text-align:right">${x.n}</strong></div>`).join(''):'<div class="empty-state"><strong>Aún no hay actividad</strong>Guarda algún borrador desde el planificador para generar indicadores.</div>'}</div>
    <div class="module"><h3>Selecciones por carrera</h3><p>Distribución aproximada del conjunto ficticio, no una estimación de demanda institucional.</p>${Object.entries(byCareer).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="career-chart"><div class="module-top"><strong>${esc(k)}</strong><span>${v}</span></div><div class="bar-bg"><div class="bar-fill" style="width:${v/overall*100}%"></div></div></div>`).join('')||'<div class="empty">Los indicadores aparecerán cuando se guarden planes.</div>'}<div class="alert info" style="margin-top:20px">Para una decisión real sobre apertura de cupos harían falta datos representativos, autorización institucional y verificación de capacidad.</div></div></div>`;
  }
  function wirePage(){
    const career=$('#career');if(career)career.value=state.career;
    const semester=$('#semester');if(semester)semester.value=state.semester;
    const field=$('#official-field');if(field)field.value=state.officialField;
    const teacher=$('#teacher-filter');if(teacher)teacher.value=state.teacher;
    for(const [sel,val] of [['#official-career',state.officialCareer],['#history-version',state.historyVersion],['#goal',state.objective]]){const node=$(sel);if(node)node.value=val;}
  }
  document.addEventListener('click',async e=>{
    const nav=e.target.closest('[data-nav],[data-view]');if(nav){navigate(nav.dataset.nav||nav.dataset.view);return}
    const sel=e.target.closest('[data-select]');if(sel){
      const id=Number(sel.dataset.select),row=state.data.sections.find(x=>x.id===id);
      if(!row)return;
      if(state.selected.includes(id)){state.selected=state.selected.filter(x=>x!==id);render();return}
      const {hard,soft}=clashesFor(row);if(hard.length){toast('No se agregó: '+hard[0]);return}
      state.selected.push(id);render();if(soft.length)toast('Aviso de traslado: '+soft[0]);return;
    }
    const publish=e.target.closest('[data-publish]');if(publish){
      if(state.role!=='school')return toast('Cambia a la vista de Control Escolar.');
      if(!confirm('¿Publicar esta propuesta en el entorno de demostración? La versión consultable cambiará.'))return;
      try{state.busy=true;let result=await api('/publish',{id:Number(publish.dataset.publish)});state.selected=[];state.alternatives=[];state.historyData=null;state.historyVersion='latest';await refresh();toast(result.mensaje)}catch(err){toast(err.message)}finally{state.busy=false}return;
    }
    const gp=e.target.closest('[data-group]');if(gp){
      const g=courses().find(x=>x.key===gp.dataset.group);if(!g)return;
      const added=g.rows.every(x=>state.selected.includes(x.id));
      if(added){const rm=new Set(g.rows.map(x=>x.id));state.selected=state.selected.filter(id=>!rm.has(id));render();return}
      const check=collision(g);if(check.hard.length){toast('No se agregó: '+check.hard[0]);return}
      state.selected=[...state.selected,...g.rows.map(x=>x.id)];render();if(check.soft.length)toast(check.soft[0]);return;
    }
    const detail=e.target.closest('[data-detail]');if(detail){const r=state.data.sections.find(x=>x.id===Number(detail.dataset.detail));if(r)toast(`${r.subject} · Grupo ${r.group_name} · ${r.teacher} · ${r.room} · ${r.campus}`);return}
    const load=e.target.closest('[data-load-draft]');if(load){const d=state.data.drafts.find(x=>x.name===load.dataset.loadDraft);if(!d||!d.vigente)return toast('El borrador pertenece a una versión anterior.');state.selected=[...d.ids];state.draftName=d.name;render();toast('Borrador abierto: '+d.name);return}
    const del=e.target.closest('[data-delete-draft]');if(del){const name=del.dataset.deleteDraft;if(!confirm('¿Eliminar el borrador '+name+'?'))return;try{await api('/delete-plan',{student:state.student,name});if(state.draftName===name){state.selected=[];state.draftName='Mi horario'}await refresh();toast('Borrador eliminado.')}catch(err){toast(err.message)}return}
    const cancel=e.target.closest('[data-cancel]');if(cancel){if(state.role!=='admin')return toast('Usa vista de Jefatura para cancelar propuestas.');if(!confirm('¿Cancelar esta propuesta?'))return;try{await api('/cancel-proposal',{id:Number(cancel.dataset.cancel)});await refresh();toast('Propuesta cancelada.')}catch(err){toast(err.message)}return}
    const mode=e.target.closest('[data-official-mode]');if(mode){state.officialMode=mode.dataset.officialMode;render();return}
    const apply=e.target.closest('[data-apply]');if(apply){const a=state.alternatives[Number(apply.dataset.apply)];if(a){state.selected=[...a.ids];state.draftName='Alternativa '+(Number(apply.dataset.apply)+1);render();toast('Alternativa aplicada a tu calendario.')}return}
    const act=e.target.closest('[data-action]');if(!act)return;
    const a=act.dataset.action;
    try{
      if(a==='clear'){state.selected=[];render();toast('Se limpió la selección.');}
      if(a==='save'){state.draftName=($('#draft-name')?.value||'Mi horario').trim();const res=await api('/save-plan',{ids:state.selected,name:state.draftName,student:state.student});await refresh();toast(res.mensaje)}
      if(a==='print'){window.print();toast('Selecciona Guardar como PDF desde el cuadro de impresión.');}
      if(a==='export'||a==='official-export'){
        const ids=new Set(state.selected),cols=['materia','grupo','dia','inicio','fin','docente','salon','campus'],rows=a==='official-export'?(state.historyData?.sections||state.data.sections).filter(r=>(!state.officialCareer||r.career===state.officialCareer)&&(!state.officialQ||[r.subject,r.teacher,r.group_name,r.career,r.room].join(' ').toLocaleLowerCase().includes(state.officialQ.toLocaleLowerCase()))):state.data.sections.filter(x=>ids.has(x.id));
        const txt=[cols.join(','),...rows.map(r=>[r.subject,r.group_name,r.day,r.start,r.end,r.teacher,r.room,r.campus].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(','))].join('\r\n');
        const blob=new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=a==='official-export'?'SYNCRO_horarios_consulta.csv':'SYNCRO_mi_borrador.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Borrador CSV exportado.');
      }
      if(a==='suggest'){
        state.objective=$('#goal')?.value||state.objective;
        if(!state.wish.length)return toast('Marca las materias que deseas incluir.');
        const res=await api('/suggest',{career:state.career,subjects:state.wish,objective:state.objective});
        state.alternatives=res.alternativas||[];state.suggestedEmpty=!state.alternatives.length;render();toast(state.alternatives.length?`Se encontraron ${state.alternatives.length} opciones válidas.`:'No hay combinaciones posibles para esas materias.');
      }
      if(a==='validate'||a==='import'){
        if(state.role!=='admin')return toast('Usa la vista de Jefatura para cargar o validar.');
        if(!state.uploadBase64)return toast('Selecciona un archivo .xlsx.');
        state.busy=true;const file={contenido:state.uploadBase64};
        const res=await api(a==='validate'?'/validate':'/import',file);
        state.checked=res;state.busy=false;
        if(a==='import'&&res.propuesta_id){state.uploadBase64='';state.uploadName='';state.checked=null;await refresh();toast(`Propuesta #${res.propuesta_id} creada. Cambia al perfil Control Escolar para publicarla.`)}else{render();toast(res.valido?'Validación completada sin errores.':`Hay ${res.total_errores} problemas para corregir.`)}
      }
      if(a==='reset'){
        if(!confirm('Esto borrará borradores, propuestas y versiones de DEMOSTRACIÓN guardadas en este ordenador. ¿Continuar?'))return;
        const r=await api('/reset',{confirmar:'REINICIAR DEMO'});state.selected=[];state.checked=null;state.uploadBase64='';state.uploadName='';await refresh();toast('Datos de demostración restablecidos.');
      }
    }catch(err){state.busy=false;render();toast(err.message)}
  });
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.id==='role'){state.role=el.value;render();return}
    if(el.id==='demo-student'){state.student=el.value;state.selected=null;state.draftName='Mi horario';await refresh();return}
    if(el.id==='show-saturday'){state.saturday=el.checked;render();return}
    if(el.id==='draft-name'){state.draftName=el.value;return}
    if(el.id==='goal'){state.objective=el.value;return}
    if(el.dataset.wish){if(el.checked&&!state.wish.includes(el.dataset.wish))state.wish.push(el.dataset.wish);else if(!el.checked)state.wish=state.wish.filter(x=>x!==el.dataset.wish);state.alternatives=[];state.suggestedEmpty=false;render();return}
    if(el.id==='official-career'){state.officialCareer=el.value;render();return}
    if(el.id==='history-version'){state.historyVersion=el.value;try{state.historyData=el.value==='latest'?null:await api('/version?id='+encodeURIComponent(el.value));render()}catch(err){toast(err.message)}return}
    if(el.id==='career'){state.career=el.value;state.semester='';state.wish=[];state.alternatives=[];render();return}
    if(el.id==='semester'){state.semester=el.value;render();return}
    if(el.id==='official-field'){state.officialField=el.value;render();return}
    if(el.id==='teacher-filter'){state.teacher=el.value;render();return}
    if(el.id==='upload-file'){
      const file=el.files?.[0];state.checked=null;state.uploadBase64='';state.uploadName='';
      if(!file){render();return}
      if(!file.name.toLowerCase().endsWith('.xlsx')||file.size>3*1024*1024){toast('Usa un Excel .xlsx de hasta 3 MB.');render();return}
      try{const text=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('No se pudo leer el archivo'));r.readAsDataURL(file)});
        state.uploadBase64=text.split(',')[1];state.uploadName=file.name;render();toast('Archivo listo para validar.');}
      catch(err){toast(err.message)}return;
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='subject-search'){state.q=e.target.value;const at=e.target.selectionStart;render();const n=$('#subject-search');if(n){n.focus();n.setSelectionRange(at,at)}return}
    if(e.target.id==='official-search'){state.officialQ=e.target.value;const at=e.target.selectionStart;render();const n=$('#official-search');if(n){n.focus();n.setSelectionRange(at,at)}return}
  });
  const toggle=$('#theme-toggle');if(toggle)toggle.addEventListener('click',()=>{state.theme=state.theme==='dark'?'light':'dark';try{localStorage.setItem('syncro-theme',state.theme)}catch{}render()});
  const sidebarBtn=$('#collapse-toggle');if(sidebarBtn)sidebarBtn.addEventListener('click',()=>{state.sidebarCollapsed=!state.sidebarCollapsed;render()});
  refresh().catch(err=>{$('#content').innerHTML=`<div class="module">${p('No se pudo conectar con el servidor local: '+esc(err.message),'bad')}<p>Inicia el proyecto usando <strong>python server.py</strong> y abre <strong>http://127.0.0.1:8765</strong> en el navegador.</p></div>`});
})();
