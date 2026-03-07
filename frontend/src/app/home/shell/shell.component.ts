import {Component, HostListener} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {SidebarComponent} from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    SidebarComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  isLoading = false;
  showMobileSidebar = false;
  isMobile = false;
  // private destroy$ = new Subject<void>();

  constructor() {
    this.checkScreenSize();
  }
  //
  // ngOnInit(): void {
  //   // Subscribe to auth loading state
  //   this.authService.isLoading$
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(loading => {
  //       this.isLoading = loading;
  //     });
  // }

  // ngOnDestroy(): void {
  //   this.destroy$.next();
  //   this.destroy$.complete();
  // }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768; // md breakpoint
    if (!this.isMobile) {
      this.showMobileSidebar = false;
    }
  }

  toggleMobileSidebar(): void {
    this.showMobileSidebar = !this.showMobileSidebar;
  }

  closeMobileSidebar(): void {
    this.showMobileSidebar = false;
  }
}
