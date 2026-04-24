import { toast } from 'sonner';

/**
 * Custom hook to emit toast notifications
 * Uses Sonner under the hood
 */
export const useToast = () => {
  return {
    success: (message, options = {}) => toast.success(message, options),
    error: (message, options = {}) => toast.error(message, options),
    loading: (message, options = {}) => toast.loading(message, options),
    info: (message, options = {}) => toast.info(message, options),
    warning: (message, options = {}) => toast.warning(message, options)
  };
};

export default useToast;
