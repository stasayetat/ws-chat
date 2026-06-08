import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-message-input',
  imports: [],
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageInputComponent {
  activeContactId = input<string>();
  messageSent = output<string>();
  text = signal('');

  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('messageInput');

  constructor() {
    effect(() => {
      const contactId = this.activeContactId();
      const inputRef = this.inputRef();

      if (contactId && inputRef) {
        this.text.set('');
        inputRef.nativeElement.focus();
      }
    });
  }

  send(): void {
    const trimmed = this.text().trim();

    if (!trimmed) {
      return;
    }

    this.messageSent.emit(trimmed);
    this.text.set('');
    this.inputRef().nativeElement.focus();
  }
}
