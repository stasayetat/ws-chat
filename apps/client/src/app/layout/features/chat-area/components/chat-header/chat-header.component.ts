import { Component, Input } from '@angular/core';
import { Contact } from '@chat/api-interfaces';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss',
  imports: [],
})
export class ChatHeaderComponent {
  @Input() contact!: Contact;
}
