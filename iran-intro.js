/* ═══════════════════════════════════════════════════════════════════
   Iran Intro  —  90 million dots → zoom → civic compass
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Skip if already seen this session ── */
  if (sessionStorage.getItem('intro-seen')) return;

  /* ── Iran border polygon [lon, lat] clockwise ── */
  var IRAN = [
    [44.2,39.5],[44.7,39.7],[45.3,39.8],[45.9,39.5],[46.4,39.2],
    [46.9,39.0],[47.5,38.8],[48.0,38.4],[48.4,38.0],[48.7,37.6],
    [49.1,37.3],[49.6,37.0],[50.2,36.8],[50.8,36.7],[51.4,36.8],
    [52.0,36.9],[52.6,37.0],[53.2,37.1],[53.8,37.3],[54.4,37.5],
    [54.9,37.7],[55.4,38.0],[55.9,38.1],[56.4,37.9],[57.0,37.6],
    [57.6,37.4],[58.2,37.3],[58.8,37.3],[59.4,37.4],[60.0,37.2],
    [60.5,36.9],[60.9,36.5],[61.1,35.9],[61.1,35.2],[61.0,34.5],
    [60.9,33.7],[60.8,32.9],[60.7,32.0],[60.6,31.2],[60.6,30.3],
    [60.8,29.4],[61.0,28.6],[61.2,27.8],[61.5,27.2],[62.0,26.6],
    [61.8,26.0],[61.5,25.5],[61.1,25.2],[60.6,25.0],[60.0,25.0],
    [59.5,25.1],[59.0,25.3],[58.5,25.4],[58.0,25.5],[57.5,25.6],
    [57.0,25.8],[56.5,26.0],[56.0,26.1],[55.5,26.1],[55.0,26.1],
    [54.5,26.3],[54.0,26.5],[53.5,26.6],[53.0,26.7],[52.5,26.8],
    [52.0,26.9],[51.5,27.1],[51.0,27.4],[50.5,27.7],[50.0,28.0],
    [49.5,28.4],[49.0,28.9],[48.7,29.4],[48.5,29.9],[48.3,30.5],
    [47.9,31.1],[47.5,31.6],[47.0,32.1],[46.5,32.6],[46.0,33.1],
    [45.7,33.7],[45.7,34.5],[45.8,35.3],[45.7,36.1],[45.3,36.7],
    [44.9,37.2],[44.5,37.7],[44.2,38.2],[44.0,38.7],[44.2,39.5],
  ];

  var POPULATION  = 90000000;
  var DOT_COUNT   = 7000;
  var ACCENT      = '#0EBB90';
  var ACCENT_RGB  = [14, 187, 144];
  var DIM_BLUE    = [140, 218, 245];

  var AXIS_COLORS = [
    '#0EBB90','#8CDAF5','#FEEB34','#E87461',
    '#A78BFA','#F59E0B','#34D399','#60A5FA',
  ];
  var DIM_NAMES = [
    'Economic\nFreedom','Civil\nLiberties','Digital\nRights','Healthcare',
    'Education','Environment','Governance\nReform','Security &\nDefence',
  ];
  /* Civic values for zk-citizen #00000001 */
  var CITIZEN = [0.72, 0.88, 0.91, 0.65, 0.78, 0.60, 0.83, 0.40];

  /* ── Phase constants ── */
  var PH_MATERIALIZE = 0;   // 2.6 s
  var PH_HOLD        = 1;   // 2.0 s
  var PH_ZOOM        = 2;   // 2.6 s
  var PH_COMPASS     = 3;   // 4.5 s
  var PH_FADEOUT     = 4;   // 0.8 s

  /* ── State ── */
  var canvas, ctx, W, H;
  var poly      = [];   // projected Iran polygon
  var dots      = [];
  var hero      = null; // the target dot
  var phase     = PH_MATERIALIZE;
  var phaseT0   = 0;    // start time of current phase (seconds)
  var globalT0  = null;
  var angle     = 0;
  var raf       = null;

  /* ══════════════════════ geometry helpers ══════════════════════ */
  function projectPoly(w, h) {
    var lons = IRAN.map(function(p){ return p[0]; });
    var lats = IRAN.map(function(p){ return p[1]; });
    var minLon = Math.min.apply(null,lons), maxLon = Math.max.apply(null,lons);
    var minLat = Math.min.apply(null,lats), maxLat = Math.max.apply(null,lats);
    var pad   = 0.13;
    var avail = Math.min(w * (1-2*pad), h * (1-2*pad));
    var lonR  = maxLon - minLon, latR = maxLat - minLat;
    var sc    = Math.min(avail / lonR, avail / latR);
    var ox    = (w - lonR * sc) / 2;
    var oy    = (h - latR * sc) / 2;
    return IRAN.map(function(p){
      return [ ox + (p[0]-minLon)*sc,
               oy + (maxLat - p[1])*sc ];
    });
  }

  function pointInPoly(px, py, pg) {
    var inside = false;
    for (var i=0, j=pg.length-1; i<pg.length; j=i++) {
      var xi=pg[i][0], yi=pg[i][1], xj=pg[j][0], yj=pg[j][1];
      if (((yi>py)!==(yj>py)) && px < (xj-xi)*(py-yi)/(yj-yi)+xi) inside=!inside;
    }
    return inside;
  }

  function polyBounds(pg) {
    var xs=pg.map(function(p){return p[0];}), ys=pg.map(function(p){return p[1];});
    return { minX:Math.min.apply(null,xs), maxX:Math.max.apply(null,xs),
             minY:Math.min.apply(null,ys), maxY:Math.max.apply(null,ys) };
  }

  /* ══════════════════════ dot setup ══════════════════════════════ */
  function buildDots(pg) {
    var b = polyBounds(pg);
    var cx = (b.minX+b.maxX)/2, cy = (b.minY+b.maxY)/2;
    var list = [], attempts = 0, maxA = DOT_COUNT * 25;
    while (list.length < DOT_COUNT && attempts < maxA) {
      attempts++;
      var x = b.minX + Math.random()*(b.maxX-b.minX);
      var y = b.minY + Math.random()*(b.maxY-b.minY);
      if (!pointInPoly(x,y,pg)) continue;
      list.push({
        x: x, y: y,
        sx: Math.random()*W, sy: Math.random()*H,  // scatter origin
        delay: Math.random()*1.8,
        size:  0.7 + Math.random()*1.1,
        bright: Math.random(),
        isHero: false,
      });
    }
    /* pick dot closest to Iran's geographic centre (~53°E, 32°N) */
    var lonC = 53.5, latC = 32.5;
    var lons2 = IRAN.map(function(p){return p[0];}),
        lats2 = IRAN.map(function(p){return p[1];});
    var minL=Math.min.apply(null,lons2), maxL=Math.max.apply(null,lons2);
    var minLa=Math.min.apply(null,lats2), maxLa=Math.max.apply(null,lats2);
    var sc2 = Math.min((W*(1-0.26))/(maxL-minL),(H*(1-0.26))/(maxLa-minLa));
    var ox2=(W-(maxL-minL)*sc2)/2, oy2=(H-(maxLa-minLa)*sc2)/2;
    var heroCanvasX = ox2+(lonC-minL)*sc2;
    var heroCanvasY = oy2+(maxLa-latC)*sc2;
    var best=null, bestD=Infinity;
    list.forEach(function(d){
      var dd=(d.x-heroCanvasX)*(d.x-heroCanvasX)+(d.y-heroCanvasY)*(d.y-heroCanvasY);
      if(dd<bestD){bestD=dd;best=d;}
    });
    if(best){ best.isHero=true; best.size=2.5; best.bright=1; }
    hero=best;
    return list;
  }

  /* ══════════════════════ easing ═════════════════════════════════ */
  function eio(t){ return t<.5?2*t*t:-1+(4-2*t)*t; }          // ease in-out quad
  function eout3(t){ return 1-Math.pow(1-t,3); }               // ease out cubic
  function eoutE(t){ return t>=1?1:1-Math.pow(2,-10*t); }       // ease out expo

  /* ══════════════════════ draw civic compass ═════════════════════ */
  function drawCompass(cx, cy, radius, prog, ang, alpha) {
    var N = 8, TAU = Math.PI*2;
    var golden = (1+Math.sqrt(5))/2;

    /* Fibonacci sphere axes */
    var axes3 = [];
    for(var i=0;i<N;i++){
      var theta=Math.acos(1-2*(i+0.5)/N), phi=TAU*i/golden;
      axes3.push({ x:Math.sin(theta)*Math.cos(phi),
                   y:Math.sin(theta)*Math.sin(phi),
                   z:Math.cos(theta) });
    }

    /* Rotate + project */
    var ay=ang, ax=ang*0.38;
    var cY=Math.cos(ay),sY=Math.sin(ay),cX=Math.cos(ax),sX=Math.sin(ax);
    var FOV=500;
    function proj(p) {
      var x1=p.x*cY+p.z*sY, z1=-p.x*sY+p.z*cY;
      var y1=p.y*cX-z1*sX, z2=p.y*sX+z1*cX;
      var sc=FOV/(FOV+z2*radius*0.7);
      return { x:cx+x1*radius*sc, y:cy+y1*radius*sc, z:z2 };
    }
    var pa=axes3.map(proj);

    ctx.save();
    ctx.globalAlpha=alpha;

    /* faint web rings */
    for(var ring=1;ring<=4;ring++){
      var rf=ring/4;
      ctx.strokeStyle='rgba(255,255,255,0.05)';
      ctx.lineWidth=0.5;
      ctx.beginPath();
      pa.forEach(function(p,i){
        var px=cx+(p.x-cx)*rf, py=cy+(p.y-cy)*rf;
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      });
      ctx.closePath();
      ctx.stroke();
    }

    /* axis spokes */
    pa.forEach(function(p,i){
      var hex=AXIS_COLORS[i];
      var r2=parseInt(hex.slice(1,3),16),g2=parseInt(hex.slice(3,5),16),b2=parseInt(hex.slice(5,7),16);
      ctx.strokeStyle='rgba('+r2+','+g2+','+b2+',0.35)';
      ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y); ctx.stroke();
    });

    /* data hull — animates in */
    var hullProg = Math.min(1, prog*1.6);
    ctx.beginPath();
    pa.forEach(function(p,i){
      var v=CITIZEN[i]*hullProg;
      var px=cx+(p.x-cx)*v, py=cy+(p.y-cy)*v;
      i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(14,187,144,0.12)';
    ctx.fill();
    ctx.strokeStyle='rgba(14,187,144,0.85)';
    ctx.lineWidth=1.5;
    ctx.stroke();

    /* data nodes */
    if(prog>0.25){
      var nodeProg=Math.min(1,(prog-0.25)*1.6);
      pa.forEach(function(p,i){
        var v=CITIZEN[i]*nodeProg;
        var px=cx+(p.x-cx)*v, py=cy+(p.y-cy)*v;
        var hex=AXIS_COLORS[i];
        var r2=parseInt(hex.slice(1,3),16),g2=parseInt(hex.slice(3,5),16),b2=parseInt(hex.slice(5,7),16);
        ctx.fillStyle='rgba('+r2+','+g2+','+b2+',0.95)';
        ctx.beginPath(); ctx.arc(px,py,2.5,0,Math.PI*2); ctx.fill();
      });
    }

    /* axis labels fade in last */
    if(prog>0.55){
      var labProg=Math.min(1,(prog-0.55)*2.2);
      ctx.globalAlpha=alpha*labProg*0.75;
      pa.forEach(function(p,i){
        var hex=AXIS_COLORS[i];
        var r2=parseInt(hex.slice(1,3),16),g2=parseInt(hex.slice(3,5),16),b2=parseInt(hex.slice(5,7),16);
        ctx.fillStyle='rgba('+r2+','+g2+','+b2+',1)';
        var fontSize=Math.max(8, Math.round(radius*0.115));
        ctx.font='500 '+fontSize+'px "Inter",sans-serif';
        ctx.textAlign='center';
        var lx=cx+(p.x-cx)*1.28, ly=cy+(p.y-cy)*1.28;
        var lines=DIM_NAMES[i].split('\n');
        lines.forEach(function(ln,k){ ctx.fillText(ln, lx, ly+k*fontSize*1.2); });
      });
      ctx.globalAlpha=alpha;
    }

    /* centre glow */
    var grd=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*0.18);
    grd.addColorStop(0,'rgba(14,187,144,0.25)');
    grd.addColorStop(1,'rgba(14,187,144,0)');
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.arc(cx,cy,radius*0.18,0,Math.PI*2); ctx.fill();

    /* ZK label */
    if(prog>0.65){
      var zkProg=Math.min(1,(prog-0.65)*3);
      ctx.globalAlpha=alpha*zkProg;
      var fs=Math.max(11, Math.round(radius*0.13));
      ctx.fillStyle=ACCENT;
      ctx.font='600 '+fs+'px "Inter",sans-serif';
      ctx.textAlign='center';
      ctx.fillText('zk-citizen  #00000001', cx, cy+radius+fs*1.8);
      ctx.fillStyle='rgba(255,255,255,0.45)';
      ctx.font='400 '+(fs*0.88)+'px "Inter",sans-serif';
      ctx.fillText('Iran  ·  Verified  ·  Anonymous', cx, cy+radius+fs*3.2);
    }

    ctx.restore();
  }

  /* ══════════════════════ main render loop ═══════════════════════ */
  function tick(ts) {
    var now = ts/1000;
    if(globalT0===null){ globalT0=now; phaseT0=now; }
    var t  = now - globalT0;    // total elapsed
    var pt = now - phaseT0;     // elapsed in current phase

    angle += (1/60)*0.55;

    /* ── phase transitions ── */
    if(phase===PH_MATERIALIZE && pt>2.6){ advance(now); }
    if(phase===PH_HOLD        && pt>2.0){ advance(now); }
    if(phase===PH_ZOOM        && pt>2.6){ advance(now); }
    if(phase===PH_COMPASS     && pt>4.5){ advance(now); }

    var pt2 = now - phaseT0;   // re-read after possible advance

    /* ── overlay alpha (fade-out at end) ── */
    var bgAlpha = 1;
    if(phase===PH_FADEOUT){
      bgAlpha = Math.max(0, 1-pt2/0.8);
      if(bgAlpha<=0){ finish(); return; }
    }

    /* ── background ── */
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(6,6,10,'+bgAlpha+')';
    ctx.fillRect(0,0,W,H);

    /* ── dot layer (all phases except compass/fadeout) ── */
    if(phase<=PH_ZOOM){
      var zp = phase===PH_ZOOM ? eio(Math.min(1,pt2/2.2)) : 0;
      var zoomScale = 1 + zp*24;

      dots.forEach(function(d){
        /* materialize progress per-dot */
        var mp;
        if(phase===PH_MATERIALIZE){
          mp=Math.max(0,Math.min(1,(pt2-d.delay)/1.1));
        } else { mp=1; }
        if(mp<=0) return;

        /* fly from scatter to map position */
        var ease=mp<.5?2*mp*mp:-1+(4-2*mp)*mp;
        var wx = d.sx+(d.x-d.sx)*ease;
        var wy = d.sy+(d.y-d.sy)*ease;

        /* camera zoom toward hero dot */
        if(phase===PH_ZOOM && hero){
          wx = W/2 + (wx - hero.x)/zoomScale;
          wy = H/2 + (wy - hero.y)/zoomScale;
        }

        /* alpha: hero stays bright, others fade during zoom */
        var dotAlpha = mp * (d.isHero ? 1 : 0.65);
        if(phase===PH_ZOOM && !d.isHero) dotAlpha *= (1-zp*0.95);

        var r,g,b;
        if(d.isHero){ r=ACCENT_RGB[0];g=ACCENT_RGB[1];b=ACCENT_RGB[2]; }
        else { r=DIM_BLUE[0];g=DIM_BLUE[1];b=DIM_BLUE[2]; }

        ctx.globalAlpha=dotAlpha*bgAlpha;
        ctx.fillStyle='rgba('+r+','+g+','+b+',1)';
        ctx.beginPath();
        ctx.arc(wx, wy, d.isHero?(d.size*(1+zp*2)):d.size, 0, Math.PI*2);
        ctx.fill();
      });
      ctx.globalAlpha=1;
    }

    /* ── population counter ── */
    if(phase===PH_HOLD || phase===PH_ZOOM){
      var cntAlpha, count;
      if(phase===PH_HOLD){
        cntAlpha=Math.min(1,pt2/0.5);
        count=Math.round(POPULATION*Math.min(1,pt2/1.6));
      } else {
        cntAlpha=Math.max(0,1-pt2/1.0);
        count=POPULATION;
      }
      cntAlpha*=bgAlpha;
      ctx.globalAlpha=cntAlpha;
      var fs=Math.max(14,Math.round(W*0.022));
      ctx.font='600 '+fs+'px "Inter",sans-serif';
      ctx.textAlign='center';
      ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.fillText(count.toLocaleString()+'\u200f زیست‌شهروند', W/2, H-38);
      ctx.font='400 '+Math.round(fs*0.7)+'px "Inter",sans-serif';
      ctx.fillStyle='rgba(255,255,255,0.35)';
      ctx.fillText('جمهور ایران — republic of iran', W/2, H-16);
      ctx.globalAlpha=1;
    }

    /* ── compass phase ── */
    if(phase===PH_COMPASS || phase===PH_FADEOUT){
      var cp  = eoutE(Math.min(1, (phase===PH_FADEOUT?4.5:pt2)/1.8));
      var compassR = Math.min(W,H)*0.27*cp;
      var cAlpha   = (phase===PH_FADEOUT)?(bgAlpha):Math.min(1,pt2/0.5);
      drawCompass(W/2, H/2, compassR, cp, angle, cAlpha);
    }

    /* ── skip hint ── */
    if(phase<PH_FADEOUT && t>0.8){
      ctx.globalAlpha=Math.min(0.35,(t-0.8)*0.3)*bgAlpha;
      ctx.fillStyle='rgba(255,255,255,0.7)';
      ctx.font='400 11px "Inter",sans-serif';
      ctx.textAlign='right';
      ctx.fillText('esc to skip', W-18, H-14);
    }
    ctx.globalAlpha=1;

    raf=requestAnimationFrame(tick);
  }

  function advance(now){ phase++; phaseT0=now; }
  function skip(){ if(phase<PH_FADEOUT){ phase=PH_FADEOUT; phaseT0=performance.now()/1000; } }
  function finish(){
    cancelAnimationFrame(raf);
    var el=document.getElementById('iran-intro');
    if(el){ el.style.display='none'; }
    sessionStorage.setItem('intro-seen','1');
  }

  /* ══════════════════════ setup ══════════════════════════════════ */
  function resize(){
    W=canvas.width =window.innerWidth;
    H=canvas.height=window.innerHeight;
    poly=projectPoly(W,H);
    dots=buildDots(poly);
  }

  function init(){
    canvas=document.getElementById('iran-intro');
    if(!canvas) return;
    ctx=canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', skip);
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') skip(); });
    raf=requestAnimationFrame(tick);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
