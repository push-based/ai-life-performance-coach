import type { Routes } from '@angular/router';
import { ClimbPageComponent } from '@ai-coach/vault-view-feat-climb';
import { GraphPageComponent } from '@ai-coach/vault-view-feat-graph';
import { PlansPageComponent } from '@ai-coach/vault-view-feat-plans';

export const appRoutes: Routes = [
  {
    path: '',
    component: GraphPageComponent,
  },
  {
    path: 'plans',
    component: PlansPageComponent,
  },
  {
    path: 'climb',
    component: ClimbPageComponent,
  },
  { path: '**', redirectTo: '' },
];
