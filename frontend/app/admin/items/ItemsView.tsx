'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card, CardBody } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { Switch } from '@/app/components/ui/Switch';
import { Textarea } from '@/app/components/ui/Textarea';
import { PageHeader } from '@/app/components/layout/PageHeader';
import { ErrorCard } from '@/app/components/feedback/ErrorCard';
import { EmptyState } from '@/app/components/feedback/EmptyState';
import { ListSkeleton } from '@/app/components/feedback/ListSkeleton';
import { useToast } from '@/app/contexts/ToastContext';
import {
  ApiClientError,
  createCategory,
  createProduct,
  deleteProduct,
  listAdminProducts,
  listCategories,
  updateProduct,
} from '@/app/lib/api-client';
import { formatMoney } from '@/app/lib/utils';
import type {
  Category,
  CreateCategoryRequest,
  CreateProductRequest,
  Difficulty,
  Product,
  UpdateProductRequest,
} from '@foldify/shared';

const DIFFICULTIES: Array<Difficulty> = ['beginner', 'intermediate', 'advanced'];
interface ProductFormState {
  slug: string;
  name: string;
  description: string;
  /** Entered in rupees; ×100 on the way in. */
  priceRupees: string;
  /** Entered in rupees; ×100 on the way in. Blank = not on sale. */
  compareAtRupees: string;
  categoryId: string;
  stock: string;
  difficulty: Difficulty;
  imageUrl: string;
  isPublished: boolean;
}

const EMPTY_FORM: ProductFormState = {
  slug: '',
  name: '',
  description: '',
  priceRupees: '',
  compareAtRupees: '',
  categoryId: '',
  stock: '0',
  difficulty: 'beginner',
  imageUrl: '',
  isPublished: false,
};

type FormErrors = Partial<Record<keyof ProductFormState, string>>;

/** Category slug → id. Never -1: a missing category is a form error, not a row to create. */
function resolveCategoryId(state: ProductFormState, categories: Category[]): number {
  const found = categories.find((category) => category.slug === state.categoryId);
  if (found === undefined) throw new Error('Choose a category.');
  return found.id;
}

function formToCreate(state: ProductFormState, categories: Category[]): CreateProductRequest {
  return {
    slug: state.slug.trim(),
    name: state.name.trim(),
    description: state.description.trim(),
    priceMinor: Math.round((Number(state.priceRupees) || 0) * 100),
    compareAtPriceMinor:
      state.compareAtRupees.trim() === ''
        ? null
        : Math.round((Number(state.compareAtRupees) || 0) * 100),
    categoryId: resolveCategoryId(state, categories),
    stock: Number(state.stock) || 0,
    difficulty: state.difficulty,
    imageUrl: state.imageUrl.trim() === '' ? null : state.imageUrl.trim(),
  };
}

function formToUpdate(state: ProductFormState, categories: Category[]): UpdateProductRequest {
  return {
    slug: state.slug.trim(),
    name: state.name.trim(),
    description: state.description.trim(),
    priceMinor: Math.round((Number(state.priceRupees) || 0) * 100),
    compareAtPriceMinor:
      state.compareAtRupees.trim() === ''
        ? null
        : Math.round((Number(state.compareAtRupees) || 0) * 100),
    categoryId: resolveCategoryId(state, categories),
    stock: Number(state.stock) || 0,
    difficulty: state.difficulty,
    imageUrl: state.imageUrl.trim() === '' ? null : state.imageUrl.trim(),
    isPublished: state.isPublished,
  };
}

function productToForm(product: Product, categories: Category[]): ProductFormState {
  const matching = categories.find((category) => category.name === product.categoryName);
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceRupees: String(product.priceMinor / 100),
    compareAtRupees: product.compareAtPriceMinor === null ? '' : String(product.compareAtPriceMinor / 100),
    categoryId: matching?.slug ?? product.categoryName ?? '',
    stock: String(product.stock),
    difficulty: product.difficulty,
    imageUrl: product.imageUrl ?? '',
    isPublished: product.isPublished,
  };
}

/**
 * The small "create a category" form that expands under the category select.
 * The slug auto-fills from the name until the user types one themselves.
 */
function CategoryForm({
  onCreate,
  onDone,
  onCancel,
}: {
  onCreate: (input: CreateCategoryRequest) => Promise<Category>;
  onDone: (slug: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await onCreate({
        slug: slug.trim(),
        name: name.trim(),
        description: description.trim() === '' ? null : description.trim(),
      });
      onDone(created.slug);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-cut)] border border-crease p-3">
      <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">New category</p>
      <Input
        label="Name"
        value={name}
        onChange={(event) => handleNameChange(event.target.value)}
        error={error ?? undefined}
        required
      />
      <Input
        label="Slug"
        value={slug}
        onChange={(event) => {
          setSlugTouched(true);
          setSlug(event.target.value);
        }}
        hint="Used in the public filter URL, e.g. /products?category=animals."
        required
      />
      <Input
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        hint="Optional — shows under the filter heading."
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void handleSubmit()} isLoading={busy}>
          Create category
        </Button>
      </div>
    </div>
  );
}

function ProductForm({
  categories,
  initial,
  isNew,
  onSubmit,
  onCancel,
  onCreateCategory,
}: {
  categories: Category[];
  initial: ProductFormState;
  isNew: boolean;
  onSubmit: (state: ProductFormState) => Promise<void>;
  onCancel: () => void;
  onCreateCategory: (input: CreateCategoryRequest) => Promise<Category>;
}) {
  const [state, setState] = useState<ProductFormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const setField = (field: keyof ProductFormState) => (value: string | boolean) => {
    setState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (state.categoryId.trim() === '') {
      setErrors((current) => ({ ...current, categoryId: 'Choose a category.' }));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(state);
    } catch (cause) {
      if (cause instanceof ApiClientError) {
        // The backend names the price field priceMinor; the form knows it as
        // priceRupees, so map the key across before storing the errors.
        const raw = cause.fields ?? {};
        const fields: FormErrors = raw as FormErrors;
        if (raw.priceMinor !== undefined) {
          fields.priceRupees = raw.priceMinor;
        }
        if (raw.compareAtPriceMinor !== undefined) {
          fields.compareAtRupees = raw.compareAtPriceMinor;
        }
        if (Object.keys(fields).length === 0) fields.name = cause.message;
        setErrors(fields);
      } else if (cause instanceof Error) {
        setErrors({ name: cause.message });
      } else {
        setErrors({ name: 'Something went wrong.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Slug"
        value={state.slug}
        onChange={(event) => setField('slug')(event.target.value)}
        error={errors.slug}
        hint="Lowercase letters, numbers and dashes — used in the public URL."
        required
      />
      <Input
        label="Name"
        value={state.name}
        onChange={(event) => setField('name')(event.target.value)}
        error={errors.name}
        required
      />
      <Textarea
        label="Description"
        value={state.description}
        onChange={(event) => setField('description')(event.target.value)}
        error={errors.description}
        required
      />
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Price (Rs.)"
          type="number"
          min="0"
          step="1"
          value={state.priceRupees}
          onChange={(event) => setField('priceRupees')(event.target.value)}
          error={errors.priceRupees}
          hint="Rupees — converted to paisa on save."
          required
        />
        <Input
          label="Compare-at (Rs.)"
          type="number"
          min="0"
          step="1"
          value={state.compareAtRupees}
          onChange={(event) => setField('compareAtRupees')(event.target.value)}
          error={errors.compareAtRupees}
          hint="Optional. The struck-through original for a sale; leave blank for no discount."
        />
        <Input
          label="Stock"
          type="number"
          min="0"
          step="1"
          value={state.stock}
          onChange={(event) => setField('stock')(event.target.value)}
          error={errors.stock}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          value={state.categoryId}
          onChange={(event) => setField('categoryId')(event.target.value)}
          options={categories.map((category) => ({ value: category.slug, label: category.name }))}
          error={errors.categoryId}
          placeholder="Choose a category"
          required
        />
        <Select
          label="Difficulty"
          value={state.difficulty}
          onChange={(event) => setField('difficulty')(event.target.value)}
          options={DIFFICULTIES.map((difficulty) => ({
            value: difficulty,
            label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
          }))}
          error={errors.difficulty}
          required
        />
      </div>

      {showCategoryForm ? (
        <CategoryForm
          onCreate={onCreateCategory}
          onDone={(slug) => {
            setField('categoryId')(slug);
            setShowCategoryForm(false);
          }}
          onCancel={() => setShowCategoryForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowCategoryForm(true)}
          className="self-start font-mono text-xs tracking-wider text-ink-muted uppercase underline-offset-4 hover:text-ink hover:underline"
        >
          + New category
        </button>
      )}
      <Input
        label="Image URL"
        value={state.imageUrl}
        onChange={(event) => setField('imageUrl')(event.target.value)}
        error={errors.imageUrl}
        hint="Optional — leave blank for the fold mark."
      />
      {!isNew ? (
        <Switch
          label="Published — visible in the catalogue"
          checked={state.isPublished}
          onCheckedChange={setField('isPublished')}
        />
      ) : (
        <p className="font-body text-sm text-ink-muted">New items start unpublished until you flip them on.</p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-crease pt-4">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} isLoading={submitting}>
          {isNew ? 'Create item' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

export function ItemsView() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  /** The product being edited, or `'new'` for the create modal, or null closed. */
  const [editing, setEditing] = useState<'new' | Product | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const confirmTimer = useRef<number | null>(null);

  const applyData = useCallback((data: { products: Product[]; categories: Category[] }) => {
    setError(null);
    setProducts(data.products);
    setCategories(data.categories);
  }, []);

  const applyError = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Could not load the catalogue.');
  }, []);

  useEffect(() => {
    let isStale = false;
    Promise.all([listAdminProducts(), listCategories()])
      .then(([products, categories]) => {
        if (!isStale) applyData({ products, categories });
      })
      .catch((cause: unknown) => {
        if (!isStale) applyError(cause);
      });
    return () => {
      isStale = true;
    };
  }, [applyData, applyError]);

  const reload = useCallback(async () => {
    const [products, categories] = await Promise.all([listAdminProducts(), listCategories()]);
    applyData({ products, categories });
  }, [applyData]);

  const refreshAfterMutation = async () => {
    try {
      await reload();
    } catch {
      // The mutation itself succeeded; a stale list is recoverable later.
    }
  };

  /** Creates a category, then refreshes the dropdown so it is selectable immediately. */
  const handleCreateCategory = async (input: CreateCategoryRequest): Promise<Category> => {
    const created = await createCategory(input);
    setCategories(await listCategories());
    return created;
  };

  const handleSaveNew = async (state: ProductFormState) => {
    await createProduct(formToCreate(state, categories));
    toast.success('Item created.');
    setEditing(null);
    await refreshAfterMutation();
  };

  const handleSaveEdit = async (state: ProductFormState) => {
    if (editing === null || editing === 'new') return;
    await updateProduct(editing.id, formToUpdate(state, categories));
    toast.success('Item saved.');
    setEditing(null);
    await refreshAfterMutation();
  };

  const handleDelete = async (product: Product) => {
    if (confirmingId === product.id) {
      confirmTimer.current = null;
      setConfirmingId(null);
      try {
        await deleteProduct(product.id);
        toast.success(`"${product.name}" moved out of sale.`);
        await refreshAfterMutation();
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : 'Could not delete the item.');
      }
    } else {
      setConfirmingId(product.id);
      if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirmingId(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-16">
      <PageHeader
        eyebrow="Admin"
        title="Items"
        description="Create, edit and retire the catalogue."
        actions={
          <Button onClick={() => setEditing('new')} size="sm">
            New item
          </Button>
        }
      />

      {error !== null ? (
        <ErrorCard message={error} onRetry={() => void reload()} />
      ) : products === null ? (
        <ListSkeleton count={5} lines={2} />
      ) : products.length === 0 ? (
        <EmptyState message="No items yet. Add your first with “New item”." />
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-ink">{product.name}</span>
                    {product.isPublished ? (
                      <Badge tone="accent" size="sm">
                        Live
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="sm">
                        Hidden
                      </Badge>
                    )}
                    <Badge tone="cardboard" size="sm">
                      {product.difficulty}
                    </Badge>
                  </div>
                  <p className="font-mono text-sm text-ink-muted">
                    /{product.slug} · {product.categoryName ?? 'uncategorised'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-2">
                  <p className="font-body text-sm text-ink">
                    {formatMoney(product.priceMinor, { prefix: 'Rs. ' })}
                    <span className="text-ink-muted"> · {product.stock} in stock</span>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(product)}>
                      Edit
                    </Button>
                    <Button
                      variant={confirmingId === product.id ? 'danger' : 'ghost'}
                      size="sm"
                      onClick={() => void handleDelete(product)}
                    >
                      {confirmingId === product.id ? 'Confirm?' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New item' : editing !== null ? `Edit ${editing.name}` : ''}
        size="lg"
      >
        {editing === 'new' || editing === null ? (
          <ProductForm
            key="new"
            categories={categories}
            initial={EMPTY_FORM}
            isNew
            onSubmit={handleSaveNew}
            onCancel={() => setEditing(null)}
            onCreateCategory={handleCreateCategory}
          />
        ) : (
          <ProductForm
            key={editing.id}
            categories={categories}
            initial={productToForm(editing, categories)}
            isNew={false}
            onSubmit={handleSaveEdit}
            onCancel={() => setEditing(null)}
            onCreateCategory={handleCreateCategory}
          />
        )}
      </Modal>
    </div>
  );
}