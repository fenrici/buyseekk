import { isPasswordValid } from '@buyseekk/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'passwordPolicy', async: false })
export class PasswordPolicyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && isPasswordValid(value);
  }

  defaultMessage() {
    return 'La contraseña no cumple los requisitos de seguridad';
  }
}

export function IsPasswordPolicy(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: PasswordPolicyConstraint,
    });
  };
}
