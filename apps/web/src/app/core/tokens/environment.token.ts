import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Environment {
  production: boolean;
  apiBaseUrl: string;
}

export const ENVIRONMENT = new InjectionToken<Environment>('Environment', {
  providedIn: 'root',
  factory: () => environment,
});
