import type { UserDto } from '@miniledger/shared';

import type { User } from '../../generated/prisma/client';

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    identifierType: user.identifierType,
    identifier: user.identifier,
    displayName: user.displayName,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}
