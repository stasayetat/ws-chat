import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Message } from '@chat/api-interfaces';

@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent {
  messages = input<Message[]>([]);
  currentUserId = input.required();
  contactAvatar = input('');
  contactName = input('');
  userAvatar = input('');

  isFirstInGroup(index: number): boolean {
    if (index === 0) {
      return true;
    }

    return (
      this.messages()[index].senderId !== this.messages()[index - 1].senderId
    );
  }
}
