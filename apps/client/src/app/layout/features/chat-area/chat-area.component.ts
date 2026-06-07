import {
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { Contact, Message } from '@chat/api-interfaces';
import { Subscription } from 'rxjs';

import { SocketService } from '../../../data/services/socket.service';
import { ChatHeaderComponent } from './components/chat-header/chat-header.component';
import { MessageInputComponent } from './components/message-input/message-input.component';
import { MessageListComponent } from './components/message-list/message-list.component';

@Component({
  selector: 'app-chat-area',
  imports: [ChatHeaderComponent, MessageInputComponent, MessageListComponent],
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.scss',
})
export class ChatAreaComponent implements OnInit, OnChanges, OnDestroy {
  @Input() contact: Contact | null = null;
  @Input() currentUserId = '';
  @Input() userAvatar = '';

  private readonly socketService = inject(SocketService);
  readonly messages = signal<Message[]>([]);

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.socketService.history$().subscribe((data) => {
        if (data.contactId === this.contact?.id) {
          this.messages.set(data.messages);
        }
      }),
    );

    this.subs.add(
      this.socketService.newMessage$().subscribe((msg) => {
        if (this.belongsToConversation(msg)) {
          this.messages.update((current) => [...current, msg]);
        }
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contact'] && this.contact) {
      this.messages.set([]);
      this.socketService.getHistory({ contactId: this.contact.id });
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onMessageSent(text: string): void {
    if (this.contact) {
      this.socketService.sendMessage({ receiverId: this.contact.id, text });
    }
  }

  private belongsToConversation(msg: Message): boolean {
    const contactId = this.contact?.id;
    if (!contactId) return false;
    return (
      (msg.senderId === contactId && msg.receiverId === this.currentUserId) ||
      (msg.senderId === this.currentUserId && msg.receiverId === contactId)
    );
  }
}
