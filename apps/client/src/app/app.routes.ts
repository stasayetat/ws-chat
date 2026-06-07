import { Route } from '@angular/router';

import { ChatLayoutComponent } from './layout/chat-layout/chat-layout.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: ChatLayoutComponent,
  },
];
