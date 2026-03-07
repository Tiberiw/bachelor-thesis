export interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  closable?: boolean;
  redirectUrl?: string;
  redirectText?: string;
}

export interface Toast extends ToastConfig {
  id: string;
  timestamp: Date;
}
