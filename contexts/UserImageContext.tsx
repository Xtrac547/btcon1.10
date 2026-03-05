import { useState, useCallback, useMemo, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_IMAGES: 'btcon_user_images',
  IMAGE_CHANGES: 'btcon_image_changes',
  USED_IMAGES: 'btcon_used_images',
};

const BTC_IMAGE_URL = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=400&fit=crop';

const DEVELOPER_ADDRESSES = [
  'bc1qdff8680vyy0qthr5vpe3ywzw48r8rr4jn4jvac',
  'bc1qh78w8awednuw3336fnwcnr0sr4q5jxu980eyyd',
];

interface UserImageData {
  profileImage: string;
  qrImage: string;
  changesCount: number;
  lastChangeTimestamp: number | null;
}

interface UserImagesRegistry {
  [address: string]: UserImageData;
}

interface UsedImagesRegistry {
  [imageUri: string]: string;
}

export const [UserImageProvider, useUserImage] = createContextHook(() => {
  const [userImages, setUserImages] = useState<UserImagesRegistry>({});
  const [usedImages, setUsedImages] = useState<UsedImagesRegistry>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadUserImages = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_IMAGES);
      if (stored) {
        setUserImages(JSON.parse(stored));
      }
      const storedUsed = await AsyncStorage.getItem(STORAGE_KEYS.USED_IMAGES);
      if (storedUsed) {
        setUsedImages(JSON.parse(storedUsed));
      }
    } catch (error) {
      console.error('Error loading user images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserImages = async (images: UserImagesRegistry) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_IMAGES, JSON.stringify(images));
      setUserImages(images);
    } catch (error) {
      console.error('Error saving user images:', error);
    }
  };

  const saveUsedImages = async (images: UsedImagesRegistry) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USED_IMAGES, JSON.stringify(images));
      setUsedImages(images);
    } catch (error) {
      console.error('Error saving used images:', error);
    }
  };

  const isDeveloper = useCallback((address: string): boolean => {
    return DEVELOPER_ADDRESSES.includes(address);
  }, []);

  const isImageAvailable = useCallback((imageUri: string, currentAddress: string): boolean => {
    if (imageUri === BTC_IMAGE_URL) {
      return false;
    }
    const owner = usedImages[imageUri];
    return !owner || owner === currentAddress;
  }, [usedImages]);

  const canUseImage = useCallback((imageUri: string, address: string): { canUse: boolean; reason?: string } => {
    if (imageUri === BTC_IMAGE_URL) {
      if (isDeveloper(address)) {
        return { canUse: true };
      }
      return { canUse: false, reason: 'L\'image Btcon est réservée aux développeurs' };
    }

    const owner = usedImages[imageUri];
    if (owner && owner !== address) {
      return { canUse: false, reason: 'Cette image est déjà utilisée par un autre utilisateur' };
    }

    return { canUse: true };
  }, [usedImages, isDeveloper]);

  const getImageForUser = useCallback((address: string | null): UserImageData => {
    if (!address) {
      return {
        profileImage: BTC_IMAGE_URL,
        qrImage: BTC_IMAGE_URL,
        changesCount: 0,
        lastChangeTimestamp: null,
      };
    }

    return userImages[address] || {
      profileImage: BTC_IMAGE_URL,
      qrImage: BTC_IMAGE_URL,
      changesCount: 0,
      lastChangeTimestamp: null,
    };
  }, [userImages]);

  const canChangeImage = useCallback((address: string): boolean => {
    const imageData = getImageForUser(address);
    return imageData.changesCount === 0;
  }, [getImageForUser]);

  const needsPaymentForChange = useCallback((address: string): boolean => {
    if (isDeveloper(address)) {
      return false;
    }
    const imageData = getImageForUser(address);
    return imageData.changesCount >= 1;
  }, [getImageForUser, isDeveloper]);

  const updateUserImage = useCallback(async (
    address: string,
    profileImage: string,
    qrImage: string,
    hasPaid: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const profileCheck = canUseImage(profileImage, address);
      if (!profileCheck.canUse) {
        return { success: false, error: profileCheck.reason };
      }

      const qrCheck = canUseImage(qrImage, address);
      if (!qrCheck.canUse) {
        return { success: false, error: qrCheck.reason };
      }

      const currentData = getImageForUser(address);
      
      if (currentData.changesCount > 0 && !hasPaid && !isDeveloper(address)) {
        return { success: false, error: 'Paiement requis pour les changements suivants' };
      }

      const updatedUsedImages = { ...usedImages };
      
      if (currentData.profileImage !== BTC_IMAGE_URL && currentData.profileImage !== profileImage) {
        delete updatedUsedImages[currentData.profileImage];
      }
      if (currentData.qrImage !== BTC_IMAGE_URL && currentData.qrImage !== qrImage) {
        delete updatedUsedImages[currentData.qrImage];
      }

      updatedUsedImages[profileImage] = address;
      updatedUsedImages[qrImage] = address;

      const updatedImages = {
        ...userImages,
        [address]: {
          profileImage,
          qrImage,
          changesCount: currentData.changesCount + 1,
          lastChangeTimestamp: Date.now(),
        },
      };

      await saveUserImages(updatedImages);
      await saveUsedImages(updatedUsedImages);
      return { success: true };
    } catch (error) {
      console.error('Error updating user image:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  }, [userImages, usedImages, getImageForUser, canUseImage, isDeveloper]);

  const updateUserImageWithPin = useCallback(async (
    address: string,
    profileImage: string,
    qrImage: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const profileCheck = canUseImage(profileImage, address);
      if (!profileCheck.canUse) {
        return { success: false, error: profileCheck.reason };
      }

      const qrCheck = canUseImage(qrImage, address);
      if (!qrCheck.canUse) {
        return { success: false, error: qrCheck.reason };
      }

      const currentData = getImageForUser(address);
      const updatedUsedImages = { ...usedImages };
      
      if (currentData.profileImage !== BTC_IMAGE_URL && currentData.profileImage !== profileImage) {
        delete updatedUsedImages[currentData.profileImage];
      }
      if (currentData.qrImage !== BTC_IMAGE_URL && currentData.qrImage !== qrImage) {
        delete updatedUsedImages[currentData.qrImage];
      }

      updatedUsedImages[profileImage] = address;
      updatedUsedImages[qrImage] = address;

      const updatedImages = {
        ...userImages,
        [address]: {
          profileImage,
          qrImage,
          changesCount: userImages[address]?.changesCount || 0,
          lastChangeTimestamp: Date.now(),
        },
      };

      await saveUserImages(updatedImages);
      await saveUsedImages(updatedUsedImages);
      return { success: true };
    } catch (error) {
      console.error('Error updating user image with PIN:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  }, [userImages, usedImages, getImageForUser, canUseImage]);

  const resetImageChanges = useCallback(async (address: string): Promise<void> => {
    try {
      const updatedImages = {
        ...userImages,
        [address]: {
          ...userImages[address],
          changesCount: 0,
        },
      };
      await saveUserImages(updatedImages);
    } catch (error) {
      console.error('Error resetting image changes:', error);
    }
  }, [userImages]);

  useEffect(() => {
    loadUserImages();
  }, []);

  return useMemo(() => ({
    userImages,
    usedImages,
    isLoading,
    getImageForUser,
    canChangeImage,
    needsPaymentForChange,
    updateUserImage,
    updateUserImageWithPin,
    resetImageChanges,
    isDeveloper,
    isImageAvailable,
    canUseImage,
  }), [
    userImages,
    usedImages,
    isLoading,
    getImageForUser,
    canChangeImage,
    needsPaymentForChange,
    updateUserImage,
    updateUserImageWithPin,
    resetImageChanges,
    isDeveloper,
    isImageAvailable,
    canUseImage,
  ]);
});
