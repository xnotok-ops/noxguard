export const VIEW_ACL_QUERY = `
  query viewACL($handleId: ID!) {  
    handle(id: $handleId) {  
      isPubliclyDecryptable  
      admins: roles(where: {role: ADMIN}, first: 1000) {  
        account  
      }  
      viewers: roles(where: {role: VIEWER}, first: 1000) {  
        account  
      }  
    }  
  }  
`;

export type ViewACLResponse = {
  handle: {
    isPubliclyDecryptable: boolean;
    admins: Array<{ account: string }>;
    viewers: Array<{ account: string }>;
  } | null;
};
