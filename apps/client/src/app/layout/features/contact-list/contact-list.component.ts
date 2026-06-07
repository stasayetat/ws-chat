import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Contact } from '@chat/api-interfaces';

@Component({
  selector: 'app-contact-list',
  imports: [FormsModule],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss',
})
export class ContactListComponent {
  @Input() contacts: Contact[] = [];
  @Input() selectedContactId? = '';
  @Output() contactSelected = new EventEmitter<Contact>();

  searchQuery = signal('');
  filter = signal<'all' | 'online'>('all');

  get filteredContacts(): Contact[] {
    return this.contacts
      .filter((c) => this.filter() === 'all' || c.status === 'online')
      .filter((c) =>
        c.name.toLowerCase().includes(this.searchQuery().toLowerCase()),
      );
  }

  selectContact(contact: Contact): void {
    this.contactSelected.emit(contact);
  }

  formatTime(timestamp: number | undefined): string {
    if (!timestamp) return '';
    const diff = Math.floor((Date.now() - timestamp) / 1000);

    return `${Math.floor(diff / 60)}m`;
  }
}
