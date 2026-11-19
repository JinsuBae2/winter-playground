// 무대: 캔버스에 화장실과 인물을 그린다. 게임 규칙은 모른다. 받은 장면 정보를 그대로 그릴 뿐이다.
// 좌표는 전부 평면도 기준이고, 문과 인물은 그 평면 위에서 회전한다.
export function createStage(canvas) {
  const c=canvas.getContext('2d');
  const ink='#364149', cream='#ffffff', mint='#d5dde2';
  const lanes=[335,510,685];
  function rect(x,y,w,h,fill,stroke=ink,r=0) {
    c.beginPath(); c.roundRect(x,y,w,h,r); paint(fill,stroke);
  }
  function ellipse(x,y,rx,ry,fill,stroke=ink) {
    c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); paint(fill,stroke);
  }
  function paint(fill,stroke) {
    if(fill) {c.fillStyle=fill;c.fill();}
    if(stroke) {c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
  }
  function line(x,y,xx,yy,color=ink,width=2) {
    c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);
    c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();
  }
  function label(s,x,y,size,color=ink) {
    c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
    c.font='bold '+size+'px system-ui,sans-serif';c.fillText(s,x,y);
  }
  const plate=new Image();
  plate.src='restroom.webp';
  function resize() {
    const bounds=canvas.getBoundingClientRect();
    const density=Math.min(devicePixelRatio || 1,3);
    const w=Math.max(1,Math.round(bounds.width*density));
    const h=Math.max(1,Math.round(bounds.height*density));
    if(canvas.width!==w || canvas.height!==h) {
      canvas.width=w; canvas.height=h;
    }
    c.setTransform(w/624,0,0,h/410,-216*w/624,-70*h/410);
  }
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize',resize);
  resize();
  function floor(place) {
    if(plate.naturalWidth) c.drawImage(plate,216,70,624,410);
    else rect(216,70,624,410,'#e6eaec',null);
    // shortcut: 렌더에 남은 모서리 검은 점을 벽 색으로 덮는다. make_restroom.py 를 고쳐 다시 구우면 지운다.
    for(const x of [234,757]) for(const y of [84,466]) rect(x-5,y-5,10,10,'#eceeef',null);
    lanes.forEach((x,i)=>{
      rect(x-15,90,30,15,'#425260',null,3);
      label('0'+(i+1),x,98,11,cream);
    });
    // 왼쪽 벽 핸드드라이어
    rect(245,331,11,32,'#c9d2d8','#57656c',3);rect(254,341,4,12,'#6f7d86',null,1);
    if(place.tint) {c.fillStyle=place.tint;c.fillRect(216,70,624,410);}
    label(place.name,799,113,14,'#52616e');
    label('입구',801,366,14,'#52616e');
  }

  function door(x,shut) {
    const i=lanes.indexOf(x);
    const left=[244,422,597][i],right=[422,597,751][i];
    const hinge=x-39, jamb=x+39;
    rect(left,226,hinge-left,8,'#a0adb6',ink,1);
    rect(jamb,226,right-jamb,8,'#a0adb6',ink,1);
    c.save();c.translate(hinge,230);c.rotate((1-shut)*Math.PI/2);
    c.shadowColor='#23313955';c.shadowBlur=3;c.shadowOffsetY=3;
    rect(0,-3,77,6,mint,'#536169',1);c.shadowColor='transparent';
    line(2,-1.8,74,-1.8,'#f7f8f8',1);
    rect(63,-7,9,4,'#acb6bf','#57656c',1);
    c.restore();ellipse(hinge,230,3.5,3.5,'#798892');
  }
  // look·turn: 들켰을 때 고개만 돌린다. puff: 숨 들이쉬며 부푼다. flush: 얼굴이 달아오른다.
  function actor(x,y,color,angle,act,time,{look=0,turn=0,puff=0,flush=0}={}) {
    const quick=act==='shake'||act==='knock';
    const step=Math.sin(time*(quick?34:13)),walk=['walk','approach','depart','phone'].includes(act);
    const strain=act==='strain',cheer=act==='cheer',sit=strain||cheer||act==='ready'||act==='inhale';
    const sink=act==='wash'||act==='shake'||act==='dry'||act==='knock';
    const reach=act==='dry'?34:act==='knock'?30:55; // 팔을 뻗는 거리: 세면대, 드라이어, 문
    c.save();c.translate(x,y);
    ellipse(2,3,24,21,'#354b3a2b',null);
    c.rotate(angle);c.scale(1+puff*.13,1+puff*.13);
    // Faces point down the plan at zero rotation. Long, thin limbs show the pose.
    for(const side of [-1,1]) {
      const foot=sit?18:walk?side*step*7:5;
      line(side*8,3,side*13,foot+6,ink,4);
      ellipse(side*13,foot+7,5,7,'#536050');
      if(act==='phone' && side>0) { // 한 손은 전화기를 귀에 댄다
        line(13,-1,21,-12,ink,4);rect(17,-24,7,13,'#2b3640',null,2);
      } else if(sink && !(act==='knock' && side<0)) {
        const wrist=side*5+step*(quick?5:2), out=act==='knock'?reach+step*4:reach;
        line(side*13,4,side*20,out*.5,ink,4);
        line(side*20,out*.5,wrist,out,'#c79c7c',4);
        ellipse(wrist,out+1,5,5,'#efba8d');
      } else {
        const hand=cheer?-24+step*4:sit?14:walk?-side*step*7:4;
        line(side*13,-1,side*24,hand-5,ink,4);
        ellipse(side*24,hand-3,5,5,'#efba8d');
      }
    }
    const suit=c.createLinearGradient(-19,0,19,0);
    suit.addColorStop(0,'#263342');suit.addColorStop(.3,color);suit.addColorStop(1,'#38424b');
    const rookie=color==='#eab456', glasses=color==='#c88878';
    rect(-15,-3,30,30,suit,'#35404a',8);
    // A crooked tie, a sliding pair of glasses and a stubborn comb-over.
    c.save();c.translate(0,14);c.rotate(rookie?-.65:.12);
    rect(-3,0,6,13,rookie?'#da5534':'#47566a',null,2);c.restore();
    const hairAngle=look*turn;
    c.rotate(hairAngle);c.translate(strain?Math.sin(time*28):0,-6);
    const skin=c.createRadialGradient(-7,-9,2,2,2,28);
    skin.addColorStop(0,'#ffe4c5');skin.addColorStop(1,'#cca283');
    if(glasses) rect(-17,-22,34,42,skin,'#644e45',12);
    else ellipse(0,-1,rookie?19:24,rookie?20:16,skin,'#644e45');
    if(flush) {c.globalAlpha=flush*.5;ellipse(0,-1,rookie?17:21,rookie?18:14,'#d9482f',null);c.globalAlpha=1;}
    if(rookie) ellipse(14,8,strain?12:9,9,'#f0b49a',null);
    if(strain) for(const side of [-1,1]) { // 힘주는 동안 머리 옆에서 떨리는 선
      const r=27+2*Math.sin(time*30+side);
      line(side*r,-9,side*(r+6),-13,'#b5482f',2);line(side*r,-1,side*(r+7),-1,'#b5482f',2);
    }
    for(const side of [-1,1]) {
      const eyeX=side*(rookie?6:8);
      ellipse(eyeX,-1,rookie?3:4,turn?5:3.7,cream,null);
      ellipse(eyeX+1,-1,1.5,2,ink,null);
    }
    if(glasses) {
      const slip=strain?6:1;
      for(const side of [-1,1]) rect(side*8-7,slip-5,14,11,null,'#366772',4);
      line(-1,slip,1,slip,'#366772');
      ellipse(7,-21,8,4,'#6f483c',null);
    } else {
      c.save();c.rotate(-hairAngle*.85);
      for(let n=0;n<3;n++) line(-8+n*4,-14,-16+n*5,rookie?-22:-17,'#60483f',2);
      c.restore();
    }
    ellipse(0,6,rookie?3:5,3,'#c88d72',null);
    if(turn) ellipse(-2,13,2.3,3,'#65483e',null);
    else line(-5,12,rookie?0:5,rookie?10:13,'#715349',1.5);
    c.restore();
  }
  function bubble(text,x,y) {
    const w=text.length>2?70:48;
    x=Math.min(837-w/2,Math.max(w/2+3,x));
    rect(x-w/2,y-12,w,24,cream,ink,8);
    label(text,x,y+1,16);
  }
  const limit=n=>Math.max(0,Math.min(1,n));
  return function draw({phase,time,guests,held,leak,urge,reaction,culprits,place,close,player}) {
    floor(place);
    const intro=phase==='intro', active=phase!=='title'&&!intro;
    const caught=phase==='caught'||phase==='lost', won=phase==='won';
    const still=caught?time-reaction:time; // 들킨 순간의 자세 그대로 멈춘다
    let px=intro?852-342*limit(time/1.25):510;
    const py=intro?347-195*limit((time-1.25)/.85):152;
    if(phase==='play' && !held && urge>.7) px+=Math.sin(time*40)*5*(urge-.7);
    const knocked=guests.some(g=>g.act==='knock');
    if(won) { // 태연하게 문 열고 나와 손 씻고 나간다
      const g=player, moving=g.act==='walk'||g.act==='depart';
      if(g.act!=='away') {
        if(g.act==='wash') ellipse(g.x,416,22+3*Math.sin(time*6),10,null,'#6fb3c4');
        actor(g.x,g.y,'#eab456',moving?-g.heading:0,g.act,time);
        if(g.act==='cheer') {
          for(let n=0;n<6;n++) {
            const a=n*Math.PI/3+time, r=36+5*Math.sin(time*7+n);
            line(g.x+Math.cos(a)*r,g.y+Math.sin(a)*r,g.x+Math.cos(a)*(r+9),g.y+Math.sin(a)*(r+9),'#e5a93b',3);
          }
          bubble('후련~',g.x,g.y-35);
        }
      }
      door(lanes[1],g.act==='cheer'?1:g.act==='open'?1-limit(g.elapsed/.45):0);
    } else if(phase!=='title') {
      const act=intro&&time<2.1?'walk':intro&&time<2.55?'stand':held?'strain':'ready';
      const yaw=intro?(time<1.25?1.85:Math.PI*(1-limit((time-2.1)/.43))):0;
      actor(px,py,'#eab456',yaw,act,still,{flush:caught?1:active?Math.max(urge*.8,held?.9:0):0});
      const word=caught?(leak&&reaction<.7?'뿡!':'헉!'):leak?'뿡!':knocked?'있어요!':close?'아슬아슬!':phase==='play'&&time<1.8?'나':'';
      if(word) bubble(word,px,py-35);
    }
    if(!won) door(lanes[1],active?1:intro?limit((time-2.1)/.45):0);
    for(const lane of [lanes[0],lanes[2]]) {
      const g=guests.find(g=>g.lane===lane);
      let closed=0;
      if(g?.act==='close') closed=limit(g.elapsed/.4);
      if(['strain','ready','inhale'].includes(g?.act)) closed=1;
      if(g?.act==='open') closed=1-limit(g.elapsed/.45);
      door(lane,closed);
    }
    for(const g of guests) {
      if(g.act==='away') continue;
      const y=g.y;
      const motion=['walk','approach','depart','phone'].includes(g.act);
      const angle=motion?-g.heading:g.act==='dry'?Math.PI/2:g.act==='knock'?Math.PI:0; // 드라이어는 왼쪽 벽, 노크는 내 칸 문을 본다
      const target=Math.atan2(g.x-510,152-y)-angle;
      const look=Math.atan2(Math.sin(target),Math.cos(target));
      // 정적이 흐른 뒤 들은 사람이 먼저, 나머지가 한 박자 늦게 고개만 돌린다.
      const heard=culprits.includes(g.who);
      const turn=caught?limit((reaction-(heard?.7:1.15))/.1):0;
      if(turn) {
        c.setLineDash([4,7]);line(g.x,y,510,152,heard?'#c2452d':'#af695288',heard?2.5:1.5);c.setLineDash([]);
      }
      if(g.act==='dry') for(let n=0;n<3;n++) { // 드라이어 바람
        const blow=(time*40+n*7)%18;
        line(258+blow,340+n*7,264+blow,340+n*7,'#8aa3b0',2);
      }
      if(g.act==='wash') { // 물이 나오는 동안만 물줄기와 물결이 보인다. 손을 털 때는 끊긴다.
        ellipse(g.x,416,22+3*Math.sin(time*6),10,null,'#6fb3c4');
        for(let n=0;n<3;n++) {
          const drop=(time*24+n*5)%10;
          line(g.x-3+n*3,426-drop,g.x-3+n*3,414-drop*.65,'#549eb2',2);
        }
      }
      actor(g.x,y,['#789fb6','#c88878','#79967e','#aa8cbd'][g.who],angle,g.act,still,
        {look,turn,puff:g.act==='inhale'?limit(g.elapsed/.5):0,flush:g.act==='strain'?.9:0});
      // 말풍선은 행동이 바뀌는 순간에만 잠깐 뜬다. 판단은 몸짓을 보고 한다.
      const word=caught?(turn?(heard?'…?!':'…?'):'')
        :g.act==='phone'?'여보세요':g.act==='dry'?'위이잉':g.act==='knock'?'똑똑' // 소리가 나는 동안 계속 보인다
        :g.elapsed>.7?'':{strain:'끙!',inhale:'스읍',wash:'쏴아',shake:'탈탈',open:'찰칵',close:'찰칵',approach:'또각'}[g.act];
      if(word) bubble(word,g.x,y-35);
    }
  };
}
