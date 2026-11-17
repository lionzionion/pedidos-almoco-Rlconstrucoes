/* Inicialização resiliente AMBEV Pedidos RL.
   Exibe login antes de baixar bibliotecas e mostra mensagens claras quando a rede falha. */
(() => {
  'use strict';
  const loaderURL = document.currentScript?.src || new URL('./loader.js',location.href).href;
  const status=document.getElementById('bootStatus');
  const login=document.getElementById('login');
  const loginButton=document.getElementById('loginBtn');
  const dateElement=document.getElementById('todayLabel');
  const setStatus=(message,error=false)=>{
    if(!status)return;
    status.hidden=false;
    status.textContent=message;
    status.classList.toggle('error',error);
  };
  const failed=message=>{
    login.hidden=false;
    loginButton.disabled=true;
    setStatus(message,true);
  };
  const loadScript=(src,timeout=9000)=>new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    let settled=false;
    const finish=(error)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      script.onload=null;
      script.onerror=null;
      if(error){script.remove();reject(error);}
      else resolve();
    };
    script.async=true;
    script.src=src;
    script.onload=()=>finish();
    script.onerror=()=>finish(new Error('Falha ao baixar o componente'));
    const timer=setTimeout(()=>finish(new Error('Tempo de conexão esgotado')),timeout);
    document.head.appendChild(script);
  });
  window.addEventListener('error',()=>{
    if(!window.RL_APP_BOOTED)failed('Não foi possível iniciar o aplicativo. Recarregue a página (Ctrl + F5). Se persistir, confira a conexão de internet.');
  });
  if(window.RL_MENU){
    try {
      const day=window.RL_MENU.today();
      dateElement.textContent=window.RL_MENU.days[window.RL_MENU.weekday(day)]+' • '+day.split('-').reverse().join('/');
    }catch { dateElement.textContent='Data indisponível'; }
  }else{
    failed('O cardápio não carregou. Recarregue a página para tentar novamente.');
    return;
  }

  async function start(){
    login.hidden=false;
    loginButton.disabled=true;
    setStatus('Conectando com segurança ao sistema de pedidos...');
    if(!window.RL_CONFIG?.supabaseUrl || !window.RL_CONFIG?.supabaseAnonKey){
      throw new Error('Configuração do banco ausente');
    }
    if(typeof window.supabase?.createClient !== 'function'){
      const sources=[
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/dist/umd/supabase.js',
        'https://unpkg.com/@supabase/supabase-js@2.57.0/dist/umd/supabase.js'
      ];
      let ready=false;
      for(let i=0;i<sources.length;i++){
        if(i===1)setStatus('Primeira conexão indisponível; tentando servidor alternativo...');
        try{
          await loadScript(sources[i]);
          if(typeof window.supabase?.createClient==='function'){ready=true;break;}
        }catch(error){console.warn('Falha ao carregar biblioteca de conexão:',error.message);}
      }
      if(!ready)throw new Error('Não foi possível carregar o serviço de autenticação');
    }
    const appScript = new URL('app.js?v=18', new URL('.', loaderURL)).href;
    await loadScript(appScript,10000);
    if(!window.RL_APP_BOOTED)throw new Error('A interface não concluiu a inicialização');
  }

  start().catch(error=>{
    console.error('AMBEV Pedidos RL — falha de inicialização:',error.message);
    failed('Falha na conexão do aplicativo. Recarregue a página (Ctrl + F5). Se persistir, verifique se a rede permite acesso ao Supabase.');
  });
})();