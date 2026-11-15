/* Preserva um endereço de acesso limpo quando alguém abre links compartilhados.
   Remove somente parâmetros de campanha; não interfere na autenticação. */
(() => {
  'use strict';
  try {
    const url=new URL(window.location.href);
    let changed=false;
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || key==='fbclid' || key==='gclid') {
        url.searchParams.delete(key);
        changed=true;
      }
    }
    if (changed) {
      const search=url.searchParams.toString();
      history.replaceState(history.state,'',url.pathname+(search?'?'+search:'')+url.hash);
    }
  } catch { /* Navegadores sem History API continuam normalmente. */ }
})();
