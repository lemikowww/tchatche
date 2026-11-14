const $=document.getElementById('app');
let me=null,V=null,key='',off=0,es=null,auto=null;
const e=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const av=p=>p.face?`<img class="av" src="${p.face}" alt="">`:`<span class="av">${e(p.name[0].toUpperCase())}</span>`;
const NETMSG='Désolé, nous n’avons pas assuré votre connexion.';
const SAD=`<svg viewBox="58 62 84 80" width="200" role="img" aria-label="Ampoule désolée"><g class="sway"><g class="flick"><g transform="rotate(8 100 100)"><circle cx="100" cy="94" r="19" fill="#FFC93C"/><rect x="93" y="108" width="14" height="15" rx="4" fill="#FFC93C"/><path d="M93 116h14" stroke="#2A1A5E" stroke-width="2.2" stroke-linecap="round"/><circle cx="94" cy="92" r="2.4" fill="#2A1A5E"/><circle cx="106" cy="92" r="2.4" fill="#2A1A5E"/><path d="M89 85l8 3M111 85l-8 3" stroke="#2A1A5E" stroke-width="2.2" stroke-linecap="round"/><path d="M94 103q6-6 12 0" stroke="#2A1A5E" stroke-width="2.8" fill="none" stroke-linecap="round"/></g></g><path class="tear" d="M110 96q3.5 5 0 7.5q-3.5-2.5 0-7.5z"/></g></svg>`;
const BULB=`<svg class="bob" viewBox="74 68 52 62" width="64" aria-hidden="true"><g transform="rotate(-8 100 100)"><circle cx="100" cy="94" r="19" fill="#FFC93C"/><rect x="93" y="108" width="14" height="15" rx="4" fill="#FFC93C"/><path d="M93 116h14" stroke="#2A1A5E" stroke-width="2.2" stroke-linecap="round"/><circle cx="94" cy="90" r="2.4" fill="#2A1A5E"/><circle cx="106" cy="90" r="2.4" fill="#2A1A5E"/><path d="M93 97q7 8 14 0" stroke="#2A1A5E" stroke-width="2.8" fill="none" stroke-linecap="round"/></g></svg>`;
const t0=Date.now(),$q=i=>document.getElementById(i);
const load=on=>$q('ld').classList.toggle('off',!on);
const net=on=>$q('nc').classList.toggle('show',!on);
const ready=()=>setTimeout(()=>load(0),Math.max(0,1300-(Date.now()-t0)));
function oops(t,m,label,fn){key='';V=null;auto=null;$.className='';$.innerHTML=`<div class="c home">${SAD}<h2>${t}</h2><p class="mut">${m}</p><button class="btn" id="rt">${label}</button></div>`;rt.onclick=fn;ready()}
function confetti(){const d=document.createElement('div'),c=['#FFC93C','#FF5A6E','#9B7BFF'];d.className='cf';d.setAttribute('aria-hidden','true');for(let i=0;i<46;i++){const x=document.createElement('i');x.style.cssText=`left:${Math.random()*100}%;background:${c[i%3]};animation-delay:${Math.random()*1.2}s;animation-duration:${2.4+Math.random()*1.6}s;--r:${Math.random()*720-360}deg`;d.appendChild(x)}document.body.appendChild(d);setTimeout(()=>d.remove(),5200)}
const api=(p,b)=>fetch('/api/'+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).catch(()=>{const n=new Error(NETMSG);n.net=1;throw n}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Erreur de connexion.');return j});
const act=(type,data)=>api('act',{...me,type,data}).catch(x=>x.net||alert(x.message));
const store=v=>{try{v?localStorage.setItem('tch',JSON.stringify(v)):localStorage.removeItem('tch')}catch{}};

function home(){
 key='';V=null;auto=null;$.className='';
 $.innerHTML=`<div class="c home"><h1 class="wm" aria-label="Tchatche">${[...'Tchatche'].map((l,i)=>`<span style="--i:${i}">${l}</span>`).join('')}</h1><button class="btn" style="--i:8" onclick="showForm(1)">Créer une partie</button><button class="btn alt" style="--i:9" onclick="showForm(0)">Rejoindre une partie</button><p class="mut small">À jouer entre amis, dans la bienveillance. Aucune donnée personnelle n’est conservée : les parties sont effacées après 3 h d’inactivité.</p></div>`;
 ready();
}
function showForm(create){
 const pre=new URLSearchParams(location.search).get('code')||'';
 $.innerHTML=`<h2>${create?'Créer une partie':'Rejoindre une partie'}</h2><input id="nm" maxlength="14" placeholder="Ton pseudo" aria-label="Ton pseudo">${create?'':`<input id="cd" maxlength="7" placeholder="Code de la partie" aria-label="Code de la partie" value="${e(pre)}" style="margin-top:10px">`}<p id="er" class="err"></p><button class="btn" id="ok">${create?'Créer':'Rejoindre'}</button><button class="btn alt" onclick="home()">Retour</button>`;
 ok.onclick=async()=>{load(1);try{me=await api(create?'create':'join',{name:nm.value,code:create?'':cd.value});store(me);connect()}catch(x){oops(x.net?'Oups, la connexion a lâché':'Oups, ça ne marche pas',x.message,x.net?'Réessayer':'Retour',()=>x.net?showForm(create):home())}};
 ready();
}
function connect(){
 es&&es.close();key='';
 es=new EventSource(`/api/events?code=${encodeURIComponent(me.code)}&id=${me.id}`);
 es.onmessage=m=>{V=JSON.parse(m.data);off=V.now-Date.now();net(1);ready();paint()};
 es.onerror=()=>{if(es.readyState===2){store(null);me=null;oops('Partie introuvable','Ce code ne correspond à aucune partie en cours.','Retour à l’accueil',()=>home())}else net(0)};
}
let RN=10;
const hd=(t,l)=>`${V.dl?'<div class="tm" id="t"></div>':''}<p class="mut">${l||`Manche ${V.round}/${V.rounds}`}</p><h2>${t}</h2>`;
const wait=m=>{$.innerHTML=`<div class="card c">${BULB}<h2>Envoyé !</h2>${m?`<p>${m}</p>`:''}<p id="st" class="mut"></p></div>`;st()};
function st(){const s=document.getElementById('st');if(s)s.textContent=`${V.players.filter(p=>p.done).length}/${V.players.filter(p=>p.on).length} ont terminé`}
const P=i=>V.players.find(p=>p.id===i);
const BIG=p=>`<div class="c big">${av(p)}</div>`;
function ring(hl){
 const n=V.players.length,w=Math.min(14,211/n);
 return `<div class="ring">${V.players.map((p,i)=>{const a=2*Math.PI*i/n-Math.PI/2;return `<div class="rv${p.id===hl?' hl':''}${p.on?'':' gone'}" style="left:${50+42*Math.cos(a)}%;top:${50+42*Math.sin(a)}%;width:${w}%;--i:${i}" title="${e(p.name)}">${av(p)}</div>`}).join('')}<div class="mid">${BULB}</div></div>`;
}
const info=(t,m)=>`<h2 class="c">${t}</h2><p class="mut c">${m}</p>`;
function paint(){
 const c=V.cur,k=V.phase==='lobby'?'l'+JSON.stringify(V.players.map(p=>[p.id,p.on])):V.phase+V.round+(c?c.w+c.role+(c.out||''):'')+V.mine;
 if(k===key)return st();
 $.classList.toggle('still',k[0]==='l'&&key[0]==='l');key=k;auto=null;
 const ph=V.phase,host=V.host===V.you;
 if(ph==='lobby'){
  const n=V.players.filter(p=>p.on).length;
  $.innerHTML=`<h2>Salon</h2><div class="code">${V.code}</div><div id="qr"></div><p class="mut c">Les amis scannent le QR code ou tapent le code. ${n} joueur${n>1?'s':''} (de 4 à 36).</p><div class="chips">${V.players.map(p=>`<div class="chip">${av(p)}<b>${e(p.name)}${p.id===V.host?' (hôte)':''}</b></div>`).join('')}</div>${host?`<p class="mut">Nombre de manches : <b id="rv">${RN}</b></p><input type="range" id="rn" min="3" max="40" value="${RN}" aria-label="Nombre de manches"><button class="btn" id="go" ${n<4?'disabled':''}>Commencer</button>${n<4?'<p class="mut c">Il faut au moins 4 joueurs connectés.</p>':''}`:'<p class="c mut">L’hôte va lancer la partie…</p>'}`;
  if(window.QRCode)new QRCode(document.getElementById('qr'),{text:location.origin+'/?code='+V.code,width:150,height:150});
  if(host){rn.oninput=()=>{RN=+rn.value;rv.textContent=RN};if(!go.disabled)go.onclick=()=>act('start',{rounds:RN})}
 }
 else if(ph==='draw'){
  if(V.mine)return wait(`Ton dessin devient la photo de profil de <b>${e(V.target)}</b>.`);
  $.innerHTML=hd(`Dessine la tête de ${e(V.target)}`,'Avant la partie')+`<canvas class="cv" id="cv" width="400" height="400"></canvas><button class="btn alt" id="cl">Effacer</button><button class="btn" id="ok">Terminé</button>`;
  const x=cv.getContext('2d'),wh=()=>{x.fillStyle='#fff';x.fillRect(0,0,400,400)};
  wh();x.lineWidth=7;x.lineCap=x.lineJoin='round';x.strokeStyle='#2A1A5E';let d=false;
  const pt=ev=>{const r=cv.getBoundingClientRect();return[(ev.clientX-r.left)*400/r.width,(ev.clientY-r.top)*400/r.height]};
  cv.onpointerdown=ev=>{d=true;x.beginPath();x.moveTo(...pt(ev));x.lineTo(...pt(ev));x.stroke();cv.setPointerCapture(ev.pointerId)};
  cv.onpointermove=ev=>{if(d){x.lineTo(...pt(ev));x.stroke()}};cv.onpointerup=()=>d=false;cl.onclick=wh;
  const send=()=>{auto=null;const t=document.createElement('canvas');t.width=t.height=128;t.getContext('2d').drawImage(cv,0,0,128,128);act('face',{v:t.toDataURL('image/jpeg',.7)})};
  ok.onclick=send;auto=send;
 }
 else if(ph==='write'){
  const wr=P(c.w);
  if(c.role==='writer'){
   if(V.mine)return $.innerHTML=ring(c.w)+info('Ton texte est parti','On attend le verdict des votants…');
   const tg=P(c.tg.id);
   $.innerHTML=hd(`Écris un truc sur ${e(tg.name)}`)+BIG(tg)+`<p class="mut c">Tu ne seras lu que si la majorité des votants le décide.</p><textarea id="tx" rows="4" maxlength="200" placeholder="Ex : la fois où il a pris un poteau pour un ami…" aria-label="Ton texte"></textarea><button class="btn" id="ok">Envoyer</button>`;
   const send=()=>{auto=null;act('text',{v:tx.value})};ok.onclick=send;auto=send;
  }
  else $.innerHTML=hd(`${e(wr.name)} écrit…`)+ring(c.w)+`<p class="mut c">Patience, ça se prépare.</p>`;
 }
 else if(ph==='vote'){
  const wr=P(c.w);
  if(c.role==='voter'&&!V.mine){
   $.innerHTML=hd('Tu as été désigné en secret')+`<p class="mut">${e(wr.name)} a écrit à propos de <b>${e(c.tg.name)}</b>. Faut-il le révéler à tout le monde ?</p><div class="sit"></div><br><button class="btn" id="y">Révéler à tout le monde</button><button class="btn alt" id="n">Garder le secret</button>`;
   $.querySelector('.sit').textContent=c.text;y.onclick=()=>act('vote',{v:1});n.onclick=()=>act('vote',{v:0});
  }
  else if(c.role==='voter')$.innerHTML=ring(null)+info('Vote enregistré','Chut, les autres votent encore.');
  else if(c.role==='writer')$.innerHTML=ring(null)+info('Tes mots sont jugés','Des joueurs désignés en secret décident s’ils seront révélés.');
  else $.innerHTML=ring(null)+info('Tu n’as pas été désigné pour voter','Attends que les autres votent.');
 }
 else if(ph==='res'){
  const wr=P(c.w);
  if(c.out==='shown'){
   $.innerHTML=hd('Révélé !')+BIG(P(c.tg.id))+`<div class="sit"></div><p class="c">${e(wr.name)} a écrit à propos de <b>${e(c.tg.name)}</b>.</p>`;
   $.querySelector('.sit').textContent=c.text;
  }
  else if(c.out==='hidden')$.innerHTML=hd('Le secret reste caché')+ring(null)+`<p class="mut c">Les votants ont décidé de ne pas le révéler.</p>`;
  else $.innerHTML=hd('Personne n’a rien écrit')+ring(null)+`<p class="mut c">Au suivant !</p>`;
 }
 else if(ph==='final'){
  $.innerHTML=`<h2 class="c">Merci d’avoir joué !</h2>${ring(null)}<h2>Les secrets révélés</h2>${V.log.map(()=>'<div class="card"><b></b><p class="mut"></p></div>').join('')||'<p class="mut c">Aucun secret n’a été révélé.</p>'}${host?'<button class="btn" id="again">Rejouer</button>':'<p class="c mut">L’hôte peut relancer une partie.</p>'}<button class="btn alt" id="quit">Quitter</button>`;
  [...$.querySelectorAll('.card')].forEach((d,i)=>{const l=V.log[i];d.querySelector('b').textContent=l.t;d.querySelector('p').textContent=`${l.by} à propos de ${l.to}`});
  confetti();if(host)again.onclick=()=>act('again');
  quit.onclick=()=>{es.close();store(null);me=null;home()};
 }
}
setInterval(()=>{const t=document.getElementById('t');if(!t||!V)return;const l=Math.max(0,Math.ceil((V.dl-(Date.now()+off))/1000));t.textContent=l;t.classList.toggle('hurry',l<=5);if(l<=1&&auto){const f=auto;auto=null;f()}},250);

try{me=JSON.parse(localStorage.getItem('tch')||'null')}catch{}
$q('nc').innerHTML=SAD+`<h2>Oups, la connexion a lâché</h2><p class="mut">${NETMSG} On réessaie tout seul…</p>`;
if(location.pathname!=='/')oops('Page introuvable','Cette page n’existe pas ou plus.','Retour à l’accueil',()=>{history.replaceState(null,'','/');home()});
else if(me)connect();else if(new URLSearchParams(location.search).get("code"))showForm(0);else home();
