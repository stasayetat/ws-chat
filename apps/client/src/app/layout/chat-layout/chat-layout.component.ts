import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Contact, Message, User } from '@chat/api-interfaces';

import { SocketService } from '../../data/services/socket.service';
import { ChatAreaComponent } from '../features/chat-area/chat-area.component';
import { ContactListComponent } from '../features/contact-list/contact-list.component';

@Component({
  selector: 'app-chat-layout',
  imports: [ContactListComponent, ChatAreaComponent],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatLayoutComponent {
  private readonly socketService = inject(SocketService);

  readonly currentUser = signal<User | null>(null);
  readonly contacts = signal<Contact[]>([]);
  readonly selectedContact = signal<Contact | null>(null);

  constructor() {
    this.socketService
      .me$()
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        this.currentUser.set(user);
      });

    this.socketService
      .contactsList$()
      .pipe(takeUntilDestroyed())
      .subscribe((list) => {
        this.contacts.set(list);
      });

    this.socketService
      .userConnected$()
      .pipe(takeUntilDestroyed())
      .subscribe((user) => {
        if (!this.contacts().some((c) => c.id === user.id)) {
          this.contacts.update((current) => [...current, user as Contact]);
        }
      });

    this.socketService
      .userStatusChanged$()
      .pipe(takeUntilDestroyed())
      .subscribe((dto) => {
        this.contacts.update((current) =>
          current.map((c) =>
            c.id === dto.id ? { ...c, status: dto.status } : c,
          ),
        );
        const selected = this.selectedContact();

        if (selected?.id === dto.id) {
          this.selectedContact.set({ ...selected, status: dto.status });
        }
      });

    this.socketService
      .newMessage$()
      .pipe(takeUntilDestroyed())
      .subscribe(this.updateLastMessageInfo);
  }

  onContactSelected(contact: Contact): void {
    this.selectedContact.set(contact);
  }

  onBack(): void {
    this.selectedContact.set(null);
  }

  private updateLastMessageInfo = (message: Message) => {
    const myId = this.currentUser()?.id;

    if (!myId) {
      return;
    }

    const contactId =
      message.senderId === myId ? message.receiverId : message.senderId;

    this.contacts.update((currentContact) => {
      return currentContact.map((contact) => {
        return contact.id === contactId
          ? {
              ...contact,
              lastMessage: message.text,
              lastMessageAt: message.timestamp,
            }
          : contact;
      });
    });
  };
}
