'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Skeleton } from '@/app/components/ui/Skeleton';

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any difficulty' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'Name' },
];

/** Same height as the real controls, so the row does not jump when they arrive. */
export function ProductControlsSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Skeleton shape="block" className="h-16 flex-1" />
      <Skeleton shape="block" className="h-16 sm:w-48" />
      <Skeleton shape="block" className="h-16 sm:w-48" />
    </div>
  );
}

/**
 * Filters live in the URL rather than in component state, so a filtered shop
 * is a link someone can send. Changing one drops back to page 1 — staying on
 * page 4 of a result set that now has two pages shows an empty grid.
 */
export function ProductControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === '') next.delete(key);
      else next.set(key, value);
    }
    next.delete('page');

    const query = next.toString();
    router.push(query === '' ? '/products' : `/products?${query}`);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply({ search });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <form onSubmit={handleSearch} className="flex flex-1 items-end gap-2">
        <Input
          label="Search"
          name="search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Select
        label="Difficulty"
        options={DIFFICULTY_OPTIONS}
        value={searchParams.get('difficulty') ?? ''}
        onChange={(event) => apply({ difficulty: event.target.value })}
        className="sm:w-48"
      />

      <Select
        label="Sort"
        options={SORT_OPTIONS}
        value={searchParams.get('sort') ?? 'newest'}
        onChange={(event) => apply({ sort: event.target.value })}
        className="sm:w-48"
      />
    </div>
  );
}
