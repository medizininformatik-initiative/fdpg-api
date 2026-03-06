import { EmailCategory } from 'src/modules/email/types/email-category.enum';
import { ITemplateEmail } from 'src/modules/email/types/email.interface';
import { IGetKeycloakUser } from 'src/modules/user/types/keycloak-user.interface';
import { getLocaleDateString } from 'src/shared/utils/date.utils';

export const newUserRegistrationEmail = (
  validAdminContacts: string[],
  newUsers: IGetKeycloakUser[],
): ITemplateEmail => {
  const newUsersList = newUsers
    .map((user) => {
      const name = `${user.firstName} ${user.lastName}`.trim();
      const email = user.email || 'N/A';
      const desiredRole = user.attributes?.desiredRole?.[0] || 'Not specified';
      return `${name} (${email}) - Requested role: ${desiredRole}`;
    })
    .join('\n');

  const registrationDate = getLocaleDateString(new Date());

  return {
    to: validAdminContacts,
    categories: [EmailCategory.UserRegistration],
    templateId: 14,
    params: {
      newUsersList,
      registrationCount: String(newUsers.length),
      registrationDate,
    },
  };
};
