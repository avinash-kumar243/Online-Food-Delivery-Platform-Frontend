import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const oauth2 = params['oauth2'];
      const userType = params['userType'];

      if (token && oauth2 === 'success') {
        this.authService.handleGoogleToken(token, userType);
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}