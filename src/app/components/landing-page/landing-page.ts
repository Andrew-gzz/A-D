import { Component, OnDestroy, OnInit } from '@angular/core';

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
};

@Component({
  selector: 'app-landing-page',
  standalone: true,
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css'],
})
export class LandingPage implements OnInit, OnDestroy {

  private weddingDate = new Date(2026, 3, 18, 20, 0, 0);

  countdown: Countdown = {
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  };

  private intervalId?: number;

  ngOnInit(): void {
    this.syncToNextSecond();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  /** 
   * Alinea el primer tick al cambio real de segundo
   * para que el contador sea ultra preciso
   */
  private syncToNextSecond(): void {
    const now = new Date();
    const delay = 1000 - now.getMilliseconds();

    setTimeout(() => {
      this.updateCountdown();
      this.intervalId = window.setInterval(() => {
        this.updateCountdown();
      }, 1000);
    }, delay);
  }

  private updateCountdown(): void {
    const now = Date.now();
    const diff = this.weddingDate.getTime() - now;

    if (diff <= 0) {
      this.countdown = {
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00',
      };
      if (this.intervalId) clearInterval(this.intervalId);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.countdown = {
      days: this.pad(days),
      hours: this.pad(hours),
      minutes: this.pad(minutes),
      seconds: this.pad(seconds),
    };
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
