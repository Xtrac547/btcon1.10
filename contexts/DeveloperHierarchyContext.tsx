import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DEVELOPER_HIERARCHY: 'btcon_developer_hierarchy',
};

const ADMIN_EMAIL = 'mateo.peyskens547@gmail.com';

export type DeveloperPermissionLevel = 'full' | 'username_only';

export interface DeveloperEntry {
  address: string;
  level: number;
  permissionLevel: DeveloperPermissionLevel;
  canModifyUsernames: boolean;
  canModifyImages: boolean;
  canDeleteAccounts: boolean;
  addedBy: string;
  addedAt: number;
}

interface DeveloperHierarchy {
  [address: string]: DeveloperEntry;
}

const INITIAL_HIERARCHY: DeveloperHierarchy = {
  'bc1qdff8680vyy0qthr5vpe3ywzw48r8rr4jn4jvac': {
    address: 'bc1qdff8680vyy0qthr5vpe3ywzw48r8rr4jn4jvac',
    level: 0,
    permissionLevel: 'full',
    canModifyUsernames: true,
    canModifyImages: true,
    canDeleteAccounts: true,
    addedBy: 'system',
    addedAt: Date.now(),
  },
  'bc1qh78w8awewnuw3336fnwcnr0sr4q5jxu980eyyd': {
    address: 'bc1qh78w8awewnuw3336fnwcnr0sr4q5jxu980eyyd',
    level: 0,
    permissionLevel: 'full',
    canModifyUsernames: true,
    canModifyImages: true,
    canDeleteAccounts: true,
    addedBy: 'system',
    addedAt: Date.now(),
  },
};

export const [DeveloperHierarchyProvider, useDeveloperHierarchy] = createContextHook(() => {
  const [hierarchy, setHierarchy] = useState<DeveloperHierarchy>(INITIAL_HIERARCHY);
  const [isLoading, setIsLoading] = useState(true);

  const loadHierarchy = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.DEVELOPER_HIERARCHY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHierarchy({ ...INITIAL_HIERARCHY, ...parsed });
      }
    } catch (error) {
      console.error('Error loading developer hierarchy:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHierarchy = async (newHierarchy: DeveloperHierarchy) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DEVELOPER_HIERARCHY, JSON.stringify(newHierarchy));
      setHierarchy(newHierarchy);
    } catch (error) {
      console.error('Error saving developer hierarchy:', error);
    }
  };

  const sendEmailNotification = async (
    subject: string,
    body: string,
    reason: string
  ) => {
    console.log('Email notification:', { subject, body, reason, to: ADMIN_EMAIL });
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    NOTIFICATION PAR EMAIL                      ║
╠════════════════════════════════════════════════════════════════╣
║ À: ${ADMIN_EMAIL}                           ║
║ Sujet: ${subject}                                              ║
╠════════════════════════════════════════════════════════════════╣
║ Message:                                                       ║
║ ${body}                                                        ║
╠════════════════════════════════════════════════════════════════╣
║ Raison:                                                        ║
║ ${reason}                                                      ║
╚════════════════════════════════════════════════════════════════╝
    `);
  };

  const getDeveloperEntry = useCallback((address: string): DeveloperEntry | null => {
    return hierarchy[address] || null;
  }, [hierarchy]);

  const isDeveloper = useCallback((address: string): boolean => {
    return !!hierarchy[address];
  }, [hierarchy]);

  const canModify = useCallback((
    sourceAddress: string,
    targetAddress: string,
    action: 'username' | 'image' | 'delete'
  ): { canModify: boolean; reason?: string } => {
    const source = getDeveloperEntry(sourceAddress);
    const target = getDeveloperEntry(targetAddress);

    if (!source) {
      return { canModify: false, reason: 'Vous n\'êtes pas un développeur' };
    }

    if (target) {
      if (source.level > target.level) {
        return {
          canModify: false,
          reason: `Niveau insuffisant. Le développeur cible est de niveau ${target.level}, vous êtes de niveau ${source.level}`,
        };
      }

      if (source.level === target.level && sourceAddress !== targetAddress) {
        return {
          canModify: false,
          reason: 'Vous ne pouvez pas modifier un développeur du même niveau',
        };
      }
    }

    if (action === 'username' && !source.canModifyUsernames) {
      return { canModify: false, reason: 'Vous n\'avez pas la permission de modifier les noms d\'utilisateur' };
    }

    if (action === 'image' && !source.canModifyImages) {
      return { canModify: false, reason: 'Vous n\'avez pas la permission de modifier les images' };
    }

    if (action === 'delete' && !source.canDeleteAccounts) {
      return { canModify: false, reason: 'Vous n\'avez pas la permission de supprimer des comptes' };
    }

    return { canModify: true };
  }, [getDeveloperEntry]);

  const attemptModification = useCallback(async (
    sourceAddress: string,
    targetAddress: string,
    action: 'username' | 'image' | 'delete',
    details: string,
    reason: string
  ): Promise<{ allowed: boolean; reason?: string }> => {
    const check = canModify(sourceAddress, targetAddress, action);

    if (!check.canModify) {
      const source = getDeveloperEntry(sourceAddress);
      const target = getDeveloperEntry(targetAddress);

      if (target && source && source.level > target.level) {
        const actionText = action === 'username' ? 'modifier le nom d\'utilisateur' : 
                          action === 'image' ? 'modifier l\'image' : 'supprimer le compte';
        
        await sendEmailNotification(
          `Tentative de modification refusée`,
          `Le développeur ${sourceAddress.slice(0, 20)}... (niveau ${source.level}) a tenté de ${actionText} du développeur de niveau supérieur ${targetAddress.slice(0, 20)}... (niveau ${target.level}).\n\nDétails: ${details}`,
          reason
        );
      }

      return { allowed: false, reason: check.reason };
    }

    await sendEmailNotification(
      `Modification effectuée`,
      `Le développeur ${sourceAddress.slice(0, 20)}... a effectué une modification.\n\nAction: ${action}\nCible: ${targetAddress.slice(0, 20)}...\nDétails: ${details}`,
      reason
    );

    return { allowed: true };
  }, [canModify, getDeveloperEntry]);

  const addDeveloper = useCallback(async (
    sourceAddress: string,
    newAddress: string,
    permissionLevel: DeveloperPermissionLevel,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const source = getDeveloperEntry(sourceAddress);

      if (!source) {
        return { success: false, error: 'Vous n\'êtes pas un développeur' };
      }

      if (hierarchy[newAddress]) {
        return { success: false, error: 'Cette adresse est déjà un développeur' };
      }

      const newLevel = source.level + 1;

      const newEntry: DeveloperEntry = {
        address: newAddress,
        level: newLevel,
        permissionLevel,
        canModifyUsernames: permissionLevel === 'full' || permissionLevel === 'username_only',
        canModifyImages: permissionLevel === 'full',
        canDeleteAccounts: permissionLevel === 'full',
        addedBy: sourceAddress,
        addedAt: Date.now(),
      };

      const updatedHierarchy = {
        ...hierarchy,
        [newAddress]: newEntry,
      };

      await saveHierarchy(updatedHierarchy);

      await sendEmailNotification(
        'Nouveau développeur ajouté',
        `Le développeur ${sourceAddress.slice(0, 20)}... (niveau ${source.level}) a ajouté un nouveau développeur ${newAddress.slice(0, 20)}... au niveau ${newLevel} avec les permissions: ${permissionLevel}`,
        reason
      );

      return { success: true };
    } catch (error) {
      console.error('Error adding developer:', error);
      return { success: false, error: 'Erreur lors de l\'ajout' };
    }
  }, [hierarchy, getDeveloperEntry]);

  const updateDeveloperPermissions = useCallback(async (
    sourceAddress: string,
    targetAddress: string,
    permissionLevel: DeveloperPermissionLevel,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const check = canModify(sourceAddress, targetAddress, 'username');
      
      if (!check.canModify) {
        return { success: false, error: check.reason };
      }

      const target = hierarchy[targetAddress];
      if (!target) {
        return { success: false, error: 'Développeur introuvable' };
      }

      const updatedEntry: DeveloperEntry = {
        ...target,
        permissionLevel,
        canModifyUsernames: permissionLevel === 'full' || permissionLevel === 'username_only',
        canModifyImages: permissionLevel === 'full',
        canDeleteAccounts: permissionLevel === 'full',
      };

      const updatedHierarchy = {
        ...hierarchy,
        [targetAddress]: updatedEntry,
      };

      await saveHierarchy(updatedHierarchy);

      await sendEmailNotification(
        'Permissions développeur modifiées',
        `Le développeur ${sourceAddress.slice(0, 20)}... a modifié les permissions de ${targetAddress.slice(0, 20)}... vers: ${permissionLevel}`,
        reason
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating developer permissions:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  }, [hierarchy, canModify]);

  const getAllDevelopers = useCallback((): DeveloperEntry[] => {
    return Object.values(hierarchy).sort((a, b) => a.level - b.level);
  }, [hierarchy]);

  useEffect(() => {
    loadHierarchy();
  }, []);

  return useMemo(() => ({
    hierarchy,
    isLoading,
    getDeveloperEntry,
    isDeveloper,
    canModify,
    attemptModification,
    addDeveloper,
    updateDeveloperPermissions,
    getAllDevelopers,
  }), [
    hierarchy,
    isLoading,
    getDeveloperEntry,
    isDeveloper,
    canModify,
    attemptModification,
    addDeveloper,
    updateDeveloperPermissions,
    getAllDevelopers,
  ]);
});
