import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome implements OnInit {
  constructor(private router: Router) {}

  async ngOnInit() {
    try {
      const aosModule = await import('aos');
      const AOS = aosModule.default ?? aosModule;
      AOS.init();
    } catch (error) {
      console.error('Failed to initialize welcome page animations.', error);
    }
  }

  navigateToRole(role: string) {
    if (role === 'customer') {
      this.router.navigate(['/customer/dashboard']);
    } else if (role === 'restaurant') {
      this.router.navigate(['/restaurant/auth']);
    } else if (role === 'delivery-partner') {
      this.router.navigate(['/delivery-partner/auth']);
    } else if (role === 'admin') {
      this.router.navigate(['/admin/auth']);
    }
  }

  goToCustomer() {
    this.router.navigate(['/customer/dashboard']);
  }
}
