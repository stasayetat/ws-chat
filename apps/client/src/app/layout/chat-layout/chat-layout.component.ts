import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Contact, User } from '@chat/api-interfaces';
import { Subscription } from 'rxjs';

import { SocketService } from '../../data/services/socket.service';
import { ChatAreaComponent } from '../features/chat-area/chat-area.component';
import { ContactListComponent } from '../features/contact-list/contact-list.component';

@Component({
  selector: 'app-chat-layout',
  imports: [ContactListComponent, ChatAreaComponent],
  templateUrl: './chat-layout.component.html',
  styleUrl: './chat-layout.component.scss',
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  private readonly socketService = inject(SocketService);
  private readonly subs = new Subscription();

  readonly currentUser = signal<User | null>(null);
  readonly contacts = signal<Contact[]>([]);
  readonly selectedContact = signal<Contact | null>(null);

  ngOnInit(): void {
    this.subs.add(
      this.socketService.me$().subscribe((user) => {
        this.currentUser.set(user);
      }),
    );

    this.subs.add(
      this.socketService.contactsList$().subscribe((list) => {
        this.contacts.set(list);
      }),
    );

    this.subs.add(
      this.socketService.userConnected$().subscribe((user) => {
        if (!this.contacts().some((c) => c.id === user.id)) {
          this.contacts.update((current) => [...current, user as Contact]);
        }
      }),
    );

    this.subs.add(
      this.socketService.userStatusChanged$().subscribe((dto) => {
        this.contacts.update((current) =>
          current.map((c) =>
            c.id === dto.id ? { ...c, status: dto.status } : c,
          ),
        );
        const selected = this.selectedContact();

        if (selected?.id === dto.id) {
          this.selectedContact.set({ ...selected, status: dto.status });
        }
      }),
    );

    this.subs.add(
      this.socketService.newMessage$().subscribe((msg) => {
        const myId = this.currentUser()?.id;
        if (!myId) return;

        const contactId = msg.senderId === myId ? msg.receiverId : msg.senderId;

        this.contacts.update((current) =>
          current.map((c) =>
            c.id === contactId
              ? { ...c, lastMessage: msg.text, lastMessageAt: msg.timestamp }
              : c,
          ),
        );
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onContactSelected(contact: Contact): void {
    this.selectedContact.set(contact);
  }
}
