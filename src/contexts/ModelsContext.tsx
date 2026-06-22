import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_MODEL, type ModelData } from '@/components/studio/types';

export interface SavedModel {
  id: string;
  name: string;
  created_at: string;
  cover_image_url: string | null;
  is_public: boolean;
  slug: string | null;
  data: ModelData;
}

interface ModelsContextType {
  models: SavedModel[];
  loading: boolean;
  currentId: string | null;
  currentModel: ModelData;
  setCurrentModel: React.Dispatch<React.SetStateAction<ModelData>>;
  refresh: () => Promise<void>;
  saveCurrent: () => Promise<{ error: string | null; id?: string }>;
  loadModel: (id: string) => void;
  deleteModel: (id: string) => Promise<{ error: string | null }>;
  setCoverImage: (modelId: string, imageUrl: string | null) => Promise<{ error: string | null }>;
  togglePublish: (
    modelId: string,
    publish: boolean
  ) => Promise<{ error: string | null; slug?: string | null }>;
  newModel: () => void;
}

const ModelsContext = createContext<ModelsContextType | undefined>(undefined);

export const useModels = () => {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error('useModels must be used within ModelsProvider');
  return ctx;
};

// Build a URL-friendly slug from an arbitrary string + short random suffix
const makeSlug = (name: string) => {
  const base = (name || 'model')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'model';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
};

export const ModelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [models, setModels] = useState<SavedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<ModelData>(DEFAULT_MODEL);

  const refresh = useCallback(async () => {
    if (!user) {
      setModels([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('models')
      .select('id, name, created_at, cover_image_url, is_public, slug, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setModels(
        data.map((row: any) => ({
          id: row.id,
          name: row.name,
          created_at: row.created_at,
          cover_image_url: row.cover_image_url ?? null,
          is_public: !!row.is_public,
          slug: row.slug ?? null,
          data: { ...DEFAULT_MODEL, ...(row.data || {}), name: row.name },
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) {
      setCurrentId(null);
    }
  }, [user, refresh]);

  const saveCurrent = useCallback(async () => {
    if (!user) return { error: 'You must be signed in to save a model.' };
    if (!currentModel.name?.trim()) return { error: 'Please give your model a name first.' };

    const payload = {
      user_id: user.id,
      name: currentModel.name,
      gender: currentModel.gender,
      age: currentModel.age,
      ethnicity: currentModel.ethnicity,
      hair: currentModel.hair,
      eyes: currentModel.eyes,
      skin: currentModel.skin,
      body: currentModel.body,
      style: currentModel.style,
      bio: currentModel.bio,
      personality: currentModel.personality,
      interests: currentModel.interests,
      data: currentModel as any,
      updated_at: new Date().toISOString(),
    };

    if (currentId) {
      const { error } = await supabase.from('models').update(payload).eq('id', currentId);
      if (error) return { error: error.message };
      await refresh();
      return { error: null, id: currentId };
    } else {
      const { data, error } = await supabase.from('models').insert(payload).select('id').single();
      if (error) return { error: error.message };
      setCurrentId(data.id);
      await refresh();
      return { error: null, id: data.id };
    }
  }, [user, currentModel, currentId, refresh]);

  const loadModel = useCallback(
    (id: string) => {
      const m = models.find((x) => x.id === id);
      if (!m) return;
      setCurrentId(id);
      setCurrentModel({ ...DEFAULT_MODEL, ...m.data, name: m.name });
    },
    [models]
  );

  const deleteModel = useCallback(
    async (id: string) => {
      if (!user) return { error: 'Not signed in' };
      const { error } = await supabase.from('models').delete().eq('id', id);
      if (error) return { error: error.message };
      if (currentId === id) {
        setCurrentId(null);
        setCurrentModel(DEFAULT_MODEL);
      }
      await refresh();
      return { error: null };
    },
    [user, currentId, refresh]
  );

  const setCoverImage = useCallback(
    async (modelId: string, imageUrl: string | null) => {
      if (!user) return { error: 'Not signed in' };
      const { error } = await supabase
        .from('models')
        .update({ cover_image_url: imageUrl, updated_at: new Date().toISOString() })
        .eq('id', modelId);
      if (error) return { error: error.message };
      await refresh();
      return { error: null };
    },
    [user, refresh]
  );

  const togglePublish = useCallback(
    async (modelId: string, publish: boolean) => {
      if (!user) return { error: 'Not signed in' };
      const model = models.find((m) => m.id === modelId);
      if (!model) return { error: 'Model not found' };

      if (publish) {
        const slug = model.slug || makeSlug(model.name);
        const { error } = await supabase
          .from('models')
          .update({ is_public: true, slug, updated_at: new Date().toISOString() })
          .eq('id', modelId);
        if (error) return { error: error.message };

        // Publish all of this model's generated images
        await supabase
          .from('generated_images')
          .update({ is_public: true })
          .eq('session_id', user.id)
          .eq('model_name', model.name);

        await refresh();
        return { error: null, slug };
      } else {
        const { error } = await supabase
          .from('models')
          .update({ is_public: false, updated_at: new Date().toISOString() })
          .eq('id', modelId);
        if (error) return { error: error.message };

        await supabase
          .from('generated_images')
          .update({ is_public: false })
          .eq('session_id', user.id)
          .eq('model_name', model.name);

        await refresh();
        return { error: null, slug: model.slug };
      }
    },
    [user, models, refresh]
  );

  const newModel = useCallback(() => {
    setCurrentId(null);
    setCurrentModel(DEFAULT_MODEL);
  }, []);

  return (
    <ModelsContext.Provider
      value={{
        models,
        loading,
        currentId,
        currentModel,
        setCurrentModel,
        refresh,
        saveCurrent,
        loadModel,
        deleteModel,
        setCoverImage,
        togglePublish,
        newModel,
      }}
    >
      {children}
    </ModelsContext.Provider>
  );
};
