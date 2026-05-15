import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './components/shared/toast-outlet.component';
import { AuthService } from './services/auth.service';
import { RealtimeService } from './services/realtime.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly title = signal('QuickBite-Frontend');

  constructor() {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user?.token) {
          this.realtimeService.connect();
        } else {
          this.realtimeService.disconnect();
        }
      });
  }
}
