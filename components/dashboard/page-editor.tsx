"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_AVATAR_CONTENT_TYPES,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MAX_AVATAR_BYTES,
  MAX_BREAD_PRICE_MINOR,
  MIN_BREAD_PRICE_MINOR,
  SUPPORTED_CURRENCIES,
  appErrorMessage,
  formatMoney,
  fromMinorUnits,
  parseMajorAmount,
} from "@/lib/format";

/** Shape of `updateProfile`'s args, built incrementally from changed fields. */
type ProfilePatch = {
  displayName?: string;
  bio?: string | null;
  breadPrice?: number;
  currency?: string;
  goalAmount?: number | null;
};

type MyCreator = NonNullable<
  FunctionReturnType<typeof api.creators.getMyCreator>["creator"]
>;

export function PageEditor() {
  const data = useQuery(api.creators.getMyCreator, {});

  // CreatorGuard in the dashboard layout normally handles this; the skeleton
  // doubles as the loading state and as the fallback while redirecting.
  if (data === undefined || data.creator === null) {
    return <PageEditorSkeleton />;
  }

  return <PageEditorForm creator={data.creator} />;
}

function PageEditorForm({ creator }: { creator: MyCreator }) {
  const updateProfile = useMutation(api.creators.updateProfile);
  const generateUploadUrl = useMutation(api.creators.generateAvatarUploadUrl);
  const setAvatar = useMutation(api.creators.setAvatar);
  const removeAvatar = useMutation(api.creators.removeAvatar);

  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio ?? "");
  const [breadPriceInput, setBreadPriceInput] = useState(() =>
    fromMinorUnits(creator.breadPrice, creator.currency),
  );
  const [currency, setCurrency] = useState<string>(creator.currency);
  const [goalInput, setGoalInput] = useState(() =>
    creator.goalAmount === undefined
      ? ""
      : fromMinorUnits(creator.goalAmount, creator.currency),
  );

  const [errors, setErrors] = useState<{
    displayName?: string;
    breadPrice?: string;
    goalAmount?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    if (
      !(ALLOWED_AVATAR_CONTENT_TYPES as readonly string[]).includes(file.type)
    ) {
      toast.error("Choose a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Images must be 2 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const { url } = await generateUploadUrl();
      const response = await fetch(url, { method: "POST", body: file });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      await setAvatar({ storageId });
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(appErrorMessage(error, "Could not upload that image."));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setRemovingAvatar(true);
    try {
      await removeAvatar();
      toast.success("Avatar removed");
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setRemovingAvatar(false);
    }
  }

  async function handleSave() {
    const nextErrors: typeof errors = {};

    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length < 1) {
      nextErrors.displayName = "A display name is required.";
    } else if (trimmedDisplayName.length > DISPLAY_NAME_MAX_LENGTH) {
      nextErrors.displayName = `Keep it to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
    }

    const breadPrice = parseMajorAmount(breadPriceInput, currency);
    if (breadPrice === null) {
      nextErrors.breadPrice = "Enter a valid amount.";
    } else if (
      breadPrice < MIN_BREAD_PRICE_MINOR ||
      breadPrice > MAX_BREAD_PRICE_MINOR
    ) {
      nextErrors.breadPrice = `Price must be between ${formatMoney(
        MIN_BREAD_PRICE_MINOR,
        currency,
      )} and ${formatMoney(MAX_BREAD_PRICE_MINOR, currency)}.`;
    }

    const trimmedGoal = goalInput.trim();
    let goalAmount: number | null = null;
    if (trimmedGoal !== "") {
      const parsed = parseMajorAmount(trimmedGoal, currency);
      if (parsed === null) {
        nextErrors.goalAmount = "Enter a valid amount.";
      } else if (parsed < MIN_BREAD_PRICE_MINOR) {
        nextErrors.goalAmount = `Goals start at ${formatMoney(
          MIN_BREAD_PRICE_MINOR,
          currency,
        )}.`;
      } else {
        goalAmount = parsed;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Only send fields that actually changed. The backend applies provided
    // fields only, so sending the whole form would overwrite values that may
    // have been changed elsewhere and would try currency switches that the
    // backend legitimately refuses after donations exist.
    const patch: ProfilePatch = {};
    if (trimmedDisplayName !== creator.displayName) {
      patch.displayName = trimmedDisplayName;
    }

    const trimmedBio = bio.trim();
    if (trimmedBio !== (creator.bio ?? "")) {
      // Empty string clears the bio on the backend.
      patch.bio = trimmedBio === "" ? null : trimmedBio;
    }

    if (breadPrice !== null && breadPrice !== creator.breadPrice) {
      patch.breadPrice = breadPrice;
    }

    if (currency !== creator.currency) {
      patch.currency = currency;
    }

    if (goalAmount !== (creator.goalAmount ?? null)) {
      patch.goalAmount = goalAmount;
    }

    if (Object.keys(patch).length === 0) {
      toast.info("Nothing has changed yet.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(patch);
      toast.success("Page updated");
    } catch (error) {
      toast.error(appErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const initial = (creator.displayName || creator.username)
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Page editor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update how your page looks and what a bread costs.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/${creator.username}`}>
            <ExternalLink />
            View my page
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>
            A square PNG, JPEG or WebP works best. Up to 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-16">
            {creator.avatarUrl ? (
              <AvatarImage src={creator.avatarUrl} alt={creator.displayName} />
            ) : null}
            <AvatarFallback className="text-lg">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Input
              type="file"
              accept={ALLOWED_AVATAR_CONTENT_TYPES.join(",")}
              aria-label="Upload avatar"
              className="w-full max-w-full sm:max-w-64"
              disabled={uploading || removingAvatar}
              onChange={(event) => void handleAvatarChange(event)}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!creator.avatarUrl || uploading || removingAvatar}
                >
                  {removingAvatar ? <Spinner /> : null}
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove your avatar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your page will fall back to a letter until you upload a new
                    one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleRemoveAvatar()}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {uploading ? (
            <p className="w-full text-xs text-muted-foreground">Uploading…</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page details</CardTitle>
          <CardDescription>
            These appear on your public page at /{creator.username}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.displayName)}>
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <Input
                id="display-name"
                value={displayName}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                aria-invalid={Boolean(errors.displayName)}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <FieldError>{errors.displayName}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="bio">
                Bio
                <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                  {bio.length}/{BIO_MAX_LENGTH}
                </span>
              </FieldLabel>
              <Textarea
                id="bio"
                value={bio}
                rows={4}
                maxLength={BIO_MAX_LENGTH}
                placeholder="Tell supporters who you are and what you make."
                onChange={(event) => setBio(event.target.value)}
              />
              <FieldDescription>
                Leave it empty to hide the bio from your page.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.breadPrice)}>
                <FieldLabel htmlFor="bread-price">Bread price</FieldLabel>
                <Input
                  id="bread-price"
                  inputMode="decimal"
                  value={breadPriceInput}
                  aria-invalid={Boolean(errors.breadPrice)}
                  onChange={(event) => setBreadPriceInput(event.target.value)}
                />
                <FieldDescription>
                  {formatMoney(MIN_BREAD_PRICE_MINOR, currency)} –{" "}
                  {formatMoney(MAX_BREAD_PRICE_MINOR, currency)}
                </FieldDescription>
                <FieldError>{errors.breadPrice}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="currency">Currency</FieldLabel>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue placeholder="Pick a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  You can only change this before your first donation.
                </FieldDescription>
              </Field>
            </div>

            <Field data-invalid={Boolean(errors.goalAmount)}>
              <FieldLabel htmlFor="goal-amount">Goal (optional)</FieldLabel>
              <Input
                id="goal-amount"
                inputMode="decimal"
                value={goalInput}
                placeholder="e.g. 50000"
                aria-invalid={Boolean(errors.goalAmount)}
                onChange={(event) => setGoalInput(event.target.value)}
              />
              <FieldDescription>
                Show a progress goal on your page. Clear the field to remove it.
              </FieldDescription>
              <FieldError>{errors.goalAmount}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-stretch sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function PageEditorSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-6 flex flex-col gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
