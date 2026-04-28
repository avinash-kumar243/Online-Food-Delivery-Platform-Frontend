import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import AOS from 'aos';

@Component({
  selector: 'app-welcome',
  imports: [],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    AOS.init();
  }

  navigateToRole(role: string) {
    if (role === 'customer') {
      this.router.navigate(['/customer/auth']);
    } else if (role === 'restaurant') {
      this.router.navigate(['/restaurant/auth']);
    } else if (role === 'delivery-partner') {
      this.router.navigate(['/delivery-partner/auth']);
    } else if (role === 'admin') {
      this.router.navigate(['/admin/auth']);
    }
  }

  goToCustomer() {
    this.router.navigate(['/customer/auth']);
  }
}
