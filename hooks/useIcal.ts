import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchIcalLinks,
  addIcalLink,
  syncIcalLink,
  deleteIcalLink,
  getExportUrl,
} from '@/actions/icalActions';

export function useIcal(propertyId?: string) {
  const [loading, setLoading] = useState(false);

  const fetchLinks = async () => {
    if (!propertyId) return [];
    
    const result = await fetchIcalLinks(propertyId);
    if (result.error) {
      toast.error(result.error);
      return [];
    }
    return result.data || [];
  };

  const addLink = async (name: string, icalUrl: string) => {
    if (!propertyId) return null;
    
    setLoading(true);
    try {
      const result = await addIcalLink(propertyId, name, icalUrl);
      
      if (result.error) {
        toast.error(result.error);
        return null;
      }
      
      toast.success(result.success || 'Link added');
      return result.data;
    } finally {
      setLoading(false);
    }
  };

  const syncLink = async (linkId: string) => {
    setLoading(true);
    try {
      const result = await syncIcalLink(linkId);
      
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      
      toast.success(result.success || 'Synced');
      return true;
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (linkId: string) => {
    setLoading(true);
    try {
      const result = await deleteIcalLink(linkId);
      
      if (result.error) {
        toast.error(result.error);
        return false;
      }
      
      toast.success(result.success || 'Deleted');
      return true;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchLinks,
    addLink,
    syncLink,
    deleteLink,
    getExportUrl: async () => propertyId ? await getExportUrl(propertyId) : '', // Fixed: removed extra 'g'
  };
}