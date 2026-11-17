/* Relatórios nominais AMBEV Pedidos RL: PDF, impressão e conferência. */
(() => {
  'use strict';
  const M = window.RL_MENU;
  const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateBR = day => String(day||'').split('-').reverse().join('/');
  const mealName = type => type==='cafe'?'Café da manhã':'Almoço';
  const statusName = o => o.archived?'ARQUIVADO':({confirmado:'Confirmado',preparo:'Em preparo',entregue:'Entregue',cancelado:'Cancelado'}[o.status]||o.status);
  const nowBR = () => new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Recife',dateStyle:'short',timeStyle:'short'}).format(new Date());
  function build(payload) {
    const {date,meal='todos',kind='admin',company='todos'}=payload;
    const restaurant=kind==='restaurante';
    const selected=restaurant?'todos':company;
    // O rateio sempre considera o conjunto original da remessa,
    // NUNCA só as linhas da empresa selecionada.
    const allRows=(payload.orders||[]).filter(o=>o.order_day===date && (meal==='todos'||meal===o.meal));
    const rows=(selected==='todos'?allRows:allRows.filter(o=>(o.company==='SOLUTIO'?'SOLUTIO':'RL')===selected)).slice();
    rows.sort((x,y)=>x.meal.localeCompare(y.meal)||String(x.employee_name).localeCompare(String(y.employee_name),'pt-BR'));
    const summary=selected==='todos'?M.summary(allRows,date,payload.now||new Date()):
      M.companyBreakdown(allRows,date,payload.now||new Date())[selected];
    const columns=['Colaborador','Empresa','Refeição','Prato','Acompanhamentos / Observações','Situação'];
    if(!restaurant)columns.push('Valor');
    const values=rows.map(o=>{
      const details=[(o.accompaniments||[]).join(', '),o.notes||''].filter(Boolean).join(' | ');
      const base=[o.employee_name,o.company==='SOLUTIO'?'Solutio':'RL Construções',
        mealName(o.meal),o.dish,details,statusName(o)];
      if(!restaurant)base.push(M.money(o.price));
      return base;
    });
    const suffix=selected==='todos'?'GERAL':selected;
    return {rows,columns,values,summary,date,meal,kind,restaurant,company:selected,
      title:restaurant?'MAPA DE PRODUÇÃO DO RESTAURANTE':
        'CONFERÊNCIA '+(selected==='todos'?'GERAL':selected==='RL'?'RL CONSTRUÇÕES':'SOLUTIO'),
      filename:(restaurant?'RL_RESTAURANTE_':'RL_CONFERENCIA_')+suffix+'_'+date+(meal==='todos'?'':'_'+meal)+'.pdf'};
  }
  function totalsHTML(r) {
    return '<section class="totals"><div><b>Cafés ativos</b> '+r.summary.coffee+'</div><div><b>Almoços ativos</b> '+r.summary.lunch+'</div>'+
      (r.restaurant?'':'<div><b>Subtotal refeições</b> '+M.money(r.summary.subtotal)+'</div><div><b>Frete diário único (rateado)</b> '+M.money(r.summary.delivery)+'</div><div class="grand"><b>Total a conferir</b> '+M.money(r.summary.total)+'</div>')+
      '</section>';
  }
  function reportHTML(r){
    const logo=new URL('../assets/rl-logo.webp',location.href).href;
    const tds=r.values.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
    const headings=r.columns.map(h=>'<th>'+esc(h)+'</th>').join('');
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(r.title)+'</title><style>'+
      '@page{size:A4 landscape;margin:13mm}body{font:12px Arial,sans-serif;color:#14334b;margin:0}.top{background:#063750;padding:9px 17px;display:flex;align-items:center;gap:20px;color:white}.top img{width:186px;height:auto}.title{padding:15px 0 10px}h1{font-size:20px;margin:0 0 4px}p{margin:4px 0;color:#627580}.title small{font-size:11px;color:#49718b}table{width:100%;border-collapse:collapse;margin-top:15px;table-layout:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th{text-align:left;color:#fff;background:#0b567c;padding:8px}td{font-size:11px;padding:7px 8px;border-bottom:1px solid #dce6ed;vertical-align:top;overflow-wrap:anywhere}.totals{margin-top:15px;display:flex;flex-wrap:wrap;gap:12px}.totals div{padding:11px;background:#eff5f7}.totals b{display:block}.totals .grand{background:#e7f1d6;font-size:15px}.note{font-size:10px;margin-top:15px}.screen{margin:12px 0}.screen button{padding:9px 15px}@media print{.screen{display:none}}'+
      '</style></head><body><div class="top"><img src="'+esc(logo)+'" alt="RL Engenharia"></div><div class="screen"><button onclick="window.print()">Imprimir ou salvar como PDF</button></div><section class="title"><h1>'+esc(r.title)+'</h1><p>AMBEV Itapissuma • '+dateBR(r.date)+' • '+(r.meal==='todos'?'Todas as refeições':mealName(r.meal))+'</p><small>Emitido em '+esc(nowBR())+' • Horário de Recife</small></section>'+
      '<table><thead><tr>'+headings+'</tr></thead><tbody>'+tds+'</tbody></table>'+totalsHTML(r)+
      '<p class="note">Relatório emitido pelo AMBEV Pedidos RL. Pedidos cancelados/arquivados não compõem valores ativos. Conferir entregas efetivas e eventuais remessas extras antes do pagamento.</p></body></html>';
  }
  function print(payload, targetWindow){
    const r=build(payload);
    const w=targetWindow || window.open('','_blank');
    if(!w)throw Error('Permita janelas pop-up para imprimir o relatório.');
    w.document.open();w.document.write(reportHTML(r));w.document.close();w.focus();
    // A folha permite imprimir/salvar como PDF, sem depender de biblioteca externa.
  }
  async function logoPNG(){
    const img=new Image();img.src=new URL('../assets/rl-logo.webp',location.href).href;
    await img.decode();
    const canvas=document.createElement('canvas');
    canvas.width=480;canvas.height=Math.round(canvas.width*img.naturalHeight/img.naturalWidth);
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/png');
  }
  let pdfLoading=null;
  function loadLibrary(src) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      let settled=false;
      const timer=setTimeout(()=>finish(new Error('Tempo de download excedido')),12000);
      function finish(error){
        if(settled)return;
        settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;
        if(error){script.remove();reject(error);}else resolve();
      }
      script.async=true;
      script.src=src;
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error('Não foi possível baixar biblioteca PDF'));
      document.head.appendChild(script);
    });
  }
  async function ensurePDF(){
    if(window.jspdf?.jsPDF && typeof window.jspdf.jsPDF.API.autoTable==='function')return;
    if(!pdfLoading)pdfLoading=(async()=>{
      if(!window.jspdf?.jsPDF)await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      if(typeof window.jspdf?.jsPDF?.API?.autoTable!=='function')
        await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js');
    })().catch(error=>{pdfLoading=null;throw error;});
    await pdfLoading;
  }
  async function download(payload){
    await ensurePDF();
    const r=build(payload);
    const jsPDF=window.jspdf?.jsPDF;
    if(!jsPDF)throw Error('Biblioteca PDF não carregou. Use Imprimir e escolha “Salvar como PDF”.');
    const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const W=doc.internal.pageSize.getWidth();
    doc.setFillColor(6,52,80);doc.rect(0,0,W,38,'F');
    try{const png=await logoPNG();doc.addImage(png,'PNG',13,4,99,28);}catch(_){doc.setTextColor(255,255,255);doc.setFontSize(18);doc.text('RL ENGENHARIA',14,20);}
    doc.setTextColor(23,47,63);doc.setFontSize(15);doc.setFont('helvetica','bold');doc.text(r.title,13,49);
    doc.setFont('helvetica','normal');doc.setFontSize(9);
    doc.text('Obra AMBEV Itapissuma | '+dateBR(r.date)+' | '+(r.meal==='todos'?'Todas as refeições':mealName(r.meal))+' | '+(r.company==='todos'?'RL + Solutio':r.company),13,56);
    doc.text('Emitido em '+nowBR(),W-14,56,{align:'right'});
    if(typeof doc.autoTable!=='function')throw Error('O gerador de tabelas PDF não carregou. Use Imprimir / Salvar como PDF.');
    doc.autoTable({
      head:[r.columns],body:r.values.length?r.values:[['Sem pedidos para este período.']],
      startY:62,margin:{left:13,right:13,top:13,bottom:22},
      styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak',textColor:[31,59,75],lineColor:[223,233,239],lineWidth:.1},
      headStyles:{fillColor:[11,83,121],textColor:[255,255,255],fontStyle:'bold'},
      alternateRowStyles:{fillColor:[245,249,251]}
    });
    let y=(doc.lastAutoTable?.finalY||65)+10;
    const items=[['Cafés ativos',String(r.summary.coffee)],['Almoços ativos',String(r.summary.lunch)]];
    if(!r.restaurant)items.push(['Subtotal refeições',M.money(r.summary.subtotal)],['Frete diário único (rateado)',M.money(r.summary.delivery)],['TOTAL A CONFERIR',M.money(r.summary.total)]);
    if(y+items.length*7+16>doc.internal.pageSize.getHeight()){doc.addPage();y=18;}
    for(const [label,value] of items){doc.setFontSize(10);doc.setFont('helvetica',label==='TOTAL A CONFERIR'?'bold':'normal');doc.text(label,13,y);doc.text(value,W-14,y,{align:'right'});y+=7;}
    const pages=doc.internal.getNumberOfPages();
    for(let p=1;p<=pages;p++){doc.setPage(p);doc.setTextColor(103,123,135);doc.setFontSize(8);doc.text('RL Engenharia | Conferir remessas e entregas efetivas antes do pagamento',13,doc.internal.pageSize.getHeight()-9);doc.text('Página '+p+'/'+pages,W-14,doc.internal.pageSize.getHeight()-9,{align:'right'});}
    doc.save(r.filename);
  }
  window.RL_REPORTS=Object.freeze({build,download,print});
})();
