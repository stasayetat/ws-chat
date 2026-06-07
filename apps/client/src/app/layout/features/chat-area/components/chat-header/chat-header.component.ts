import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Contact } from '@chat/api-interfaces';

import { AvatarPipe } from '../../../../../shared/pipes/avatar.pipe';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss',
  imports: [AvatarPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeaderComponent {
  contact = input.required<Contact>();
}
