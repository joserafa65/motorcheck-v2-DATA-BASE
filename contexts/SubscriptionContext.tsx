import React, { createContext, useContext, useEffect, useState } from 'react';
import { Purchases, CustomerInfo, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthContext';
import { TrialService } from '../services/trial';

interface SubscriptionContextType {
  entitlementActive: boolean;
  isTrialActive: boolean;
  trialEndDate: Date | null;
  subscriptionStatus: string;
  showPaywall: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering[] | null;
  purchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [entitlementActive, setEntitlementActive] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[] | null>(null);

  const initializeRevenueCat = async () => {
    try {
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;

      if (!apiKey) {
        console.warn('RevenueCat API key not configured');
        return;
      }

      await Purchases.configure({
        apiKey,
        appUserID: undefined,
      });

      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    }
  };

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      setLoading(true);

      const isWeb = Capacitor.getPlatform() === 'web';
      console.log('Platform detected:', Capacitor.getPlatform());

      let hasActiveEntitlement = false;

      if (!isWeb) {
        await initializeRevenueCat();

        await Purchases.logIn({ appUserID: userId });
        console.log('RevenueCat user logged in:', userId);

        const { customerInfo: info } = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        hasActiveEntitlement = info.entitlements.active['premium'] !== undefined;
        setEntitlementActive(hasActiveEntitlement);
        console.log('RevenueCat entitlement active:', hasActiveEntitlement);

        const { offerings: availableOfferings } = await Purchases.getOfferings();
        if (availableOfferings.current) {
          setOfferings(availableOfferings.current.availablePackages);
          console.log('Available offerings loaded:', availableOfferings.current.availablePackages.length);
        }
      } else {
        console.log('Web platform: Skipping RevenueCat initiconsole.log('Web platform: Skipping RevenueCat initialization');
setEntitlementActive(false);
setCustomerInfo(null);

// 👇 IMPORTANTE: no dejar offerings en null
setOfferings([]);
      }

      await TrialService.initializeTrial(userId);
      console.log('Trial initialized for user:', userId);

      const accessValidation = await TrialService.validateUserAccess(userId);
      setIsTrialActive(accessValidation.isTrialActive);
      setSubscriptionStatus(accessValidation.subscriptionStatus);
      console.log('Access validation from Supabase:', accessValidation);

      const trialStatus = await TrialService.getTrialStatus(userId);
      setTrialEndDate(trialStatus.trialEndDate);
      console.log('Trial status:', trialStatus);

      const shouldShowPaywall = !accessValidation.hasAccess;
      setShowPaywall(shouldShowPaywall);

      console.log('=== SUBSCRIPTION STATUS ===');
      console.log('Platform:', Capacitor.getPlatform());
      console.log('User ID:', userId);
      console.log('RevenueCat Entitlement Active:', hasActiveEntitlement);
      console.log('Supabase Has Access:', accessValidation.hasAccess);
      console.log('Trial Active:', accessValidation.isTrialActive);
      console.log('Subscription Status:', accessValidation.subscriptionStatus);
      console.log('Trial End Date:', trialStatus.trialEndDate);
      console.log('Show Paywall:', shouldShowPaywall);
      console.log('===========================');

    } catch (error) {
      console.error('Error checking subscription status:', error);
      setShowPaywall(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkSubscriptionStatus(user.id);
    } else {
      setLoading(false);
      setShowPaywall(false);
      setEntitlementActive(false);
      setIsTrialActive(false);
      setTrialEndDate(null);
      setSubscriptionStatus('inactive');
      setCustomerInfo(null);
      setOfferings(null);
    }
  }, [user?.id]);

  const purchase = async (packageToPurchase: any): Promise<{ success: boolean; error?: string }> => {
    const isWeb = Capacitor.getPlatform() === 'web';

    if (isWeb) {
      console.log('Purchase not available on web platform');
      return { success: false, error: 'Purchases are only available on mobile devices' };
    }

    try {
      const { customerInfo: info } = await Purchases.purchasePackage({
        aPackage: packageToPurchase,
      });

      setCustomerInfo(info);

      const hasActiveEntitlement = info.entitlements.active['premium'] !== undefined;
      setEntitlementActive(hasActiveEntitlement);

      if (hasActiveEntitlement) {
        setShowPaywall(false);
        console.log('Purchase successful, entitlement activated');
        return { success: true };
      }

      return { success: false, error: 'Purchase completed but entitlement not activated' };
    } catch (error: any) {
      console.error('Error purchasing package:', error);

      if (error.userCancelled) {
        return { success: false, error: 'Purchase cancelled by user' };
      }

      return { success: false, error: error.message || 'Purchase failed' };
    }
  };

  const restore = async (): Promise<{ success: boolean; error?: string }> => {
    const isWeb = Capacitor.getPlatform() === 'web';

    if (isWeb) {
      console.log('Restore not available on web platform');
      return { success: false, error: 'Restore is only available on mobile devices' };
    }

    try {
      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info);

      const hasActiveEntitlement = info.entitlements.active['premium'] !== undefined;
      setEntitlementActive(hasActiveEntitlement);

      if (hasActiveEntitlement) {
        setShowPaywall(false);
        console.log('Purchases restored successfully, entitlement activated');
        return { success: true };
      }

      return { success: false, error: 'No active purchases found' };
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: error.message || 'Restore failed' };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        entitlementActive,
        isTrialActive,
        trialEndDate,
        subscriptionStatus,
        showPaywall,
        loading,
        customerInfo,
        offerings,
        purchase,
        restore,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
