import React, { createContext, useContext, useEffect, useState } from 'react';
import { Purchases, CustomerInfo, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { useAuth } from './AuthContext';
import { TrialService } from '../services/trial';

interface SubscriptionContextType {
  entitlementActive: boolean;
  isTrialActive: boolean;
  trialEndDate: Date | null;
  daysRemaining: number;
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
  const [daysRemaining, setDaysRemaining] = useState(0);
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

      await initializeRevenueCat();

      await Purchases.logIn({ appUserID: userId });
      console.log('RevenueCat user logged in:', userId);

      const { customerInfo: info } = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      const hasActiveEntitlement = info.entitlements.active['premium'] !== undefined;
      setEntitlementActive(hasActiveEntitlement);
      console.log('RevenueCat entitlement active:', hasActiveEntitlement);

      await TrialService.initializeTrial(userId);
      console.log('Trial initialized for user:', userId);

      const trialActive = await TrialService.checkTrialStatus(userId);
      setIsTrialActive(trialActive);
      console.log('Trial active (server-side):', trialActive);

      const trialStatus = await TrialService.getTrialStatus(userId);
      setTrialEndDate(trialStatus.trialEndDate);
      setDaysRemaining(trialStatus.daysRemaining);
      console.log('Trial status:', trialStatus);

      const shouldShowPaywall = !hasActiveEntitlement && !trialActive;
      setShowPaywall(shouldShowPaywall);

      console.log('=== SUBSCRIPTION STATUS ===');
      console.log('User ID:', userId);
      console.log('Entitlement Active:', hasActiveEntitlement);
      console.log('Trial Active:', trialActive);
      console.log('Trial End Date:', trialStatus.trialEndDate);
      console.log('Days Remaining:', trialStatus.daysRemaining);
      console.log('Show Paywall:', shouldShowPaywall);
      console.log('===========================');

      const { offerings: availableOfferings } = await Purchases.getOfferings();
      if (availableOfferings.current) {
        setOfferings(availableOfferings.current.availablePackages);
        console.log('Available offerings loaded:', availableOfferings.current.availablePackages.length);
      }

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
      setDaysRemaining(0);
      setCustomerInfo(null);
      setOfferings(null);
    }
  }, [user?.id]);

  const purchase = async (packageToPurchase: any): Promise<{ success: boolean; error?: string }> => {
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
        daysRemaining,
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
