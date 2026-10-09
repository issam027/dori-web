import type { PersonIdentityDto } from '@/api/generated/models';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPersonIdentity(person: PersonIdentityDto): boolean {
  const emailIsValid = !person.email || emailPattern.test(person.email);
  const parsedBirthDate = person.birthDate
    ? new Date(`${person.birthDate}T00:00:00Z`)
    : undefined;
  const birthDateIsValid =
    !person.birthDate ||
    (/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate) &&
      parsedBirthDate !== undefined &&
      !Number.isNaN(parsedBirthDate.getTime()) &&
      parsedBirthDate.toISOString().slice(0, 10) === person.birthDate);
  return (
    Boolean(person.lastName.trim()) &&
    /^\+[1-9][0-9]{6,14}$/.test(person.phoneNumber) &&
    emailIsValid &&
    birthDateIsValid
  );
}
