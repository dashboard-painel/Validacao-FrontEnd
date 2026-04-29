import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cnpj' })
export class CnpjPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '-';

    const digits = value.replace(/\D/g, '');

    if (digits.length !== 14) return value;

    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}
