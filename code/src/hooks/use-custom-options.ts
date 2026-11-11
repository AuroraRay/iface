import { useState, useEffect, useCallback } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import {
  DEFAULT_CATEGORY_OPTIONS,
  DEFAULT_EFFICACY_OPTIONS,
  DEFAULT_INGREDIENT_OPTIONS,
} from '@/lib/constants';

const CUSTOM_CATEGORIES_KEY = '__global_skincare_custom_categories';
const CUSTOM_EFFICACIES_KEY = '__global_skincare_custom_efficacies';
const CUSTOM_INGREDIENTS_KEY = '__global_skincare_custom_ingredients';

/** 自定义分类条目：{ value, label } */
export interface CustomCategory {
  value: string;
  label: string;
  /** 是否为用户自定义（true）还是系统默认（false） */
  custom: boolean;
}

// ============ 底层存储 helpers ============
function loadStringSet(key: string): string[] {
  try {
    const raw = scopedStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    /* ignore */
  }
  return [];
}

function saveStringSet(key: string, values: string[]) {
  try {
    scopedStorage.setItem(key, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

// ============ Hook ============
export function useCustomOptions() {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customEfficacies, setCustomEfficacies] = useState<string[]>([]);
  const [customIngredients, setCustomIngredients] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCustomCategories(loadStringSet(CUSTOM_CATEGORIES_KEY));
    setCustomEfficacies(loadStringSet(CUSTOM_EFFICACIES_KEY));
    setCustomIngredients(loadStringSet(CUSTOM_INGREDIENTS_KEY));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveStringSet(CUSTOM_CATEGORIES_KEY, customCategories);
  }, [customCategories, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveStringSet(CUSTOM_EFFICACIES_KEY, customEfficacies);
  }, [customEfficacies, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveStringSet(CUSTOM_INGREDIENTS_KEY, customIngredients);
  }, [customIngredients, loaded]);

  // ============ 分类（静态默认 + 动态自定义） ============
  const allCategoryOptions: { value: string; label: string; custom: boolean }[] = (
    DEFAULT_CATEGORY_OPTIONS as unknown as { value: string; label: string }[]
  ).map((o) => ({ ...o, custom: false }));
  customCategories.forEach((label) => {
    const value = `custom_${label}`;
    if (!allCategoryOptions.some((o) => o.value === value)) {
      allCategoryOptions.push({ value, label, custom: true });
    }
  });

  const addCategory = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return false;
    // 检查是否已存在（匹配 label 或默认选项里有同名）
    const exists =
      customCategories.includes(trimmed) ||
      DEFAULT_CATEGORY_OPTIONS.some((o) => o.label === trimmed);
    if (exists) return false;
    setCustomCategories((prev) => [...prev, trimmed]);
    return true;
  }, [customCategories]);

  const removeCategory = useCallback((label: string) => {
    setCustomCategories((prev) => prev.filter((c) => c !== label));
  }, []);

  // ============ 功效（静态默认 + 动态自定义） ============
  const allEfficacyOptions: string[] = [
    ...(DEFAULT_EFFICACY_OPTIONS as unknown as string[]),
    ...customEfficacies.filter((c) => !(DEFAULT_EFFICACY_OPTIONS as unknown as string[]).includes(c)),
  ];

  const addEfficacy = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (allEfficacyOptions.includes(trimmed)) return false;
    setCustomEfficacies((prev) => [...prev, trimmed]);
    return true;
  }, [allEfficacyOptions]);

  const removeEfficacy = useCallback((value: string) => {
    setCustomEfficacies((prev) => prev.filter((e) => e !== value));
  }, []);

  // ============ 成分（静态默认 + 动态自定义） ============
  const allIngredientOptions: string[] = [
    ...(DEFAULT_INGREDIENT_OPTIONS as unknown as string[]),
    ...customIngredients.filter((c) => !(DEFAULT_INGREDIENT_OPTIONS as unknown as string[]).includes(c)),
  ];

  const addIngredient = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (allIngredientOptions.includes(trimmed)) return false;
    setCustomIngredients((prev) => [...prev, trimmed]);
    return true;
  }, [allIngredientOptions]);

  const removeIngredient = useCallback((value: string) => {
    setCustomIngredients((prev) => prev.filter((i) => i !== value));
  }, []);

  return {
    // 分类
    allCategoryOptions,
    customCategories,
    addCategory,
    removeCategory,
    // 功效
    allEfficacyOptions,
    customEfficacies,
    addEfficacy,
    removeEfficacy,
    // 成分
    allIngredientOptions,
    customIngredients,
    addIngredient,
    removeIngredient,
    loaded,
  };
}
