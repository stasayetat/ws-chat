import { Component, Input } from '@angular/core';
import { Message } from '@chat/api-interfaces';

@Component({
  selector: 'app-message-list',
  imports: [],
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss',
})
export class MessageListComponent {
  @Input() messages: Message[] = [];
  @Input({ required: true }) currentUserId!: string;
  @Input() contactAvatar = '';
  @Input() contactName = '';
  @Input() userAvatar = '';

  isFirstInGroup(index: number): boolean {
    if (index === 0) {
      return true;
    }

    return this.messages[index].senderId !== this.messages[index - 1].senderId;
  }
}
