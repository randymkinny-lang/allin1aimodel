import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { FREE_TIER, getTierById, type Tier } from '@/data/tiers';
import { useTestMode } from './TestModeContext';

interface SubscriptionRow {
  user_id: string;
  tier_id: string;
  tier_name: string;
  status: string;
  monthly_generation_limit: number;
  generations_used: number;
  is_lifetime: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  period_end?: string;
  email?: string;
}

interface SubscriptionContextType {
  loading: boolean;
  subscription: SubscriptionRow | null;
  tier: Tier;
  isActive: boolean;
  generationsRemaining: number;
  refresh: () => Promise<void>;
  canUseFeature: (key: keyof Tier['entitlements']) => boolean;
  hasQuota: (amount?: number) => boolean;
  incrementGenerations: (amount: number) => Promise<{ error?: string }>;
  cancelSubscription: () => Promise<{ error?: string }>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  loading: true,
  subscription: null,
  tier: FREE_TIER,
  isActive: false,
  generationsRemaining: 10,
  refresh: async () => {},
  canUseFeature: () => false,
  hasQuota: () => false,
  incrementGenerations: async () => ({}),
  cancelSubscription: async () => ({}),
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getIdentityId } = useAuth();
  const { enabled: testModeEnabled } = useTestMode();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const id = user?.id ?? getIdentityId();
    if (!id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    if (user?.id) {
      // Signed-in: RLS allows reading our own row directly.
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      setSubscription(!error && data ? (data as SubscriptionRow) : null);
    } else {
      // Anonymous: RLS blocks anon direct reads, so go through the edge function
      // (service role) which scopes the read to our anonymous identity id.
      try {
        const { data } = await supabase.functions.invoke('manage-subscription', {
          body: { action: 'get-subscription', identityId: id },
        });
        setSubscription((data?.subscription as SubscriptionRow) ?? null);
      } catch {
        setSubscription(null);
      }
    }
    setLoading(false);
  }, [user, getIdentityId]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<SubscriptionContextType>(() => {
    if (testModeEnabled) {
      const topTier = getTierById('lifetime');
      const fakeSubscription: SubscriptionRow = {
        user_id: user?.id ?? 'test-mode-user',
        tier_id: topTier.id,
        tier_name: topTier.name,
        status: 'active',
        monthly_generation_limit: 999999,
        generations_used: 0,
        is_lifetime: true,
      };
      return {
        loading: false,
        subscription: fakeSubscription,
        tier: topTier,
        isActive: true,
        generationsRemaining: 999999,
        refresh: load,
        canUseFeature: () => true,
        hasQuota: () => true,
        incrementGenerations: async () => ({}),
        cancelSubscription: async () => ({}),
      };
    }

    const tier = subscription ? getTierById(subscription.tier_id) : FREE_TIER;
    const isActive =
      subscription?.is_lifetime === true ||
      subscription?.status === 'active' ||
      subscription?.status === 'canceling';
    const generationsRemaining = subscription
      ? subscription.is_lifetime
        ? 999999
        : Math.max(0, subscription.monthly_generation_limit - subscription.generations_used)
      : FREE_TIER.generations;

    const canUseFeature: SubscriptionContextType['canUseFeature'] = (key) => {
      const v = tier.entitlements[key];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      return v !== 'none';
    };

    const hasQuota: SubscriptionContextType['hasQuota'] = (amount = 1) => {
      if (subscription?.is_lifetime) return true;
      return generationsRemaining >= amount;
    };

    const incrementGenerations: SubscriptionContextType['incrementGenerations'] = async (amount) => {
      const id = user?.id ?? getIdentityId();
      if (!id || !subscription) return { error: 'No active subscription' };
      if (subscription.is_lifetime) return {};

      // Optimistic update
      const prev = subscription;
      const newUsed = subscription.generations_used + amount;
      setSubscription({ ...subscription, generations_used: newUsed });

      // Persist server-side (RLS-safe + atomic quota check).
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'increment-generations', identityId: id, amount },
      });
      if (error || data?.error) {
        setSubscription(prev); // roll back
        return { error: data?.error || error?.message || 'Failed to record usage' };
      }
      if (typeof data?.generations_used === 'number') {
        setSubscription({ ...prev, generations_used: data.generations_used });
      }
      return {};
    };

    const cancelSubscription: SubscriptionContextType['cancelSubscription'] = async () => {
      if (!user?.id) return { error: 'Sign in required to manage your subscription' };
      if (!subscription) return { error: 'No active subscription' };
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel-my-subscription' },
      });
      if (error || data?.error) return { error: data?.error || error?.message || 'Failed to cancel' };
      await load();
      return {};
    };

    return {
      loading,
      subscription,
      tier,
      isActive,
      generationsRemaining,
      refresh: load,
      canUseFeature,
      hasQuota,
      incrementGenerations,
      cancelSubscription,
    };
  }, [testModeEnabled, subscription, loading, user, getIdentityId, load]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
