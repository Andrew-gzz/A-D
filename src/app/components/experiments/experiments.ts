import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common'; 

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

@Component({
  selector: 'app-experiments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiments.html',
  styleUrl: './experiments.css',
})
export class Experiments implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  flags = [
    { label: 'México', file: 'MexicoFlag.jpg' },
    { label: 'España', file: 'SpainFlag.jpg' },
    { label: 'Uruguay', file: 'UruguayFlag.jpg' },
    { label: 'Colombia', file: 'ColombiaFlag.jpg' },
    { label: 'Corea del Sur', file: 'SouthKoreaFlag.jpg' },
    { label: 'Túnez', file: 'TunezFlag.jpg' },
    { label: 'Japón', file: 'JapanFlag.jpg' },
    { label: 'Portugal', file: 'PortugalFlag.jpg' },
    { label: 'Francia', file: 'FranceFlag.jpg' },
    { label: 'Argentina', file: 'ArgentinaFlag.jpg' },
  ];

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private modelRoot: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  
  private banderaMesh: THREE.Mesh | null = null; 
  private textureLoader = new THREE.TextureLoader();
  
  // Guardamos la selección actual por si se elige antes de cargar el modelo
  private currentFlagFile: string | null = null;

  private clock = new THREE.Clock();
  private rafId: number | null = null;

  ngAfterViewInit(): void {
    this.initThree();
    this.loadHDRI('assets/sky.hdr');
    this.loadGLB('assets/PaisesBase.glb');
    this.animate();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.controls?.dispose();

    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      this.disposeObject3D(this.modelRoot);
    }
    
    this.renderer?.dispose();
  }

  // ✅ Método optimizado para el cambio de textura
  onFlagChange(fileName: string): void {
    this.currentFlagFile = fileName; // Guardamos la selección

    if (!this.banderaMesh) {
      console.warn('El modelo aún no ha cargado, la bandera se aplicará al finalizar la carga.');
      return;
    }

    const path = `assets/${fileName}`;

    this.textureLoader.load(
      path,
      (texture) => {
        texture.flipY = false; // Importante para modelos GLB
        texture.colorSpace = THREE.SRGBColorSpace;

        // ✅ Corrección de seguridad: Aseguramos obtener un solo material
        const rawMaterial = Array.isArray(this.banderaMesh!.material) 
          ? this.banderaMesh!.material[0] 
          : this.banderaMesh!.material;

        const material = rawMaterial as THREE.MeshStandardMaterial;
        
        // Limpiamos textura anterior de memoria
        if (material.map) material.map.dispose();

        material.map = texture;

        // ✅ CRÍTICO: Reseteamos el color a blanco puro.
        // Si el modelo original tenía un color base (ej. rojo), la bandera se vería roja si no hacemos esto.
        if (material.color) material.color.setHex(0xffffff);
        
        // Opcional: Ajustar rugosidad para que parezca tela y no plástico
        material.roughness = 0.8; 
        material.metalness = 0.0;

        material.needsUpdate = true;
      },
      undefined,
      (err) => console.error('Error cargando textura:', err)
    );
  }

  private initThree(): void {
    const host = this.canvasHost.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    this.camera.position.set(0, 1.2, 3.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    host.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4); // Un poco más de luz ambiente
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(3, 6, 4);
    this.scene.add(dir);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  private loadHDRI(path: string): void {
    // Nota: Si ves advertencias de RGBELoader deprecated, es una alerta genérica de Three.js
    // pero sigue siendo funcional. Para producción futura se migrará a UltraHDRLoader.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(path, (hdrTexture) => {
        const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
        this.scene.environment = envMap;
        this.scene.background = envMap; // Opcional: ver el HDRI de fondo
        hdrTexture.dispose();
        pmrem.dispose();
      });
  }

  private loadGLB(url: string): void {
    const loader = new GLTFLoader();

    loader.load(url, (gltf) => {
        if (this.modelRoot) {
          this.scene.remove(this.modelRoot);
          this.disposeObject3D(this.modelRoot);
        }

        this.modelRoot = gltf.scene;
        this.scene.add(gltf.scene);

        // Buscar Mesh
        this.modelRoot.traverse((child: any) => {
          if (child.isMesh && child.name === 'Bandera_Mesh') {
            this.banderaMesh = child;
            console.log('Bandera_Mesh encontrado!');
          }
        });

        // ✅ Si el usuario ya había seleccionado una bandera antes de cargar, la aplicamos ahora
        if (this.currentFlagFile && this.banderaMesh) {
            this.onFlagChange(this.currentFlagFile);
        }

        this.frameModel(gltf.scene);

        if (gltf.animations?.length) {
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.animations.forEach((clip) => {
            this.mixer!.clipAction(clip).play();
          });
        }
      },
      undefined,
      (err) => console.error('Error cargando GLB:', err)
    );
  }

  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const host = this.canvasHost.nativeElement;
    this.camera.aspect = host.clientWidth / host.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(host.clientWidth, host.clientHeight);
  };

  private frameModel(root: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center); // Centrar modelo en (0,0,0)

    const maxDim = Math.max(size.x, size.y, size.z);
    this.camera.position.set(0, maxDim * 0.5, maxDim * 2);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private disposeObject3D(obj: THREE.Object3D): void {
    obj.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          if(m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }
}