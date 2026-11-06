import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CELL_STEP, LEVELS, ZONE_POSITIONS, PORTRAIT_ZONES, cellPosition, zoneLetters, type BoardAction, type BoardState } from './board';

type Props = {
  board: BoardState;
  round: number;
  paused: boolean;
  hintWord: string | null;
  onAction: (action: BoardAction) => void;
  onAnalysis: () => void;
  onExit: () => void;
};
type TileObject = { group: THREE.Group; material: THREE.MeshStandardMaterial; velocity: THREE.Vector3; target: THREE.Vector3 };
export const tileHome = (id: number) => ({ x: (id % 4 - 1.5) * 1.18 + Math.sin(id*7.1)*.085, z: -3.65 + Math.floor(id / 4) * 1.43 + Math.cos(id*4.7)*.08 });
export const cameraPosition = new THREE.Vector3(8, 22, 26);
export const portraitCameraPosition = new THREE.Vector3(0, 27, 19);

export default function World(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props); latest.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = host.current!;
    const palette = LEVELS[props.board.level];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let alive = true, frame = 0;
    let renderer: THREE.WebGLRenderer | import('three/webgpu').WebGPURenderer | undefined;
    let observer: ResizeObserver | undefined;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(palette.sky, 37, 76);
    const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, .1, 130);
    camera.position.copy(cameraPosition); camera.lookAt(0, .2, 0);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.96);
    const tiles = new Map<number, TileObject>();
    const islands: THREE.Group[] = [], pads: THREE.Mesh[] = [], cells: THREE.Object3D[] = [];
    const arches: THREE.Group[] = [], bridges: THREE.Group[] = [];
    const pickables: THREE.Object3D[] = [];
    let dragged: number | null = null, hovered: number | null = null;
    let pointerId: number | null = null, didMove = false;
    let pointerStart = { x: 0, y: 0 };
    const dragPoint = new THREE.Vector3();
    let zoom = 1, wheelZoom = 1;
    let portrait = false;
    let gate: THREE.Group, orb: THREE.Group;
    const bridgeSteps: THREE.Mesh[][] = [];
    const plants: THREE.Group[] = [];
    const exitSteps: THREE.Mesh[] = [], gateStars: THREE.Mesh[] = [];
    const islandShadows: THREE.Mesh[] = [];
    const zonePositions = () => portrait ? PORTRAIT_ZONES : ZONE_POSITIONS;

    const standard = (color: string, roughness = .78) => new THREE.MeshStandardMaterial({ color, roughness });
    const addMesh = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const box = (w: number, h: number, d: number, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0, radius = .07) =>
      addMesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, h / 3)), standard(color), parent, x, y, z);
    const cylinder = (rt: number, rb: number, height: number, color: string, parent: THREE.Object3D, x = 0, y = 0, z = 0, segments = 48) =>
      addMesh(new THREE.CylinderGeometry(rt, rb, height, segments), standard(color), parent, x, y, z);

    function arch(width: number, height: number, color: string) {
      const group = new THREE.Group();
      const radius = width / 2, thickness = .22;
      box(thickness * 2, height, .48, color, group, -radius, height / 2);
      box(thickness * 2, height, .48, color, group, radius, height / 2);
      const top = addMesh(new THREE.TorusGeometry(radius, thickness, 16, 48, Math.PI), standard(color), group, 0, height);
      top.scale.z = 1.08;
      cylinder(radius + .3, radius + .35, .17, color, group, 0, .08);
      return group;
    }

    function resize() {
      if (!alive || !renderer) return;
      const bounds = container.getBoundingClientRect(); if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height);
      const aspect = bounds.width / bounds.height;
      portrait = aspect < .85;
      camera.position.copy(portrait ? portraitCameraPosition : cameraPosition); camera.lookAt(0, .2, portrait ? .7 : 0);
      const size = (portrait ? Math.max(10.7, 6.05 / aspect) : Math.max(8.4, 13.15 / aspect)) / zoom;
      camera.left = -size * aspect; camera.right = size * aspect;
      camera.top = size; camera.bottom = -size; camera.updateProjectionMatrix();
      islands.forEach((island,i) => {
        const p = zonePositions()[i], width = props.board.zones[i].length * CELL_STEP + .72;
        const center = p.x + (props.board.zones[i].length - 1) * CELL_STEP / 2;
        island.position.set(center, island.position.y, p.z);
        islandShadows[i]?.position.set(center,-2.625,p.z);
        const boundary = 1/Math.sqrt(center*center/(3.33*3.33)+p.z*p.z/(5.05*5.05));
        const from = new THREE.Vector3(center*boundary,.55,p.z*boundary);
        const to = portrait ? new THREE.Vector3(center,.55,p.z+ (p.z<0 ? 1.35 : -1.35)) : new THREE.Vector3(center-Math.sign(center)*width/2,.55,p.z);
        if(portrait && i>=4)from.set(center,.55,PORTRAIT_ZONES[i-2].z+1.35);
        const length = from.distanceTo(to);
        bridgeSteps[i]?.forEach((step,j) => {
          step.position.copy(from.clone().lerp(to,(j+.5)/5));
          step.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
          step.userData.length=length/5/.57*.92;
        });
      });
      gate?.position.set(0,.05,portrait ? -10.3 : -7.1);
      orb?.position.set(portrait ? 4.5 : 9.35,.2,portrait ? -9.6 : -6.5);
      exitSteps.forEach((step,i)=>step.position.set(0,.54,-5.2-(portrait ? .62 : .23)*i));
    }

    async function init() {
      try {
        if ('gpu' in navigator && navigator.gpu) {
          try {
            const { WebGPURenderer } = await import('three/webgpu'); if (!alive) return;
            const gpu = new WebGPURenderer({ alpha: true, antialias: true }); renderer = gpu;
            await gpu.init(); if (!alive) { gpu.dispose(); return; }
          } catch { renderer?.dispose(); renderer = undefined; }
        }
        if (!alive) return;
        renderer ??= new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
        renderer.setClearColor(palette.sky, 1);
        renderer.domElement.dataset.ready = 'true'; renderer.domElement.setAttribute('aria-label', '字母浮岛，拖动积木拼词');
        renderer.domElement.dataset.backend = renderer instanceof THREE.WebGLRenderer || 'isWebGLBackend' in renderer.backend ? 'webgl' : 'webgpu';
        container.prepend(renderer.domElement);

        const backgroundCanvas = document.createElement('canvas'); backgroundCanvas.width = 16; backgroundCanvas.height = 256;
        const ctx = backgroundCanvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, palette.sky); gradient.addColorStop(1, palette.horizon);
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 16, 256);
        const sky = new THREE.CanvasTexture(backgroundCanvas); sky.colorSpace = THREE.SRGBColorSpace; scene.background = sky;
        scene.add(new THREE.AmbientLight('#f7e5e0', .55));
        scene.add(new THREE.HemisphereLight('#f7ecdd', '#65648a', 1.2));
        const sun = new THREE.DirectionalLight('#ffe0be', 2.8); sun.position.set(-9, 22, 7); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15 });
        sun.shadow.normalBias = .055; sun.shadow.bias = -.0001; scene.add(sun);
        const rim = new THREE.DirectionalLight('#c8d8ff', 1.5); rim.position.set(10, 9, -12); scene.add(rim);

        const ground = addMesh(new THREE.PlaneGeometry(180, 180), standard(palette.water), scene, 0, -2.65, 0);
        ground.rotation.x = -Math.PI / 2; ground.castShadow = false; ground.receiveShadow = false;
        const shade = addMesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:'#343047',opacity:.18}),scene,0,-2.64,0);
        shade.rotation.x=-Math.PI/2;shade.castShadow=false;
        const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
        const shadowContext=shadowCanvas.getContext('2d')!,soft=shadowContext.createRadialGradient(64,64,5,64,64,64);
        soft.addColorStop(0,'rgba(40,36,65,.14)');soft.addColorStop(.45,'rgba(40,36,65,.08)');soft.addColorStop(1,'rgba(40,36,65,0)');
        shadowContext.fillStyle=soft;shadowContext.fillRect(0,0,128,128);
        const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
        const softShadow=(w:number,d:number)=>{const mesh=addMesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}),scene,0,-2.63,0);mesh.rotation.x=-Math.PI/2;mesh.castShadow=mesh.receiveShadow=false;return mesh;};
        softShadow(10,14);

        // A circular island is the letter pool. The perimeter carries no labels.
        const main = new THREE.Group(); scene.add(main);
        const base = cylinder(3.3, 2.9, 1.05, palette.edge, main, 0, -.1, 0, 80); base.scale.z = 1.52;
        const surface = cylinder(3.33, 3.33, .13, palette.stone, main, 0, .48, 0, 80); surface.scale.z = 1.52;
        const lip = addMesh(new THREE.TorusGeometry(3.28, .025, 8, 100), standard(palette.accent, .4), main, 0, .56, 0);
        lip.rotation.x = Math.PI / 2; lip.scale.y = 1.52;
        const underside = addMesh(new THREE.ConeGeometry(2.9, 1.3, 8), standard(palette.edge), main, 0, -1.15, 0);
        underside.rotation.z = Math.PI; underside.scale.z = 1.5;

        props.board.zones.forEach(zone => {
          const position = ZONE_POSITIONS[zone.id];
          const width = zone.length * CELL_STEP + .72;
          const center = position.x + (zone.length - 1) * CELL_STEP / 2;
          const group = new THREE.Group(); group.position.set(center, 0, position.z); scene.add(group); islands.push(group);
          islandShadows.push(softShadow(width+2,4.6));
          box(width, .82, 2.75, palette.edge, group, 0, -.13, 0, .18);
          box(width + .05, .12, 2.8, palette.stone, group, 0, .34, 0, .1);
          const foot = addMesh(new THREE.CylinderGeometry(width / 2.2, width / 3.1, .8, 6), standard(palette.edge), group, 0, -.9, 0);
          foot.scale.z = .5;
          const pad = box(zone.length * CELL_STEP + .15, .09, 1.15, palette.edge, group, 0, .45, .22, .045);
          pad.userData.zone = zone.id; pads.push(pad); pickables.push(pad);
          for (let i = 0; i < zone.length; i++) {
            const cell = box(.99, .035, .97, '#c9c1b8', group, (i - (zone.length - 1) / 2) * CELL_STEP, .51, .22, .03);
            cell.userData.zone = zone.id; cell.userData.cell = i; cells.push(cell); pickables.push(cell);
            const inlay = box(.82, .018, .8, palette.stone, group, cell.position.x, .536, .22, .02);
            inlay.userData.zone = zone.id; inlay.userData.cell = i; pickables.push(inlay);
          }
          // A completed word raises a sculpture, then assembles a bridge to the center.
          const sculpture = arch(1.18 + zone.length * .08, 1.08 + (zone.id % 3) * .15, palette.arch);
          sculpture.position.set(0, -3, -.85); group.add(sculpture); arches.push(sculpture);
          const bridge = new THREE.Group(); scene.add(bridge); bridges.push(bridge);
          const from = new THREE.Vector3(Math.sign(center) * 3.1, 0, position.z * .82);
          const to = new THREE.Vector3(center - Math.sign(center) * width / 2, 0, position.z);
          const steps: THREE.Mesh[]=[];
          for (let i = 0; i < 5; i++) {
            const p = from.clone().lerp(to, (i + .5) / 5);
            const step = box(.46, .16, .57, palette.stone, bridge, p.x, .1 + i * .045, p.z, .04);
            step.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
            box(.18, .012, .36, palette.accent, step, 0, .089, 0, .003);
            steps.push(step);
          }
          bridgeSteps.push(steps);
          const plant = new THREE.Group(); group.add(plant); plants.push(plant);
          plant.position.set(width/2-.34,.4,-.85);
          cylinder(.16,.22,.24,palette.arch,plant,0,.12,0,12);
          cylinder(.024,.035,.7,'#718783',plant,0,.48,0,8);
          for(let j=0;j<4;j++){
            const leaf=addMesh(new THREE.SphereGeometry(.18,12,8),standard('#8faaa0'),plant,Math.cos(j*2.4)*.13,.45+j*.12,Math.sin(j*2.4)*.1);
            leaf.scale.set(1,.35,1.6);leaf.rotation.z=j%2 ? .55 : -.55;
          }
          plant.scale.setScalar(.001);
        });

        props.board.tiles.forEach(tile => {
          const group = new THREE.Group(), home = tileHome(tile.id); scene.add(group);
          group.position.set(home.x, reduced ? .96 : 7 + tile.id * .12, home.z);
          const body = box(.94, .78, .94, palette.accent, group, 0, 0, 0, .095);
          const material = body.material as THREE.MeshStandardMaterial; material.roughness = .55;
          const c = document.createElement('canvas'); c.width = c.height = 256;
          const context = c.getContext('2d')!; context.fillStyle = '#3e3c48';
          context.font = "700 174px 'Arial', sans-serif"; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(tile.letter, 128, 141);
          const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
          const face = addMesh(new THREE.PlaneGeometry(.76, .76), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }), group, 0, .397, 0);
          face.rotation.x = -Math.PI / 2; face.castShadow = false;
          group.traverse(object => object.userData.tile = tile.id); pickables.push(group);
          tiles.set(tile.id, { group, material, velocity: new THREE.Vector3(), target: new THREE.Vector3(home.x, .96, home.z) });
        });

        // The gate opens when the player has built three words. It is the level exit.
        gate = arch(1.88, 2.3, palette.stone); gate.position.set(0, .05, -7.1); scene.add(gate);
        gate.traverse(object => object.userData.exit = true); pickables.push(gate);
        const portal = addMesh(new THREE.PlaneGeometry(1.45, 2.2), new THREE.MeshBasicMaterial({ color: '#ffd6a0', transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), gate, 0, 1.27, .07);
        portal.userData.exit = true;
        const portalLight = new THREE.PointLight('#ffd1a2', 0, 9, 2); portalLight.position.set(0, 1.8, -5.8); scene.add(portalLight);
        for(let i=0;i<6;i++){const step=box(.57,.16,.5,palette.stone,scene);exitSteps.push(step);}
        for(let i=0;i<3;i++){const star=addMesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:'#ffe5a1'}),gate,(i-1)*.37,3.65,0);gateStars.push(star);}

        // The only data object is a moving glass observatory, without a permanent callout.
        orb = new THREE.Group(); orb.position.set(9.35, .2, -6.5); scene.add(orb);
        cylinder(.78, .93, .28, palette.stone, orb);
        const crystal = addMesh(new THREE.IcosahedronGeometry(.4, 2), new THREE.MeshPhysicalMaterial({ color: '#bfedf2', roughness: .08, metalness: .15, transparent: true, opacity: .8, clearcoat: 1, emissive: '#78a8b6', emissiveIntensity: .22 }), orb, 0, .9, 0);
        const rings: THREE.Mesh[] = [];
        for (let i = 0; i < 2; i++) { const ring = addMesh(new THREE.TorusGeometry(.62 + i * .1, .021, 8, 60), standard('#cfdddf', .3), orb, 0, .9, 0); ring.rotation.set(.8 + i * .7, i * .8, .35); rings.push(ring); }
        orb.traverse(object => object.userData.analytics = true); pickables.push(orb);

        const moteGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(54 * 3);
        for (let i = 0; i < 54; i++) { positions[i * 3] = Math.sin(i * 31.7) * 13; positions[i * 3 + 1] = .8 + (i % 9) * .42; positions[i * 3 + 2] = Math.cos(i * 19.1) * 10; }
        moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: '#f2dab3', size: .045, transparent: true, opacity: .42, depthWrite: false })); scene.add(motes);

        observer = new ResizeObserver(resize); observer.observe(container); resize();
        const updateRay = (event: PointerEvent) => {
          const bounds = container.getBoundingClientRect();
          pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
        };
        const hits = () => raycaster.intersectObjects(pickables, true);
        const down = (event: PointerEvent) => {
          if (latest.current.paused || pointerId !== null || event.button !== 0) return;
          updateRay(event); const hit = hits()[0]; if (!hit) return;
          if (hit.object.userData.analytics) { latest.current.onAnalysis(); return; }
          if (hit.object.userData.exit) { if (latest.current.board.completed.length >= 3) latest.current.onExit(); return; }
          if (hit.object.userData.tile !== undefined) {
            const id = hit.object.userData.tile as number; if (latest.current.board.tiles[id].consumed) return;
            dragged = id; pointerId = event.pointerId; didMove = false; pointerStart = { x: event.clientX, y: event.clientY };
            dragPoint.copy(tiles.get(id)!.group.position); renderer!.domElement.setPointerCapture(event.pointerId); container.style.cursor = 'grabbing';
          } else if (hit.object.userData.zone !== undefined) latest.current.onAction({ type: 'select', zone: hit.object.userData.zone });
        };
        const move = (event: PointerEvent) => {
          updateRay(event);
          if (dragged !== null && pointerId === event.pointerId) {
            if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) didMove = true;
            if (didMove) { const p = new THREE.Vector3(); if (raycaster.ray.intersectPlane(plane, p)) dragPoint.set(p.x, 1.42, p.z); }
          } else {
            const hit = hits()[0]; hovered = hit?.object.userData.tile ?? null;
            container.style.cursor = hit?.object.userData.analytics || hit?.object.userData.exit || hit?.object.userData.zone !== undefined ? 'pointer' : hovered !== null && !latest.current.board.tiles[hovered].consumed ? 'grab' : 'default';
          }
        };
        const up = (event: PointerEvent) => {
          if (dragged === null || pointerId !== event.pointerId) return;
          const id = dragged; updateRay(event);
          if (!didMove) latest.current.onAction({ type: 'click', tile: id });
          else {
            const hit = raycaster.intersectObjects(cells, false)[0];
            if (hit && !latest.current.board.zones[hit.object.userData.zone].word) latest.current.onAction({ type: 'place', tile: id, zone: hit.object.userData.zone, cell: hit.object.userData.cell });
            else {
              const p = new THREE.Vector3(); raycaster.ray.intersectPlane(plane, p);
              const zone = latest.current.board.zones.find(z => !z.word && Math.abs(p.z - zonePositions()[z.id].z - .22) < .85 && p.x >= zonePositions()[z.id].x - .6 && p.x <= zonePositions()[z.id].x + (z.length - 1) * CELL_STEP + .6);
              if (zone) latest.current.onAction({ type: 'place', tile: id, zone: zone.id, cell: Math.round((p.x - zonePositions()[zone.id].x) / CELL_STEP) });
              else latest.current.onAction({ type: 'return', tile: id });
            }
          }
          dragged = null; pointerId = null; container.style.cursor = 'default';
        };
        const cancel = () => { dragged = null; pointerId = null; container.style.cursor = 'default'; };
        const wheel = (event: WheelEvent) => { event.preventDefault(); wheelZoom = THREE.MathUtils.clamp(wheelZoom - event.deltaY * .00045, .8, 1.55); };
        renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move);
        renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', cancel);
        renderer.domElement.addEventListener('wheel', wheel, { passive: false });
        setReady(true);
        let last = performance.now(), elapsed = 0;
        const bridgeProgress = Array(6).fill(0);
        const errorTimes = Array(6).fill(-10), previousErrors = Array(6).fill('');

        function animate(now: number) {
          if (!alive || !renderer) return;
          const realDt = Math.min((now-last)/1000,.5), dt = Math.min(realDt,.035); last = now;
          if(!latest.current.paused) elapsed += realDt;
          if (Math.abs(zoom - wheelZoom) > .001) { zoom += (wheelZoom - zoom) * .12; resize(); }
          const board = latest.current.board;
          main.position.y = reduced ? 0 : Math.sin(elapsed * .62) * .045;
          islands.forEach((island, i) => {
            const intro = reduced ? 1 : THREE.MathUtils.smoothstep(elapsed - i * .07, 0, 1.25);
            island.position.y = (1 - intro) * -3 + (reduced ? 0 : Math.sin(elapsed * .7 + i * 1.3) * .045);
            const built = board.zones[i].word ? 1 : 0;
            bridgeProgress[i] += (built - bridgeProgress[i]) * (1-Math.exp(-realDt*3.2));
            const progress = bridgeProgress[i];
            bridgeSteps[i].forEach((step,j)=>{const growth=Math.max(.001,THREE.MathUtils.smoothstep(progress,j*.13,j*.13+.36));step.scale.set(growth,growth,growth*(step.userData.length||1));step.position.y=.55-(1-growth)*1.1;});
            plants[i].scale.setScalar(Math.max(.001,THREE.MathUtils.smoothstep(progress,.3,1)));
            arches[i].position.y = -3.4 * (1 - progress);
            arches[i].scale.setScalar(Math.max(.001, progress));
            if (board.zones[i].lastError !== previousErrors[i]) { previousErrors[i] = board.zones[i].lastError; errorTimes[i] = elapsed; }
            const padMaterial = pads[i].material as THREE.MeshStandardMaterial;
            padMaterial.color.set(board.active === i ? palette.accent : palette.edge);
            padMaterial.emissive.set(elapsed - errorTimes[i] < .65 ? '#8f2829' : board.active === i ? '#b86e41' : '#000000');
            padMaterial.emissiveIntensity = elapsed - errorTimes[i] < .65 ? .4 : board.active === i ? .12 + Math.sin(elapsed * 2) * .04 : 0;
          });
          const hintLetters = latest.current.hintWord ? zoneLetters(board, board.active) : [];
          const missing = latest.current.hintWord ? [...latest.current.hintWord].find((letter, i) => hintLetters[i] !== letter) : null;
          board.tiles.forEach(tile => {
            const object = tiles.get(tile.id)!;
            const home = tileHome(tile.id);
            const intro = reduced ? 1 : THREE.MathUtils.smoothstep(elapsed - tile.id * .019, .08, 1.28);
            if (dragged === tile.id && didMove) object.target.copy(dragPoint);
            else if (tile.zone !== null) { const p = cellPosition(tile.zone, tile.cell!,portrait); object.target.set(p.x, islands[tile.zone].position.y + .96, p.z + .22); }
            else object.target.set(home.x, .96 + main.position.y + (hovered === tile.id && !latest.current.paused ? .13 : 0) + (1 - intro) * 6, home.z);
            if (reduced) object.group.position.copy(object.target);
            else {
              const duration = Math.min(realDt,.18), count = Math.max(1,Math.ceil(duration/.018)), stepDt = duration/count;
              for(let step=0;step<count;step++) { const acceleration=object.target.clone().sub(object.group.position).multiplyScalar(112).addScaledVector(object.velocity,-17);object.velocity.addScaledVector(acceleration,stepDt);object.group.position.addScaledVector(object.velocity,stepDt); }
            }
            const lean = dragged === tile.id && didMove ? .12 : 0;
            object.group.rotation.z += (lean - object.group.rotation.z) * Math.min(1, dt * 15);
            const turn=tile.zone===null ? Math.sin(tile.id*11.3)*.085 : 0;
            object.group.rotation.y += (turn - object.group.rotation.y) * Math.min(1, realDt * 15);
            object.material.color.set(tile.consumed ? palette.stone : palette.accent);
            const isHint = missing === tile.letter && !tile.consumed && tile.zone === null;
            object.material.emissive.set(isHint ? '#ffe7a1' : tile.consumed ? '#b9854b' : '#000000');
            object.material.emissiveIntensity = isHint ? .25 + Math.sin(elapsed * 4) * .12 : tile.consumed ? .045 : 0;
          });
          const gateOpen = board.completed.length >= 3;
          portalLight.position.set(0,1.8,gate.position.z+.6);
          gateStars.forEach((star,i)=>{star.visible=board.completed.length>i;star.position.y=3.65+Math.sin(elapsed*1.5+i)*.035;});
          exitSteps.forEach((step,i)=>{step.scale.setScalar(Math.max(.001,gateOpen ? Math.min(1,step.scale.x+realDt*.8) : step.scale.x-realDt*2));step.position.y=.54-(1-step.scale.x);});
          (portal.material as THREE.MeshBasicMaterial).opacity += ((gateOpen ? .65 + Math.sin(elapsed * 1.8) * .08 : .025) - (portal.material as THREE.MeshBasicMaterial).opacity) * Math.min(1, realDt * 4);
          portalLight.intensity += ((gateOpen ? 4.5 : 0) - portalLight.intensity) * Math.min(1, realDt * 4);
          crystal.rotation.y += dt * .35; crystal.position.y = .9 + Math.sin(elapsed * 1.2) * .08;
          rings.forEach((ring, i) => ring.rotation.y += dt * (.12 + i * .05));
          motes.rotation.y = reduced ? 0 : elapsed * .007;
          renderer.render(scene, camera); frame = requestAnimationFrame(animate);
        }
        frame = requestAnimationFrame(animate);
      } catch (error) { console.error('Unable to render world', error); if (alive) setFailed(true); }
    }
    setReady(false); setFailed(false); void init();
    return () => {
      alive = false; cancelAnimationFrame(frame); observer?.disconnect();
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
            Object.values(material).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); }); material.dispose();
          });
        }
        if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
      });
      renderer?.dispose(); renderer?.domElement.remove();
    };
  }, [props.round]);

  return <div className="game-world" ref={host}>
    {!ready && !failed && <div className="world-loading"><span/><span/><span/></div>}
    {failed && <div className="world-failure">3D 暂不可用<button onClick={() => location.reload()}>重试</button></div>}
  </div>;
}
