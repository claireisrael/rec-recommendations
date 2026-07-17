"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recommendationSchema } from "@/lib/schemas/recommendation";
import { STATUS_LABELS, RECOMMENDATION_STATUSES } from "@/lib/types/recommendation";
import {
  CATEGORY_OPTIONS,
  DEFAULT_CATEGORY,
} from "@/lib/categories";
import { getCategoryCode } from "@/lib/numbering";
import {
  getScoreColor,
  DEFAULT_TIER,
  toScoreTierKey,
} from "@/lib/score";
import { ScoreTierSelect } from "@/components/ui/score-tier-select";
import { ScoreLegend } from "@/components/ui/score-legend";
import { ActionEvidenceField } from "@/components/admin/ActionEvidenceField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 2040 - 2020 + 1 }, (_, i) => {
  const year = 2040 - i;
  return { value: String(year), label: String(year) };
}).filter((opt) => Number(opt.value) <= currentYear);

const defaultAction = {
  id: undefined,
  text: "",
  scoreTier: DEFAULT_TIER.key,
  partner: "",
  evidence: [],
};

/**
 * @param {{
 *   initialData?: import("@/lib/types/recommendation").Recommendation,
 *   onSubmit: (data: import("@/lib/schemas/recommendation").RecommendationFormData) => Promise<void>,
 *   isSubmitting?: boolean,
 *   lockProtected?: boolean
 * }} props
 */
export function RecommendationForm({
  initialData,
  onSubmit,
  isSubmitting,
  lockProtected = false,
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      recommendation: initialData?.recommendation ?? "",
      year: initialData?.year ?? currentYear,
      category: initialData?.category ?? DEFAULT_CATEGORY,
      sectionCode:
        initialData?.sectionCode ??
        getCategoryCode(initialData?.category ?? DEFAULT_CATEGORY),
      actions: initialData?.actions?.length
        ? initialData.actions.map((a) => ({
            id: a.id,
            text: a.text,
            scoreTier: toScoreTierKey(a.scoreTier),
            partner: a.partner,
            evidence: a.evidence ?? [],
          }))
        : [{ ...defaultAction }],
      comments: initialData?.comments ?? "",
      status: initialData?.status ?? "planned",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "actions",
  });

  const category = watch("category");

  const appendAction = () => {
    append({ ...defaultAction }, { shouldFocus: true });
  };

  /** @param {number} index */
  const removeAction = (index) => {
    if (fields.length <= 1) return;
    remove(index);
  };

  /**
   * @param {number} index
   * @param {typeof DEFAULT_TIER.key} scoreTier
   */
  const updateActionScoreTier = (index, scoreTier) => {
    setValue(`actions.${index}.scoreTier`, scoreTier, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  /**
   * @param {number} index
   * @param {string[]} evidence
   */
  const updateActionEvidence = (index, evidence) => {
    setValue(`actions.${index}.evidence`, evidence, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  return (
    <form
      onSubmit={handleSubmit((data) =>
        onSubmit({
          ...data,
          sectionCode: getCategoryCode(data.category),
        })
      )}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recommendation">Recommendation</Label>
            <Textarea
              id="recommendation"
              {...register("recommendation")}
              placeholder="Describe the recommendation"
              readOnly={lockProtected}
              aria-readonly={lockProtected}
              className={`mt-1.5 min-h-[120px]${
                lockProtected
                  ? " cursor-not-allowed bg-[#f1f5f6] text-muted"
                  : ""
              }`}
            />
            {lockProtected && (
              <p className="mt-1 text-xs text-muted">
                Only Dr. Mukisa can edit the recommendation text.
              </p>
            )}
            {errors.recommendation && (
              <p className="text-red-500 text-xs mt-1">{errors.recommendation.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select
                value={String(watch("year"))}
                onChange={(v) => setValue("year", Number(v))}
                options={yearOptions}
                className="mt-1.5"
              />
              {errors.year && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.year.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch("category")}
                onChange={(v) => {
                  const cat =
                    /** @type {import("@/lib/categories").RecommendationCategory} */ (
                      v
                    );
                  setValue("category", cat);
                  setValue("sectionCode", getCategoryCode(cat));
                }}
                options={CATEGORY_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `R ${getCategoryCode(o.value)} · ${o.label}`,
                }))}
                placeholder="Select category"
                className="mt-1.5"
              />
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.category.message}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                Items under this category number as {getCategoryCode(category)}
                .1, {getCategoryCode(category)}.2, …
              </p>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onChange={(v) =>
                  setValue(
                    "status",
                    /** @type {import("@/lib/schemas/recommendation").RecommendationFormData["status"]} */ (
                      v
                    )
                  )
                }
                options={RECOMMENDATION_STATUSES.map((value) => ({
                  value,
                  label: STATUS_LABELS[value],
                }))}
                placeholder="Select status"
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>Actions</CardTitle>
            <p className="text-sm font-normal text-muted">
              One recommendation can include multiple actions — each with its
              own partners, score, and evidence.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={appendAction}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add action
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 border-b border-border pb-3">
            <ScoreLegend />
          </div>

          {fields.map((field, index) => {
            const scoreTier =
              watch(`actions.${index}.scoreTier`) ?? field.scoreTier;
            return (
              <div
                key={field.id}
                className="space-y-3 rounded-xl border border-border bg-[#f8fbfc] p-4"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: getScoreColor(scoreTier),
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Action {index + 1}
                    <span className="ml-2 font-normal normal-case text-muted/80">
                      of {fields.length}
                    </span>
                  </p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                      title="Remove action"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block">Description</Label>
                  <Textarea
                    {...register(`actions.${index}.text`)}
                    placeholder={`Describe action ${index + 1}`}
                    className="min-h-[72px] bg-white"
                  />
                  {errors.actions?.[index]?.text && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.actions[index]?.text?.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block">
                    Action Implementation Partner(s)
                  </Label>
                  <Input
                    {...register(`actions.${index}.partner`)}
                    placeholder="Partner name, or several separated by commas"
                    readOnly={lockProtected}
                    aria-readonly={lockProtected}
                    className={
                      lockProtected
                        ? "cursor-not-allowed bg-[#f1f5f6] text-muted"
                        : "bg-white"
                    }
                  />
                  {lockProtected && (
                    <p className="mt-1 text-xs text-muted">
                      Only Dr. Mukisa can edit partners.
                    </p>
                  )}
                  {errors.actions?.[index]?.partner && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.actions[index]?.partner?.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-1.5 block">Score Rating</Label>
                  <ScoreTierSelect
                    value={scoreTier}
                    onChange={(v) => updateActionScoreTier(index, v)}
                  />
                </div>

                <ActionEvidenceField
                  evidence={
                    watch(`actions.${index}.evidence`) ?? field.evidence ?? []
                  }
                  onChange={(v) => updateActionEvidence(index, v)}
                  error={errors.actions?.[index]?.evidence?.message}
                />
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-primary/30 bg-white py-6 text-primary hover:border-primary/50 hover:bg-primary/[0.03]"
            onClick={appendAction}
          >
            <Plus className="h-4 w-4" />
            Add another action
          </Button>

          {errors.actions && !Array.isArray(errors.actions) && (
            <p className="text-xs text-red-500">{errors.actions.message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("comments")}
            placeholder="Internal comments (optional)"
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Recommendation"
              : "Create Recommendation"}
        </Button>
      </div>
    </form>
  );
}
