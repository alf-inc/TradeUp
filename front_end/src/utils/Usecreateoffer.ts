import { useState } from 'react';

export interface MatchItem {
  userA: string;
  userB: string;
  itemA: string;
  itemATitle: string;
  itemAImage: string;
  itemACategory: string;
  itemB: string;
  itemBTitle: string;
  itemBImage: string;
  itemBCategory: string;
}

export interface CreateOfferPayload {
  fromUserId: string;       // current user (liker)
  toUserId: string;         // owner of the liked item
  offeredItemIds: string[]; // items current user selected to offer (itemA candidates)
  requestedItemId: string;  // the item current user originally liked (itemB)
}

export type OfferStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseCreateOfferReturn {
  status: OfferStatus;
  errorMessage: string | null;
  createOffer: (payload: CreateOfferPayload) => Promise<boolean>;
  reset: () => void;
}

const API_BASE = 'http://127.0.0.1:8000';

export function useCreateOffer(): UseCreateOfferReturn {
  const [status, setStatus] = useState<OfferStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createOffer = async (payload: CreateOfferPayload): Promise<boolean> => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/offers/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to pull a readable error message from the backend
        let detail = 'Failed to create offer. Please try again.';
        try {
          const errData = await res.json();
          if (errData?.detail) detail = errData.detail;
        } catch {
          // response wasn't JSON — keep default message
        }
        setStatus('error');
        setErrorMessage(detail);
        return false;
      }

      setStatus('success');
      return true;

    } catch (err) {
      // Network error or fetch threw
      setStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
      return false;
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage(null);
  };

  return { status, errorMessage, createOffer, reset };
}