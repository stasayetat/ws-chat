import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { Contact } from '@chat/api-interfaces';

import { AvatarPipe } from '../../../shared/pipes/avatar.pipe';

@Component({
  selector: 'app-contact-list',
  imports: [AvatarPipe],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactListComponent {
  contacts = input<Contact[]>([]);
  selectedContactId = input<string | undefined>('');
  contactSelected = output<Contact>();

  searchQuery = signal('');
  filter = signal<'all' | 'online'>('all');

  filteredContacts = computed(() =>
    this.contacts()
      .filter((c) => this.filter() === 'all' || c.status === 'online')
      .filter((c) =>
        c.name.toLowerCase().includes(this.searchQuery().toLowerCase()),
      ),
  );

  selectContact(contact: Contact): void {
    this.contactSelected.emit(contact);
  }

  formatTime(timestamp: number | undefined): string {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - timestamp) / 1000);

    return `${Math.floor(diff / 60)}m`;
  }
}
