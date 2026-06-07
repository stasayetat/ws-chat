import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  imports: [FormsModule],
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss',
})
export class MessageInputComponent {
  @Output() messageSent = new EventEmitter<string>();

  text = '';

  send(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;

    this.messageSent.emit(trimmed);
    this.text = '';
  }
}
