import { UserRole } from '../types';

export interface RolePermissions {
  canCreateArticles: boolean;
  canEditAnyArticle: boolean;
  canPublishArticles: boolean;
  canUnpublishArticles: boolean;
  canDeleteAnyArticle: boolean;
  canUploadVideos: boolean;
  canPublishVideos: boolean;
  canDeleteVideos: boolean;
  canUploadImages: boolean;
  canManageCategories: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateArticles: true,
    canEditAnyArticle: true,
    canPublishArticles: true,
    canUnpublishArticles: true,
    canDeleteAnyArticle: true,
    canUploadVideos: true,
    canPublishVideos: true,
    canDeleteVideos: true,
    canUploadImages: true,
    canManageCategories: true,
    canManageStaff: true,
    canManageSettings: true,
  },
  editor: {
    canCreateArticles: true,
    canEditAnyArticle: true,
    canPublishArticles: true,
    canUnpublishArticles: true,
    canDeleteAnyArticle: true,
    canUploadVideos: true,
    canPublishVideos: true,
    canDeleteVideos: true,
    canUploadImages: true,
    canManageCategories: true,
    canManageStaff: false,
    canManageSettings: false,
  },
  reporter: {
    canCreateArticles: true,
    canEditAnyArticle: false,
    canPublishArticles: false,
    canUnpublishArticles: false,
    canDeleteAnyArticle: false,
    canUploadVideos: true,
    canPublishVideos: false,
    canDeleteVideos: false,
    canUploadImages: true,
    canManageCategories: false,
    canManageStaff: false,
    canManageSettings: false,
  },
};

export function getPermissionsForRole(role?: UserRole): RolePermissions {
  if (!role) {
    return {
      canCreateArticles: false,
      canEditAnyArticle: false,
      canPublishArticles: false,
      canUnpublishArticles: false,
      canDeleteAnyArticle: false,
      canUploadVideos: false,
      canPublishVideos: false,
      canDeleteVideos: false,
      canUploadImages: false,
      canManageCategories: false,
      canManageStaff: false,
      canManageSettings: false,
    };
  }
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.reporter;
}
