export type FollowSectionType = 'following' | 'followers' | 'nearby';

export interface FollowPerson {
  id: string;
  name: string;
  handle: string;
  note: string;
  distance?: string;
  action: string;
}

export interface FollowSection {
  id: string;
  type: FollowSectionType;
  title: string;
  subtitle: string;
  people: FollowPerson[];
}

export const followingData: FollowSection[] = [
  {
    id: 'following',
    type: 'following',
    title: 'Personnes que je suis',
    subtitle: 'Envoyer rapidement et rester connecté',
    people: [
      {
        id: 'follow-1',
        name: 'Amine B.',
        handle: '@amineb',
        note: 'Dernier envoi: 2 jours',
        action: 'Envoyer',
      },
      {
        id: 'follow-2',
        name: 'Kenza M.',
        handle: '@kenza',
        note: 'Solde partagé',
        action: 'Voir',
      },
      {
        id: 'follow-3',
        name: 'Yassin R.',
        handle: '@yassin',
        note: 'En attente de réponse',
        action: 'Relancer',
      },
    ],
  },
  {
    id: 'followers',
    type: 'followers',
    title: 'Ils me suivent',
    subtitle: 'Gérer les demandes et la confiance',
    people: [
      {
        id: 'follower-1',
        name: 'Lina S.',
        handle: '@lina',
        note: 'Demande acceptée',
        action: 'Message',
      },
      {
        id: 'follower-2',
        name: 'Karim T.',
        handle: '@karim',
        note: 'Nouveau suivi',
        action: 'Accepter',
      },
      {
        id: 'follower-3',
        name: 'Noor A.',
        handle: '@noor',
        note: 'Actif aujourd’hui',
        action: 'Voir',
      },
    ],
  },
  {
    id: 'nearby',
    type: 'nearby',
    title: 'Personnes proches',
    subtitle: 'Basé sur la localisation',
    people: [
      {
        id: 'nearby-1',
        name: 'Sami D.',
        handle: '@sami',
        note: 'Disponible pour échange',
        distance: '1.2 km',
        action: 'Inviter',
      },
      {
        id: 'nearby-2',
        name: 'Aya H.',
        handle: '@aya',
        note: 'En ligne maintenant',
        distance: '2.8 km',
        action: 'Suivre',
      },
      {
        id: 'nearby-3',
        name: 'Mehdi F.',
        handle: '@mehdi',
        note: 'Dernière activité hier',
        distance: '4.1 km',
        action: 'Voir',
      },
    ],
  },
];
