import type { Routes } from '@angular/router';
import { ShellPlaceholderComponent } from './shell-placeholder.component.js';

export const appRoutes: Routes = [
  {
    path: '',
    component: ShellPlaceholderComponent,
    data: {
      section: 'Graph',
      description:
        'The vault graph view will be migrated here in PRs 4 through 6.',
    },
  },
  {
    path: 'plans',
    component: ShellPlaceholderComponent,
    data: {
      section: 'Plans',
      description: 'The plans view will be migrated here in PR 2.',
    },
  },
  {
    path: 'climb',
    component: ShellPlaceholderComponent,
    data: {
      section: 'Climb',
      description:
        'The climb view and drawing board will be migrated here in PR 3.',
    },
  },
  { path: '**', redirectTo: '' },
];
