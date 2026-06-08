import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Contact, Message } from '@chat/api-interfaces';

import { SocketService } from '../../../data/services/socket.service';
import { AvatarPipe } from '../../../shared/pipes/avatar.pipe';
import { ChatHeaderComponent } from './components/chat-header/chat-header.component';
import { MessageInputComponent } from './components/message-input/message-input.component';
import { MessageListComponent } from './components/message-list/message-list.component';

@Component({
  selector: 'app-chat-area',
  imports: [
    ChatHeaderComponent,
    MessageInputComponent,
    MessageListComponent,
    AvatarPipe,
  ],
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAreaComponent {
  contact = input<Contact | null>(null);
  currentUserId = input('');
  userAvatar = input('');
  readonly backPressed = output<void>();

  private readonly socketService = inject(SocketService);
  readonly messages = signal<Message[]>([]);

  constructor() {
    this.socketService
      .history$()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        if (data.contactId === this.contact()?.id) {
          this.messages.set(data.messages);
        }
      });

    this.socketService
      .newMessage$()
      .pipe(takeUntilDestroyed())
      .subscribe((msg) => {
        if (this.belongsToConversation(msg)) {
          this.messages.update((current) => [...current, msg]);
        }
      });

    effect(() => {
      const contact = this.contact();

      if (contact) {
        this.messages.set([]);
        this.socketService.getHistory({ contactId: contact.id });
      }
    });
  }

  onMessageSent(text: string): void {
    const contact = this.contact();

    if (contact) {
      this.socketService.sendMessage({ receiverId: contact.id, text });
    }
  }

  private belongsToConversation(msg: Message): boolean {
    const contactId = this.contact()?.id;

    if (!contactId) {
      return false;
    }

    return (
      (msg.senderId === contactId && msg.receiverId === this.currentUserId()) ||
      (msg.senderId === this.currentUserId() && msg.receiverId === contactId)
    );
  }
}
