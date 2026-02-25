import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

type Countdown = { days: string; hours: string; minutes: string; seconds: string; };

type Song = {
  name: string;
  src: string;
};

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css'],
})
export class LandingPage implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('weddingAudio') weddingAudio?: ElementRef<HTMLAudioElement>;

  private observer?: IntersectionObserver;
  private intervalId?: any;

  private userGestureHandler?: () => void;
  private onTimeUpdate?: () => void;
  private onPlay?: () => void;
  private onPause?: () => void;

  constructor(
    private cdr: ChangeDetectorRef,
    private elRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    // ===== Contador =====
    this.startCountdown();
    this.startCarousel();
  }

  ngAfterViewInit(): void {
    // ===== Música =====
    this.initMusic();

    // ===== Animaciones =====
    this.initRevealAnimations();
  }

  ngOnDestroy(): void {
    // ===== Contador =====
    if (this.intervalId) clearInterval(this.intervalId);

    // ===== Carrusel =====
    if (this.carouselIntervalId) clearInterval(this.carouselIntervalId);

    // ===== Música =====
    this.removeGestureListeners();
    this.unbindAudioEvents();

    // ===== Animaciones =====
    this.observer?.disconnect();
  }

  // =========================================================
  // ======================= CONTADOR =========================
  // =========================================================

  // Fecha objetivo: 18 de Abril de 2026, 8:00 PM (Abril = 3 en JS)
  private readonly weddingDate = new Date(2026, 3, 18, 20, 0, 0).getTime();

  countdown: Countdown = { days: '00', hours: '00', minutes: '00', seconds: '00' };

  private startCountdown(): void {
    this.updateCountdown();
    this.intervalId = setInterval(() => this.updateCountdown(), 1000);
  }

  private updateCountdown(): void {
    const now = new Date().getTime();
    const diff = this.weddingDate - now;

    if (diff <= 0) {
      this.countdown = { days: '00', hours: '00', minutes: '00', seconds: '00' };
      if (this.intervalId) clearInterval(this.intervalId);
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      this.countdown = {
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      };
    }

    this.cdr.detectChanges();
  }

  // =========================================================
  // ======================== MÚSICA ==========================
  // =========================================================

  // Playlist (agrega aquí todas las que quieras)
  songs: Song[] = [
    {
      name: 'The Only Exception - Paramore',
      src: 'assets/Paramore The Only Exception.mp3'
    },
    {
      name: 'Eres tú - Carla Morrison',
      src: 'assets/Eres tú - Carla Morrison.mp3'
    },
    {
      name: 'Regalo De Dios - Julión Álvarez',
      src: 'assets/Regalo De Dios - Julión Álvarez.mp3'
    }
  ];

  currentSongIndex = 0;

  // UI
  isPlaying = false;
  progress = 0;

  // Para pintar en .music-meta usando {{ currentSongName }}
  get currentSongName(): string {
    return this.songs?.[this.currentSongIndex]?.name ?? '';
  }

  private initMusic(): void {
    // Cargar 1ra canción en el <audio>
    this.loadSong(this.currentSongIndex);

    // Eventos del audio
    this.bindAudioEvents();

    // Intento autoplay
    this.tryPlayAudio();

    // Fallback por gesto del usuario (si el navegador bloquea autoplay)
    this.userGestureHandler = () => {
      this.tryPlayAudio();
      this.removeGestureListeners();
    };

    window.addEventListener('pointerdown', this.userGestureHandler, { once: true });
    window.addEventListener('touchstart', this.userGestureHandler, { once: true });
    window.addEventListener('keydown', this.userGestureHandler, { once: true });
  }

  private loadSong(index: number): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    const song = this.songs[index];
    if (!song) return;

    el.src = song.src;
    el.load();

    // refresca nombre en UI
    this.cdr.detectChanges();
  }

  togglePlay(): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  seek(ev: MouseEvent): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el || !el.duration) return;

    const bar = ev.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const pct = Math.min(Math.max(x / rect.width, 0), 1);

    el.currentTime = pct * el.duration;
  }

  prev(): void {
    // Si quieres que sea "reiniciar canción" cuando vas avanzadito:
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    if (el.currentTime > 2) {
      el.currentTime = 0;
      return;
    }

    // Si no, cambia a la anterior:
    this.currentSongIndex = (this.currentSongIndex - 1 + this.songs.length) % this.songs.length;
    this.loadSong(this.currentSongIndex);
    this.tryPlayAudio();
  }

  next(): void {
    this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length;
    this.loadSong(this.currentSongIndex);
    this.tryPlayAudio();
  }

  private tryPlayAudio(): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    if (el.paused) {
      el.play()
        .then(() => {
          this.isPlaying = true;
          this.cdr.detectChanges();
        })
        .catch(() => {});
    }
  }

  private bindAudioEvents(): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    this.onTimeUpdate = () => {
      this.progress = el.duration ? (el.currentTime / el.duration) * 100 : 0;
      this.cdr.detectChanges();
    };

    this.onPlay = () => {
      this.isPlaying = true;
      this.cdr.detectChanges();
    };

    this.onPause = () => {
      this.isPlaying = false;
      this.cdr.detectChanges();
    };

    el.addEventListener('timeupdate', this.onTimeUpdate);
    el.addEventListener('play', this.onPlay);
    el.addEventListener('pause', this.onPause);

    // Si quieres que al terminar pase a la siguiente automáticamente:
    el.addEventListener('ended', () => this.next());
  }

  private unbindAudioEvents(): void {
    const el = this.weddingAudio?.nativeElement;
    if (!el) return;

    if (this.onTimeUpdate) el.removeEventListener('timeupdate', this.onTimeUpdate);
    if (this.onPlay) el.removeEventListener('play', this.onPlay);
    if (this.onPause) el.removeEventListener('pause', this.onPause);
  }

  private removeGestureListeners(): void {
    if (!this.userGestureHandler) return;

    window.removeEventListener('pointerdown', this.userGestureHandler);
    window.removeEventListener('touchstart', this.userGestureHandler);
    window.removeEventListener('keydown', this.userGestureHandler);

    this.userGestureHandler = undefined;
  }

  // =========================================================
  // ===================== ANIMACIONES ========================
  // =========================================================

  private initRevealAnimations(): void {
    // 1. Agregamos '.divider-final' a la lista de elementos a observar
    const elements = Array.from(
      this.elRef.nativeElement.querySelectorAll('.it-title, .it-icon, .it-text, .it-icon-2, .divider-final')
    ) as HTMLElement[];

    elements.forEach(el => el.classList.add('reveal-init'));

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const el = entry.target as HTMLElement;

          el.classList.remove('reveal-init');
          el.classList.add('reveal-show');

          // 2. Lógica para elegir la animación
          // Si el elemento tiene la clase 'divider-final', usa 'fadeIn', de lo contrario usa 'slideInUp'
          const animationName = el.classList.contains('divider-final') 
            ? 'animate__fadeIn' 
            : 'animate__slideInUp';

          requestAnimationFrame(() => {
            el.classList.add('animate__animated', animationName);
          });

          this.observer?.unobserve(el);
        }
      },
      {
        threshold: 0.01,
        rootMargin: '0px 0px -20% 0px'
      }
    );

    elements.forEach(el => this.observer!.observe(el));
  }

  // =========================================================
  // ===================== Carrusel ==========================
  // =========================================================

  carouselImages: string[] = [
  'assets/Enamorados.jpg',
  'assets/DSC05273.jpg',
  'assets/DSC05150.jpg',
  'assets/DSC05350.jpg',
  'assets/DSC05358.jpg',
  'assets/DSC05532.jpg',
];

currentCarouselIndex = 0;
private carouselIntervalId?: any;

private startCarousel(): void {
  this.carouselIntervalId = setInterval(() => {
    this.nextSlide();
  }, 4000); // Cambia cada 4 segundos
}

private nextSlide(): void {
  this.currentCarouselIndex = (this.currentCarouselIndex + 1) % this.carouselImages.length;
  this.cdr.detectChanges();
}
}
