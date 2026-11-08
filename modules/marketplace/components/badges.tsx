/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  ASSIGNMENT_STATES,
  COMMISSION_STATUSES,
  DOCUMENT_REVIEWS,
  OFFER_STATUSES,
  PLAN_STATUSES,
  SELLER_STATUSES,
} from "../models/marketplace.interface";

type Variant = "default" | "secondary" | "destructive" | "outline";

const SELLER_VARIANT: Record<(typeof SELLER_STATUSES)[number], Variant> = {
  DRAFT: "outline",
  IN_REVIEW: "secondary",
  CHANGES_REQUESTED: "secondary",
  APPROVED: "default",
  SUSPENDED: "destructive",
  CLOSED: "outline",
};

const PLAN_VARIANT: Record<(typeof PLAN_STATUSES)[number], Variant> = {
  DRAFT: "outline",
  ACTIVE: "default",
  SUPERSEDED: "secondary",
  RETIRED: "outline",
};

const REVIEW_VARIANT: Record<(typeof DOCUMENT_REVIEWS)[number], Variant> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
};

const ASSIGNMENT_VARIANT: Record<(typeof ASSIGNMENT_STATES)[number], Variant> = {
  CURRENT: "default",
  SCHEDULED: "secondary",
  ENDED: "outline",
  CANCELLED: "outline",
};

const is = <T extends string>(list: readonly T[], value?: string | null): value is T => (list as readonly string[]).includes(value ?? "");

export const SellerStatusBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.marketplace.seller.statuses");
  if (!is(SELLER_STATUSES, status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={SELLER_VARIANT[status]}>{t(status)}</Badge>;
};

export const PlanStatusBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.marketplace.plan.statuses");
  if (!is(PLAN_STATUSES, status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={PLAN_VARIANT[status]}>{t(status)}</Badge>;
};

export const DocumentReviewBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.marketplace.documents.reviews");
  if (!is(DOCUMENT_REVIEWS, status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={REVIEW_VARIANT[status]}>{t(status)}</Badge>;
};

export const AssignmentStateBadge = ({ state }: { state?: string | null }) => {
  const t = useTranslations("Administre.marketplace.assignments.states");
  if (!is(ASSIGNMENT_STATES, state)) return <Badge variant='outline'>{state || "—"}</Badge>;
  return <Badge variant={ASSIGNMENT_VARIANT[state]}>{t(state)}</Badge>;
};

const OFFER_VARIANT: Record<(typeof OFFER_STATUSES)[number], Variant> = {
  DRAFT: "outline",
  PENDING_REVIEW: "secondary",
  ACTIVE: "default",
  REJECTED: "destructive",
  PAUSED: "secondary",
  CLOSED: "outline",
};

export const OfferStatusBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.marketplace.offer.statuses");
  if (!is(OFFER_STATUSES, status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={OFFER_VARIANT[status]}>{t(status)}</Badge>;
};

const COMMISSION_VARIANT: Record<(typeof COMMISSION_STATUSES)[number], Variant> = {
  PENDING: "secondary",
  ACCRUED: "default",
  VOIDED: "outline",
  REVIEW: "destructive",
};

export const CommissionStatusBadge = ({ status }: { status?: string | null }) => {
  const t = useTranslations("Administre.marketplace.billing.statuses");
  if (!is(COMMISSION_STATUSES, status)) return <Badge variant='outline'>{status || "—"}</Badge>;
  return <Badge variant={COMMISSION_VARIANT[status]}>{t(status)}</Badge>;
};
