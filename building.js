import * as THREE from './vendor/three.module.js';
import {CSS3DRenderer,CSS3DObject} from './vendor/CSS3DRenderer.js';

const data = window.portfolioProjects;
const host = document.querySelector('#building-canvas');
const directory = document.querySelector('#floor-directory');
let active = 0, tour = false, rotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const names = ['FoodByQR','QuickBill','StayByQR','SmartFuture Hub','MailForge QA','Wedding Planner','Personal Portfolio'];
for (let i=6;i>=0;i--){const b=document.createElement('button');b.className='floor-button';b.dataset.floor=i;b.innerHTML=`<span>0${i+1}</span><b>${names[i]}</b><i>↗</i>`;b.setAttribute('aria-label',`Floor ${i+1}: ${names[i]}`);b.addEventListener('click',()=>{tour=false;selectFloor(i,true);updateControls()});directory.append(b)}
const interiorCache=new Map();
let wallView='room',walkX=0,walkZ=0,wallLook=new THREE.Vector3(0,2.3,-4.1),lastWall=-1,wallEntry=0;
let inside=false,interior=null,interiorFloor=-1,interiorTargets=[],cameraBlend=0, facade=null;
let scene,renderer,camera,tower, elevator, floorGroups=[], lights=[], floorMeshes=[], floorSigns=[], highlight, desiredY=7.8,desiredDistance=27, angle=.49, manualAngle=.49, isDragging=false, startX=0,startY=0, dragX=0, totalDrag=0, elapsed=0,lastTour=0, inView=false, ready=false;
function selectFloor(i,focus=true){active=i;window.currentProjectFloor=i;window.dispatchEvent(new CustomEvent('portfolio-floor',{detail:{index:i,focus}}));const p=data[i];document.querySelectorAll('.floor-button').forEach(b=>{const on=+b.dataset.floor===i;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});document.querySelector('#floor-status').textContent=`FLOOR 0${i+1} / ${p.status}`;document.querySelector('#floor-title').textContent=p.title;document.querySelector('#floor-subtitle').textContent=p.subtitle;document.querySelector('#floor-description').textContent=p.detail;document.querySelector('#floor-tags').innerHTML=p.tags.map(t=>`<span>${t}</span>`).join('');const a=document.querySelector('#floor-link');a.textContent=p.url?`${p.link} ↗`:(i===4?'Discuss this toolkit ↗':'Ask about this project ↗');a.href=p.url||'#contact';if(p.url){a.target='_blank';a.rel='noopener'}else{a.removeAttribute('target')}document.querySelector('#floor-indicator').textContent=`0${i+1} / 07`;const detail=document.querySelector('.house-detail');detail.style.animation='none';requestAnimationFrame(()=>detail.style.animation='');if(focus){inside=true;wallView='room';walkX=walkZ=0;wallEntry=performance.now();lastWall=-1;document.querySelector('.building-view').classList.add('first-person');document.querySelectorAll('[data-wall-view]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.wallView==='room'))});document.querySelector('.lift-doors').classList.remove('doors-open');void document.querySelector('.lift-doors').offsetWidth;requestAnimationFrame(()=>document.querySelector('.lift-doors').classList.add('doors-open'));document.querySelector('.interior-controls').hidden=false;document.querySelector('#interior-name').textContent=`FLOOR 0${i+1} / ${names[i]}`;desiredY=1.5+i*2.1;desiredDistance=18;rotate=false;updateControls()}if(ready){floorSigns.forEach((m,j)=>{m.material.emissiveIntensity=j===active?1.3:.45});lights.forEach((l,j)=>l.intensity=j===active?13:6)}}
selectFloor(0,false);
window.addEventListener('portfolio-select-floor',e=>{tour=false;selectFloor(e.detail.index,true);updateControls()});
function updateControls(){document.querySelector('#building-tour').setAttribute('aria-pressed',String(tour));document.querySelector('#building-tour').textContent=tour?'Ⅱ Pause tour':'▷ Take a tour';document.querySelector('#building-rotate').setAttribute('aria-pressed',String(rotate));}
document.querySelector('#building-overview').addEventListener('click',()=>{inside=false;document.querySelector('.building-view').classList.remove('first-person');document.querySelector('.interior-controls').hidden=true;desiredY=7.8;desiredDistance=27;manualAngle=.49;rotate=true;tour=false;updateControls()});document.querySelector('#building-tour').addEventListener('click',()=>{tour=!tour;lastTour=elapsed;if(tour)selectFloor(active,true);updateControls()});document.querySelector('#building-rotate').addEventListener('click',()=>{rotate=!rotate;manualAngle=angle;updateControls()});updateControls();

document.querySelector('#interior-prev').addEventListener('click',()=>{tour=false;selectFloor((active+6)%7,true);updateControls()});
document.querySelector('#interior-next').addEventListener('click',()=>{tour=false;selectFloor((active+1)%7,true);updateControls()});
document.querySelectorAll('[data-wall-view]').forEach(b=>b.addEventListener('click',()=>{tour=false;updateControls();wallView=b.dataset.wallView;walkX=walkZ=0;document.querySelectorAll('[data-wall-view]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)))}));
host.tabIndex=0;host.addEventListener('keydown',e=>{if(!inside)return;const key=e.key.toLowerCase();if(['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();if(key==='w'||key==='arrowup')walkZ-=.3;if(key==='s'||key==='arrowdown')walkZ+=.3;if(key==='a'||key==='arrowleft')walkX-=.3;if(key==='d'||key==='arrowright')walkX+=.3;walkZ=THREE.MathUtils.clamp(walkZ,-2,2);walkX=THREE.MathUtils.clamp(walkX,-2,2)}});
try { init(); } catch(error){document.querySelector('#building-loading').innerHTML='The 3D view needs WebGL.<br>Use the floor directory to explore every project.';console.warn('3D building could not start:',error);}
function init(){
const wallScene=new THREE.Scene(),wallRenderer=new CSS3DRenderer();wallRenderer.domElement.className='physical-wall-layer';host.append(wallRenderer.domElement);const wallObjects=[];
const escapeText=str=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [x,w] of [[-3.95,3.15],[0,4.1],[3.95,3.15]]){const el=document.createElement('article');el.className='physical-wall';const object=new CSS3DObject(el);el.style.pointerEvents='none';object.position.set(x,2.55,-4.07);object.scale.set(w/1200,3.35/1000,.00335);wallScene.add(object);wallObjects.push(object)}
function refreshWalls(i){const p=data[i],r=window.projectRoomData?.[i];
wallObjects[0].element.innerHTML=`<div class="wall-eyebrow">PROJECT GALLERY / 0${i+1}</div><img class="wall-photo" src="${r?.image||'assets/studio.png'}" alt="${escapeText(r?.alt||p.title)}"><div class="wall-photo-caption">${escapeText(p.title)}<small>Project-related imagery</small></div>`;
wallObjects[1].element.className='physical-wall wall-description';wallObjects[1].element.innerHTML=`<div class="wall-eyebrow">FLOOR 0${i+1} · ${escapeText(p.status)}</div><h3>${escapeText(p.title)}</h3><h4>${escapeText(p.subtitle)}</h4><p>${escapeText(r?.body||p.detail)}</p><div class="wall-tools-label">TECHNOLOGIES & TOOLS</div><div class="wall-tools">${p.tags.map(t=>`<span>${escapeText(t)}</span>`).join('')}</div>`;
wallObjects[2].element.innerHTML=`<div class="wall-eyebrow">EXPLORE THE PROJECT</div><h3>${escapeText(r?.promise||p.title)}</h3><p>${escapeText(r?.live||p.detail)}</p><a class="wall-visit" href="${p.url||'#contact'}" ${p.url?'target="_blank" rel="noopener"':''}>${p.url?'Open live site ↗':'Discuss project ↗'}</a><div class="wall-domain">${p.url?escapeText(new URL(p.url).hostname):'Project details on request'}</div>`;
}
scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x182127,.012);
camera=new THREE.PerspectiveCamera(39,1,.1,160);
try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'}); } catch { renderer=new SoftwareRenderer(); }renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8d3e6,0x3c2e25,2.3));const moon=new THREE.DirectionalLight(0xd2e5ff,3.5);moon.position.set(15,25,20);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);Object.assign(moon.shadow.camera,{left:-18,right:18,top:25,bottom:-14,near:.1,far:80});moon.shadow.bias=-.0003;scene.add(moon);const warm=new THREE.DirectionalLight(0xffce9e,2.1);warm.position.set(-12,15,-8);scene.add(warm);const rim=new THREE.DirectionalLight(0x82b8d6,2);rim.position.set(-10,10,8);scene.add(rim);
const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x5b6972);const ep=new THREE.Mesh(new THREE.SphereGeometry(40,16,16),new THREE.MeshBasicMaterial({color:0x536572,side:THREE.BackSide}));envScene.add(ep);for(const [x,y,z,w,h,c] of [[-15,10,8,15,20,0xd5e2ef],[15,8,-5,10,20,0xe9b985],[0,25,0,30,15,0xced8e1]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);m.lookAt(0,0,0);envScene.add(m)}if(!renderer.isSoftware){const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(envScene,.1);scene.environment=env.texture;pmrem.dispose();}
const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const concrete=mat(0x99968b,.88),dark=mat(0x293139,.42,.65),wood=mat(0x9b704c,.75),brass=mat(0xbda17b,.3,.8),white=mat(0xe1dad0,.8),fabric=mat(0x536260,.92),green=mat(0x405b3e,.9),glass=new THREE.MeshPhysicalMaterial({color:0x9cb6c1,transparent:true,opacity:.12,roughness:.12,metalness:.35,side:THREE.DoubleSide,depthWrite:false}),glow=new THREE.MeshStandardMaterial({color:0xffe2af,emissive:0xffc679,emissiveIntensity:2.4}),blueGlow=new THREE.MeshStandardMaterial({color:0x93bfc7,emissive:0x72acba,emissiveIntensity:.65});
// Fine concrete grain keeps large architectural surfaces tactile.
const texCanvas=document.createElement('canvas');texCanvas.width=texCanvas.height=128;const tc=texCanvas.getContext('2d');const id=tc.createImageData(128,128);for(let i=0;i<id.data.length;i+=4){let n=190+Math.random()*35;id.data[i]=id.data[i+1]=id.data[i+2]=n;id.data[i+3]=255}tc.putImageData(id,0,0);const tex=new THREE.CanvasTexture(texCanvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(4,4);concrete.map=tex;concrete.bumpMap=tex;concrete.bumpScale=.025;
const woodCanvas=document.createElement('canvas');woodCanvas.width=256;woodCanvas.height=128;const wc=woodCanvas.getContext('2d');wc.fillStyle='#b89570';wc.fillRect(0,0,256,128);for(let k=0;k<200;k++){wc.strokeStyle=`rgba(65,35,15,${Math.random()*.16})`;wc.lineWidth=Math.random()*1.5;wc.beginPath();const y=Math.random()*128;wc.moveTo(0,y);wc.bezierCurveTo(70,y+Math.random()*4,180,y-3,256,y);wc.stroke()}for(let k=0;k<4;k++){wc.fillStyle='#69534455';wc.fillRect(0,k*32,256,1)}const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;woodTexture.repeat.set(2,2);wood.map=woodTexture;wood.bumpMap=woodTexture;wood.bumpScale=.015;

const unitBox=new THREE.BoxGeometry(1,1,1),unitCylinder=new THREE.CylinderGeometry(1,1,1,16);
function box(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(unitBox,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cyl(parent,x,y,z,r,h,m){const o=new THREE.Mesh(unitCylinder,m);o.scale.set(r,h,r);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function textPanel(parent,text,x,y,z,w,h,size=60,bg='#242c30',color='#e1c59c'){const cv=document.createElement('canvas');cv.width=1024;cv.height=128;const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,1024,128);c.fillStyle=color;c.font=`500 ${size}px Arial`;c.textBaseline='middle';c.fillText(text,38,64);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:.45,roughness:.5});const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);o.position.set(x,y,z);parent.add(o);return o}
function plant(parent,x,y,z,size=.6){cyl(parent,x,y+.18,z,.19,.36,concrete);const stem=cyl(parent,x,y+.55,z,.025,.6,wood);for(let j=0;j<5;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,7,6),green);leaf.scale.set(size*.36,size*.55,size*.3);leaf.position.set(x+Math.sin(j*2.4)*.16,y+.7+Math.cos(j)*.13,z+Math.cos(j*2.4)*.16);leaf.rotation.z=Math.sin(j)*.6;parent.add(leaf)}}
function chair(parent,x,y,z,rotation=0,color=fabric){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);box(g,0,.42,0,.46,.1,.46,color);box(g,0,.72,-.2,.46,.55,.09,color);for(const a of [-.17,.17])for(const b of [-.17,.17])box(g,a,.2,b,.035,.4,.035,dark);return g}
function desk(parent,x,y,z,width=1.5){box(parent,x,y+.75,z,width,.09,.7,wood);for(const a of [-width*.43,width*.43])box(parent,x+a,y+.37,z,.07,.75,.56,dark)}
function screen(parent,x,y,z,w=.7){box(parent,x,y+.3,z,w,.43,.06,dark);box(parent,x,y+.3,z+.033,w-.06,.36,.008,blueGlow);box(parent,x,y+.05,z,.04,.2,.05,dark);box(parent,x,y-.04,z+.05,.25,.025,.2,dark);box(parent,x,y-.015,z+.3,.42,.022,.14,dark);for(let j=0;j<3;j++)box(parent,x-.1,y+.4-j*.09,z+.039,.3-j*.05,.012,.003,glow)}
function pendant(parent,x,y,z){cyl(parent,x,y-.2,z,.012,.4,dark);const shade=new THREE.Mesh(new THREE.ConeGeometry(.22,.2,20,1,true),brass);shade.position.set(x,y-.48,z);parent.add(shade);cyl(parent,x,y-.58,z,.17,.02,glow)}
function person(parent,x,y,z,colour=0x858787){const bodyMat=mat(colour);cyl(parent,x,y+.47,z,.09,.48,bodyMat);const head=new THREE.Mesh(new THREE.SphereGeometry(.085,10,8),mat(0xb69b85));head.position.set(x,y+.78,z);parent.add(head);box(parent,x-.045,y+.13,z,.04,.3,.06,dark);box(parent,x+.045,y+.13,z,.04,.3,.06,dark)}
tower=new THREE.Group();scene.add(tower);
// Ground plane, raised stone plaza and architectural approach.
box(scene,0,-.6,0,160,.4,160,mat(0x182025,.9));box(tower,0,-.24,0,11,.35,8.4,concrete);box(tower,0,-.05,0,9.9,.1,7.2,dark);for(let j=0;j<3;j++)box(tower,0,-.36+j*.1,4.5-j*.25,4.8,.12,.7,concrete);
for(let x=-5;x<=5;x+=.5)box(tower,x,-.055,3.6,.015,.012,1.1,dark);
for(const x of [-5,5])for(const z of [-3.3,3.3]){box(tower,x,.35,z,.45,.75,.45,dark);box(tower,x,.74,z,.34,.08,.34,glow);plant(tower,x,-.02,z-1,.8)}
// Seven habitable floors: restaurant, shop, suite, classroom, QA lab, events, studio.
const colors=[0xe8ba75,0xb9b4d7,0xb5cbbf,0xd5bf90,0x9ebcd3,0xdab8b1,0xc9bd9d];
for(let i=0;i<7;i++){
 const g=new THREE.Group();g.position.y=.1+i*2.1;tower.add(g);floorGroups.push(g);const y=0;
 const slab=box(g,0,0,0,8.6,.22,5.7,concrete);slab.userData.floor=i;floorMeshes.push(slab);
 box(g,0,.14,0,8.1,.06,5.2,i===2?fabric:wood);
 box(g,0,1.05,-2.65,8.35,1.9,.15,mat(i%2?0x716c61:0x8a8170,.88));
 // Structural columns and curtain-wall mullions, with the front opened to the interior.
 for(const x of [-4.12,4.12])for(const z of [-2.55,2.55])box(g,x,1,z,.13,2,.13,dark);
 for(const x of [-4.12,4.12]){box(g,x,1,0,.025,1.8,4.9,glass);for(const z of [-1.3,0,1.3])box(g,x,1,z,.045,1.9,.05,dark)}
 box(g,0,.16,2.82,8.55,.07,.055,glow);
 const sign=textPanel(g,`0${i+1}   /   ${names[i].toUpperCase()}`,0,-.005,2.866,7.65,.25,47);floorSigns.push(sign);sign.userData.floor=i;floorMeshes.push(sign);
 box(g,0,1.95,0,8.3,.08,5.3,white);
 for(const x of [-2.8,0,2.8])box(g,x,1.89,-.3,1.7,.025,.075,glow);
 const light=new THREE.PointLight(colors[i],6,7,2);light.position.set(0,1.5,1.6);g.add(light);lights.push(light);
 plant(g,-3.7,.2,1.8);plant(g,3.6,.2,-1.9);
 const photoPath=['assets/project-0.jpg','assets/project-1.jpg','assets/project-2.jpg','assets/project-3.jpg','assets/studio.png','assets/project-4.jpg','assets/studio.png'][i];
 const picture=new THREE.TextureLoader().load(photoPath);picture.colorSpace=THREE.SRGBColorSpace;
 const pictureMaterial=new THREE.MeshStandardMaterial({map:picture,emissiveMap:picture,emissive:0xffffff,emissiveIntensity:.35,roughness:.45});
 const pictureFrame=box(g,3.08,1.18,-2.5,1.6,1,.06,brass);
 const picturePlane=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.88),pictureMaterial);picturePlane.position.set(3.08,1.18,-2.458);g.add(picturePlane);

 if(i===0){ // Restaurant: walnut tables, upholstered seats, bar and pendant lamps.
  box(g,0,.65,-1.8,5.6,.9,.65,wood);box(g,0,1.14,-1.8,5.9,.08,.82,white);
  for(const x of [-2.5,0,2.5]){cyl(g,x,.78,.6,.52,.07,white);cyl(g,x,.45,.6,.06,.7,brass);cyl(g,x,.22,.6,.28,.04,dark);chair(g,x-.75,.2,.6,-Math.PI/2);chair(g,x+.75,.2,.6,Math.PI/2);pendant(g,x,1.95,.6);cyl(g,x,.85,.6,.09,.12,brass)}
  textPanel(g,'FOOD / DRINK / GOOD COMPANY',0,1.5,-2.55,4.6,.4,45,'#554536','#ead5b4');
 }else if(i===1){ // Retail counter with tills and shelving.
  for(const x of [-2.5,-.6,1.3]){box(g,x,.7,-1.7,1.3,1,.6,wood);for(const sy of [.45,.85,1.2]){box(g,x,sy,-1.6,1.4,.04,.7,white);for(let b=0;b<4;b++)box(g,x-.43+b*.28,sy+.14,-1.6,.18,.24,.22,mat([0xa6b1a0,0xb2a0b8,0xceb98d,0x879ea4][b]))}}
  box(g,0,.66,.85,4.6,.94,.8,white);box(g,0,1.16,.85,4.8,.07,.95,wood);screen(g,-1.3,1.2,.75);screen(g,1.3,1.2,.75);person(g,2.8,.2,-.1,0x728b7b);
 }else if(i===2){ // Hotel suite, bed, pillows, lounge, bedside lights.
  box(g,-1.1,.44,-.4,2.4,.42,2.9,wood);box(g,-1.1,.7,-.4,2.3,.25,2.8,white);box(g,-1.1,1,-1.83,2.6,1.4,.12,wood);box(g,-1.1,.85,.25,2.32,.08,1.4,fabric);for(const x of [-1.72,-.5])box(g,x,.88,-1.25,.88,.17,.5,white);
  for(const x of [-2.7,.5]){box(g,x,.55,-1.3,.6,.7,.55,wood);cyl(g,x,1,-1.3,.12,.25,glow)}
  chair(g,2.4,.2,.8,Math.PI/3);chair(g,3.1,.2,-.5,-Math.PI/2);cyl(g,2.5,.65,-.2,.35,.06,white);cyl(g,2.5,.4,-.2,.05,.5,brass);box(g,2.7,1.2,-2.54,1.9,.9,.04,dark);
 }else if(i===3){ // Learning space.
  box(g,0,1.25,-2.5,3.9,1.1,.06,dark);box(g,0,1.25,-2.46,3.65,.85,.01,blueGlow);textPanel(g,'LEARN. CONNECT. GROW.',0,1.25,-2.448,3.4,.44,60,'#3a5963','#dae5de');
  for(const x of [-2.5,0,2.5])for(const z of [-.7,1]){desk(g,x,.2,z,1.35);chair(g,x,.2,z+.6);box(g,x,.99,z,.5,.03,.34,white)}
 }else if(i===4){ // Email QA workbench lab.
  for(const x of [-2.6,0,2.6]){desk(g,x,.2,.4,1.9);screen(g,x-.35,1.02,.2,.65);screen(g,x+.4,1.02,.2,.65);chair(g,x,.2,1.15)}
  for(const x of [-3,-1,1,3]){box(g,x,1.1,-2.2,.75,1.65,.45,dark);for(let k=0;k<7;k++){box(g,x,.5+k*.18,-1.96,.6,.08,.01,mat(0x465459));box(g,x+.21,.5+k*.18,-1.948,.03,.025,.006,blueGlow)}}
 }else if(i===5){ // Event room with floral arch and banquet tables.
  const arch=new THREE.Mesh(new THREE.TorusGeometry(.82,.035,8,36,Math.PI),brass);arch.position.set(0,1.1,-1.75);g.add(arch);for(const x of [-.82,.82]){box(g,x,.65,-1.75,.05,1.1,.05,brass);plant(g,x,.2,-1.75,.5)}
  for(const x of [-2.5,2.5]){cyl(g,x,.85,.3,.66,.08,white);cyl(g,x,.5,.3,.08,.7,brass);for(let k=0;k<4;k++)chair(g,x+Math.sin(k*Math.PI/2)*.9,.2,.3+Math.cos(k*Math.PI/2)*.9,k*Math.PI/2+Math.PI);cyl(g,x,1.04,.3,.1,.3,brass);const bloom=new THREE.Mesh(new THREE.SphereGeometry(.17,8,8),mat(0xe9c9bc));bloom.position.set(x,1.25,.3);g.add(bloom)}
  pendant(g,0,1.95,.1);
 }else{ // Developer's penthouse studio.
  desk(g,-1.4,.2,-.6,3);screen(g,-1.4,1.02,-.8,1.4);chair(g,-1.4,.2,.2);box(g,2.2,.52,.4,1.5,.6,1.3,fabric);box(g,2.2,.95,-.18,1.5,.7,.15,fabric);cyl(g,1,.58,1.4,.45,.07,wood);cyl(g,1,.4,1.4,.06,.4,dark);textPanel(g,'A.   IDEAS INTO DIGITAL PRODUCTS.',0,1.38,-2.54,5.7,.58,45,'#3d4648','#e5d0af');
 }
}
// Limestone facade with deep window reveals and repeated cornices.
facade=new THREE.Group();tower.add(facade);const limestone=mat(0xc5bcae,.82);
for(let f=0;f<7;f++){const y=.1+f*2.1;box(facade,0,y+.07,2.99,8.95,.2,.42,limestone);box(facade,0,y+.22,3.06,9.05,.055,.5,limestone);for(const x of [-4.18,-1.39,1.39,4.18]){box(facade,x,y+1.1,2.97,.28,1.85,.42,limestone);box(facade,x,y+1.93,3,.4,.12,.48,limestone)}for(const x of [-2.78,0,2.78]){box(facade,x,y+1.04,3.02,2.35,1.57,.018,glass);for(const bx of [-1.17,0,1.17])box(facade,x+bx,y+1.04,3.05,.045,1.6,.08,dark);box(facade,x,y+1.28,3.05,2.37,.04,.08,dark)}}
for(let j=0;j<4;j++)box(facade,0,14.9+j*.085,3.03,9+j*.12,.08,.55+j*.09,limestone);
// Roof terrace, mechanical core, framed glass balustrade and architectural crown.
box(tower,0,14.88,0,8.7,.24,5.8,concrete);for(const x of [-4.1,4.1]){box(tower,x,15.38,0,.04,.8,5.3,glass);box(tower,x,15.8,0,.06,.04,5.3,brass)}box(tower,0,15.38,-2.5,8.2,.8,.04,glass);box(tower,0,15.8,-2.5,8.2,.04,.06,brass);for(const x of [-3,3])plant(tower,x,15,0,1);box(tower,0,15.15,-1.4,3.6,.3,1.1,dark);textPanel(tower,'THE PROJECT HOUSE',0,15.65,1.6,5.8,.6,65,'#20292c','#e9d1ad');for(const x of [-3.2,3.2])box(tower,x,15.42,1.6,.04,1,.04,brass);
// External glazed lift shaft and a travelling illuminated cabin.
box(tower,-4.92,7.4,-.3,1.05,14.8,2,glass);for(const x of [-5.45,-4.39])for(const z of [-1.3,.7])box(tower,x,7.4,z,.06,14.9,.06,dark);for(let i=0;i<8;i++)box(tower,-4.92,.1+i*2.1,.73,1.1,.055,.07,brass);elevator=new THREE.Group();tower.add(elevator);box(elevator,-4.92,.55,-.3,.92,1.4,1.75,brass);box(elevator,-4.92,.55,.59,.78,1.2,.02,glass);box(elevator,-4.92,1.26,-.3,.8,.035,1.5,glow);box(elevator,-4.92,-.12,-.3,.8,.04,1.5,glow);
highlight=new THREE.Group();tower.add(highlight);const edgeGlow=new THREE.MeshStandardMaterial({color:0xfbd3a0,emissive:0xe7b175,emissiveIntensity:2});box(highlight,0,.22,2.91,8.7,.025,.035,edgeGlow);box(highlight,4.35,.22,0,.025,.025,5.8,edgeGlow);box(highlight,-4.35,.22,0,.025,.025,5.8,edgeGlow);
// Plaza furniture and human scale.
for(const x of [-3.5,3.5]){box(tower,x,.3,3.45,1.3,.09,.35,wood);box(tower,x-.45,.1,3.45,.06,.4,.3,dark);box(tower,x+.45,.1,3.45,.06,.4,.3,dark)}person(tower,1.2,-.05,3.8,0xc2bca6);person(tower,-2,-.05,3.65,0x788c98);
const road=mat(0x252e32,.95);box(scene,0,-.38,8.5,80,.08,3.5,road);for(let x=-30;x<30;x+=3)box(scene,x,-.33,8.5,1.3,.012,.07,mat(0x777d78));
// Distant architecture gives the tower a believable physical setting.
for(let i=0;i<12;i++){const x=(i-5.5)*5.5;const h=2+(Math.sin(i*4)+1)*2.5;box(scene,x,h/2-.4,-16-Math.abs(i-5)*.8,3.8,h,4,mat(0x253039,.9));for(let y=1;y<h;y+=1.1)for(let z=0;z<3;z++)if((i+z+Math.floor(y))%3)box(scene,x-1+z,y,-13.95-Math.abs(i-5)*.8,.38,.5,.01,new THREE.MeshStandardMaterial({color:0x8b8a73,emissive:0x8b784e,emissiveIntensity:.45}))}
const car=new THREE.Group();scene.add(car);box(car,0,.1,0,1.3,.38,.64,mat(0x737d84,.25,.7));box(car,-.08,.36,0,.75,.28,.57,dark);for(const x of [-.42,.42])for(const z of [-.32,.32]){const wheel=cyl(car,x,-.02,z,.15,.1,dark);wheel.rotation.x=Math.PI/2}box(car,.66,.12,.2,.02,.06,.12,glow);box(car,.66,.12,-.2,.02,.06,.12,glow);car.position.set(-14,0,8.6);
function createInterior(index){
 const room=new THREE.Group();room.userData.interior=true;interiorTargets=[];
 const project=data[index],info=window.projectRoomData?.[index];
 const plaster=mat(0xd3cec3,.9),oak=wood.clone(),black=mat(0x202a2e,.38,.45),linen=mat(0xd0c5b4,.95);
 box(room,0,-.18,0,12,.3,14,concrete);box(room,0,-.005,0,11.8,.06,13.8,oak);
 // Broad timber planks, skirting and a high plaster ceiling.
 for(let j=-11;j<=11;j++)box(room,j*.52,.03,0,.012,.005,13.8,mat(0x57442f,.9));
 box(room,0,2.4,-4.6,12,4.8,.2,plaster);box(room,-6,2.4,0,.2,4.8,9.4,plaster);box(room,6,2.4,0,.2,4.8,9.4,plaster);box(room,0,4.8,0,12,.18,10,plaster);
 box(room,0,.12,-4.47,11.8,.2,.07,oak);for(const x of [-5.88,5.88])box(room,x,.12,0,.08,.2,9,oak);
 // Wood-panelled display wall with real depth, brass picture frames and picture lights.
 box(room,0,2.3,-4.43,11.5,4.45,.12,oak);
 for(let j=-23;j<=23;j++)box(room,j*.24,2.3,-4.35,.016,4.4,.022,mat(0x67503a,.8));
 function wallTexture(draw){const cv=document.createElement('canvas');cv.width=1200;cv.height=1000;const c=cv.getContext('2d');draw(c,cv);const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;}
 function wrap(c,text,x,y,maxWidth,lineHeight){let words=text.split(' '),line='';for(const word of words){const next=line+word+' ';if(c.measureText(next).width>maxWidth&&line){c.fillText(line.trim(),x,y);y+=lineHeight;line=word+' '}else line=next}c.fillText(line.trim(),x,y);return y+lineHeight;}
 function mount(x,width,height,texture){box(room,x,2.55,-4.23,width+.14,height+.14,.12,brass);box(room,x,2.55,-4.15,width+.055,height+.055,.065,black);const m=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:.65,roughness:.58});const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),m);panel.position.set(x,2.55,-4.108);panel.userData.wallTexture=true;panel.material.transparent=true;panel.material.opacity=0;room.add(panel);box(room,x,4.18,-4.02,width*.55,.055,.11,black);box(room,x,4.145,-4.01,width*.5,.018,.1,glow);return panel;}
 const detailTex=wallTexture((c)=>{c.fillStyle='#f0e9dd';c.fillRect(0,0,1200,1000);c.fillStyle='#8a6948';c.font='24px Arial';c.fillText(`FLOOR 0${index+1} / THE PROJECT HOUSE`,70,75);c.fillStyle='#273135';c.font='bold 64px Arial';let y=wrap(c,project.title,70,165,1060,72);c.fillStyle='#705b46';c.font='30px Arial';y=wrap(c,project.subtitle,70,y+15,1060,42);c.fillStyle='#343d3f';c.font='43px Arial';y=wrap(c,project.detail,70,y+45,1060,56);c.fillStyle='#9b7d5a';c.fillRect(70,y+18,1060,2);c.font='bold 27px Arial';c.fillText('TECHNOLOGIES & TOOLS',70,y+75);c.fillStyle='#303d41';c.font='36px Arial';wrap(c,project.tags.join('   /   '),70,y+130,1060,49);c.fillStyle='#7a6857';c.font='25px Arial';c.fillText(project.status.toUpperCase(),70,940)});
 mount(0,4.1,3.35,detailTex);
 const imageTex=wallTexture(c=>{c.fillStyle='#202b30';c.fillRect(0,0,1200,1000);c.fillStyle='#d8bea0';c.font='45px Arial';c.fillText('PROJECT GALLERY',65,100);c.font='30px Arial';c.fillText('A setting for the experience.',65,930)});
 const art=mount(-3.95,3.15,3.35,imageTex);
 const img=new Image();img.onload=()=>{const c=imageTex.image.getContext('2d');const ratio=Math.max(1080/img.width,710/img.height),w=img.width*ratio,h=img.height*ratio;c.save();c.beginPath();c.rect(60,150,1080,710);c.clip();c.drawImage(img,60+(1080-w)/2,150+(710-h)/2,w,h);c.restore();imageTex.needsUpdate=true};img.src=info?.image||'assets/studio.png';
 const liveTex=wallTexture(c=>{c.fillStyle='#203239';c.fillRect(0,0,1200,1000);c.fillStyle='#a0b8c1';c.font='28px Arial';c.fillText('THE LIVE EXPERIENCE',70,90);c.fillStyle='#ead5b9';c.font='60px Georgia';let y=wrap(c,info?.promise||project.title,70,205,1060,76);c.fillStyle='#ccdadb';c.font='35px Arial';wrap(c,info?.live||'Explore the project.',70,y+70,1060,52);c.fillStyle='#d8bc94';c.fillRect(70,725,1060,130);c.fillStyle='#263335';c.font='bold 42px Arial';c.fillText(project.url?'OPEN LIVE SITE  ↗':'DISCUSS THIS PROJECT  ↗',115,805);c.fillStyle='#9db3b8';c.font='28px Arial';c.fillText(project.url?new URL(project.url).hostname:'Details available on request',70,925)});
 const livePanel=mount(3.95,3.15,3.35,liveTex);livePanel.userData.url=project.url;interiorTargets.push(livePanel);
 // Tall factory-style windows on the side walls, inspired by the supplied studio photos.
 for(const side of [-1,1]){
  const x=side*5.84;const winMat=new THREE.MeshStandardMaterial({color:0xb8d1d5,emissive:0x8aa5ad,emissiveIntensity:.38,roughness:.18,metalness:.3});box(room,x,2.6,1,.035,3.6,5.4,winMat);
  for(const z of [-1.7,-.35,1,2.35,3.7])box(room,x-side*.035,2.6,z,.08,3.7,.06,black);
  for(const y of [.8,2,3.2,4.4])box(room,x-side*.04,y,1,.08,.06,5.5,black);
  box(room,x-side*.1,.72,1,.3,.12,5.7,plaster);
 }
 // Architectural linear pendants and warm indirect light.
 for(const x of [-3,3]){for(const z of [-1.5,2]){box(room,x,4.43,z,.018,.6,.018,black)}box(room,x,4.11,.25,.09,.08,4.6,black);box(room,x,4.06,.25,.06,.018,4.5,glow)}
 const ceilingLight=new THREE.PointLight(0xffead0,55,15,2);ceilingLight.position.set(0,4,1);room.add(ceilingLight);const windowLight=new THREE.PointLight(0xc3e4f3,45,15,2);windowLight.position.set(-4.8,2.9,2);room.add(windowLight);
 // Work tables set to the sides leave a clear route to the wall exhibits.
 for(const x of [-4.4,4.4]){desk(room,x,.05,1.1,2);screen(room,x,.88,.95,.85);chair(room,x,.05,2.1);box(room,x-.7,.4,1.1,.48,.7,.65,oak);for(let j=0;j<3;j++){box(room,x-.7,.2+j*.21,1.435,.43,.012,.01,black);box(room,x-.7,.28+j*.21,1.45,.13,.025,.02,brass)}cyl(room,x+.67,.91,1.4,.065,.15,white);box(room,x+.5,.84,.9,.3,.04,.42,linen)}
 plant(room,-5.15,0,-2.9,1.15);plant(room,5.15,0,-2.9,1.15);
 box(room,0,.035,1.7,5.3,.025,3.5,mat(0x687371,.98));
 textPanel(room,`0${index+1}  /  ${names[index].toUpperCase()}`,0,.06,3.4,3.8,.32,45,'#344348','#e5ccb0').rotation.x=-Math.PI/2;
 return room;
}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);wallRenderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();
new IntersectionObserver(e=>{inView=e[0].isIntersecting},{rootMargin:'150px'}).observe(host);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
host.addEventListener('pointerdown',e=>{host.focus({preventScroll:true});isDragging=true;startX=e.clientX;startY=e.clientY;dragX=manualAngle=angle;totalDrag=0;if(e.pointerType==='mouse')host.setPointerCapture(e.pointerId)});
host.addEventListener('pointermove',e=>{if(!isDragging)return;totalDrag=Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY);manualAngle=THREE.MathUtils.clamp(dragX-(e.clientX-startX)*.006,-.8,1.15);rotate=false;updateControls()});
host.addEventListener('pointerup',e=>{isDragging=false;if(totalDrag<8){const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(inside){const hits=ray.intersectObjects(interiorTargets);if(hits.length){const url=data[active].url;if(url)window.open(url,'_blank','noopener');else document.querySelector('#contact').scrollIntoView({behavior:'smooth'})}}else{const hits=ray.intersectObjects(floorMeshes);if(hits.length)selectFloor(hits[0].object.userData.floor,true)}}});host.addEventListener('pointercancel',()=>isDragging=false);
let y=7.8,distance=27,last=performance.now();camera.position.set(14,14,25);ready=true;selectFloor(0,false);
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(!inView||document.hidden)return;const moving=!document.body.classList.contains('motion-paused');if(moving)elapsed+=dt;if(tour&&moving&&elapsed-lastTour>16){lastTour=elapsed;selectFloor((active+1)%7,true)}
 const targetAngle=rotate&&moving?manualAngle+Math.sin(elapsed*.12)*.24:manualAngle;angle=THREE.MathUtils.lerp(angle,targetAngle,.045);y=THREE.MathUtils.lerp(y,desiredY,.035);distance=THREE.MathUtils.lerp(distance,desiredDistance,.035);
 const fitFactor=camera.aspect<.8?1.3:1;
 if(inside){
  if(interiorFloor!==active){if(interior)interior.visible=false;if(interiorCache.has(active)){interior=interiorCache.get(active)}else{interior=createInterior(active);interiorCache.set(active,interior);scene.add(interior);renderer.invalidate?.()}interiorFloor=active;}
  tower.visible=false;interior.visible=true;wallRenderer.domElement.style.display='block';
  if(lastWall!==active){refreshWalls(active);lastWall=active;camera.position.set(0,1.75,3.6);wallLook.set(0,2.25,-4.1);}
  const focusX=wallView==='gallery'?-3.95:wallView==='website'?3.95:0;
  const isRoom=wallView==='room';const newFov=isRoom?78:55;camera.fov=THREE.MathUtils.lerp(camera.fov,newFov,moving?.12:1);camera.updateProjectionMatrix();
  const panelWidth=wallView==='project'?4.1:3.15;
  const focusDistance=Math.max(4.6,(panelWidth*1.15)/(2*Math.tan(27.5*Math.PI/180)*camera.aspect));
  const pos=new THREE.Vector3(THREE.MathUtils.clamp(focusX+walkX,-5.2,5.2),1.75,THREE.MathUtils.clamp((isRoom?3.6:-4.1+focusDistance)+walkZ,-1.7,5));
  const look=new THREE.Vector3(focusX+Math.sin(angle-.49)*1.3+walkX*.3,isRoom?2.25:2.45,-4.1);
  const blend=moving?1-Math.exp(-Math.max(dt,.016)*7):1;
  camera.position.lerp(pos,blend);wallLook.lerp(look,blend);camera.lookAt(wallLook);
  if(tour&&moving){const phase=(elapsed-lastTour)%16;wallView=phase<3?'room':phase<9?'project':phase<12?'gallery':'website';document.querySelectorAll('[data-wall-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wallView===wallView)));}
  wallRenderer.render(wallScene,camera);

 }else{
  wallRenderer.domElement.style.display='none';tower.visible=true;if(interior)interior.visible=false;camera.fov=39;camera.updateProjectionMatrix();camera.position.set(Math.sin(angle)*distance*fitFactor,y+distance*.25,Math.cos(angle)*distance*fitFactor);camera.lookAt(0,y,0);
 }

 if(moving){blueGlow.emissiveIntensity=.6+Math.sin(elapsed*1.4)*.12;const targetLift=tour?active*2.1:(Math.sin(elapsed*.18-Math.PI/2)+1)*6.3;elevator.position.y=THREE.MathUtils.lerp(elevator.position.y,targetLift,.015);car.position.x=((elapsed*.65+15)%40)-20;highlight.children.forEach(o=>o.material.emissiveIntensity=1.5+Math.sin(elapsed*1.8)*.25)}
 highlight.position.y=THREE.MathUtils.lerp(highlight.position.y,.1+active*2.1,.045);renderer.render(scene,camera);
}
requestAnimationFrame(frame);renderer.render(scene,camera);document.querySelector('#building-loading').classList.add('done');
}

// Canvas projection fallback: same geometry and camera when a GPU is unavailable.
function SoftwareRenderer(){
 this.isSoftware=true;this.domElement=document.createElement('canvas');this.shadowMap={};this.setPixelRatio=()=>{};this.setSize=(w,h)=>{this.domElement.width=w;this.domElement.height=h};
 const c=this.domElement.getContext('2d'),v=new THREE.Vector3(),normal=new THREE.Vector3(),centre=new THREE.Vector3(),sun=new THREE.Vector3(.4,.8,.7).normalize();
 let cached=null,lastRender=0;this.invalidate=()=>{cached=null};
 this.render=(scene,camera)=>{
  const now=performance.now();if(now-lastRender<45)return;lastRender=now;
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const width=this.domElement.width,height=this.domElement.height;
  c.clearRect(0,0,width,height);
  if(!cached){cached=[];scene.traverse(o=>{if(o.isMesh&&o.geometry&&o.material.opacity!==0){const g=o.geometry,p=g.attributes.position,ind=g.index;const isBox=g.type==='BoxGeometry',isPlane=g.type==='PlaneGeometry';const stride=(isBox||isPlane)?6:3;
  for(let j=0;j<(ind?ind.count:p.count);j+=stride){const indices=isBox||isPlane?[0,1,2,5]:[0,1,2];const verts=indices.map(k=>new THREE.Vector3().fromBufferAttribute(p,ind?ind.getX(j+k):j+k));if(isBox||isPlane){ // remove any duplicated fourth corner and use unique rectangle points
  const six=Array.from({length:6},(_,k)=>new THREE.Vector3().fromBufferAttribute(p,ind?ind.getX(j+k):j+k));const unique=[];six.forEach(a=>{if(!unique.some(b=>b.distanceToSquared(a)<.000001))unique.push(a)});if(unique.length===4){verts.splice(0,verts.length,...[unique[0],unique[1],unique[3],unique[2]])}}
  cached.push({o,verts,plane:isPlane});}
  }})}
  const polys=[];
  for(const poly of cached){const o=poly.o,m=o.material;let visibleObject=o;let isVisible=true;while(visibleObject){if(!visibleObject.visible){isVisible=false;break}visibleObject=visibleObject.parent}if(!isVisible)continue;const pts=poly.verts.map(a=>a.clone().applyMatrix4(o.matrixWorld));normal.subVectors(pts[1],pts[0]).cross(v.subVectors(pts[2],pts[0])).normalize();centre.set(0,0,0);pts.forEach(a=>centre.add(a));centre.multiplyScalar(1/pts.length);
   if(normal.dot(v.subVectors(camera.position,centre))<0 && m.side!==THREE.DoubleSide)continue;
   const distance=centre.distanceTo(camera.position);if(distance>80)continue;
   const screen=pts.map(a=>{a.project(camera);return{x:(a.x*.5+.5)*width,y:(-.5*a.y+.5)*height,z:a.z}});if(screen.some(a=>a.z>1||a.z< -1))continue;
   if(screen.every(a=>a.x<0)||screen.every(a=>a.x>width)||screen.every(a=>a.y<0)||screen.every(a=>a.y>height))continue;
   const light=.34+Math.max(0,normal.dot(sun))*.6+Math.max(0,normal.y)*.15;
   const col=m.color||new THREE.Color(0x999999);const ec=m.emissive||new THREE.Color(0);const em=m.emissiveIntensity||0;const fog=Math.min(.9,Math.max(0,(distance-25)/80));
   const rgb=[col.r,col.g,col.b].map((n,k)=>{let val=Math.min(1,n*light+[ec.r,ec.g,ec.b][k]*em*.4);val=THREE.MathUtils.clamp(val,0,1);val=Math.pow(val,1/2.2)*255;return Math.round(val*(1-fog)+[24,33,39][k]*fog)});
   const depth=-centre.clone().applyMatrix4(camera.matrixWorldInverse).z;polys.push({screen,distance,depth,rgb,opacity:m.transparent?m.opacity:1,texture:poly.plane&&m.map?.image});
  }
  polys.sort((a,b)=>b.depth-a.depth);
  for(const p of polys){const a=p.screen;c.globalAlpha=p.opacity;c.beginPath();c.moveTo(a[0].x,a[0].y);for(let j=1;j<a.length;j++)c.lineTo(a[j].x,a[j].y);c.closePath();c.fillStyle=`rgb(${p.rgb.join(',')})`;c.fill();if(p.texture&&p.texture.width>0&&a.length===4){ // project each sign into its surface
   c.save();c.clip();const image=p.texture;const sx=(a[3].x-a[0].x)/image.width,sy=(a[3].y-a[0].y)/image.width,tx=(a[1].x-a[0].x)/image.height,ty=(a[1].y-a[0].y)/image.height;c.setTransform(sx,sy,tx,ty,a[0].x,a[0].y);c.drawImage(image,0,0);c.restore();
  }}c.globalAlpha=1;
 };
}
