import { dbClient } from './database';

export interface UserAccess {
  user_id: string;
  trial_start: string;
  trial_end: string;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface TrialStatus {
  isActive: boolean;
  trialEndDate: Date | null;
  subscriptionStatus: string;
}

export interface UserAccessValidation {
  hasAccess: boolean;
  isTrialActive: boolean;
  subscriptionStatus: string;
}

export const TrialService = {
  async initializeTrial(userId: string): Promise<UserAccess | null> {
    try {
      const { data, error } = await dbClient.rpc('create_trial', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error initializing trial:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error calling create_trial:', error);
      return null;
    }
  },

  async checkTrialStatus(userId: string): Promise<boolean> {
    try {
      const { data, error } = await dbClient.rpc('is_trial_active', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking trial status:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error calling is_trial_active:', error);
      return false;
    }
  },

  async getTrialEndDate(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await dbClient
        .from('user_access')
        .select('trial_end')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error getting trial end date:', error);
        return null;
      }

      if (!data || !data.trial_end) {
        return null;
      }

      return new Date(data.trial_end);
    } catch (error) {
      console.error('Error fetching trial end date:', error);
      return null;
    }
  },

  async getTrialStatus(userId: string): Promise<TrialStatus> {
    try {
      const isActive = await this.checkTrialStatus(userId);
      const trialEndDate = await this.getTrialEndDate(userId);
      const userAccess = await this.getUserAccess(userId);
      const subscriptionStatus = userAccess?.subscription_status || 'inactive';

      return {
        isActive,
        trialEndDate,
        subscriptionStatus
      };
    } catch (error) {
      console.error('Error getting complete trial status:', error);
      return {
        isActive: false,
        trialEndDate: null,
        subscriptionStatus: 'inactive'
      };
    }
  },

  async getUserAccess(userId: string): Promise<UserAccess | null> {
    try {
      const { data, error } = await dbClient
        .from('user_access')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error getting user access:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user access:', error);
      return null;
    }
  },

  async validateUserAccess(userId: string): Promise<UserAccessValidation> {
    try {
      const isTrialActive = await this.checkTrialStatus(userId);
      const userAccess = await this.getUserAccess(userId);
      const subscriptionStatus = userAccess?.subscription_status || 'inactive';

      const hasAccess = isTrialActive || subscriptionStatus === 'active';

      return {
        hasAccess,
        isTrialActive,
        subscriptionStatus
      };
    } catch (error) {
      console.error('Error validating user access:', error);
      return {
        hasAccess: false,
        isTrialActive: false,
        subscriptionStatus: 'inactive'
      };
    }
  }
};
