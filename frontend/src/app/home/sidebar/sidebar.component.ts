import {Component, EventEmitter, inject, OnInit, Output} from '@angular/core';
import {User} from '../../auth/user';
import {AuthService} from '../../auth/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {ClickOutsideDirective} from '../../shared/click-outside.directive';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    ClickOutsideDirective
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {

  @Output() onClose = new EventEmitter<void>();

  user: User | null = null;
  isMobile = false;
  showProfileMenu = false;

  navItems: NavItem[] = [
    {
      label: 'Patients',
      path: '/patients',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      label: 'Recording',
      path: '/recording',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  constructor(
    private readonly authService: AuthService,
    private router: Router
  ) {
    this.checkScreenSize();
    this.authService.currentUser$.subscribe(user => {
      this.user = user!;
    });
  }

  ngOnInit(): void {
    // Get user data from auth service
    this.authService.currentUser$.subscribe(user => {
      this.user = user!;
    });

    window.addEventListener('resize', () => this.checkScreenSize());
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
  }

  closeSidebar(): void {
    if (this.isMobile) {
      this.onClose.emit();
    }
  }

  navigateToRecord(): void {
    this.router.navigate(['/home/new-recording']);
    this.closeSidebar();
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
  }

  closeProfileMenu(): void {
    this.showProfileMenu = false;
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  }
}
