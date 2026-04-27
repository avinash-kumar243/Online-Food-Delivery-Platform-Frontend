import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './components/shared/toast-outlet.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('QuickBite-Frontend');
}
