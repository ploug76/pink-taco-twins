'use strict';
/* The Pink Taco Twins vs. the Scissor Sisters — adults-only cartoon brawler (Vault). */
(()=>{
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.random()*a.length|0], sgn=v=>v<0?-1:1;
let W=0,H=0,DPR=1,S=1,GH=1,GT=0,portrait=false,viewW=1,VHv=540,RM=30;
const VH=540,GROUND=488;
/* ---------------- assets ---------------- */
const IMG={};
const SPR=['rosa','rosa_bump','rosa_special','rosa_jump','rosa_hurt','lupe','lupe_bump','lupe_special','lupe_jump','lupe_hurt',
 'e_karen','e_mallcop','e_roomba','e_bachelorette','e_elvis','e_flamingo','e_gymbro','e_yogi','e_thigh','e_bigfoot','e_raccoon','e_clipper','e_mime',
 'b_karen','b_snippy','b_clippy','b_trixie','b_shearleen','rosa_na','rosa_a0u','rosa_a0f','lupe_na','lupe_a0u','lupe_a0f','lupe_a1u','lupe_a1f','e_bachelorette_na','e_bachelorette_a0u','e_bachelorette_a0f','e_bachelorette_dr','e_bigfoot_na','e_bigfoot_a0u','e_bigfoot_a0f','e_elvis_na','e_elvis_a0u','e_elvis_a0f','p_burrito','p_spanx','p_wine','p_marg','p_yogurt','p_divorce'];
const BGS=['bg1','bg2','bg3','bg4','bg5'];
function loadImg(n){return new Promise(res=>{const im=new Image();im.decoding='async';im.onload=()=>{IMG[n]=im;res()};im.onerror=()=>res();im.src='art/'+n+'.webp?v=1'})}
function silhouette(im,col){const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return c}
async function loadAll(){const all=[...SPR,...BGS];let done=0;const bar=$('loadBar');
 await Promise.all(all.map(n=>loadImg(n).then(()=>{done++;bar.style.width=(done/all.length*100)+'%'})));
 for(const n of SPR)if(IMG[n]){IMG[n+'_w']=silhouette(IMG[n],'#fff');}
 for(const n of SPR)if(IMG[n]&&(n.startsWith('e_')||n.startsWith('b_')))IMG[n+'_g']=silhouette(IMG[n],'#8fff3a');
 ['cut_weather','cut_beans','cut_grandma','cut_space','win','lose','title'].forEach(n=>{const i=new Image();i.src='art/'+n+'.webp?v=1'});}
/* ---------------- save ---------------- */
const SAVE_K='ptt_save_v1';let SAVE={unlocked:1,best:0,twin:'rosa',diff:1,voice:1,adult:0,muted:0,seenCut:{}};
try{Object.assign(SAVE,JSON.parse(localStorage.getItem(SAVE_K)||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem(SAVE_K,JSON.stringify(SAVE))}catch(e){}};
/* ---------------- audio ---------------- */
const AU={ctx:null,master:null,music:null,sfx:null,muted:!!SAVE.muted,timer:null,cur:null,
 unlock(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=this.ctx=new C();
  this.master=a.createGain();this.master.gain.value=this.muted?0:1;
  const comp=a.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;this.master.connect(comp);comp.connect(a.destination);
  this.music=a.createGain();this.music.gain.value=0.32;this.music.connect(this.master);
  this.sfx=a.createGain();this.sfx.gain.value=0.9;this.sfx.connect(this.master);
  this.noiseBuf=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=this.noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  if(this.want)this.play(this.want)},
 mute(m){this.muted=m;SAVE.muted=m?1:0;save();if(this.master)this.master.gain.value=m?0:1;$('bMute').textContent=m?'🔇':'🔊';if(m&&'speechSynthesis'in window)speechSynthesis.cancel()},
 play(k){this.want=k;if(!this.ctx||this.cur===k)return;this.stop();this.cur=k;startSong(k)},
 stop(){if(this.timer)clearInterval(this.timer);this.timer=null;this.cur=null}};
function osc(type,f,t,d,vol,dest,slide,attack){const a=AU.ctx,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+d);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(attack||0.005));g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(dest||AU.sfx);o.start(t);o.stop(t+d+0.05);return o}
function noiseSrc(t,d){const a=AU.ctx,s=a.createBufferSource();s.buffer=AU.noiseBuf;s.loop=true;s.loopStart=Math.random();s.start(t,Math.random()*1.5);s.stop(t+d+0.05);return s}
function filt(type,f,q){const b=AU.ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q)b.Q.value=q;return b}
function env(t,d,vol,att){const g=AU.ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+(att||0.01));g.gain.exponentialRampToValueAtTime(0.0001,t+d);return g}
/* gas: low noise through a fluttering lowpass + a sagging buzz tone */
function sfxGas(len,pitch){const a=AU.ctx,t=a.currentTime;len=len||rnd(0.45,0.9);pitch=pitch||rnd(0.8,1.3);
 const n=noiseSrc(t,len),lp=filt('lowpass',420*pitch,6),g=env(t,len,0.55,0.02);
 const fl=a.createOscillator(),fg=a.createGain();fl.type='square';fl.frequency.setValueAtTime(rnd(22,34),t);fl.frequency.linearRampToValueAtTime(rnd(12,18),t+len);fg.gain.value=0.45;fl.connect(fg);
 const am=a.createGain();am.gain.value=0.55;fg.connect(am.gain);n.connect(lp);lp.connect(am);am.connect(g);g.connect(AU.sfx);fl.start(t);fl.stop(t+len+0.05);
 const o=a.createOscillator(),og=env(t,len,0.22,0.02),bp=filt('bandpass',300*pitch,3);o.type='sawtooth';o.frequency.setValueAtTime(95*pitch,t);o.frequency.exponentialRampToValueAtTime(60*pitch,t+len);
 const vib=a.createOscillator(),vg=a.createGain();vib.frequency.value=rnd(18,28);vg.gain.value=22*pitch;vib.connect(vg);vg.connect(o.frequency);o.connect(bp);bp.connect(og);og.connect(AU.sfx);o.start(t);o.stop(t+len+0.05);vib.start(t);vib.stop(t+len+0.05);
 if(Math.random()<0.35){osc('sine',rnd(500,700),t+len*0.75,0.18,0.12,null,rnd(900,1300))}}
function sfxBoing(){const a=AU.ctx,t=a.currentTime;const o=a.createOscillator(),g=env(t,0.42,0.38);o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(rnd(380,460),t+0.12);o.frequency.exponentialRampToValueAtTime(220,t+0.42);
 const v=a.createOscillator(),vg=a.createGain();v.frequency.value=14;vg.gain.value=35;v.connect(vg);vg.connect(o.frequency);o.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+0.45);v.start(t);v.stop(t+0.45);
 osc('triangle',90,t,0.12,0.4,null,45);const n=noiseSrc(t,0.08),lp=filt('lowpass',900),ng=env(t,0.08,0.3);n.connect(lp);lp.connect(ng);ng.connect(AU.sfx)}
function sfxBuzz(){const a=AU.ctx,t=a.currentTime,d=0.28;const o=a.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(rnd(105,125),t);
 const am=a.createGain();am.gain.value=0;const lfo=a.createOscillator(),lg=a.createGain();lfo.type='square';lfo.frequency.value=rnd(28,36);lg.gain.value=0.5;lfo.connect(lg);lg.connect(am.gain);
 const bp=filt('bandpass',rnd(650,850),2),g=env(t,d,0.6,0.01);o.connect(am);am.connect(bp);bp.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+d+0.05);lfo.start(t);lfo.stop(t+d+0.05)}
function sfxThud(v){const t=AU.ctx.currentTime;osc('sine',160,t,0.16,0.5*(v||1),null,50);const n=noiseSrc(t,0.1),lp=filt('lowpass',1400),g=env(t,0.1,0.35*(v||1));n.connect(lp);lp.connect(g);g.connect(AU.sfx)}
function sfxOof(hi){const a=AU.ctx,t=a.currentTime;const o=a.createOscillator();o.type='sawtooth';const f=hi?320:170;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.6,t+0.25);
 const f1=filt('bandpass',hi?900:650,5),f2=filt('bandpass',hi?1500:1100,6),g=env(t,0.26,0.5,0.02);o.connect(f1);o.connect(f2);f1.connect(g);f2.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+0.3)}
function sfxRip(){const t=AU.ctx.currentTime,n=noiseSrc(t,0.4),bp=filt('bandpass',1800,2),g=env(t,0.4,0.6);bp.frequency.setValueAtTime(800,t);bp.frequency.exponentialRampToValueAtTime(5000,t+0.35);n.connect(bp);bp.connect(g);g.connect(AU.sfx)}
function sfxScratch(){const t=AU.ctx.currentTime,n=noiseSrc(t,0.35),bp=filt('bandpass',1200,4),g=env(t,0.35,0.7);bp.frequency.setValueAtTime(3000,t);bp.frequency.exponentialRampToValueAtTime(300,t+0.12);bp.frequency.exponentialRampToValueAtTime(2500,t+0.3);n.connect(bp);bp.connect(g);g.connect(AU.sfx)}
function sfxHorn(){const t=AU.ctx.currentTime;[0,4,7].forEach(i=>{const f=233*Math.pow(2,i/12);const o=osc('sawtooth',f,t,0.7,0.12,null,0,0.02);});[0,0.12].forEach(d=>{const o=osc('square',466,t+d,0.1,0.06)})}
function sfxOoh(){const a=AU.ctx,t=a.currentTime;for(let i=0;i<5;i++){const o=a.createOscillator();o.type='sawtooth';const f=rnd(180,320);o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.12,t+0.4);o.frequency.linearRampToValueAtTime(f*0.8,t+1.2);const bp=filt('bandpass',600,3),g=env(t,1.3,0.07,0.2);bp.frequency.linearRampToValueAtTime(400,t+1.2);o.connect(bp);bp.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+1.4)}}
function sfxSad(){const t=AU.ctx.currentTime;[392,370,349,330].forEach((f,i)=>{const o=AU.ctx.createOscillator(),g=env(t+i*0.38,i===3?1.1:0.36,0.2,0.03),lp=filt('lowpass',1200);o.type='sawtooth';o.frequency.setValueAtTime(f,t+i*0.38);if(i===3){const v=AU.ctx.createOscillator(),vg=AU.ctx.createGain();v.frequency.value=6;vg.gain.value=8;v.connect(vg);vg.connect(o.frequency);v.start(t+i*0.38);v.stop(t+3)}o.connect(lp);lp.connect(g);g.connect(AU.sfx);o.start(t+i*0.38);o.stop(t+i*0.38+1.2)})}
function sfx(n){if(!AU.ctx||AU.muted)return;const t=AU.ctx.currentTime;switch(n){
 case'gas':sfxGas();break;case'gasbig':sfxGas(1.6,0.7);setTimeout(()=>sfxGas(0.5,1.5),900);break;case'pfft':sfxGas(0.22,1.6);break;
 case'boing':sfxBoing();break;case'buzz':sfxBuzz();break;case'thud':sfxThud();break;case'slam':sfxThud(1.6);osc('sine',70,t,0.6,0.6,null,30);break;
 case'swish':{const nn=noiseSrc(t,0.12),bp=filt('bandpass',2500,1.5),g=env(t,0.12,0.25);bp.frequency.exponentialRampToValueAtTime(900,t+0.12);nn.connect(bp);bp.connect(g);g.connect(AU.sfx);break}
 case'hurt':sfxOof(true);break;case'eoof':sfxOof(false);break;case'rip':sfxRip();break;case'scratch':sfxScratch();break;case'horn':sfxHorn();break;case'ooh':sfxOoh();break;case'sad':sfxSad();break;
 case'jump':osc('square',300,t,0.14,0.08,null,620);break;case'land':osc('sine',120,t,0.08,0.2,null,60);break;
 case'pickup':[659,784,988,1319].forEach((f,i)=>osc('triangle',f,t+i*0.05,0.12,0.16));break;case'heal':[523,659,784,1047,1319].forEach((f,i)=>osc('sine',f,t+i*0.06,0.18,0.15));break;
 case'tip':osc('square',1319,t,0.06,0.06);osc('square',1760,t+0.05,0.12,0.06);break;
 case'squeeze':{const o=osc('square',300,t,0.5,0.08,null,900);break}
 case'snip':[0,0.09].forEach(d=>{const nn=noiseSrc(t+d,0.05),hp=filt('highpass',4000),g=env(t+d,0.05,0.5);nn.connect(hp);hp.connect(g);g.connect(AU.sfx);osc('square',2400,t+d,0.03,0.08)});break;
 case'splat':{const nn=noiseSrc(t,0.25),lp=filt('lowpass',700),g=env(t,0.25,0.6);nn.connect(lp);lp.connect(g);g.connect(AU.sfx);osc('sine',220,t,0.2,0.3,null,80);break}
 case'roar':{const o=AU.ctx.createOscillator(),bp=filt('bandpass',700,1.2),g=env(t,1.1,0.5,0.06);o.type='sawtooth';o.frequency.setValueAtTime(150,t);o.frequency.linearRampToValueAtTime(240,t+0.3);o.frequency.linearRampToValueAtTime(110,t+1.0);const l=AU.ctx.createOscillator(),lg=AU.ctx.createGain();l.frequency.value=26;lg.gain.value=40;l.connect(lg);lg.connect(o.frequency);o.connect(bp);bp.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+1.15);l.start(t);l.stop(t+1.15);break}
 case'ko':sfxThud(2);[523,392,262].forEach((f,i)=>osc('square',f,t+0.2+i*0.12,0.2,0.12));break;
 case'clear':[523,659,784,1047,784,1047,1319].forEach((f,i)=>osc('square',f,t+i*0.1,0.16,0.1));break;
 case'shout':{const o=AU.ctx.createOscillator(),bp=filt('bandpass',1100,2),g=env(t,0.7,0.35,0.03);o.type='square';o.frequency.setValueAtTime(330,t);const l=AU.ctx.createOscillator(),lg=AU.ctx.createGain();l.frequency.value=9;lg.gain.value=60;l.connect(lg);lg.connect(o.frequency);o.connect(bp);bp.connect(g);g.connect(AU.sfx);o.start(t);o.stop(t+0.75);l.start(t);l.stop(t+0.75);break}
 case'zap':osc('sawtooth',1400,t,0.18,0.08,null,200);break;
 case'beep':osc('square',880,t,0.08,0.08);break;
 default:osc('square',500,t,0.06,0.06)}}
/* funk sequencer: bass, wah stabs, drums. per-world grooves */
const SONGS={
 title:{bpm:100,root:40,bass:[0,0,12,0,10,0,7,0,0,0,12,0,10,12,7,5],ch:[0,4,7,10],swing:0.12,wah:1},
 w1:{bpm:104,root:43,bass:[0,-1,0,12,0,10,0,7,0,0,3,4,7,-1,10,12],ch:[0,4,7,10],swing:0.1,wah:1},
 w2:{bpm:118,root:45,bass:[0,0,12,0,0,0,12,0,3,3,15,3,5,5,17,5],ch:[0,3,7,10],swing:0.06,wah:1},
 w3:{bpm:96,root:38,bass:[0,-1,-1,0,7,-1,5,-1,0,-1,12,10,7,-1,5,3],ch:[0,4,7,11],swing:0.14,wah:1},
 w4:{bpm:110,root:41,bass:[0,0,7,0,10,0,7,0,0,12,0,10,0,7,5,3],ch:[0,3,7,10],swing:0.1,wah:1},
 w5:{bpm:124,root:36,bass:[0,0,12,0,0,0,10,0,0,0,12,0,13,13,12,10],ch:[0,3,6,10],swing:0.02,wah:0},
 boss:{bpm:138,root:40,bass:[0,0,12,0,1,1,13,1,0,0,12,0,-2,-2,10,-2],ch:[0,3,7,10],swing:0,wah:0},
 win:{bpm:112,root:43,bass:[0,12,7,12,5,17,7,19,0,12,7,12,5,17,7,19],ch:[0,4,7,11],swing:0.1,wah:1}};
const mf=m=>440*Math.pow(2,(m-69)/12);
function startSong(k){const s=SONGS[k]||SONGS.w1,a=AU.ctx;const step=60/s.bpm/4;let n=0,next=a.currentTime+0.08;
 AU.timer=setInterval(()=>{if(!AU.ctx)return;while(next<a.currentTime+0.25){const st=n%16,bar=(n>>4)%4,t=next+(st%2?step*s.swing:0);
  const b=s.bass[st];const tr=bar===2?5:bar===3?(k==='boss'?-2:7):0;
  if(b!==-1){const o=a.createOscillator(),lp=filt('lowpass',380,8),g=env(t,step*1.6,0.32,0.005);o.type='sawtooth';o.frequency.value=mf(s.root+b+tr);lp.frequency.setValueAtTime(1400,t);lp.frequency.exponentialRampToValueAtTime(220,t+step*1.4);o.connect(lp);lp.connect(g);g.connect(AU.music);o.start(t);o.stop(t+step*1.8)}
  if(st===2||st===6||st===10||st===14||(k==='boss'&&st%4===0)){const bp=filt('bandpass',500,s.wah?7:3),g=env(t,step*1.5,s.wah?0.07:0.06,0.004);bp.frequency.setValueAtTime(s.wah?350:900,t);bp.frequency.exponentialRampToValueAtTime(s.wah?2200:1800,t+step*1.2);
   s.ch.forEach(c=>{const o=a.createOscillator();o.type=s.wah?'sawtooth':'square';o.frequency.value=mf(s.root+24+c+tr);o.connect(bp);o.start(t);o.stop(t+step*1.6)});bp.connect(g);g.connect(AU.music)}
  if(s.wah&&(st===7||st===15)&&bar%2===1){const bp=filt('bandpass',400,9),g=env(t,step*2.5,0.06);bp.frequency.setValueAtTime(400,t);bp.frequency.exponentialRampToValueAtTime(1800,t+step);bp.frequency.exponentialRampToValueAtTime(500,t+step*2.4);const o=a.createOscillator();o.type='sawtooth';o.frequency.value=mf(s.root+31+tr);o.connect(bp);bp.connect(g);g.connect(AU.music);o.start(t);o.stop(t+step*2.6)}
  if(st===0||st===10||(st===8&&k!=='w3')||(k==='boss'&&st%4===0)||(k==='w5'&&st%4===0)){const o=a.createOscillator(),g=env(t,0.16,0.55,0.002);o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+0.14);o.connect(g);g.connect(AU.music);o.start(t);o.stop(t+0.18)}
  if(st===4||st===12){const nn=noiseSrc(t,0.14),bp=filt('bandpass',1800,0.8),g=env(t,0.14,0.28,0.002);nn.connect(bp);bp.connect(g);g.connect(AU.music)}
  if(st%2===0||k==='boss'){const nn=noiseSrc(t,0.03),hp=filt('highpass',8000),g=env(t,0.03,st%4===2?0.12:0.06,0.001);nn.connect(hp);hp.connect(g);g.connect(AU.music)}
  next+=step;n++}},80)}
/* announcer (optional, device voice) */
function say(txt,pitch){if(!SAVE.voice||AU.muted||!('speechSynthesis'in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.rate=1.05;u.pitch=pitch||0.6;u.volume=1;speechSynthesis.speak(u)}catch(e){}}
/* ---------------- data ---------------- */
const TWINS={
 rosa:{name:'ROSA',full:'Rosa "The Bumper" Taco',h:178,spd:300,acc:2600,bump:1.15,gas:1,desc:'Heavy BOOB BUMPS. Sneakers. Zero chill.',voice:0.9},
 lupe:{name:'LUPE',full:'Lupe "Roller Derby" Taco',h:180,spd:370,acc:1300,bump:0.95,gas:1.25,desc:'Roller skates = speed + slides. Extra-gassy QUEEFS.',voice:1.2}};
const ET={
 karen:{h:172,hp:34,spd:80,kind:'ranged',dmg:8,range:300,cd:2.2,shot:'complaint',score:120,
  hit:['I\'m calling CORPORATE!','This is ASSAULT!','ONE STAR!','I have 40k followers!'],die:['MANAGER!!!','I\'m... telling... Yelp...','Unsubscribe!']},
 mallcop:{h:176,hp:40,spd:120,kind:'charge',dmg:12,range:70,cd:2.6,score:140,
  hit:['Code Pink! CODE PINK!','Stop resisting!','I\'m basically a cop!'],die:['My SEGWAY!','Tell my mom I was brave','Radio... for... help...']},
 roomba:{h:80,hp:22,spd:240,kind:'charge',dmg:10,range:60,cd:1.6,score:200,low:1,
  hit:['*angry beep*','ANKLE DETECTED','STAB MODE'],die:['*sad beep*','Docking... forever','I just wanted crumbs']},
 bachelorette:{h:170,hp:30,spd:95,kind:'melee',dmg:9,range:80,cd:1.6,score:110,wobble:1,
  hit:['WOOOOO!','I\'m getting MARRIED!','Is this the stripper?!','Who invited the TWINS?!'],die:['I\'m gonna puke…','Best bachelorette EVER','Call... Becky...']},
 elvis:{h:178,hp:42,spd:90,kind:'melee',dmg:11,range:95,cd:1.9,score:150,
  hit:['Uh-huh-huh!','Hunka hunka OW','Viva Las... OUCH'],die:['Thank you. Thank you very much.','Elvis has left the building','The King is DEAD (again)']},
 flamingo:{h:150,hp:28,spd:140,kind:'hop',dmg:10,range:70,cd:1.3,score:200,
  hit:['SQUAWK!','You popped my vibe!','Honk?!'],die:['*deflating noises*','I was a $12 float!','SSSSSSSSS']},
 gymbro:{h:182,hp:60,spd:75,kind:'melee',dmg:14,range:90,cd:2.4,score:180,flex:1,
  hit:['Do you even LIFT?!','Not on LEG DAY!','Bro. BRO.'],die:['My GAINS!','Tell Chad I loved him','Protein... shake... me...']},
 yogi:{h:160,hp:36,spd:70,kind:'ranged',dmg:9,range:320,cd:2.4,shot:'om',score:160,float:1,
  hit:['My CHAKRAS!','Namaste... OW','Breathe in... OOF'],die:['Inner peace... GONE','I see the light (it\'s pink)','Om... nom... nooo']},
 thigh:{h:120,hp:30,spd:150,kind:'hop',dmg:12,range:70,cd:1.1,score:220,
  hit:['*SNAP*','As seen on TV!','SQUEEZE!'],die:['*sproing*','Returned for a full refund','Only 3 easy payments...']},
 bigfoot:{h:205,hp:80,spd:65,kind:'melee',dmg:16,range:105,cd:2.6,score:220,stomp:1,
  hit:['I JUST GOT WAXED!','Not the face! I\'m moisturizing!','RAWR (politely)'],die:['Nobody will believe this','Blurry photo of me crying','I\'m... calling... Kelly...']},
 raccoon:{h:120,hp:24,spd:210,kind:'melee',dmg:7,range:65,cd:1.0,score:160,thief:1,
  hit:['*trash panda screech*','Hissss!','MY LOTION!'],die:['Back to the dumpster','*smells like lavender*','Worth it']},
 clipper:{h:178,hp:38,spd:105,kind:'melee',dmg:10,range:100,cd:1.7,score:130,
  hit:['Snip snip, sweetie!','My MULLET!','Scissor Sisters 4 LIFE!','You\'ll pay for that, Taco!'],die:['Tell Shearleen... I\'m sorry','My hair is still flawless','Party in the back... over']},
 mime:{h:170,hp:34,spd:85,kind:'melee',dmg:9,range:85,cd:2.0,score:220,wall:1,
  hit:['...!','(mimes outrage)','(silent swearing)'],die:['(mimes dying)','(mimes dying harder)','(an invisible box closes)']}};
const BOSS={
 karen:{img:'b_karen',name:'KAREN PRIME',title:'THE MANAGER OF MANAGERS',h:300,hp:340,spd:110,
  lines:['Left 4,000 one-star reviews. Two were for her own kids.','Weakness: hearing the word "no".'],taunt:['I WANT TO SPEAK TO YOUR MANAGER!','I\'m posting this on Nextdoor!','Do you know who my HUSBAND is?!'],atk:['charge','coupons','shout'],minion:'karen',voice:'I want to speak to your manager!'},
 snippy:{img:'b_snippy',name:'SNIPPY',title:'SCISSOR SISTER #3 · STYLIST FROM HELL',h:290,hp:400,spd:150,
  lines:['Has given 900 women bangs against their will.','Hobbies: snipping, gossip, more snipping.'],taunt:['Just a little off the top!','Bangs are BACK, sweetie!','Hold STILL!'],atk:['lunge','combs','bangs'],minion:'clipper',voice:'Just a little off the top, sweetie.'},
 clippy:{img:'b_clippy',name:'CLIPPY',title:'SCISSOR SISTER #2 · THE ACRYLIC ASSASSIN',h:290,hp:440,spd:170,
  lines:['Hasn\'t opened a soda can by herself since 2009.','Her nails have their own Instagram.'],taunt:['Don\'t chip my nails!','These cost $300, b*tch!','Talk to the CLAW!'],atk:['darts','swipe','leap'],minion:'gymbro',voice:'Talk to the claw!'},
 trixie:{img:'b_trixie',name:'TRIXIE TRIMMER',title:'SCISSOR SISTER #1 · THE WAXECUTIONER',h:300,hp:500,spd:120,
  lines:['Her wax is 900 degrees. Her heart is colder.','Has heard every scream. Enjoyed every one.'],taunt:['This might sting a little!','Brazilian? Don\'t mind if I DO!','Hold your breath, honey!'],atk:['whip','wax','slam'],minion:'raccoon',voice:'This might sting a little.'},
 shearleen:{img:'b_shearleen',name:'BIG SHEARLEEN',title:'QUEEN OF THE SCISSOR SISTERS',h:350,hp:820,spd:120,
  lines:['Built a giant robot instead of going to therapy.','Her beehive has its own zip code.'],taunt:['Bow before the BEEHIVE!','Hot flash MODE!','You girls need a TRIM!'],atk:['chop','dryer','stomp','summon'],minion:'clipper',voice:'Bow before the beehive, tacos!'}};
const LEVELS=[
 {name:'Taco Tuesday Turf War',sub:'A strip mall that time (and the health department) forgot',bg:'bg1',song:'w1',pool:['karen','mallcop','clipper'],surprise:'roomba',surpriseName:'A ROOMBA WITH A KNIFE',boss:'karen',waves:[4,5,6],
  intro:'Somebody ate the last Taco Tuesday special. The Scissor Sisters\' goons are blaming YOU.'},
 {name:'Bachelorette Bus Brawl',sub:'Party-bus rooftop, Las Vegas Strip, 2 AM',bg:'bg2',song:'w2',pool:['bachelorette','elvis','clipper'],surprise:'flamingo',surpriseName:'A POOL FLOAT WITH ANGER ISSUES',boss:'snippy',waves:[5,6,7],
  intro:'Twelve bridesmaids, one bus, zero dignity. Snippy is on board with her shears.'},
 {name:'Hot Yoga Hell',sub:'Thermostat: 120°F. Smell: indescribable.',bg:'bg3',song:'w3',pool:['gymbro','yogi','clipper'],surprise:'thigh',surpriseName:'A HAUNTED THIGH-MASTER',boss:'clippy',waves:[5,7,8],
  intro:'Clippy runs a "wellness studio" that is mostly a nail-tech laundering front.'},
 {name:'Sasquatch Spa Smackdown',sub:'Five stars on Bigfoot\'s Yelp. One star on everyone else\'s.',bg:'bg4',song:'w4',pool:['bigfoot','raccoon','clipper'],surprise:'mime',surpriseName:'A MIME. WHY IS THERE A MIME.',boss:'trixie',waves:[6,7,8],
  intro:'Trixie Trimmer is waxing the whole forest. The raccoons are furious. Bigfoot is... smooth.'},
 {name:'The Salon of Doom',sub:'Scissor Sisters HQ. Hairspray levels: illegal.',bg:'bg5',song:'w5',pool:['clipper','karen','bachelorette','gymbro','bigfoot','elvis'],surprise:'party',surpriseName:'SURPRISE PARTY! (EVERY WEIRDO AT ONCE)',boss:'shearleen',waves:[7,8,10],
  intro:'Big Shearleen is waiting. So is her giant salon robot. So is her overdue therapy bill.'}];
const PICK={
 burrito:{img:'p_burrito',name:'BEAN BURRITO',quip:'BEAN THERE, DONE THAT',gas:60},
 wine:{img:'p_wine',name:'BOXED WINE',quip:'MOMMY JUICE! +40 HP',hp:40},
 marg:{img:'p_marg',name:'MARGARITA',quip:'LIQUID COURAGE! (dmg up, aim down)',hp:20,tipsy:7},
 spanx:{img:'p_spanx',name:'SPANX OF INVINCIBILITY',quip:'SUCKED IN & UNSTOPPABLE',inv:8},
 yogurt:{img:'p_yogurt',name:'EXPIRED YOGURT',quip:'LIVE CULTURES (VERY LIVE)',yog:1},
 divorce:{img:'p_divorce',name:'DIVORCE PAPERS',quip:'SHE GETS THE HOUSE! (screen clear)',nuke:1}};
const RANKS=[[5,'MILDLY RUDE'],[10,'RAUNCHY'],[18,'HR VIOLATION'],[28,'BANNED IN UTAH'],[40,'YOUR MOM SAW THAT'],[60,'ABSOLUTE FILTH'],[90,'GOD HAS LOOKED AWAY']];
const rankOf=c=>{let r='';for(const[n,t]of RANKS)if(c>=n)r=t;return r};
const POP={bump:['BUMP!','BOING!','HONK!','BOOB-ONK!','JIGGLE!'],bump3:['DOUBLE-D-STRUCTION!','TITANIC BUMP!','BOOBQUAKE!','JUGGERNAUT!'],motor:['BRRRRRR!','PBBBBT!','BLBLBLBL!','VRRRRM!'],
 gas:['PFFFT!','FWOOMP!','PHHBBT!','SILENT BUT VIOLENT','QUEEF BLAST!','TOOT TOOT!'],butt:['BUTT BOMB!','CHEEKQUAKE!','DONK!'],scissor:['SCISSOR LOCK!','THIGH-PRISON!','TAPPED OUT!']};
const CUTS={
 weather:{img:'cut_weather',cap:'MEANWHILE, at Channel 8 Weather: "Folks... that is NOT a cold front. Close your windows. Close your SOULS."'},
 beans:{img:'cut_beans',cap:'MEANWHILE, at the bean factory: "She ate ANOTHER one! Shovel faster, Gary! SHOVEL FOR YOUR LIFE!"'},
 grandma:{img:'cut_grandma',cap:'MEANWHILE, at St. Agnes Bingo Night: Grandma felt that motorboat in her dentures. Three deacons fainted.'},
 space:{img:'cut_space',cap:'MEANWHILE, aboard the International Space Station: "Houston... we have a smell."'}};
const LOSE=['You got SNIPPED.','The Scissor Sisters left you a 1-star review.','Your mom saw that. She\'s not mad, just disappointed.','You have been given BANGS. Forever.','Even the raccoon is laughing at you.'];
const WINL=['The Scissor Sisters were sentenced to 10,000 hours of community service: cutting their own bangs.','Big Shearleen\'s robot was sold for scrap. It is now 400 hair dryers at a Ross.','Las Vegas declared a state of emergency for air quality. The twins declared a 3-day hangover.'];
/* ---------------- layout ---------------- */
const pad=$('pad'),hud=$('hud'),ui=$('ui');
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
 portrait=H>W*1.08;
 if(portrait){GH=Math.round(Math.min(H-270,W*1.48));GT=0}else{GH=H;GT=0}
 VHv=portrait?540:Math.min(540,Math.max(420,GH*1.05));S=GH/VHv;viewW=W/S;RM=portrait?30:Math.min(viewW*0.25,(Math.min(104,H*0.24)+40)/S);layoutPad()}
function place(el,x,y,sz){el.style.left=x+'px';el.style.top=y+'px';el.style.width=sz+'px';el.style.height=sz+'px'}
function layoutPad(){const hint=$('swipeHint');const sb=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab'))||0;
 if(portrait){const top=GH,ph=H-GH;const a=Math.min(112,ph*0.52),s=Math.min(90,ph*0.42),c=Math.min(80,ph*0.38);
  const cy=top+ph*0.56;place($('bAttack'),W-a-14,cy-a/2,a);place($('bSpecial'),W-a-s-26,cy-s/2+a*0.22,s);place($('bScissor'),W-a-s*0.5-c-30,cy-c/2-a*0.42,c);
  hint.style.top=(top+8)+'px';hint.style.bottom='';hint.style.left='8px';hint.style.right=(a+s+40)+'px';hint.style.textAlign='left';hint.style.fontSize='11px'}
 else{const a=Math.min(104,H*0.24),s=Math.min(86,H*0.2),c=Math.min(74,H*0.18);
  place($('bAttack'),W-a-18,H-a-16,a);place($('bSpecial'),W-a-s-30,H-s-12,s);place($('bScissor'),W-a/2-c/2-18,H-a-c-26,c);
  hint.style.top='';hint.style.bottom='10px';hint.style.left='12px';hint.style.right=(a+s+50)+'px';hint.style.textAlign='left';hint.style.fontSize='10px'}}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,200));
/* ---------------- input ---------------- */
const K={};const VIRT={atk:0,sp:0,sc:0};const TOUCH=new Map();
const inp={L:0,R:0,jumpP:0,downP:0,atkP:0,spDown:0,spHeld:0,spRel:0,scP:0};
let swJump=0,swDown=0,atkBuf=0,spT0=0;
const KEYMAP={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',Space:'U',KeyJ:'A',KeyZ:'A',KeyK:'S',KeyX:'S',KeyL:'C',KeyC:'C',KeyT:'T'};
addEventListener('keydown',e=>{AU.unlock();const k=KEYMAP[e.code];if(!k){if(e.code==='KeyP'||e.code==='Escape'){if(state==='play')pauseGame();else if(state==='pause')resumeGame()}if(e.code==='KeyM')AU.mute(!AU.muted);return}
 e.preventDefault();if(e.repeat)return;K[k]=1;if(k==='U')swJump=1;if(k==='D')swDown=1;if(k==='A')atkBuf=0.15;if(k==='S')spPress();if(k==='C')inp.scP=1;if(k==='T')tryTag()});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k){K[k]=0;if(k==='S')spRelease()}});
function swipeDir(t){let dx=t.x-t.ax,dy=t.y-t.ay;const d=Math.hypot(dx,dy);const o={};if(d<16)return o;if(d>46){t.ax=t.x-dx/d*46;t.ay=t.y-dy/d*46}
 const s=Math.round(Math.atan2(dy,dx)/(Math.PI/4));if(s===0||s===1||s===-1)o.R=1;if(s===4||s===-4||s===3||s===-3)o.L=1;if(s===2)o.D=1;if(s===-2||s===-1||s===-3)o.U=1;return o}
function tStart(id,x,y){AU.unlock();TOUCH.set(id,{x,y,ax:x,ay:y,z:{}})}
function tMove(id,x,y){const t=TOUCH.get(id);if(!t)return;t.x=x;t.y=y;const bu=t.z.U,bd=t.z.D;t.z=swipeDir(t);if(t.z.U&&!bu)swJump=1;if(t.z.D&&!bd)swDown=1}
function tEnd(id){TOUCH.delete(id)}
cv.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)tStart(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)tMove(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchend',e=>{e.preventDefault();for(const t of e.changedTouches)tEnd(t.identifier)},{passive:false});
cv.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)tEnd(t.identifier)});
let md=false;cv.addEventListener('mousedown',e=>{md=true;tStart('m',e.clientX,e.clientY)});addEventListener('mousemove',e=>{if(md)tMove('m',e.clientX,e.clientY)});addEventListener('mouseup',()=>{if(md){md=false;tEnd('m')}});
function bindBtn(el,on,off){const a=e=>{e.preventDefault();e.stopPropagation();AU.unlock();el.classList.add('on');on&&on()},b=e=>{e.preventDefault();e.stopPropagation();el.classList.remove('on');off&&off()};
 el.addEventListener('touchstart',a,{passive:false});el.addEventListener('touchend',b,{passive:false});el.addEventListener('touchcancel',b,{passive:false});el.addEventListener('mousedown',a);el.addEventListener('mouseup',b);el.addEventListener('mouseleave',e=>{if(el.classList.contains('on'))b(e)});el.addEventListener('contextmenu',e=>e.preventDefault())}
function spPress(){inp.spDown=1;spT0=performance.now()}
function spRelease(){if(!inp.spDown)return;inp.spDown=0;inp.spRel=(performance.now()-spT0)/1000}
bindBtn($('bAttack'),()=>{atkBuf=0.15});bindBtn($('bSpecial'),spPress,spRelease);bindBtn($('bScissor'),()=>{inp.scP=1});
function readInput(dt){let L=K.L,R=K.R;for(const t of TOUCH.values()){if(t.z.L)L=1;if(t.z.R)R=1}
 inp.L=L?1:0;inp.R=R?1:0;inp.jumpP=swJump;inp.downP=swDown;swJump=0;swDown=0;inp.atkP=atkBuf>0?1:0;atkBuf=Math.max(0,atkBuf-dt);
 inp.spHeld=inp.spDown?(performance.now()-spT0)/1000:0}
/* ---------------- game state ---------------- */
let state='load',G=null,tG=0;
const DIFF=[{n:'LIGHTWEIGHT',tk:0.55,eh:0.8},{n:'NORMAL',tk:1,eh:1},{n:'SAVAGE',tk:1.45,eh:1.25}];
const dif=()=>DIFF[SAVE.diff]||DIFF[1];
function newGame(li){const lv=LEVELS[li];const segs=[];
 const waveX=[760,1800,2840],bossX=3900;
 G={li,lv,t:0,camX:0,lock:null,enemies:[],projs:[],pickups:[],props:[],fx:[],pops:[],bubbles:[],hazards:[],
  twins:{rosa:{hp:100},lupe:{hp:100}},active:SAVE.twin||'rosa',tagCd:0,
  waves:lv.waves.map((n,i)=>({x:waveX[i],n,done:false,started:false,queue:[],spawnT:0,surprise:i===1})),bossX,boss:null,phase:'walk',
  score:0,combo:0,comboT:0,maxCombo:0,stats:{gas:0,nado:0,motor:0,brr:0,ko:0,bumps:0,scissor:0,picks:0},
  hitstop:0,shake:0,slow:1,slowT:0,cine:null,flashT:0,banner:null,goT:0,endT:0,cutQ:[],levelLen:bossX+700,tipsy:0,wob:0};
 G.P=mkPlayer(140);
 [[1250,'box'],[2300,'box'],[3350,'box']].forEach(([x])=>G.props.push({x,y:GROUND,hp:2,w:70,h:70,flash:0,shake:0}));
 G.pickups.push(mkPick(pick(['burrito','wine']),1500,GROUND));
 return G}
function mkPlayer(x){return{x,y:GROUND,vx:0,vy:0,face:1,onG:1,st:'idle',stT:0,step:0,lastAtk:-9,hitDone:false,inv:1,gas:50,sass:0,spanx:0,slowT:0,bangs:0,grab:null,grabT:0,grabHits:0,grabTick:0,walkT:0,land:0,air:0,tipsy:0}}
const tw=()=>TWINS[G.active];
function mkEnemy(type,x,opts){const d=ET[type];const e={type,d,x,y:GROUND,vx:0,vy:0,face:-1,hp:d.hp*dif().eh,max:d.hp*dif().eh,st:'walk',stT:0,atkCd:rnd(0.8,1.6),flash:0,gasT:0,daze:0,sayT:rnd(2,5),bob:Math.random()*6,hitBy:0,carry:null,flexT:rnd(3,6),dash:0};
 Object.assign(e,opts||{});G.enemies.push(e);return e}
function mkPick(k,x,y){return{k,x,y,vy:-300,t:0,life:14}}
/* ---------- fx helpers ---------- */
function pop(x,y,txt,col,size,life){G.pops.push({x,y,txt,col:col||'#ffe14d',size:size||34,t:0,life:life||0.9,rot:rnd(-0.18,0.18)})}
function bubble(e,txt,life){G.bubbles=G.bubbles.filter(b=>b.e!==e);G.bubbles.push({e,txt,t:0,life:life||1.8})}
function burst(x,y,n,cols,spd,grav,size,kind){for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),v=rnd(spd*0.3,spd);G.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*0.3,g:grav,t:0,life:rnd(0.4,0.9),c:pick(cols),s:rnd(size*0.5,size),k:kind||'dot',r:rnd(0,6)})}}
function gasPuff(x,y,n,big){for(let i=0;i<n;i++)G.fx.push({x:x+rnd(-20,20),y:y+rnd(-20,20),vx:rnd(-60,60),vy:rnd(-80,-10),g:-20,t:0,life:rnd(0.6,1.2),c:pick(['#ff9be0','#ffc2ef','#d8ff9b','#ffd1f5']),s:rnd(big?30:14,big?60:30),k:'puff',r:0})}
function shake(v){G.shake=Math.max(G.shake,v)}
function hitstop(v){G.hitstop=Math.max(G.hitstop,v)}
function addScore(v){G.score+=Math.round(v*(1+Math.min(G.combo,60)*0.05))}
function comboHit(){G.combo++;G.comboT=2.2;if(G.combo>G.maxCombo)G.maxCombo=G.combo;const r=rankOf(G.combo),pr=rankOf(G.combo-1);if(r&&r!==pr){G.banner={txt:r,sub:G.combo+' HIT COMBO',t:0,life:1.4,col:'#ffe14d'};sfx('horn');if(G.combo>=18)say(r.toLowerCase(),0.5)}}
function cutaway(k){if(SAVE.seenCut[k]&&Math.random()<0.6)return;SAVE.seenCut[k]=1;save();G.cutQ.push(k)}
/* ---------- combat ---------- */
function front(P,e,reach,back){const dx=(e.x-P.x)*P.face;const half=e.w?e.w*0.5:(e.d?e.d.h*0.25:30);return dx>-(back||20)-half&&dx<reach+half}
function hurtEnemy(e,dmg,kb,o){o=o||{};if(e.st==='dead'||e.st==='fly'||e.st==='enter')return false;
 if(!e.boss&&e.d.flex&&e.st==='flex'&&!o.gas&&!o.pierce){pop(e.x,e.y-e.d.h-10,'NOPE, FLEXING','#9cf',22);sfx('boing');G.P.vx=-G.P.face*300;return false}
 if(!e.boss&&e.d.wall&&o.gas&&e.st!=='daze'&&e.face===-sgn(o.dir||1)){pop(e.x,e.y-e.d.h-10,'(MIMES A WALL)','#fff',22);return 'block'}
 const P=G.P;dmg*=(P.tipsy>0?1.3:1);e.hp-=dmg;e.flash=1;comboHit();addScore(dmg*8);G.sassAdd=(G.sassAdd||0);
 P.sass=Math.min(100,P.sass+(o.gas?1.5:o.motor?3:4));
 if(o.gas)e.gasT=Math.max(e.gasT,2.4);
 if(e.boss){e.vx+=kb*0.12;if(e.hp<=0)killBoss(e);else if(Math.random()<0.18&&e.sayT<=0){bubble(e,pick(e.B.taunt));e.sayT=3}return true}
 if(e.hp<=0){killEnemy(e,kb,o);return true}
 if(e.st==='grabbed')return true;
 e.vx=kb;if(o.launch){e.vy=-520;e.y-=2}
 if(o.daze){e.st='daze';e.stT=o.daze;e.daze=o.daze}else if(e.st!=='daze'){e.st='hurt';e.stT=0.28}
 if(e.sayT<=0&&Math.random()<0.35){bubble(e,pick(e.d.hit));e.sayT=3}
 return true}
function killEnemy(e,kb,o){e.st='fly';e.vx=(kb||sgn(e.x-G.P.x)*500)*1.4+sgn(kb||1)*200;e.vy=-700;e.spin=rnd(8,14)*sgn(e.vx);e.stT=0;G.stats.ko++;addScore(e.d.score);
 bubble(e,pick(e.d.die),1.6);sfx('eoof');burst(e.x,e.y-e.d.h*0.5,14,['#fff','#ffe14d','#ff3fae'],520,900,9,'star');hitstop(0.07);shake(8);
 if(Math.random()<0.75)G.pickups.push(Object.assign(mkPick('tip',e.x,e.y-60),{vy:-420,vx:rnd(-80,80)}));
 if(e.carry)G.pickups.push(mkPick(e.carry,e.x,e.y-60));
 else if(Math.random()<0.16)G.pickups.push(mkPick(randPick(),e.x,e.y-60))}
function randPick(){const r=Math.random()*100;return r<30?'burrito':r<55?'wine':r<68?'marg':r<77?'spanx':r<91?'yogurt':'divorce'}
function hurtPlayer(dmg,fromX,o){const P=G.P;o=o||{};if(P.inv>0||P.spanx>0||P.st==='cine'||G.cine||state!=='play')return false;
 if(P.st==='grab'&&P.grab){const e=P.grab;e.st='hurt';e.stT=0.3;P.grab=null}
 dmg*=dif().tk;G.twins[G.active].hp-=dmg;P.st='hurt';P.stT=0.38;P.vx=sgn(P.x-fromX)*340;if(P.onG){P.vy=-260;P.onG=0}P.inv=1.1;
 G.combo=0;G.comboT=0;pop(P.x,P.y-tw().h-10,pick(['OW!','HEY!','RUDE!','MY HAIR!','OOF!','WTF?!']),'#ff5d5d',30);sfx('hurt');shake(10);hitstop(0.06);
 burst(P.x,P.y-90,10,['#fff','#ff5d5d'],400,800,8,'star');
 if(o.slow){P.slowT=Math.max(P.slowT,o.slow)}
 if(G.twins[G.active].hp<=0){G.twins[G.active].hp=0;const other=G.active==='rosa'?'lupe':'rosa';
  if(G.twins[other].hp>0){G.banner={txt:'TAG! YOU\'RE IN, SIS!',sub:TWINS[G.active].name+' needs a nap',t:0,life:1.8,col:'#7ed321'};swapTwin(true)}
  else{gameOver()}}
 return true}
function swapTwin(forced){const P=G.P;G.active=G.active==='rosa'?'lupe':'rosa';P.st='idle';P.stT=0;P.inv=1.4;P.grab=null;G.tagCd=4;
 burst(P.x,P.y-90,26,['#ff3fae','#ffe14d','#7ed321','#fff'],600,700,9,'conf');sfx(forced?'scratch':'pickup');pop(P.x,P.y-tw().h-20,'TAG!','#ffe14d',40);updateTagBtn()}
function tryTag(){if(state!=='play'||!G||G.cine||G.tagCd>0)return;const other=G.active==='rosa'?'lupe':'rosa';if(G.twins[other].hp<=5){pop(G.P.x,G.P.y-tw().h-10,'SIS IS STILL NAPPING','#fff',20);return}
 if(['grab','cine'].includes(G.P.st))return;swapTwin(false)}
function updateTagBtn(){if(!G)return;const other=G.active==='rosa'?'lupe':'rosa';$('tagImg').src='art/'+other+'.webp?v=1';$('bTag').classList.toggle('cd',G.tagCd>0||G.twins[other].hp<=5)}
$('bTag').addEventListener('click',e=>{e.stopPropagation();tryTag()});$('bTag').addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();AU.unlock();tryTag()},{passive:false});
/* ---------- player ---------- */
function useAtk(){atkBuf=0;inp.atkP=0}
function updatePlayer(dt){const P=G.P,T=tw();P.stT-=dt;P.inv-=dt;P.spanx-=dt;P.slowT-=dt;P.tipsy-=dt;P.land-=dt;
 const busy=['atk','hurt','special','grab','bomb','cine','airatk'].includes(P.st)&&P.stT>0||P.st==='grab'||P.st==='bomb'||P.st==='cine';
 let mv=(inp.R-inp.L);if(P.tipsy>0)mv+=Math.sin(G.t*2.3)*0.35;
 const spd=T.spd*(P.slowT>0?0.55:1)*(P.spanx>0?1.15:1);
 if(P.st==='cine')return;
 /* grab: motorboat mayhem */
 if(P.st==='grab'){const e=P.grab;P.vx=0;if(!e||e.st!=='grabbed'){P.st='idle';P.grab=null}else{
  e.x=P.x+P.face*72;e.y=GROUND;P.grabT-=dt;P.grabTick-=dt;
  if(inp.atkP){useAtk();P.grabTick=Math.min(P.grabTick,0)}
  if(P.grabTick<=0&&P.grabHits<12){P.grabTick=0.2;P.grabHits++;G.stats.brr++;sfx('buzz');shake(4);hitstop(0.03);
   e.hp-=4*T.bump;e.flash=1;comboHit();addScore(40);P.sass=Math.min(100,P.sass+3);
   pop(e.x+rnd(-30,30),e.y-e.d.h*0.7+rnd(-30,20),pick(POP.motor),pick(['#ff3fae','#ffe14d','#fff']),rnd(22,34),0.6);
   burst(e.x,e.y-e.d.h*0.6,4,['#fff','#ffd1f0'],300,600,6,'dot')}
  if(P.grabT<=0||P.grabHits>=12||e.hp<=0){/* toss */P.st='atk';P.stT=0.3;P.grab=null;G.stats.motor++;
   e.st='hurt';e.stT=0.2;e.thrown=0.9;e.vx=P.face*820;e.vy=-460;pop(e.x,e.y-e.d.h-20,'MOTORBOAT MAYHEM!','#ff3fae',36,1.2);sfx('boing');shake(12);hitstop(0.1);
   if(e.hp<=0){e.hp=0.001}
   if(G.stats.motor===1||Math.random()<0.15)setTimeout(()=>cutaway('grandma'),600)}}
  return}
 /* butt bomb */
 if(P.st==='bomb'){P.vy=1600;P.vx*=0.9;P.x+=P.vx*dt;P.y+=P.vy*dt;if(P.y>=GROUND){P.y=GROUND;P.onG=1;P.st='atk';P.stT=0.3;P.vy=0;
  sfx('slam');sfx('pfft');shake(16);hitstop(0.08);gasPuff(P.x,GROUND-20,10,true);burst(P.x,GROUND-10,18,['#c9a27a','#fff'],500,900,8,'dot');
  G.fx.push({k:'ring',x:P.x,y:GROUND,t:0,life:0.4,r:170,c:'#ffd1f0'});pop(P.x,P.y-T.h-20,pick(POP.butt),'#ffe14d',40);
  for(const e of G.enemies)if(Math.abs(e.x-P.x)<175&&Math.abs(e.y-GROUND)<60)hurtEnemy(e,16*T.bump,sgn(e.x-P.x)*420,{daze:1.3,launch:1})}
  return}
 /* horizontal */
 if(!busy||P.st==='airatk'){const target=mv*spd;const acc=P.onG?T.acc:T.acc*0.55;
  if(P.st!=='airatk'){if(Math.abs(target-P.vx)<acc*dt)P.vx=target;else P.vx+=sgn(target-P.vx)*acc*dt}
  if(mv)P.face=sgn(mv)}
 else if(P.onG)P.vx*=Math.pow(0.0015,dt);
 /* jump */
 if(inp.jumpP&&P.onG&&!busy){P.vy=-940;P.onG=0;sfx('jump');P.st='air';burst(P.x,GROUND,6,['#fff','#ddd'],180,300,6,'dot')}
 if(inp.downP&&!P.onG&&!busy){P.st='bomb';P.vy=1600;sfx('swish');return}
 /* gravity */
 if(!P.onG){P.vy+=2300*dt;P.y+=P.vy*dt;if(P.y>=GROUND){P.y=GROUND;P.vy=0;P.onG=1;P.land=0.12;sfx('land');if(P.st==='air'||P.st==='airatk')P.st='idle'}}
 P.x+=P.vx*dt;
 const L=G.lock?G.lock.l+40:40,R=G.lock?G.lock.r-40:G.levelLen-40;P.x=clamp(P.x,Math.max(L,G.camX+30),Math.min(R,G.camX+viewW-RM));
 /* attack */
 if(inp.atkP&&!busy){useAtk();
  if(!P.onG){P.st='airatk';P.stT=0.32;P.hitDone=false;P.vx=P.face*480;P.vy=Math.min(P.vy,-120);sfx('swish')}
  else{const dz=G.enemies.find(e=>e.st==='daze'&&!e.boss&&front(P,e,120,30));
   if(dz){P.st='grab';P.grab=dz;dz.st='grabbed';P.grabT=1.9;P.grabHits=0;P.grabTick=0.12;P.face=sgn(dz.x-P.x)||P.face;pop(P.x,P.y-T.h-20,'MOTORBOAT!','#ff3fae',34);say('motorboat!',T.voice);return}
   P.step=(G.t-P.lastAtk<0.55)?(P.step+1)%3:0;P.lastAtk=G.t;P.st='atk';P.stT=P.step===2?0.42:0.26;P.hitDone=false;P.vx=P.face*(P.step===2?380:200);sfx('swish')}}
 if((P.st==='atk'||P.st==='airatk')&&!P.hitDone&&P.stT>0){const el=(P.st==='airatk'?0.32:(P.step===2?0.42:0.26))-P.stT;
  if(el>0.06){let any=false;const big=P.step===2&&P.st==='atk';const reach=P.st==='airatk'?120:big?130:110;
   for(const e of G.enemies){if(Math.abs(e.y-P.y)>(e.boss?260:150))continue;if(!front(P,e,reach))continue;
    const ok=hurtEnemy(e,(big?15:P.st==='airatk'?12:8)*T.bump,P.face*(big?560:180),{daze:big&&!e.boss?1.5:0,launch:big});if(ok===true)any=true}
   for(const pr of G.props)if(pr.hp>0&&front(P,pr,reach)){hitProp(pr);any=true}
   P.hitDone=el>0.16||any;
   if(any){G.stats.bumps++;sfxBoing();hitstop(big?0.09:0.045);shake(big?9:4);const fx=P.x+P.face*80;
    pop(fx,P.y-T.h*0.65,big?pick(POP.bump3):pick(POP.bump),big?'#ff3fae':'#ffe14d',big?38:28);burst(fx,P.y-T.h*0.6,big?16:8,['#fff','#ffe14d','#ff9be0'],big?600:380,700,big?10:7,'star')}}}
 /* special: queef */
 if(inp.spRel&&!busy){const held=inp.spRel;inp.spRel=0;
  if(held>0.5&&P.gas>=100){queefNado()}
  else if(P.gas>=22){P.gas-=22/T.gas*1;P.gas=Math.max(0,P.gas);P.st='special';P.stT=0.42;P.vx=-P.face*60;G.stats.gas++;sfx('gas');
   setTimeout(()=>{if(!G||state!=='play')return;G.projs.push({k:'gas',x:P.x+P.face*30,y:P.y-70,vx:P.face*520,vy:0,r:30,t:0,life:0.95,dmg:12*T.gas,own:'p',hit:new Set(),dir:P.face});gasPuff(P.x,P.y-60,8)},110);
   pop(P.x-P.face*30,P.y-T.h-10,pick(POP.gas),'#b6ff5c',30)}
  else{sfx('pfft');pop(P.x,P.y-T.h-10,'OUT OF GAS! EAT A BURRITO','#b6ff5c',20);gasPuff(P.x-P.face*20,P.y-60,2)}}
 else if(inp.spRel)inp.spRel=0;
 if(inp.spDown&&inp.spHeld>0.5&&P.gas>=100&&!busy){inp.spDown=0;inp.spRel=0;$('bSpecial').classList.remove('on');queefNado()}
 /* scissor */
 if(inp.scP){inp.scP=0;if(P.sass>=100&&!busy&&P.onG){const tg=G.enemies.filter(e=>!['dead','fly','enter'].includes(e.st)&&Math.abs(e.x-P.x)<560).sort((a,b)=>Math.abs(a.x-P.x)-Math.abs(b.x-P.x))[0];
  if(tg)startScissor(tg);else pop(P.x,P.y-T.h-10,'NOBODY TO SQUEEZE','#fff',20)}else if(P.sass<100)pop(P.x,P.y-T.h-10,'NOT SASSY ENOUGH YET','#fff',20)}
 if(P.st==='atk'&&P.stT<=0||P.st==='special'&&P.stT<=0||P.st==='hurt'&&P.stT<=0&&P.onG)P.st=P.onG?'idle':'air';
 if(Math.abs(P.vx)>30&&P.onG)P.walkT+=dt*(Math.abs(P.vx)/T.spd)*11;
 /* bench heal */
 const other=G.active==='rosa'?'lupe':'rosa';if(G.twins[other].hp>0)G.twins[other].hp=Math.min(100,G.twins[other].hp+dt*2.2);
 G.tagCd-=dt}
function queefNado(){const P=G.P;P.gas=0;P.st='special';P.stT=0.7;G.stats.nado++;sfx('gasbig');shake(14);say('queef-nado!',tw().voice);
 G.banner={txt:'QUEEF-NADO!!!',sub:'Air quality: HAZARDOUS',t:0,life:1.5,col:'#b6ff5c'};
 G.projs.push({k:'nado',x:P.x+P.face*60,y:GROUND,vx:P.face*230,vy:0,r:110,t:0,life:3.0,dmg:7,own:'p',tick:0,dir:P.face});
 if(G.stats.nado===1||Math.random()<0.3)setTimeout(()=>cutaway('weather'),900)}
function hitProp(pr){pr.hp--;pr.flash=1;pr.shake=0.25;sfx('thud');burst(pr.x,pr.y-35,6,['#c9a27a','#8a5a2b'],300,800,7,'dot');
 if(pr.hp<=0){burst(pr.x,pr.y-35,18,['#c9a27a','#8a5a2b','#fff'],600,900,10,'dot');G.pickups.push(mkPick(randPick(),pr.x,pr.y-40));pop(pr.x,pr.y-90,pick(['LOOT!','OOH, GOODIES','FINDERS KEEPERS']),'#fff',24);addScore(50)}}
/* ---------- scissor finisher cinematic ---------- */
function startScissor(tg){const P=G.P;P.sass=0;P.st='cine';G.stats.scissor++;
 G.cine={t:0,tg,x0:P.x,face:sgn(tg.x-P.x)||1,dealt:false,partner:G.twins[G.active==='rosa'?'lupe':'rosa'].hp>0};P.face=G.cine.face;
 if(!tg.boss){tg.st='grabbed'}sfx('scratch');sfx('ooh');say(G.cine.partner?'double twin scissor lock!':'scissor lock!',tw().voice);
 G.banner={txt:G.cine.partner?'DOUBLE TWIN SCISSOR LOCK':'SCISSOR LOCK!',sub:'(it\'s a WRESTLING move, Mom)',t:0,life:2.2,col:'#ffe14d'}}
function updateCine(dt){const c=G.cine,P=G.P,e=c.tg,T=tw();c.t+=dt;if(c.t<0.6){const lo=G.camX+(portrait?150:210),hi=G.camX+viewW-RM-(portrait?150:215),tx2=lo>hi?(lo+hi)/2:clamp(e.x,lo,hi);e.x+=(tx2-e.x)*Math.min(1,dt*12)}const eh=e.boss?e.B.h:e.d.h;const hx=e.x-c.face*(e.boss?e.w*0.25:16),hy=GROUND-eh*0.8;
 if(c.t<0.45){const k=c.t/0.45;P.x=c.x0+(hx-c.x0)*k;P.y=GROUND+(hy-GROUND)*Math.sin(k*Math.PI*0.5)-Math.sin(k*Math.PI)*80}
 else if(c.t<1.9){P.x=hx+Math.sin(c.t*40)*3;P.y=hy;if(!e.boss)e.wob=Math.sin(c.t*30)*0.08;if(Math.floor(c.t*6)!==Math.floor((c.t-dt)*6)){sfx('squeeze');shake(5);e.flash=0.45;
   if(Math.floor(c.t*6)%2)pop(e.x+rnd(-50,50),GROUND-eh-rnd(20,70),pick(['SQUEEZE!','TAP OUT!','SAY UNCLE!','THIGHS OF FURY!','CRUNCH!','OH NO NOT THE THIGHS']),pick(['#ffe14d','#ff3fae','#fff']),rnd(24,32),0.6);comboHit()}}
 else if(c.t<2.35){const k=(c.t-1.9)/0.45;if(!e.boss)e.wob=c.face*k*1.3;P.y=hy+(GROUND-60-hy)*k;if(!c.dealt&&k>0.8){c.dealt=true;sfx('slam');shake(26);hitstop(0.18);
   burst(e.x,GROUND-10,30,['#fff','#ffe14d','#c9a27a','#ff3fae'],800,900,12,'star');G.fx.push({k:'ring',x:e.x,y:GROUND,t:0,life:0.5,r:260,c:'#ffe14d'});
   pop(e.x,GROUND-eh-30,pick(POP.scissor),'#ff3fae',52,1.4);
   const dmg=e.boss?e.max*(c.partner?0.16:0.12):999;if(!e.boss){e.st='hurt';e.wob=0}hurtEnemy(e,dmg,c.face*700,{pierce:1,launch:1});
   for(const o of G.enemies)if(o!==e&&Math.abs(o.x-e.x)<240)hurtEnemy(o,20,sgn(o.x-e.x)*600,{daze:1.2,launch:1,pierce:1})}}
 else if(c.t>2.7){P.y=GROUND;P.onG=1;P.vy=0;P.st='idle';P.inv=0.8;P.x=e.x-c.face*90;G.cine=null;if(G.stats.scissor===1||Math.random()<0.25)cutaway('space')}}
/* ---------- enemies ---------- */
function updateEnemy(e,dt){const P=G.P,d=e.d;e.stT-=dt;e.flash=Math.max(0,e.flash-dt*5);e.sayT-=dt;e.bob+=dt;e.atkCd-=dt;
 if(e.gasT>0){e.gasT-=dt;if(Math.random()<dt*6)gasPuff(e.x,e.y-d.h*0.7,1);e.coughT=(e.coughT||0)-dt;if(e.coughT<=0&&e.st!=='fly'){e.coughT=0.5;e.hp-=2;if(e.hp<=0)killEnemy(e,sgn(e.x-P.x)*200);else if(Math.random()<0.25)pop(e.x,e.y-d.h-5,pick(['*COUGH*','IT BURNS!','MY EYES!','WHO DID THAT?!','IS THAT... TACO?']),'#b6ff5c',20,0.8)}}
 if(e.st==='fly'){e.vy+=1500*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.rot=(e.rot||0)+e.spin*dt;if(e.y>GROUND+600||e.stT<-2.5)e.st='dead';return}
 if(e.st==='grabbed'){e.wob=Math.sin(G.t*50)*0.06;return}
 if(e.st==='enter'){e.vy+=900*dt;e.y+=e.vy*dt;if(e.y>=GROUND){e.y=GROUND;e.vy=0;e.st='walk';shake(10);sfx('thud');burst(e.x,GROUND,12,['#fff','#c9a27a'],400,800,8,'dot')}return}
 /* physics */
 if(e.y<GROUND||e.vy<0){e.vy+=2000*dt;e.y+=e.vy*dt;if(e.y>=GROUND){e.y=GROUND;e.vy=0;if(e.thrown){e.thrown=0;shake(6);sfx('thud');if(e.hp<=0.01)killEnemy(e,e.vx)}}}
 e.x+=e.vx*dt;const fr=e.y<GROUND?0.6:0.002;e.vx*=Math.pow(fr,dt);
 if(e.thrown>0){e.thrown-=dt;for(const o of G.enemies)if(o!==e&&o.st!=='fly'&&o.st!=='dead'&&Math.abs(o.x-e.x)<70&&!o.hitByThrow){o.hitByThrow=1;hurtEnemy(o,14,sgn(e.vx)*500,{launch:1});pop(o.x,o.y-o.d.h,'STRIKE!','#fff',26)}if(e.thrown<=0&&e.hp<=0.01)killEnemy(e,e.vx)}
 if(G.lock){e.x=clamp(e.x,G.lock.l-160,G.lock.r+160)}
 if(e.st==='daze'){if(e.stT<=0)e.st='walk';return}
 if(e.st==='hurt'){if(e.stT<=0)e.st='walk';return}
 const dx=P.x-e.x,dist=Math.abs(dx);if(e.st!=='dash')e.face=sgn(dx);
 /* thief */
 if(d.thief&&!e.carry&&G.pickups.some(p=>p.k!=='tip')){const p=G.pickups.filter(p=>p.k!=='tip').sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];
  if(Math.abs(p.x-e.x)<500){e.face=sgn(p.x-e.x);e.x+=e.face*d.spd*1.2*dt;if(Math.abs(p.x-e.x)<30&&p.y>=GROUND-5){e.carry=p.k;G.pickups.splice(G.pickups.indexOf(p),1);bubble(e,'MINE! ALL MINE!');sfx('beep')}return}}
 if(d.flex){e.flexT-=dt;if(e.st==='flex'){if(e.stT<=0)e.st='walk';return}if(e.flexT<=0&&dist<400){e.st='flex';e.stT=1.3;e.flexT=rnd(4,7);bubble(e,pick(['DO YOU EVEN LIFT?','*FLEXES IN YOUR GENERAL DIRECTION*','SUN\'S OUT, GUNS OUT']),1.3);return}}
 if(e.st==='wind'){if(e.stT<=0)doEnemyAttack(e);return}
 if(e.st==='dash'){e.x+=e.face*d.spd*2.8*dt;if(Math.random()<dt*20)burst(e.x-e.face*30,GROUND-10,1,['#ddd'],100,0,6,'dot');if(Math.abs(P.x-e.x)<60&&Math.abs(P.y-e.y)<(d.low?50:120))hurtPlayer(d.dmg,e.x);if(e.stT<=0){e.st='walk';e.atkCd=d.cd*rnd(0.8,1.3)}return}
 if(e.st==='strike'){if(e.stT<=0){e.st='walk';e.atkCd=d.cd*rnd(0.8,1.3)}return}
 /* movement by kind */
 let want=0;const crowd=G.enemies.filter(o=>o!==e&&o.st!=='fly'&&o.st!=='dead'&&Math.abs(o.x-e.x)<60).length;
 if(d.kind==='ranged'){if(dist>d.range)want=sgn(dx);else if(dist<d.range*0.6)want=-sgn(dx);if(e.atkCd<=0&&dist<d.range+60){e.st='wind';e.stT=0.55;return}}
 else if(d.kind==='charge'){if(dist>380)want=sgn(dx);else if(dist<150)want=-sgn(dx)*0.6;if(e.atkCd<=0&&dist<520){e.st='wind';e.stT=d.low?0.45:0.6;sfx('beep');return}}
 else if(d.kind==='hop'){want=sgn(dx);if(e.atkCd<=0&&e.y>=GROUND&&dist<420){e.vy=-760;e.vx=clamp(dx*1.4,-460,460);e.atkCd=d.cd*rnd(0.8,1.3);e.hopping=1;sfx('jump')}
  if(e.hopping&&e.y<GROUND-10&&Math.abs(P.x-e.x)<55&&Math.abs(P.y-e.y)<110){hurtPlayer(d.dmg,e.x);e.hopping=0}if(e.y>=GROUND)e.hopping=0}
 else{if(dist>d.range*0.75)want=sgn(dx);if(e.atkCd<=0&&dist<d.range&&Math.abs(P.y-e.y)<160){e.st='wind';e.stT=0.45;return}}
 if(d.wobble)want+=Math.sin(e.bob*3)*0.7;
 if(crowd&&Math.random()<0.5)want*=0.3;
 if(d.kind!=='hop'||e.y>=GROUND)e.x+=want*d.spd*dt;
 /* separation */
 for(const o of G.enemies){if(o===e||o.st==='fly'||o.st==='dead')continue;const s=o.x-e.x;if(Math.abs(s)<46)e.x-=sgn(s||Math.random()-0.5)*40*dt}
 if(e.sayT<=0&&Math.random()<dt*0.15&&dist<500){bubble(e,pick(e.d.hit),1.5);e.sayT=5}}
function doEnemyAttack(e){const P=G.P,d=e.d;
 if(d.kind==='ranged'){e.st='strike';e.stT=0.3;sfx(e.type==='karen'?'shout':'zap');
  if(e.type==='karen')G.projs.push({k:'txt',txt:pick(['MANAGER!','1 STAR!','RUDE!','CORPORATE!']),x:e.x+e.face*40,y:e.y-120,vx:e.face*330,vy:0,r:26,t:0,life:2.2,dmg:d.dmg,own:'e',col:'#fff'});
  else G.projs.push({k:'om',txt:'OM',x:e.x+e.face*40,y:e.y-90,vx:e.face*260,vy:0,r:24,t:0,life:2.6,dmg:d.dmg,own:'e',wave:1,y0:e.y-90});
  e.atkCd=d.cd*rnd(0.8,1.3);return}
 if(d.kind==='charge'){e.st='dash';e.stT=d.low?0.9:0.75;e.face=sgn(P.x-e.x);bubble(e,e.type==='roomba'?'STAB MODE ENGAGED':'HALT!!',0.9);return}
 e.st='strike';e.stT=0.25;sfx('swish');
 if(d.stomp){G.hazards.push({k:'wave',x:e.x,dir:-1,t:0,life:0.6,dmg:d.dmg*0.7,spd:420,hit:false});G.hazards.push({k:'wave',x:e.x,dir:1,t:0,life:0.6,dmg:d.dmg*0.7,spd:420,hit:false});shake(8);sfx('thud')}
 if(front({x:e.x,face:e.face},P,d.range,10)&&Math.abs(P.y-e.y)<140)hurtPlayer(d.dmg,e.x)}
/* ---------- bosses ---------- */
function spawnBoss(){const k=G.lv.boss,B=BOSS[k];const x=Math.min(G.lock.r,G.camX+viewW)-RM-B.h*0.3;
 const b={boss:1,type:k,B,d:{h:B.h,hit:B.taunt,die:B.taunt,score:5000},x,y:GROUND,vx:0,vy:0,face:-1,hp:B.hp*dif().eh,max:B.hp*dif().eh,st:'idle',stT:1.2,atkCd:1.5,flash:0,gasT:0,sayT:2,bob:0,w:B.h*0.42,phase:1,atkI:0,cur:null,minT:12};
 G.enemies.push(b);G.boss=b;return b}
function killBoss(b){b.st='fly';b.vx=sgn(b.x-G.P.x)*500;b.vy=-900;b.spin=6*sgn(b.vx);b.stT=0;G.slow=0.25;G.slowT=1.4;hitstop(0.25);shake(30);sfx('ko');sfx('ooh');
 G.banner={txt:'K.O.!!!',sub:pick(['FLAWLESS... ISH','SHE\'LL FEEL THAT TOMORROW','GET HER A RECEIPT','THAT\'S GONNA LEAVE A MARK']),t:0,life:2.4,col:'#ff3fae'};
 burst(b.x,b.y-b.B.h*0.5,60,['#ff3fae','#ffe14d','#7ed321','#fff','#6af'],900,700,12,'conf');addScore(5000);say('K.O.!',0.5);
 for(const e of G.enemies)if(e!==b&&e.st!=='fly')killEnemy(e,sgn(e.x-b.x)*600);
 G.phase='done';G.endT=3.2}
function updateBoss(b,dt){const P=G.P,B=b.B;b.stT-=dt;b.flash=Math.max(0,b.flash-dt*5);b.sayT-=dt;b.bob+=dt;b.atkCd-=dt;b.minT-=dt;
 if(b.st==='fly'){b.vy+=1300*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot=(b.rot||0)+b.spin*dt;return}
 if(b.gasT>0){b.gasT-=dt;if(Math.random()<dt*6)gasPuff(b.x,b.y-B.h*0.7,1)}
 if(b.phase===1&&b.hp<b.max*0.5){b.phase=2;b.st='rage';b.stT=1.2;sfx('roar');shake(18);G.banner={txt:b.type==='shearleen'?'HOT FLASH MODE!':'SHE\'S PISSED!',sub:B.name+' is ENRAGED',t:0,life:1.6,col:'#ff5d5d'};bubble(b,pick(B.taunt),1.6);
  for(let i=0;i<2;i++)mkEnemy(B.minion,i?G.lock.l+60:G.lock.r-60,{st:'walk'})}
 if(b.st==='rage'){if(b.stT<=0){b.st='idle';b.stT=0.4}return}
 if(b.y<GROUND||b.vy<0){b.vy+=2200*dt;b.y+=b.vy*dt;if(b.y>=GROUND){b.y=GROUND;b.vy=0;if(b.st==='leapair'){b.st='recover';b.stT=0.9;shake(20);sfx('slam');ringWave(b.x,B.h>320?1.3:1,14)}}}
 b.x+=b.vx*dt;b.vx*=Math.pow(0.02,dt);b.x=clamp(b.x,Math.max(G.lock.l,G.camX)+b.w*0.5,Math.min(G.lock.r,G.camX+viewW)-RM-b.w*0.3);
 const dx=P.x-b.x,dist=Math.abs(dx),sp=B.spd*(b.phase===2?1.3:1),cdm=b.phase===2?0.65:1;
 /* body push */
 if(dist<b.w*0.5+20&&Math.abs(P.y-b.y)<B.h*0.6&&!G.cine){P.x=b.x+sgn(dx||1)*(b.w*0.5+22)}
 if(b.st==='idle'){b.face=sgn(dx);const keep=b.type==='karen'||b.type==='trixie'?260:150;if(dist>keep+40)b.x+=sgn(dx)*sp*dt;else if(dist<keep-60)b.x-=sgn(dx)*sp*0.5*dt;
  if(b.minT<=0&&b.type==='shearleen'){b.minT=14;b.cur='summon';b.st='wind';b.stT=0.8;return}
  if(b.atkCd<=0){b.cur=B.atk[(b.atkI++)%B.atk.length];if(Math.random()<0.35)b.cur=pick(B.atk);if(b.cur==='summon'&&b.type!=='shearleen')b.cur=B.atk[0];b.st='wind';b.stT=(b.phase===2?0.55:0.8);
   if(b.sayT<=0||Math.random()<0.4){bubble(b,pick(B.taunt),1.4);b.sayT=2.5}sfx('beep')}
  return}
 if(b.st==='wind'){if(b.stT<=0)bossAttack(b,sp,cdm);return}
 if(b.st==='dash'){b.x+=b.face*b.dspd*dt;if(Math.random()<dt*25)burst(b.x-b.face*b.w*0.4,GROUND-10,1,['#ddd','#c9a27a'],120,0,9,'dot');
  if(Math.abs(P.x-b.x)<b.w*0.5+30&&Math.abs(P.y-b.y)<B.h*0.55)hurtPlayer(16,b.x);
  if(b.stT<=0||b.x<=Math.max(G.lock.l,G.camX)+b.w*0.5+2||b.x>=Math.min(G.lock.r,G.camX+viewW)-RM-b.w*0.3-2){b.st='recover';b.stT=0.8;shake(8);if(b.cur==='lunge'){sfx('snip');snipHit(b,150,14)}}return}
 if(b.st==='recover'||b.st==='act'){if(b.stT<=0){b.st='idle';b.atkCd=rnd(1.0,1.8)*cdm}return}
 if(b.st==='leapair')return}
function snipHit(b,reach,dmg){const P=G.P;burst(b.x+b.face*reach*0.6,GROUND-b.B.h*0.4,8,['#fff','#ccd'],400,600,7,'star');pop(b.x+b.face*reach*0.6,GROUND-b.B.h*0.6,'SNIP!','#fff',30);if(front({x:b.x,face:b.face},P,reach+b.w*0.4,20)&&P.y>GROUND-b.B.h*0.8)hurtPlayer(dmg,b.x)}
function ringWave(x,sc,dmg){G.hazards.push({k:'wave',x,dir:-1,t:0,life:0.9,dmg,spd:470*sc,hit:false});G.hazards.push({k:'wave',x,dir:1,t:0,life:0.9,dmg,spd:470*sc,hit:false})}
function bossAttack(b,sp,cdm){const P=G.P,B=b.B,f=b.face;b.st='act';b.stT=0.9;
 switch(b.cur){
 case'charge':b.st='dash';b.dspd=720*(b.phase===2?1.15:1);b.stT=2.2;sfx('roar');pop(b.x,GROUND-B.h-20,'CLEAN UP ON AISLE YOU!','#fff',24);break;
 case'coupons':sfx('shout');pop(b.x,GROUND-B.h-20,'COUPON STORM!','#ffe14d',30);for(let i=0;i<(b.phase===2?9:6);i++){const x=P.x+rnd(-260,260);G.hazards.push({k:'warn',x,t:-i*0.18,life:0.65,then:'coupon'})}b.stT=1.4;break;
 case'shout':sfx('shout');bubble(b,'I WANT TO SPEAK TO YOUR MANAGER!',1.6);G.projs.push({k:'sound',x:b.x+f*b.w*0.5,y:GROUND-40,vx:f*430,vy:0,r:44,t:0,life:2.2,dmg:12,own:'e'});if(b.phase===2)setTimeout(()=>G&&G.projs.push({k:'sound',x:b.x+f*b.w*0.5,y:GROUND-40,vx:f*430,vy:0,r:44,t:0,life:2.2,dmg:12,own:'e'}),500);b.stT=1.1;break;
 case'lunge':b.st='dash';b.dspd=640;b.stT=0.45;sfx('snip');break;
 case'combs':for(let i=0;i<(b.phase===2?5:3);i++)G.projs.push({k:'comb',x:b.x+f*60,y:GROUND-B.h*0.6,vx:f*rnd(220,520),vy:rnd(-760,-420),g:1500,r:22,t:0,life:3,dmg:9,own:'e',rot:0});sfx('swish');break;
 case'bangs':pop(b.x,GROUND-B.h-20,'HAIRSPRAY OF SHAME!','#9cf',26);G.projs.push({k:'spray',x:b.x+f*70,y:GROUND-55,vx:f*500,vy:0,r:36,t:0,life:2,dmg:8,own:'e',slow:3,bangs:1});sfx('pfft');break;
 case'darts':sfx('zap');for(let i=0;i<(b.phase===2?7:5);i++){const a=-0.55+i*(1.1/((b.phase===2?7:5)-1));G.projs.push({k:'nail',x:b.x+f*60,y:GROUND-B.h*0.55,vx:f*Math.cos(a)*560,vy:Math.sin(a)*560,r:14,t:0,life:2,dmg:8,own:'e'})}break;
 case'swipe':sfx('swish');setTimeout(()=>{if(G&&b.st!=='fly'){sfx('snip');snipHit(b,170,12)}},120);setTimeout(()=>{if(G&&b.st!=='fly'){sfx('snip');snipHit(b,170,12)}},400);b.stT=0.9;break;
 case'leap':b.st='leapair';b.vy=-1250;b.vx=clamp((P.x-b.x)*1.25,-900,900);pop(b.x,GROUND-B.h-20,'INCOMING NAILS!','#ff3fae',26);sfx('jump');break;
 case'whip':sfx('rip');pop(b.x+f*200,GROUND-80,'RRRRIIIIP!','#ff3fae',40);G.fx.push({k:'strip',x:b.x+f*b.w*0.3,y:GROUND-50,dir:f,t:0,life:0.35,len:360});if(front({x:b.x,face:f},P,360+b.w*0.3,10)&&P.y>GROUND-130)hurtPlayer(15,b.x);break;
 case'wax':sfx('splat');for(let i=0;i<3;i++)G.projs.push({k:'wax',x:b.x+f*50,y:GROUND-B.h*0.6,vx:f*rnd(180,520),vy:rnd(-700,-480),g:1500,r:20,t:0,life:3,dmg:6,own:'e'});break;
 case'slam':sfx('slam');shake(18);ringWave(b.x,1,13);pop(b.x,GROUND-B.h-20,'POT SLAM!','#ff3fae',30);break;
 case'chop':sfx('snip');setTimeout(()=>{if(G&&b.st!=='fly'){sfx('slam');shake(14);snipHit(b,260,18)}},200);pop(b.x,GROUND-B.h-20,'MEGA SNIP!','#fff',30);b.stT=1.1;break;
 case'dryer':sfx('zap');pop(b.x,GROUND-B.h-20,'BLOW-DRY OF DEATH!','#ff9b3d',26);[0,1,2].forEach(i=>setTimeout(()=>{if(!G||b.st==='fly')return;const hi=i%2===1;G.projs.push({k:'heat',x:b.x+f*90,y:hi?GROUND-200:GROUND-45,vx:f*520,vy:0,r:30,t:0,life:2.4,dmg:11,own:'e'});sfx('zap')},i*380));b.stT=1.4;break;
 case'stomp':sfx('slam');shake(22);ringWave(b.x,1.25,15);setTimeout(()=>{if(G&&b.st!=='fly'){sfx('slam');shake(16);ringWave(b.x,1.25,15)}},650);b.stT=1.3;break;
 case'summon':bubble(b,'GIRLS! GET THEM!',1.4);for(let i=0;i<2;i++)mkEnemy(pick(['clipper','clipper','karen','bigfoot']),i?G.lock.l+50:G.lock.r-50);b.stT=1.0;break}}
/* ---------- projectiles / hazards / pickups ---------- */
function updateProjs(dt){const P=G.P;
 for(const p of G.projs){p.t+=dt;if(p.g)p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.wave)p.y=p.y0+Math.sin(p.t*7)*40;if(p.rot!==undefined)p.rot+=dt*12;
  if(p.own==='p'){
   if(p.k==='gas'){p.r=30+p.t*70;p.vx*=Math.pow(0.4,dt);if(Math.random()<dt*30)gasPuff(p.x,p.y,1);
    for(const e of G.enemies){if(p.hit.has(e)||e.st==='fly'||e.st==='dead')continue;const eh=e.boss?e.B.h:e.d.h;if(Math.abs(e.x-p.x)<p.r+(e.w||40)*0.5&&p.y>e.y-eh-p.r&&p.y<e.y+p.r){p.hit.add(e);
     const r=hurtEnemy(e,p.dmg,p.dir*380,{gas:1,dir:p.dir,daze:e.boss?0:0.6});if(r==='block'){p.life=0;gasPuff(p.x,p.y,6);break}if(r){pop(e.x,e.y-eh*0.8,pick(['*GAG*','PEE-YEW!','EW EW EW!','IT\'S IN MY MOUTH!','WHO ATE THE TACO?!']),'#b6ff5c',24);sfx('eoof')}}}}
   if(p.k==='nado'){p.tick-=dt;if(Math.random()<dt*40)gasPuff(p.x+rnd(-60,60),GROUND-rnd(0,220),1,true);if(p.tick<=0){p.tick=0.22;
     for(const e of G.enemies){if(e.st==='fly'||e.st==='dead')continue;if(Math.abs(e.x-p.x)<p.r+(e.w||40)*0.5){hurtEnemy(e,p.dmg,0,{gas:1,pierce:1});if(!e.boss&&e.st!=='fly'){e.vy=-380;e.y-=2;e.x+=(p.x-e.x)*0.3}}}}}}
  else{const ph=tw().h;if(Math.abs(P.x-p.x)<p.r+28&&p.y>P.y-ph-p.r*0.5&&p.y<P.y+p.r*0.6){if(hurtPlayer(p.dmg,p.x-p.vx,{slow:p.slow})){if(p.bangs){pop(P.x,P.y-ph-40,'YOU GOT BANGS!!','#9cf',34,1.4);P.bangs=4}if(p.k==='wax')P.slowT=Math.max(P.slowT,2)}p.life=0}
   if(p.g&&p.y>=GROUND-6){if(p.k==='wax'){G.hazards.push({k:'puddle',x:p.x,t:0,life:5,w:110});sfx('splat')}p.life=0;burst(p.x,GROUND-8,5,p.k==='wax'?['#ff6ad5']:['#555','#999'],200,600,6,'dot')}}}
 G.projs=G.projs.filter(p=>p.t<p.life&&p.x>G.camX-600&&p.x<G.camX+viewW+600);
 for(const h of G.hazards){h.t+=dt;
  if(h.k==='wave'){h.x+=h.dir*h.spd*dt;if(!h.hit&&Math.abs(h.x-P.x)<40&&P.y>GROUND-46){h.hit=true;hurtPlayer(h.dmg,h.x-h.dir*50)}}
  if(h.k==='warn'&&h.t>=h.life){h.done=1;G.projs.push({k:'coupon',x:h.x,y:GROUND-620,vx:0,vy:640,r:24,t:0,life:2,dmg:8,own:'e',rot:0,g:200})}
  if(h.k==='puddle'&&Math.abs(h.x-P.x)<h.w*0.5&&P.onG){P.slowT=Math.max(P.slowT,0.3);if(Math.random()<dt*2)hurtPlayer(4,h.x)}}
 G.hazards=G.hazards.filter(h=>!h.done&&h.t<(h.life||1));
 for(const k of G.pickups){k.t+=dt;if(k.y<GROUND||k.vy<0){k.vy+=1500*dt;k.y+=k.vy*dt;if(k.vx)k.x+=k.vx*dt;if(k.y>=GROUND){k.y=GROUND;k.vy=k.vy>200?-k.vy*0.35:0;if(k.vx)k.vx*=0.5}}
  if(k.t>0.3&&Math.abs(P.x-k.x)<62&&P.y>k.y-150){k.got=1;collect(k.k,k)}}
 G.pickups=G.pickups.filter(k=>!k.got&&(k.k!=='tip'||k.t<10)&&k.t<(k.life||30))}
function collect(k,o){const P=G.P,T=tw();if(k==='tip'){addScore(75);sfx('tip');pop(o.x,o.y-60,pick(['TIP!','$$$','MAKE IT RAIN','SINGLES!']),'#7ed321',22,0.6);return}
 const d=PICK[k];G.stats.picks++;sfx(d.hp?'heal':'pickup');burst(P.x,P.y-90,16,['#ffe14d','#fff','#ff3fae'],400,500,8,'star');
 G.banner={txt:d.name,sub:d.quip,t:0,life:1.6,col:'#ffe14d'};const tw_=G.twins[G.active];
 if(d.gas){P.gas=Math.min(100,P.gas+d.gas);gasPuff(P.x,P.y-60,6);if(!SAVE.seenCut.beans||Math.random()<0.2)setTimeout(()=>cutaway('beans'),500)}
 if(d.hp)tw_.hp=Math.min(100,tw_.hp+d.hp);if(d.tipsy){P.tipsy=d.tipsy;say('liquid courage',T.voice)}
 if(d.inv){P.spanx=d.inv;say('sucked in and unstoppable',T.voice)}
 if(d.yog){if(Math.random()<0.5){P.gas=100;G.banner.sub='UH OH... FULL TANK!'}else{tw_.hp=Math.max(1,tw_.hp-10);P.gas=Math.min(100,P.gas+40);G.banner.sub='THAT WAS A MISTAKE (-10 HP, +GAS)';sfx('pfft')}}
 if(d.nuke){sfx('ooh');say('she gets the house!',T.voice);for(const e of G.enemies){if(e.st==='fly'||e.st==='dead')continue;if(e.boss){hurtEnemy(e,e.max*0.08,0,{pierce:1});bubble(e,'MY LAWYER WILL HEAR ABOUT THIS!')}else if(Math.abs(e.x-P.x)<viewW){bubble(e,pick(['NOT THE ALIMONY!','I\'M MOVING BACK IN WITH MOM','WHO GETS THE DOG?!']),1.4);killEnemy(e,sgn(e.x-P.x)*500)}}shake(14)}}
/* ---------- level flow ---------- */
function updateFlow(dt){const P=G.P;
 if(G.phase==='walk'){const w=G.waves.find(w=>!w.done);
  if(w&&P.x>w.x-viewW*0.15){w.started=true;G.phase='wave';G.curWave=w;const half=Math.max(viewW,660)/2;G.lock={l:w.x-half,r:w.x+half};
   const pool=G.lv.pool;for(let i=0;i<w.n;i++)w.queue.push(pool[(i+(Math.random()*pool.length|0))%pool.length]);w.spawnT=0.2;w.surT=w.surprise?4:99;sfx('scratch')}
  else if(!w&&P.x>G.bossX-viewW*0.2){G.phase='bossintro';const half=Math.max(viewW,820)/2;G.lock={l:G.bossX-half,r:G.bossX+half};G.endT=0.9}}
 if(G.phase==='wave'){const w=G.curWave;const alive=G.enemies.filter(e=>e.st!=='fly'&&e.st!=='dead').length;const maxA=portrait?3:4;
  w.spawnT-=dt;if(w.queue.length&&w.spawnT<=0&&alive<maxA){const t=w.queue.shift();const side=Math.random()<0.6?1:-1;const x=side>0?G.camX+viewW+70:G.camX-70;mkEnemy(t,clamp(x,G.lock.l-120,G.lock.r+120));w.spawnT=rnd(0.9,1.6)}
  w.surT-=dt;if(w.surT<=0){w.surT=99;surprise()}
  if(!w.queue.length&&alive===0&&w.surT>50){w.done=true;G.phase='walk';G.lock=null;G.goT=2.5;sfx('clear');pop(P.x,P.y-tw().h-30,pick(['NEXT!','WHO\'S NEXT?!','TOO EASY','HOLD MY EARRINGS']),'#ffe14d',32)}}
 if(G.phase==='bossintro'){G.endT-=dt;if(G.endT<=0&&!G.boss){spawnBoss();G.phase='boss';bossIntro()}}
 if(G.phase==='done'){G.endT-=dt;if(G.endT<=0){G.phase='over';levelClear()}}}
function surprise(){const lv=G.lv;sfx('scratch');const list=lv.surprise==='party'?['roomba','flamingo','thigh','mime']:[lv.surprise,lv.surprise];
 G.banner={txt:'⚠ SURPRISE ENEMY ⚠',sub:lv.surpriseName,t:0,life:2.2,col:'#ff5d5d'};say('wait, what?',1.3);
 list.forEach((t,i)=>{const x=G.P.x+(i%2?1:-1)*rnd(120,Math.min(260,viewW*0.42));mkEnemy(t,clamp(x,G.lock.l+40,G.lock.r-40),{st:'enter',y:GROUND-700-i*120,vy:0,chute:1})})}
/* ---------- main update ---------- */
function update(dt){G.t+=dt;
 for(const f of G.fx){f.t+=dt;if(f.k!=='ring'&&f.k!=='strip'){f.vy+=(f.g||0)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.r+=dt*6}}G.fx=G.fx.filter(f=>f.t<f.life);
 for(const p of G.pops)p.t+=dt;G.pops=G.pops.filter(p=>p.t<p.life);
 for(const b of G.bubbles)b.t+=dt;G.bubbles=G.bubbles.filter(b=>b.t<b.life&&b.e.st!=='dead');
 if(G.banner){G.banner.t+=dt;if(G.banner.t>G.banner.life)G.banner=null}
 G.shake=Math.max(0,G.shake-dt*60);G.goT-=dt;
 if(G.cutQ.length&&state==='play'&&!G.cine){showCut(G.cutQ.shift());return}
 if(G.hitstop>0){G.hitstop-=dt;return}
 if(G.slowT>0){G.slowT-=dt;dt*=G.slow;if(G.slowT<=0)G.slow=1}
 if(G.cine){updateCine(dt);return}
 updatePlayer(dt);
 for(const e of G.enemies){if(e.boss)updateBoss(e,dt);else updateEnemy(e,dt)}
 G.enemies=G.enemies.filter(e=>e.st!=='dead'&&!(e.boss&&e.st==='fly'&&e.y>GROUND+900));
 for(const pr of G.props){pr.flash=Math.max(0,pr.flash-dt*5);pr.shake-=dt}G.props=G.props.filter(p=>p.hp>0);
 updateProjs(dt);updateFlow(dt);
 G.comboT-=dt;if(G.comboT<=0)G.combo=0;
 /* camera */
 const P=G.P;let tx=P.x-viewW*(portrait?0.42:0.36);
 if(G.lock){const l=G.lock.l,r=G.lock.r;tx=r-l<=viewW?(l+r)/2-viewW/2:clamp(tx,l,r-viewW)}
 tx=clamp(tx,0,G.levelLen-viewW);G.camX+=(tx-G.camX)*Math.min(1,dt*6)}
/* ---------------- render ---------------- */
/* ===== jointed leg rig (Grey Heart knee pass, Oct 30 2026): render-only =====
   The art is one pose per character. Each leg below the cut line cy is cut from that same image into thigh / shin / foot
   pieces (hip, knee and ankle points measured from the art) and posed as a 3-bone chain: the thigh swings about the hip,
   the shin bends at the knee (most in early swing, near-straight in stance), the foot counter-rotates to stay near its art
   angle, and the figure is lowered so the stance foot stays planted on the ground line. A static strip of each thigh top is
   drawn underneath so the hip never opens a gap; neighbouring pieces overlap at the knee and ankle.
   Phase comes from distance moved, amp eases 0..1, and at amp 0 the art pose is drawn exactly.
   L: [x0,x1 column, hipX,hipY, kneeX,kneeY, ankleX,ankleY, footBottom] in native image px; f = art facing (+1 right, -1 left);
   m:'one' = a single standing leg (Elvis's kick pose: the kicked leg is part of the body art). */
const LEGRIG={rosa:{cy:232,x:[0,250],L:[[0,116,88,225,61,285,42,333,396],[116,250,154,225,184,285,196,333,387]],f:1},
 e_karen:{cy:276,x:[0,243],L:[[0,146,120,262,104,312,88,345,396],[146,243,168,262,193,312,214,345,391]]},
 e_bachelorette:{cy:336,x:[0,271],L:[[0,125,112,275,114,336,106,352,396],[125,271,172,275,184,336,222,352,390]]},
 e_bigfoot:{cy:312,x:[0,262],L:[[0,146,92,290,92,322,77,348,396],[146,262,195,290,207,322,218,348,395]]},
 e_raccoon:{cy:296,x:[46,245],L:[[46,150,90,285,102,318,103,338,374],[150,245,189,285,200,318,218,338,396]]},
 e_clipper:{cy:252,x:[0,237],L:[[0,160,136,240,130,292,122,328,396],[160,237,182,240,203,292,211,328,385]]},
 e_mime:{cy:268,x:[0,210],L:[[0,126,101,255,99,305,100,352,396],[126,210,143,255,157,305,186,352,381]]},
 e_gymbro:{cy:303,x:[90,200],L:[[90,150,134,285,138,318,143,350,396],[150,200,166,285,166,318,174,350,396]]},
 e_elvis:{cy:280,x:[58,166],L:[[58,166,106,268,113,318,116,352,396]],m:'one'},
 b_clippy:{cy:388,x:[0,456],L:[[0,249,198,370,162,455,135,522,595],[249,456,284,370,329,455,381,522,572]]},
 b_snippy:{cy:388,x:[228,355],L:[[228,292,276,380,265,448,252,505,595],[292,355,322,380,312,448,326,505,595]]},
 b_trixie:{cy:466,x:[100,302],L:[[100,232,180,405,180,466,192,515,595],[232,302,266,405,267,466,280,515,572]]},
 b_shearleen:{cy:440,x:[150,548],L:[[150,340,269,430,288,488,273,530,594],[340,548,392,430,394,488,396,530,595]]}};
(function(){const ang=(p,q,f)=>Math.atan2(f*(q[0]-p[0]),q[1]-p[1]);
 for(const n in LEGRIG){const R=LEGRIG[n];R.f=R.f||-1;R.m=R.m||'pair';let g=0;
  R.legs=R.L.map(v=>{const L={c:[v[0],v[1]],h:[v[2],v[3]],k:[v[4],v[5]],a:[v[6],v[7]],fb:v[8]};const len=L.fb-L.h[1];
   L.t0=ang(L.h,L.k,R.f);L.s0=ang(L.k,L.a,R.f);L.hb=len*.12;L.ov=L.k[1]>R.cy+2?Math.max(8,len*.06):Math.max(12,len*.14);L.ok=len*.1;L.oa=len*.07;g=Math.max(g,L.fb);return L});
  R.G0=g;const t=R.legs.map(L=>L.t0);
  if(R.m==='one'){R.At=.1;R.Kmax=.42;R.legs[0].o=0}
  else{R.Tm=(t[0]+t[1])/2;R.At=Math.min(.45,Math.max(.24,Math.abs(t[0]-t[1])/2+.04));R.Kmax=n[0]==='b'?.62:.78;R.legs[0].o=t[0]>=t[1]?0:Math.PI;R.legs[1].o=R.legs[0].o+Math.PI}
  R.K0=.08;R.fc=.8;const lf=(g-Math.min(...R.legs.map(L=>L.h[1])))/IMGH(n);R.lf=lf;
  R.sL=R.m==='one'?.35:Math.max(.3,4*lf*Math.sin(R.At))}})();
function IMGH(n){return n[0]==='b'?600:400}
/* arm rig (render-only): free arms cut from the art offline into upper arm + forearm pieces (art/<name>_a<i>u|f.webp, placed at
   their art offset), the body drawn from <name>_na.webp (same art with those arms removed and the torso behind them refilled).
   Upper arm swings about the shoulder opposite its paired leg, forearm bends at the elbow; z 'back' arms go behind the body.
   Arms busy with a prop or a pose (phones, scissors, clippers, mic, the mime's wall, flexing) are left in the art. */
const ARMRIG={"rosa":[{"u":["rosa_a0u",162,103],"f":["rosa_a0f",166,105],"S":[163,112],"E":[186,168],"W":[218,118],"z":"front","g":0,"A":0.16,"K":0.22}],"lupe":[{"u":["lupe_a0u",28,95],"f":["lupe_a0f",28,133],"S":[62,108],"E":[34,150],"W":[72,182],"z":"front","g":0,"A":0.3,"K":0.3},{"u":["lupe_a1u",146,92],"f":["lupe_a1f",148,108],"S":[152,108],"E":[167,170],"W":[205,122],"z":"front","g":1,"A":0.3,"K":0.3}],"e_bachelorette":[{"u":["e_bachelorette_a0u",166,96],"f":["e_bachelorette_a0f",206,129],"S":[180,108],"E":[226,140],"W":[240,212],"z":"back","g":1,"A":0.32,"K":0.28}],"e_bigfoot":[{"u":["e_bigfoot_a0u",170,86],"f":["e_bigfoot_a0f",192,143],"S":[192,100],"E":[228,168],"W":[222,240],"z":"back","g":1,"A":0.26,"K":0.22}],"e_elvis":[{"u":["e_elvis_a0u",166,91],"f":["e_elvis_a0f",173,121],"S":[176,106],"E":[232,140],"W":[192,158],"z":"front","g":0,"A":0.14,"K":0.22}]};
for(const n in ARMRIG)for(const a of ARMRIG[n]){const u=[a.E[0]-a.S[0],a.E[1]-a.S[1]],v=[a.W[0]-a.E[0],a.W[1]-a.E[1]];a.fx=Math.sign(u[0]*v[1]-u[1]*v[0])||1}
/* stride tied to ground speed: cadence ~1.65-1.95 steps/s walking, rising to ~2.6-3 when running (speed in leg lengths/s);
   stride length = speed / cadence, thigh swing chosen so the planted foot travels exactly that far (no sliding) */
function gaitV(o,dx,mv,R,h){const now=performance.now(),dt=Math.min(.1,o._gt?(now-o._gt)/1000:0);o._gt=now;if(o._gp===undefined){o._gp=0;o._ga=0;o._v=0;o._At=R.At||.3}
 if(dt>0&&mv)o._v+=(dx/dt-o._v)*Math.min(1,dt*(dx/dt>o._v?14:6));const lw=R.lf*h,r=o._v/lw,c=r<2.2?1.65+r/2.2*.3:Math.min(3,1.95+(r-2.2)*.45),Lc=Math.max(1,2*o._v/c);
 const At=R.m==='one'?R.At:Math.min(.72,Math.max(.14,Math.asin(Math.min(.97,Lc/(4*lw)))));o._At+=(At-o._At)*Math.min(1,dt*6);o._run=Math.min(1,Math.max(0,(r-2.2)/1.6));
 o._ga+=((mv?1:0)-o._ga)*Math.min(1,dt*10);if(mv)o._gp+=Math.PI*c*dt;else{o._v*=Math.max(0,1-dt*8);if(o._ga<.03){o._ga=0;o._gp=Math.round(o._gp/Math.PI)*Math.PI}}
 o._cad=c;return o._ga}
/* gait state on o: _gp phase (rad), _ga amp 0..1; mv = moving this frame, d = distance moved (world), L = stride length (world, one full cycle) */
function gait(o,mv,d,L){const now=performance.now(),dt=Math.min(.1,o._gt?(now-o._gt)/1000:0);o._gt=now;if(o._gp===undefined){o._gp=0;o._ga=0}
 o._ga+=((mv?1:0)-o._ga)*Math.min(1,dt*10);if(mv)o._gp+=d/L*Math.PI*2;else if(o._ga<.03){o._ga=0;o._gp=Math.round(o._gp/Math.PI)*Math.PI}
 return o._ga}
function legPose(R,ph,amp,At,run){const f=R.f,out=[];let low=-1e9;At=At||R.At;run=run||0;
 const rot=(p,o,r)=>{const c=Math.cos(r),s=Math.sin(r),x=p[0]-o[0],y=p[1]-o[1];return[o[0]+x*c-y*s,o[1]+x*s+y*c]};
 for(const L of R.legs){const phi=ph+L.o;let T,K;
  if(R.m==='one'){T=L.t0+At*Math.sin(phi);K=(L.t0-L.s0)+R.Kmax*Math.max(0,Math.sin(phi))}
  else{T=R.Tm+At*Math.sin(phi);K=R.K0+R.Kmax*(1+.55*run)*Math.pow(Math.max(0,Math.cos(phi+.4)),1.4)}
  const dT=amp*(T-L.t0),dS=amp*((T-K)-L.s0),r1=-f*dT,r2=-f*dS,r3=-f*dS*(1-R.fc);
  const k2=rot(L.k,L.h,r1),a1=rot(L.a,L.k,r2),a2=[a1[0]+k2[0]-L.k[0],a1[1]+k2[1]-L.k[1]];
  const fb=rot([L.a[0],L.fb],L.a,r3);low=Math.max(low,fb[1]+a2[1]-L.a[1]);out.push({L,r1,r2,r3,k2,a2})}
 return{legs:out,dy:R.G0-low}}
/* joint disc radii from the art's alpha (leg half-width at knee / hip), once per character */
const LSC={};
function jointW(name,R){R._jw=1;let d=null;try{const im=IMG[name],c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);d=x.getImageData(0,0,im.width,im.height)}catch(e){}
 const hw=(L,p,lim)=>{if(!d)return lim;const y=Math.round(p[1]),W=d.width,A=(x)=>d.data[(y*W+x)*4+3]>40;let l=Math.round(p[0]),r=l;while(l>L.c[0]&&A(l-1))l--;while(r<L.c[1]-1&&A(r+1))r++;return Math.min(lim,Math.max(p[0]-l,r-p[0]))+3};
 for(const L of R.legs){const len=Math.hypot(L.a[0]-L.h[0],L.a[1]-L.h[1]);L.rk=Math.max(L.ok,hw(L,L.k,len*.32));L.rh=Math.max(L.ov,hw(L,L.h,len*.3))}}
function figDraw(name,sfx,w,h,oy,leg,arm){const R=leg&&leg[1]>.01?LEGRIG[name]:null,AR=arm&&arm[1]>.01&&IMG[name+'_na'+sfx]?ARMRIG[name]:null;
 const im=IMG[name+sfx],base=AR?IMG[name+'_na'+sfx]:im,H=im.height,k=h/H,P=R?legPose(R,leg[0],leg[1],leg[2],leg[3]):null;
 ctx.save();ctx.translate(-w/2,oy+(P?P.dy*k:0));ctx.scale(k,k);
 const arms=(z)=>{if(!AR)return;const f=LEGRIG[name]?LEGRIG[name].f:1,sw=arm[2]||1;for(const a of AR){if(a.z!==z)continue;const LR=LEGRIG[name];
  const ph=arm[0]+(LR&&LR.legs[a.g]?LR.legs[a.g].o+Math.PI:(a.g?Math.PI:0)),s=Math.sin(ph),ru=-f*a.A*sw*s*arm[1],rf=ru+a.fx*a.K*sw*s*arm[1];
  const c=Math.cos(ru),sn=Math.sin(ru),ex=a.E[0]-a.S[0],ey=a.E[1]-a.S[1],E2=[a.S[0]+ex*c-ey*sn,a.S[1]+ex*sn+ey*c],pu=IMG[a.u[0]+sfx],pf=IMG[a.f[0]+sfx];
  if(pu){ctx.save();ctx.translate(a.S[0],a.S[1]);ctx.rotate(ru);ctx.translate(-a.S[0],-a.S[1]);ctx.drawImage(pu,a.u[1],a.u[2]);ctx.restore()}
  if(pf){ctx.save();ctx.translate(E2[0],E2[1]);ctx.rotate(rf);ctx.translate(-a.E[0],-a.E[1]);ctx.drawImage(pf,a.f[1],a.f[2]);ctx.restore()}}};
 arms('back');
 const DR=P?IMG[name+'_dr'+sfx]:null;let LS=base;if(DR){const ck=name+sfx+(AR?'n':'');LS=LSC[ck];if(!LS){LS=document.createElement('canvas');LS.width=base.width;LS.height=base.height;const x=LS.getContext('2d');x.drawImage(base,0,0);x.globalCompositeOperation='destination-out';x.drawImage(DR,0,0);LSC[ck]=LS}}
 if(P){if(!R._jw)jointW(name,R);const seg=(L,y0,y1,p0,p1,r,dz)=>{ctx.save();if(p0){ctx.translate(p1[0],p1[1]);ctx.rotate(r);ctx.translate(-p0[0],-p0[1])}
   if(dz){ctx.beginPath();ctx.rect(L.c[0],0,L.c[1]-L.c[0],1e4);ctx.clip()}ctx.beginPath();ctx.rect(L.c[0],y0,L.c[1]-L.c[0],y1-y0);if(dz)for(const d of dz){ctx.moveTo(d[0]+d[2],d[1]);ctx.arc(d[0],d[1],d[2],0,Math.PI*2)}ctx.clip();ctx.drawImage(LS,0,0);ctx.restore()};
  for(const q of P.legs)seg(q.L,R.cy,R.cy+q.L.hb);
  for(const q of P.legs){const L=q.L,kn=L.k[1]>R.cy+2,dk=[L.k[0],L.k[1],L.rk];
   /* rounded joints: pieces meet at the knee line, plus a shared disc around the knee/hip so wide pant fabric can't swing out as flaps */
   if(kn)seg(L,R.cy,L.k[1],L.h,L.h,q.r1,[[L.h[0],L.h[1],L.rh],dk]);
   seg(L,kn?L.k[1]:R.cy-L.ov,L.a[1]+L.oa,L.k,q.k2,q.r2,kn?[dk]:null);
   seg(L,L.a[1]-L.oa,H,L.a,q.a2,q.r3)}
  ctx.save();ctx.beginPath();ctx.rect(0,0,im.width,H);ctx.rect(R.x[0],R.cy,R.x[1]-R.x[0],H-R.cy);ctx.clip('evenodd');ctx.drawImage(base,0,0);ctx.restore();if(DR)ctx.drawImage(DR,0,0)/* skirt/dress hem stays with the body, over the moving legs */}
 else ctx.drawImage(base,0,0);
 arms('front');ctx.restore()}
function spr(name,x,y,h,face,native,o){const im=IMG[name];if(!im)return;o=o||{};const sc=h/im.height,w=im.width*sc;
 ctx.save();ctx.translate(x,y);if(o.rot)ctx.rotate(o.rot);ctx.scale((face===native?1:-1)*(o.sx||1),o.sy||1);if(o.alpha!==undefined)ctx.globalAlpha=o.alpha;
 const oy=o.oy===undefined?-h:o.oy;const rig=(o.leg&&o.leg[1]>.01&&LEGRIG[name])||(o.arm&&o.arm[1]>.01&&ARMRIG[name]);
 const D=(sf)=>rig?figDraw(name,sf,w,h,oy,o.leg,o.arm):ctx.drawImage(IMG[name+sf],-w/2,oy,w,h);D('');
 if(o.green&&IMG[name+'_g']){ctx.globalAlpha=o.green;D('_g')}
 if(o.flash&&IMG[name+'_w']){ctx.globalAlpha=o.flash*(o.fmul||0.7);D('_w')}
 if(o.gold&&IMG[name+'_w']){ctx.globalAlpha=o.gold;ctx.globalCompositeOperation='lighter';D('_w')}
 ctx.restore();return w}
function star(x,y,r,n){ctx.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rr=i%2?r*0.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function txt(s,x,y,size,col,align,stroke){ctx.font='900 '+size+'px Impact,"Trebuchet MS",sans-serif';ctx.textAlign=align||'center';ctx.textBaseline='middle';ctx.lineJoin='round';
 ctx.lineWidth=Math.max(3,size*0.16);ctx.strokeStyle=stroke||'#000';ctx.strokeText(s,x,y);ctx.fillStyle=col;ctx.fillText(s,x,y)}
function wrap(s,maxW,font){ctx.font=font;const words=s.split(' ');const lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
function drawBG(){const im=IMG[G.lv.bg];if(!im)return;const bw=VH*im.width/im.height;const off=G.camX*1.0;const i0=Math.floor(off/bw)-1;
 for(let i=i0;i<i0+Math.ceil(viewW/bw)+3;i++){const x=i*bw;ctx.save();if(i%2){ctx.translate(x+bw,0);ctx.scale(-1,1);ctx.drawImage(im,0,0,bw+1,VH)}else ctx.drawImage(im,x,0,bw+1,VH);ctx.restore()}
 const g=ctx.createLinearGradient(0,GROUND-30,0,VH);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.35)');ctx.fillStyle=g;ctx.fillRect(G.camX-10,GROUND-30,viewW+20,VH-GROUND+30)}
function shadow(x,w,a){ctx.fillStyle='rgba(0,0,0,'+(a||0.32)+')';ctx.beginPath();ctx.ellipse(x,GROUND+2,w,w*0.22,0,0,Math.PI*2);ctx.fill()}
function playerSprite(P){const n=G.active;if(P.st==='hurt'&&P.stT>0)return[n+'_hurt',1.04];if(P.st==='special')return[n+'_special',0.84];if(P.st==='atk'||P.st==='grab'||P.st==='airatk')return[n+'_bump',0.98];
 if(!P.onG||P.st==='bomb')return[n+'_jump',0.95];return[n,1]}
function drawPlayer(P){const T=tw();let [n,hm]=playerSprite(P);let h=T.h*hm,o={},x=P.x,y=P.y;
 if(P.st==='cine'&&G.cine){const c=G.cine,e=c.tg,eh=e.boss?e.B.h:e.d.h;n=G.active+'_jump';let r=c.t<0.45?c.t/0.45*1.45:1.45;if(c.t>1.9)r+=Math.min(1,(c.t-1.9)/0.45)*1.2;
  spr(n,x,y+18,T.h*0.9,c.face,1,{rot:-c.face*r});
  if(c.partner&&c.t>0.5){const pn=(G.active==='rosa'?'lupe':'rosa')+'_jump';const k=Math.min(1,(c.t-0.5)/0.35);const px=e.x+c.face*((e.boss?e.w*0.25:16)+(1-k)*320),py=GROUND-eh*0.62-(1-k)*160+(c.t>1.9?Math.min(1,(c.t-1.9)/0.45)*eh*0.5:0);
   spr(pn,px,py+18,T.h*0.86,-c.face,1,{rot:c.face*r})}
  return}
 shadow(x,46,P.onG?0.32:0.18);
 {const wk=G.active==='rosa'&&n==='rosa'&&(P.st==='idle'||P.st==='air')&&P.onG&&Math.abs(P.vx)>30;const dxr=Math.abs(P.x-(P._lx===undefined?P.x:P._lx));P._lx=P.x;if(n==='rosa'){gaitV(P,wk?dxr:0,wk,LEGRIG.rosa,h);o.leg=[P._gp,P._ga,P._At,P._run];o.arm=[P._gp,P._ga,1+.4*P._run]}
 if(n==='lupe'){const sk=P.onG&&Math.abs(P.vx)>30&&(P.st==='idle'||P.st==='air');const n2=performance.now(),d2=Math.min(.1,P._lt?(n2-P._lt)/1000:0);P._lt=n2;P._la=(P._la||0)+((sk?1:0)-(P._la||0))*Math.min(1,d2*8);if(P._la>.01)o.arm=[P.walkT*.5,P._la,1]}}
 if(P.st==='idle'||P.st==='air'){if(P.onG&&Math.abs(P.vx)>30){if(G.active==='lupe'){o.rot=P.face*0.07;y-=Math.abs(Math.sin(P.walkT*0.5))*3}else if(n!=='rosa'){y-=Math.abs(Math.sin(P.walkT))*8*P._ga;o.rot=Math.sin(P.walkT)*0.05*P._ga}}else if(P.onG){o.sy=1+Math.sin(G.t*3.2)*0.015}}
 if(P.land>0){o.sy=0.9;o.sx=1.08}
 if(P.st==='grab')x+=Math.sin(G.t*70)*5;
 if(P.st==='atk'&&P.step===2)o.sx=1.08;
 if(P.inv>0&&P.st!=='cine'&&Math.floor(G.t*20)%2)o.alpha=0.45;
 if(P.spanx>0)o.gold=0.25+Math.sin(G.t*12)*0.15;
 spr(n,x,y,h,P.face,1,o);
 if(P.spanx>0){ctx.globalAlpha=0.5;ctx.strokeStyle='#ffe14d';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y-h*0.5,h*0.36,h*0.56,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
 if(P.bangs>0){P.bangs-=1/60;txt('BANGS',x,y-h-14,16,'#9cf')}
 if(P.tipsy>0){for(let i=0;i<3;i++){const a=G.t*3+i*2.1;ctx.fillStyle='#ffe14d';star(x+Math.cos(a)*36,y-h-8+Math.sin(a)*8,7,5);ctx.fill()}}}
function drawEnemy(e){const d=e.d;const boss=!!e.boss;const name=boss?e.B.img:'e_'+e.type;let h=boss?e.B.h:d.h,y=e.y,o={flash:e.flash,green:e.gasT>0?0.33:0,fmul:boss?0.4:0.7};
 if(e.st!=='fly')shadow(e.x,boss?e.w*0.55:Math.max(30,h*0.22),0.3);
 if(d.float&&e.st!=='fly')y-=24+Math.sin(e.bob*2)*10;
 if(e.st==='fly'){o.rot=e.rot}
 else if(e.st==='wind'){o.rot=-e.face*0.08;o.flash=Math.max(o.flash,(Math.sin(G.t*30)*0.5+0.5)*0.55)}
 else if(e.st==='grabbed'){o.rot=e.wob||0;o.sx=1+Math.sin(G.t*45)*0.05}
 else if(e.st==='daze'){o.rot=Math.sin(G.t*6)*0.12}
 else if(e.st==='flex'){o.sx=o.sy=1+Math.abs(Math.sin(G.t*10))*0.05}
 else if(e.st==='dash'){o.rot=e.face*0.12}
 else if(e.st==='hurt'){o.sx=0.92;o.sy=1.05}
 else if(LEGRIG[name]&&e.y>=GROUND-2){const dx=Math.abs(e.x-(e._lx===undefined?e.x:e._lx));e._lx=e.x;if(dx>.25)e._mvT=.12;else e._mvT=(e._mvT||0)-1/60;const a=gaitV(e,dx,e._mvT>0,LEGRIG[name],h);o.leg=[e._gp,a,e._At,e._run];if(ARMRIG[name])o.arm=[e._gp,a,1+.5*e._run]}
 else{y-=Math.abs(Math.sin(e.bob*(boss?5:8)))*(boss?5:6);o.rot=Math.sin(e.bob*8)*0.03}
 if(!o.leg){e._lx=e.x;if(LEGRIG[name]&&e._ga>.01){const a=gaitV(e,0,false,LEGRIG[name],h);o.leg=[e._gp,a,e._At,e._run];if(ARMRIG[name])o.arm=[e._gp,a,1]}}
 if(boss&&e.phase===2&&e.st!=='fly')o.flash=Math.max(o.flash,0.12+Math.sin(G.t*8)*0.08);
 if(e.chute&&e.st==='enter'){ctx.fillStyle='#ff3fae';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,y-h-90,80,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffe14d';ctx.beginPath();ctx.arc(e.x,y-h-90,80,Math.PI,Math.PI*1.33);ctx.lineTo(e.x,y-h-90);ctx.fill();ctx.beginPath();ctx.moveTo(e.x-78,y-h-90);ctx.lineTo(e.x,y-h*0.6);ctx.lineTo(e.x+78,y-h-90);ctx.stroke()}
 spr(name,e.x,y,h,e.face,-1,o);
 if(e.st==='daze'||(boss&&e.st==='recover')){for(let i=0;i<3;i++){const a=G.t*5+i*2.1;ctx.fillStyle='#ffe14d';ctx.strokeStyle='#000';ctx.lineWidth=2;star(e.x+Math.cos(a)*34,y-h-6+Math.sin(a)*8,9,5);ctx.fill();ctx.stroke()}}
 if(e.st==='wind'){txt('!',e.x,y-h-26,40,'#ff3b3b')}
 if(e.carry&&IMG[PICK[e.carry].img])spr(PICK[e.carry].img,e.x-e.face*20,y-h*0.55,46,1,1)}
function drawProp(p){const x=p.x+(p.shake>0?Math.sin(G.t*80)*4:0),y=p.y;shadow(x,44,0.3);ctx.save();ctx.translate(x,y);ctx.fillStyle=p.flash?'#fff':'#c48a4f';ctx.strokeStyle='#3a2410';ctx.lineWidth=4;rr(-38,-72,76,72,6);ctx.fill();ctx.stroke();
 ctx.fillStyle='#e8c38d';ctx.fillRect(-38,-44,76,12);ctx.fillStyle='#d23';ctx.font='900 13px Impact';ctx.textAlign='center';ctx.fillText('FRAGILE',0,-52);ctx.fillStyle='#3a2410';ctx.font='900 11px Impact';ctx.fillText('"ADULT TOYS"',0,-16);ctx.restore()}
function drawPick(k){const y=k.y-10-Math.abs(Math.sin(k.t*4))*8;if(k.k==='tip'){ctx.save();ctx.translate(k.x,y-10);ctx.rotate(Math.sin(k.t*5)*0.3);ctx.fillStyle='#4caf50';ctx.strokeStyle='#103d12';ctx.lineWidth=3;rr(-20,-11,40,22,3);ctx.fill();ctx.stroke();ctx.fillStyle='#e8ffe0';ctx.font='900 16px Impact';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,1);ctx.restore();return}
 const d=PICK[k.k];const g=ctx.createRadialGradient(k.x,y-30,4,k.x,y-30,46);g.addColorStop(0,'rgba(255,240,120,0.7)');g.addColorStop(1,'rgba(255,240,120,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(k.x,y-30,46,0,Math.PI*2);ctx.fill();
 spr(d.img,k.x,y,58,1,1,{rot:Math.sin(k.t*3)*0.1});if(k.life-k.t<3&&Math.floor(k.t*8)%2)return}
function drawProj(p){ctx.save();
 switch(p.k){
 case'gas':for(let i=0;i<5;i++){const a=i*1.3+p.t*4,r=p.r*(0.55+0.2*Math.sin(i+p.t*6));const g=ctx.createRadialGradient(p.x+Math.cos(a)*p.r*0.4,p.y+Math.sin(a)*p.r*0.3,2,p.x+Math.cos(a)*p.r*0.4,p.y+Math.sin(a)*p.r*0.3,r);
  g.addColorStop(0,i%2?'rgba(255,155,224,0.85)':'rgba(190,255,110,0.8)');g.addColorStop(1,'rgba(255,155,224,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*p.r*0.4,p.y+Math.sin(a)*p.r*0.3,r,0,Math.PI*2);ctx.fill()}break;
 case'nado':{const top=GROUND-300;for(let i=0;i<14;i++){const k=i/13,yy=GROUND-k*300,w=40+k*110,ph=p.t*9+i*0.7;ctx.globalAlpha=0.6;ctx.fillStyle=i%2?'#ff9be0':'#c6ff7a';ctx.beginPath();ctx.ellipse(p.x+Math.sin(ph)*18*k,yy,w,14+k*10,0,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;txt('QUEEF-NADO',p.x,top-10,22,'#fff','center','#a3127f');break}
 case'txt':{ctx.font='900 18px Impact';const w=ctx.measureText(p.txt).width+20;ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=3;rr(p.x-w/2,p.y-16,w,32,12);ctx.fill();ctx.stroke();ctx.fillStyle='#d10';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.txt,p.x,p.y+1);break}
 case'om':ctx.strokeStyle='#c78bff';ctx.lineWidth=6;ctx.shadowColor='#c78bff';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;txt('OM',p.x,p.y,18,'#fff');break;
 case'sound':ctx.strokeStyle='#fff';ctx.lineWidth=5;for(let i=0;i<3;i++){ctx.globalAlpha=1-i*0.3;ctx.beginPath();ctx.arc(p.x-sgn(p.vx)*i*16,p.y,p.r-i*8,-1,1);if(p.vx<0){ctx.beginPath();ctx.arc(p.x-sgn(p.vx)*i*16,p.y,p.r-i*8,Math.PI-1,Math.PI+1)}ctx.stroke()}ctx.globalAlpha=1;txt('BLAH!',p.x,p.y-p.r-8,16,'#fff');break;
 case'comb':ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle='#222';ctx.fillRect(-20,-5,40,8);for(let i=0;i<8;i++)ctx.fillRect(-18+i*5,2,3,9);break;
 case'spray':for(let i=0;i<4;i++){ctx.globalAlpha=0.55;ctx.fillStyle='#bfe6ff';ctx.beginPath();ctx.arc(p.x+Math.sin(p.t*9+i)*14,p.y+Math.cos(p.t*7+i)*10,p.r*(0.6+i*0.12),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;break;
 case'nail':ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));ctx.fillStyle='#ff2fa3';ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(-14,-7);ctx.lineTo(-14,7);ctx.closePath();ctx.fill();ctx.stroke();break;
 case'coupon':ctx.translate(p.x,p.y);ctx.rotate(p.rot*0.3);ctx.fillStyle='#fff';ctx.strokeStyle='#d10';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.fillRect(-24,-14,48,28);ctx.strokeRect(-24,-14,48,28);ctx.setLineDash([]);ctx.fillStyle='#d10';ctx.font='900 14px Impact';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('5% OFF',0,1);break;
 case'wax':ctx.fillStyle='#ff6ad5';ctx.strokeStyle='#7a0050';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();break;
 case'heat':{const g=ctx.createRadialGradient(p.x,p.y,3,p.x,p.y,p.r*1.4);g.addColorStop(0,'#fff6a0');g.addColorStop(0.5,'#ff8a00');g.addColorStop(1,'rgba(255,40,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.4,0,Math.PI*2);ctx.fill();break}}
 ctx.restore()}
function drawHaz(h){if(h.k==='wave'){ctx.fillStyle='rgba(255,230,180,0.85)';for(let i=0;i<4;i++){const x=h.x-h.dir*i*18;ctx.fillRect(x-6,GROUND-14-(3-i)*9-Math.random()*6,12,14+(3-i)*9)}ctx.fillStyle='rgba(120,80,40,0.5)';ctx.beginPath();ctx.ellipse(h.x,GROUND,34,8,0,0,Math.PI*2);ctx.fill()}
 if(h.k==='warn'&&h.t>0){const k=clamp(h.t/h.life,0,1);ctx.strokeStyle='rgba(255,40,40,0.9)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(h.x,GROUND,30*k+6,8*k+2,0,0,Math.PI*2);ctx.stroke()}
 if(h.k==='puddle'){ctx.globalAlpha=Math.min(1,(h.life-h.t)*1.5)*0.85;ctx.fillStyle='#ff6ad5';ctx.beginPath();ctx.ellipse(h.x,GROUND+2,h.w*0.5,12,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}}
function drawFx(f){const k=1-f.t/f.life;ctx.globalAlpha=Math.max(0,k);
 if(f.k==='dot'){ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.s*k,0,Math.PI*2);ctx.fill()}
 else if(f.k==='star'){ctx.fillStyle=f.c;star(f.x,f.y,f.s,4);ctx.fill()}
 else if(f.k==='conf'){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.r);ctx.fillStyle=f.c;ctx.fillRect(-f.s/2,-f.s/4,f.s,f.s/2);ctx.restore()}
 else if(f.k==='puff'){ctx.globalAlpha=k*0.6;ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.s*(1.4-k*0.6),0,Math.PI*2);ctx.fill()}
 else if(f.k==='ring'){ctx.strokeStyle=f.c;ctx.lineWidth=6*k+1;ctx.beginPath();ctx.ellipse(f.x,f.y,f.r*(1-k*0.8),f.r*0.18*(1-k*0.8),0,0,Math.PI*2);ctx.stroke()}
 else if(f.k==='strip'){const l=f.len*Math.min(1,f.t/0.12);ctx.fillStyle='#ff6ad5';ctx.strokeStyle='#7a0050';ctx.lineWidth=3;ctx.fillRect(f.dir>0?f.x:f.x-l,f.y-10,l,20);ctx.strokeRect(f.dir>0?f.x:f.x-l,f.y-10,l,20)}
 ctx.globalAlpha=1}
function drawPop(p){const k=p.t/p.life;let sc=k<0.15?1.5-k/0.15*0.5:1;ctx.font='900 '+p.size+'px Impact';const tw0=ctx.measureText(p.txt).width;const fit=Math.min(1,(viewW*0.8)/(tw0+20));sc*=fit;const hw=(tw0*sc)/2+8;ctx.save();ctx.translate(clamp(p.x,G.camX+hw,G.camX+viewW-hw),Math.max(VH-VHv+p.size*0.7,p.y-k*40));ctx.rotate(p.rot);ctx.scale(sc,sc);ctx.globalAlpha=k>0.75?(1-k)/0.25:1;
 if(p.size>=34&&p.txt.length<=12){ctx.fillStyle='rgba(0,0,0,0.0)';ctx.font='900 '+p.size+'px Impact';const w=ctx.measureText(p.txt).width;ctx.fillStyle=p.col==='#ffe14d'?'#ff3fae':'#ffe14d';star(0,0,Math.max(w*0.6,p.size*1.0),12);ctx.globalAlpha*=0.9;ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.stroke()}
 txt(p.txt,0,0,p.size,p.col);ctx.restore()}
function drawBubble(b){const e=b.e;if(!e||e.st==='dead')return;const h=e.boss?e.B.h:e.d?e.d.h:170;const lines=wrap(b.txt,190,'800 15px "Trebuchet MS",sans-serif');const lh=18,w=Math.min(206,Math.max(...lines.map(l=>ctx.measureText(l).width))+18),hh=lines.length*lh+12;
 let x=clamp(e.x,G.camX+w/2+6,G.camX+viewW-w/2-6),y=e.y-h-hh-18+(e.d&&e.d.float?-24:0);y=Math.max(VH-VHv+8,y);ctx.globalAlpha=b.t>b.life-0.25?(b.life-b.t)/0.25:1;
 ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=3;rr(x-w/2,y,w,hh,10);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(clamp(e.x,x-w/2+12,x+w/2-12)-8,y+hh-1);ctx.lineTo(clamp(e.x,x-w/2+12,x+w/2-12),y+hh+12);ctx.lineTo(clamp(e.x,x-w/2+12,x+w/2-12)+8,y+hh-1);ctx.fill();ctx.stroke();
 ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='top';lines.forEach((l,i)=>ctx.fillText(l,x,y+7+i*lh));ctx.globalAlpha=1}
function render(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle='#12021a';ctx.fillRect(0,0,W,H);if(!G)return;
 ctx.save();ctx.beginPath();ctx.rect(0,GT,W,GH);ctx.clip();
 let z=1,fx=0,fy=0;if(G.cine){const c=G.cine;const k=c.t<0.4?c.t/0.4:c.t>2.4?Math.max(0,1-(c.t-2.4)/0.3):1;z=1+0.35*k;fx=c.tg.x;fy=GROUND-(c.tg.boss?c.tg.B.h:c.tg.d.h)*0.6}
 const sx=(Math.random()-0.5)*G.shake,sy=(Math.random()-0.5)*G.shake;
 const tip=G.P.tipsy>0?Math.sin(G.t*1.7)*0.025:0;
 ctx.translate(W/2+sx,GT+GH/2+sy);ctx.rotate(tip);ctx.scale(S*z,S*z);
 const cy=VH-VHv/2;if(z!==1){ctx.translate(-(fx+(G.camX+viewW/2-fx)*(1/z)),-(fy+(cy-fy)*(1/z)))}else ctx.translate(-(G.camX+viewW/2),-cy);
 drawBG();
 for(const h of G.hazards)drawHaz(h);
 for(const p of G.props)drawProp(p);
 for(const k of G.pickups)drawPick(k);
 const ents=[...G.enemies].sort((a,b)=>(a.boss?0:1)-(b.boss?0:1));const ctg=G.cine?G.cine.tg:null;for(const e of ents)if(e.st!=='grabbed'&&e!==ctg)drawEnemy(e);
 drawPlayer(G.P);for(const e of ents)if(e.st==='grabbed'&&e!==ctg)drawEnemy(e);
 if(G.cine)drawEnemy(G.cine.tg);if(G.cine&&G.cine.t>0.45&&G.cine.t<2.35)drawPlayer(G.P);
 for(const p of G.projs)drawProj(p);for(const f of G.fx)drawFx(f);for(const b of G.bubbles)drawBubble(b);for(const p of G.pops)drawPop(p);
 ctx.restore();
 /* screen-space */
 ctx.save();ctx.beginPath();ctx.rect(0,GT,W,GH);ctx.clip();
 if(G.boss&&G.boss.phase===2&&G.boss.type==='shearleen'&&G.boss.st!=='fly'){ctx.fillStyle='rgba(255,40,0,'+(0.07+Math.sin(G.t*4)*0.04)+')';ctx.fillRect(0,GT,W,GH)}
 if(G.cine){ctx.fillStyle='#000';const bh=GH*0.06;ctx.fillRect(0,GT,W,bh);ctx.fillRect(0,GT+GH-bh,W,bh)}
 drawHUD();ctx.restore();
 if(portrait)drawPanel()}
function bar(x,y,w,h,v,c1,c2,label){ctx.fillStyle='#000a';rr(x-2,y-2,w+4,h+4,(h+4)/2);ctx.fill();ctx.fillStyle='#2a0a33';rr(x,y,w,h,h/2);ctx.fill();if(v>0){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;rr(x,y,Math.max(h,w*clamp(v,0,1)),h,h/2);ctx.fill()}
 if(label){ctx.font='900 '+(h-2)+'px Impact';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(label,x+6,y+h/2+1)}}
function drawHUD(){const P=G.P,T=tw();const top=GT+(portrait?6:8)+(parseFloat(getComputedStyle(document.body).paddingTop)||0);const sc=portrait?0.86:Math.min(1,H/420);
 ctx.save();ctx.translate(8,top);ctx.scale(sc,sc);
 /* portrait */
 const im=IMG[G.active];ctx.save();ctx.beginPath();ctx.arc(30,30,28,0,Math.PI*2);ctx.fillStyle=P.spanx>0?'#ffe14d':'#ff3fae';ctx.fill();ctx.clip();if(im){const sw=im.width*0.62,sh=sw;ctx.drawImage(im,im.width*0.22,0,sw,sh,4,4,52,52)}ctx.restore();
 ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(30,30,28,0,Math.PI*2);ctx.stroke();
 txt(T.name,66,10,15,'#ffe14d','left');
 bar(66,20,150,13,G.twins[G.active].hp/100,'#ff3fae','#ff9be0','');
 bar(66,38,110,10,P.gas/100,'#7ed321','#d8ff9b','GAS');
 const other=G.active==='rosa'?'lupe':'rosa';ctx.font='800 11px "Trebuchet MS"';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText('SIS '+TWINS[other].name+': '+Math.round(G.twins[other].hp)+'%',66,60);
 ctx.restore();
 /* score */
 const cx=portrait?W-12:W/2;txt(String(G.score).padStart(7,'0'),cx,top+(portrait?72:16),portrait?18:22,'#fff',portrait?'right':'center');
 txt(G.lv.name.toUpperCase(),portrait?W-12:W/2,top+(portrait?90:36),11,'#ffd1f0',portrait?'right':'center');
 /* combo */
 if(G.combo>1){const k=Math.min(1,G.comboT/2.2);ctx.globalAlpha=0.4+k*0.6;const x=portrait?12:W-14,y=GT+(portrait?92:110),al=portrait?'left':'right';txt(G.combo+' HITS',x,y,28+Math.min(G.combo,30)*0.4,'#ffe14d',al);const r=rankOf(G.combo);if(r)txt(r,x,y+26,14,'#ff3fae',al);ctx.globalAlpha=1}
 /* go arrow */
 if(G.goT>0&&G.phase==='walk'&&Math.floor(G.t*4)%2)txt('GO! →',W-24,GT+GH*0.45,40,'#ffe14d','right');
 /* banner */
 if(G.banner){const b=G.banner,k=b.t/b.life,s=k<0.12?1.6-k/0.12*0.6:1;ctx.save();ctx.translate(W/2,GT+GH*(portrait?0.28:0.24));ctx.scale(s,s);ctx.globalAlpha=k>0.8?(1-k)/0.2:1;
  let fs=44;ctx.font='900 44px Impact,"Trebuchet MS",sans-serif';const mw=ctx.measureText(b.txt).width;if(mw>W*0.92)fs=Math.max(16,44*W*0.92/mw);ctx.fillStyle='rgba(0,0,0,0.32)';ctx.fillRect(-W,-fs*0.75,W*2,fs*1.5+(b.sub?16:0));txt(b.txt,0,0,fs,b.col);if(b.sub)txt(b.sub,0,fs*0.85,Math.min(18,fs*0.5),'#fff');ctx.restore()}
 /* boss bar */
 if(G.boss&&G.boss.st!=='fly'&&G.phase==='boss'){const b=G.boss,w=Math.min(W-40,520),x=(W-w)/2,y=GT+GH-(portrait?30:(G.cine?60:34));txt(b.B.name,x,y-12,16,'#fff','left');bar(x,y,w,14,b.hp/b.max,'#ff2a2a','#ff3fae','')}
 /* buttons state */
 const sf=$('sassFill'),bs=$('bScissor');const sh=Math.round(P.sass)+'%';if(sf.style.height!==sh)sf.style.height=sh;bs.classList.toggle('ready',P.sass>=100);$('bSpecial').classList.toggle('low',P.gas<22);
 if((G._tagC=(G._tagC||0)+1)%15===0)updateTagBtn()}
function drawPanel(){const y=GH;const g=ctx.createLinearGradient(0,y,0,H);g.addColorStop(0,'#3a0a3f');g.addColorStop(1,'#12021a');ctx.fillStyle=g;ctx.fillRect(0,y,W,H-y);ctx.fillStyle='#ff3fae';ctx.fillRect(0,y,W,3);
 ctx.globalAlpha=0.14;txt('PINK TACO',8,H-62,Math.min(30,W*0.07),'#ff3fae','left');txt('TWINS',8,H-32,Math.min(30,W*0.07),'#ffe14d','left');ctx.globalAlpha=1}
/* ---------------- UI screens ---------------- */
function show(html,cls){ui.innerHTML='<div class="'+(cls||'scr')+'">'+html+'</div>';return ui.firstChild}
function hideUI(){ui.innerHTML=''}
function setPlayUI(on){hud.hidden=!on;pad.hidden=!on}
function btn(id,label,cls){return'<button class="btn '+(cls||'')+'" id="'+id+'" type="button">'+label+'</button>'}
function on(id,f){const el=$(id);if(el)el.addEventListener('click',e=>{AU.unlock();f(e)})}
function ageGate(){state='age';setPlayUI(false);AU.play('title');
 show('<h1>ADULTS ONLY</h1><p><b>The Pink Taco Twins vs. the Scissor Sisters</b> is crude, raunchy cartoon humor: gas jokes, body bumps, motorboats and wrestling headlocks.</p><p class="sub">Cartoon violence · rude humor · no nudity · all characters are adults.</p>'+btn('bYes','I\'M 18+ · LET\'S GET NASTY')+'<br>'+btn('bNo','GET ME OUTTA HERE','dim'));
 on('bYes',()=>{SAVE.adult=1;save();title()});on('bNo',()=>{location.href='about:blank'})}
function title(){state='title';setPlayUI(false);G=null;AU.play('title');
 show('<img class="title-art" src="art/title.webp?v=1" alt="The Pink Taco Twins vs. the Scissor Sisters"><div class="row">'+btn('bPlay','▶ PLAY')+btn('bHow','HOW TO PLAY','alt')+btn('bSet','⚙ SETTINGS','alt')+'</div><p class="sub">Best score: '+(SAVE.best||0)+' · Levels unlocked: '+SAVE.unlocked+'/5</p>');
 on('bPlay',select);on('bHow',()=>how(title));on('bSet',settings)}
function how(back){show('<h2>HOW TO BRAWL</h2><ul class="how">'+  '<li><b>🎮 Controller</b> (Xbox, PlayStation or Switch; USB or Bluetooth, on a computer or paired to your phone): stick/D-pad move, <b>A</b> jump (down in the air = butt bomb), <b>X</b> attack, <b>B</b> queef (hold = nado), <b>Y</b> scissor, <b>RB/LB</b> tag, <b>Start</b> pause, <b>Select</b> sound. Menus: D-pad + A, B goes back.</li>'+
 '<li><b>Swipe &amp; hold</b> left/right anywhere to move. <b>Swipe up</b> to jump. <b>Swipe down in the air</b> = BUTT BOMB.</li>'+
 '<li><b>ATTACK</b> = BOOB BUMPS. Tap 3× fast: the 3rd bump is a DOUBLE-D-STRUCTION that dazes.</li>'+
 '<li>ATTACK a <b>dazed</b> enemy (stars) = <b>MOTORBOAT MAYHEM</b>. Mash ATTACK, then she tosses them like a bowling ball.</li>'+
 '<li><b>QUEEF</b> = gas-cloud blast (uses GAS). <b>Hold QUEEF</b> on a full tank = <b>QUEEF-NADO</b>.</li>'+
 '<li>Land hits to fill <b>SCISSOR</b>. When it glows: leg-scissor headlock finisher. With your sis healthy it\'s a DOUBLE.</li>'+
 '<li><b>TAG</b> (top) swaps twins. The benched twin heals. If one gets KO\'d, the other jumps in.</li>'+
 '<li>Pickups: Bean Burrito (gas), Boxed Wine (heal), Margarita (tipsy power), Spanx (invincible), Expired Yogurt (gamble), Divorce Papers (screen clear). Smash "ADULT TOYS" boxes for loot.</li>'+
 '</ul><p class="sub">Keyboard: arrows/WASD, Space jump, J attack, K queef, L scissor, T tag, P pause.</p>'+btn('bBack','GOT IT'));on('bBack',back)}
function settings(){const v=SAVE.voice?'ON':'OFF';show('<h2>SETTINGS</h2><p>Difficulty</p><div class="row">'+DIFF.map((d,i)=>btn('bD'+i,d.n,SAVE.diff===i?'sel':'alt')).join('')+'</div><p>Announcer voice (uses your phone\'s voice)</p>'+btn('bV','VOICE: '+v,'alt')+'<br>'+btn('bBack','DONE'));
 DIFF.forEach((d,i)=>on('bD'+i,()=>{SAVE.diff=i;save();settings()}));on('bV',()=>{SAVE.voice=SAVE.voice?0:1;save();settings();if(SAVE.voice)say('Pink taco twins!',0.6)});on('bBack',title)}
function select(){state='select';const t=SAVE.twin;
 show('<h2>PICK YOUR TWIN</h2><div class="twins">'+Object.entries(TWINS).map(([k,d])=>'<button class="twin '+(t===k?'sel':'')+'" id="tw_'+k+'" type="button"><img src="art/'+k+'.webp?v=1" alt="">'+d.full+'<small>'+d.desc+'</small></button>').join('')+'</div><p class="sub">You can TAG your sister in any time.</p><h2>PICK A LEVEL</h2><div class="lvls">'+
  LEVELS.map((l,i)=>btn('lv'+i,(i<SAVE.unlocked?'':'🔒 ')+(i+1)+'. '+l.name+(i===4?' (FINAL)':''),i<SAVE.unlocked?'':'dim')).join('')+'</div>'+btn('bBack','BACK','alt'));
 Object.keys(TWINS).forEach(k=>on('tw_'+k,()=>{SAVE.twin=k;save();sfx('pickup');select()}));
 LEVELS.forEach((l,i)=>on('lv'+i,()=>{if(i<SAVE.unlocked)levelIntro(i);else{sfx('pfft')}}));on('bBack',title)}
function levelIntro(i){state='intro';const l=LEVELS[i];AU.play(l.song);
 show('<h2>LEVEL '+(i+1)+'</h2><h1>'+l.name+'</h1><p class="sub">'+l.sub+'</p><p>'+l.intro+'</p><p class="sub">Boss: '+BOSS[l.boss].name+'</p>'+btn('bGo','LET\'S GET NASTY'));
 on('bGo',()=>startLevel(i))}
function startLevel(i){newGame(i);hideUI();state='play';setPlayUI(true);updateTagBtn();AU.play(G.lv.song);G.banner={txt:'LEVEL '+(i+1),sub:G.lv.name,t:0,life:2,col:'#ff3fae'};say(pick(['Let\'s get nasty!','Time to taco!','Ladies, start your engines.']),tw().voice)}
function bossIntro(){const b=G.boss,B=b.B;state='bossintro';AU.play('boss');sfx('roar');say(B.voice,0.7);
 const el=show('<div class="stripe"></div><img src="art/'+B.img+'.webp?v=1" alt=""><div class="nm"><h3>'+B.title+'</h3><h1>'+B.name+'</h1>'+B.lines.map(t=>'<p>'+t+'</p>').join('')+'</div><div class="vs">FIGHT!</div>','full bi');
 let done=false;const go=()=>{if(done)return;done=true;hideUI();state='play'};el.addEventListener('click',go);el.addEventListener('touchend',e=>{e.preventDefault();go()});setTimeout(go,4200)}
function showCut(k){const c=CUTS[k];state='cut';setPlayUI(false);sfx('scratch');
 const el=show('<div class="mw">MEANWHILE...</div><img src="art/'+c.img+'.webp?v=1" alt=""><div class="cap">'+c.cap+'</div><p class="sub">tap to continue</p>','full cut');
 let done=false;const go=()=>{if(done)return;done=true;hideUI();if(state==='cut'){state='play';setPlayUI(true)}};setTimeout(()=>{el.addEventListener('click',go);el.addEventListener('touchend',e=>{e.preventDefault();go()})},500);setTimeout(go,4200)}
function pauseGame(){if(state!=='play')return;state='pause';setPlayUI(false);
 show('<h2>PAUSED</h2><p class="sub">'+pick(['Bathroom break? Same.','Go hydrate. You\'re losing fluids.','The Scissor Sisters are waiting. Impatiently.'])+'</p>'+btn('bRes','RESUME')+'<br>'+btn('bRst','RESTART LEVEL','alt')+btn('bHow2','HOW TO PLAY','alt')+'<br>'+btn('bVo','VOICE: '+(SAVE.voice?'ON':'OFF'),'alt')+btn('bQuit','QUIT TO TITLE','dim'));
 on('bRes',resumeGame);on('bRst',()=>startLevel(G.li));on('bHow2',()=>how(()=>{state='play';pauseGame0()}));on('bVo',()=>{SAVE.voice=SAVE.voice?0:1;save();state='play';pauseGame()});on('bQuit',title)}
function pauseGame0(){state='play';pauseGame()}
function resumeGame(){hideUI();state='play';setPlayUI(true)}
function statsHTML(){const s=G.stats;return'<div class="stats"><span>Score</span><b>'+G.score+'</b><span>Biggest combo</span><b>'+G.maxCombo+(rankOf(G.maxCombo)?' ('+rankOf(G.maxCombo)+')':'')+'</b><span>Queefs released</span><b>'+s.gas+(s.gas>8?' (air quality: hazardous)':'')+'</b><span>Queef-nados</span><b>'+s.nado+'</b><span>Motorboats</span><b>'+s.motor+' ('+s.brr+' BRRRs)</b><span>Scissor locks</span><b>'+s.scissor+'</b><span>Weirdos humiliated</span><b>'+s.ko+'</b></div>'}
function levelClear(){state='clear';setPlayUI(false);sfx('clear');const i=G.li;if(G.score>(SAVE.best||0))SAVE.best=G.score;
 if(i===LEVELS.length-1){save();return winScreen()}
 SAVE.unlocked=Math.max(SAVE.unlocked,i+2);save();AU.play('win');say(pick(['Too easy.','Who\'s next?','Pink taco twins win!']),tw().voice);
 show('<h2>LEVEL CLEAR!</h2><h1>'+BOSS[G.lv.boss].name+' GOT TACO\'D</h1>'+statsHTML()+'<p class="sub">'+pick(['Somewhere, a chiropractor just got rich.','The twins celebrated with a 2-for-1 margarita.','HR has been notified. HR is also impressed.'])+'</p>'+btn('bNext','NEXT LEVEL →')+'<br>'+btn('bMenu','LEVEL SELECT','alt'));
 on('bNext',()=>levelIntro(i+1));on('bMenu',select)}
function gameOver(){if(state!=='play')return;state='over';setPlayUI(false);AU.stop();sfx('sad');if(G.score>(SAVE.best||0)){SAVE.best=G.score;save()}say(pick(LOSE),0.5);
 setTimeout(()=>{show('<img class="endimg" src="art/lose.webp?v=1" alt=""><h1>WIPED OUT</h1><p>'+pick(LOSE)+'</p>'+statsHTML()+btn('bRetry','RETRY LEVEL')+btn('bMenu','LEVEL SELECT','alt'));on('bRetry',()=>startLevel(G.li));on('bMenu',select)},900)}
function winScreen(){state='win';AU.play('win');say('The pink taco twins are the champions! Now go wash your hands.',0.7);sfx('ooh');
 show('<img class="endimg" src="art/win.webp?v=1" alt=""><h1>THE SCISSOR SISTERS ARE SNIPPED!</h1><p>'+pick(WINL)+'</p>'+statsHTML()+'<p class="sub">Credits: Rosa & Lupe Taco (as themselves) · 400 bean burritos (stunt gas) · one mime (silent, unpaid) · Thanks for playing. Now go wash your hands.</p>'+btn('bAgain','PLAY AGAIN')+btn('bMenu','LEVEL SELECT','alt'))
 ;on('bAgain',()=>levelIntro(0));on('bMenu',select)}
bindBtn($('bPause'),null,()=>{if(state==='play')pauseGame()});bindBtn($('bMute'),null,()=>AU.mute(!AU.muted));$('bMute').textContent=AU.muted?'🔇':'🔊';
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pauseGame()});
/* ---------------- loop ---------------- */
let last=performance.now();
function frame(now){const dt=Math.min(0.033,(now-last)/1000);last=now;tG+=dt;
 if(G&&(state==='play')){readInput(dt);update(dt)}else if(G&&(state==='clear'||state==='over'||state==='win')){/* frozen */}
 render();requestAnimationFrame(frame)}
window.__ptt={get G(){return G},get state(){return state},startLevel,surprise:()=>surprise(),cut:k=>showCut(k),fill:()=>{G.P.sass=100;G.P.gas=100},win:()=>winScreen(),over:()=>gameOver(),boss:()=>{G.waves.forEach(w=>w.done=true);G.P.x=G.bossX-200;G.camX=G.P.x-200}};
(async()=>{resize();await loadAll();$('load').hidden=true;if(SAVE.adult)title();else ageGate();requestAnimationFrame(frame)})();
})();
