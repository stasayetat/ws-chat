import { Pipe, PipeTransform } from '@angular/core';
import { Contact } from '@chat/api-interfaces';

@Pipe({
  name: 'avatar',
})
export class AvatarPipe implements PipeTransform {
  transform(contact: Contact): string {
    return contact.avatar || this.getDefaultAvatar(contact);
  }

  private getDefaultAvatar = (contact: Contact) => {
    return contact.isBot ? '/assets/bot.svg' : '/assets/user-avatar.svg';
  };
}
