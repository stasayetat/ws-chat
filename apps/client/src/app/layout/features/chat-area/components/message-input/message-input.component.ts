import {
  ChangeDetectionStrategy,
  Component,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-message-input',
  imports: [],
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageInputComponent {
  messageSent = output<string>();
  text = signal('');

  send(): void {
    const trimmed = this.text().trim();

    if (!trimmed) {
      return;
    }

    this.messageSent.emit(trimmed);
    this.text.set('');
  }
}
