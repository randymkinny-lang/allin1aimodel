import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import PayoutsTab from '@/components/settings/PayoutsTab';
import { reportDbError } from '@/lib/reportError';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ArrowLeft, Banknote, Camera, Check, Crown, Loader2, Save, User as UserIcon, UserCog, X } from 'lucide-react';



interface ProfileRow {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const HANDLE_RE = /^[A-Za-z0-9_]{3,20}$/;

const ProfileSettings: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const activeTab = searchParams.get('tab') === 'payouts' ? 'payouts' : 'profile';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);

  const { subscription, tier, isActive, generationsRemaining, cancelSubscription } = useSubscription();
  const [canceling, setCanceling] = useState(false);

  const onCancelSubscription = useCallback(async () => {
    if (!window.confirm('Cancel your subscription? You will keep access until the end of the current billing period.')) {
      return;
    }
    setCanceling(true);
    const { error } = await cancelSubscription();
    setCanceling(false);
    if (error) {
      toast({ title: 'Could not cancel', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Subscription canceled', description: 'You will keep access until the end of the period.' });
    }
  }, [cancelSubscription]);


  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Sign in required', description: 'You need to sign in to edit your profile.' });
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, handle, display_name, avatar_url, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      let row = (data || null) as ProfileRow | null;

      if (!row && !error) {
        const { data: created, error: rpcErr } = await supabase.rpc('ensure_my_profile');
        if (!cancelled) {
          if (rpcErr) {
            reportDbError(rpcErr, 'Create profile (ensure_my_profile)');
          } else if (created) {
            row = created as unknown as ProfileRow;
          }
        }
      } else if (error) {
        reportDbError(error, 'Load profile');
      }


      if (cancelled) return;
      setProfile(row);
      setHandle(row?.handle ?? '');
      setDisplayName(row?.display_name ?? '');
      setBio(row?.bio ?? '');
      setAvatarUrl(row?.avatar_url ?? null);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setHandleError(null);
    setHandleAvailable(null);

    const trimmed = handle.trim();
    if (trimmed === (profile?.handle ?? '')) {
      setHandleAvailable(null);
      return;
    }
    if (!trimmed) { setHandleError('Handle is required.'); return; }
    if (!HANDLE_RE.test(trimmed)) { setHandleError('3–20 chars, letters/numbers/underscore only.'); return; }

    setHandleChecking(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('handle', trimmed)
        .neq('user_id', user.id)
        .maybeSingle();
      setHandleChecking(false);
      if (error) { setHandleAvailable(null); return; }
      setHandleAvailable(!data);
      if (data) setHandleError('That handle is already taken.');
    }, 350);
    return () => clearTimeout(timer);
  }, [handle, profile?.handle, user]);

  const handleUpload = useCallback(async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Max size is 5MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (upErr) {
      reportDbError(upErr, 'Avatar upload');
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
    const newUrl = pub.publicUrl;
    setAvatarUrl(newUrl);

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ avatar_url: newUrl, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (updErr) {
      reportDbError(updErr, 'Save avatar URL');
    } else {
      toast({ title: 'Avatar updated' });
      setProfile((p) => (p ? { ...p, avatar_url: newUrl } : p));
    }
    setUploading(false);
  }, [user]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!user) return;
    setAvatarUrl(null);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) {
      reportDbError(error, 'Remove avatar');
    } else {
      setProfile((p) => (p ? { ...p, avatar_url: null } : p));
      toast({ title: 'Avatar removed' });
    }
  }, [user]);


  const onSave = useCallback(async () => {
    if (!user) return;
    const trimmedHandle = handle.trim();
    if (!HANDLE_RE.test(trimmedHandle)) { setHandleError('3–20 chars, letters/numbers/underscore only.'); return; }
    if (handleAvailable === false) return;
    setSaving(true);

    const updates = {
      handle: trimmedHandle,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Try update first (row should exist because ensure_my_profile runs on load).
    // Fall back to insert if for some reason there's no row yet. This avoids
    // upsert/ON CONFLICT entirely, sidestepping any PostgREST schema-cache issues.
    let saveError: { code?: string; message: string } | null = null;

    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select('user_id')
      .maybeSingle();

    if (updErr) {
      saveError = updErr;
    } else if (!updated) {
      // No row existed — insert one.
      const { error: insErr } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, ...updates });
      if (insErr) saveError = insErr;
    }

    if (saveError) {
      if (saveError.code === '23505') {
        setHandleError('That handle is already taken.');
        toast({ title: 'Handle taken', description: 'Pick a different one.', variant: 'destructive' });
      } else {
        reportDbError(saveError, 'Save profile');
      }
    } else {

      toast({ title: 'Profile saved' });
      setProfile({
        user_id: user.id,
        handle: trimmedHandle,
        display_name: updates.display_name,
        avatar_url: avatarUrl,
        bio: updates.bio,
      });
    }
    setSaving(false);
  }, [avatarUrl, bio, displayName, handle, handleAvailable, user]);


  const initial = (displayName || handle || user?.email || 'U').charAt(0).toUpperCase();

  const onTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'payouts') params.set('tab', 'payouts');
    else params.delete('tab');
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        onNavigate={(id) => navigate(`/#${id}`)}
        onStart={() => navigate('/#studio')}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">Account Settings</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage how you appear across All in 1 AI Model and how you get paid.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/5 border border-white/10">
            <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
              <UserCog className="h-4 w-4 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="payouts" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
              <Banknote className="h-4 w-4 mr-1.5" /> Payouts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            {loading || authLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 animate-pulse h-64" />
            ) : (
              <div className="space-y-6">
                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold mb-4">Avatar</h2>
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-slate-950 text-3xl font-bold ring-2 ring-white/10">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" onError={() => setAvatarUrl(null)} />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                          e.target.value = '';
                        }}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90"
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Camera className="h-4 w-4 mr-1.5" />}
                          {avatarUrl ? 'Change avatar' : 'Upload avatar'}
                        </Button>
                        {avatarUrl && (
                          <Button variant="outline" onClick={handleRemoveAvatar} disabled={uploading} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10">
                            <X className="h-4 w-4 mr-1.5" /> Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">PNG or JPG, up to 5MB.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold mb-4">Identity</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label htmlFor="handle" className="text-slate-300">Handle</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm pointer-events-none">@</span>
                        <Input
                          id="handle"
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          placeholder="your_handle"
                          maxLength={20}
                          className="bg-slate-950/60 border-white/10 text-white pl-7"
                        />
                        {handleChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                        {!handleChecking && handleAvailable === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />}
                        {!handleChecking && handleAvailable === false && <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />}
                      </div>
                      {handleError ? (
                        <p className="mt-1.5 text-xs text-rose-400">{handleError}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-slate-500">3–20 characters. Letters, numbers, and underscores.</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="displayName" className="text-slate-300">Display name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        maxLength={60}
                        className="mt-1.5 bg-slate-950/60 border-white/10 text-white"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Shown next to your handle.</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <Label htmlFor="bio" className="text-slate-300">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short description about you…"
                      maxLength={280}
                      rows={3}
                      className="mt-1.5 bg-slate-950/60 border-white/10 text-white resize-y"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">{bio.length}/280</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-400" /> Billing &amp; Plan
                  </h2>
                  <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold text-white">{tier.name} plan</div>
                        <div className="text-sm text-slate-400">
                          {subscription?.is_lifetime
                            ? 'Lifetime — unlimited generations'
                            : isActive
                              ? `${generationsRemaining.toLocaleString()} generations remaining`
                              : 'No active subscription'}
                          {subscription?.status === 'canceling' && ' · cancels at period end'}
                        </div>
                      </div>
                      {subscription && !subscription.is_lifetime && subscription.status === 'active' && (
                        <Button
                          variant="outline"
                          onClick={onCancelSubscription}
                          disabled={canceling}
                          className="bg-white/5 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        >
                          {canceling ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                          Cancel subscription
                        </Button>
                      )}
                      {(!subscription || (!subscription.is_lifetime && subscription.status !== 'active')) && (
                        <Button
                          onClick={() => navigate('/#pricing')}
                          className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold"
                        >
                          View plans
                        </Button>
                      )}
                    </div>
                  </div>
                </section>


                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold mb-4">Preview</h2>
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-amber-400 via-purple-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold">
                      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{displayName || handle || 'Your name'}</span>
                        <span className="text-xs text-slate-400 truncate">@{handle || 'your_handle'}</span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{bio || 'Your bio will appear here.'}</p>
                    </div>
                  </div>
                </section>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => navigate(-1)} className="bg-white/5 border-white/10 text-slate-200 hover:bg-white/10">Cancel</Button>
                  <Button
                    onClick={onSave}
                    disabled={saving || !!handleError || handleAvailable === false}
                    className="bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payouts" className="mt-6">
            <PayoutsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfileSettings;
