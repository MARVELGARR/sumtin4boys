"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, CircleAlert, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { appErrorMessage } from "@/lib/format";

type Topic = "support" | "creator" | "payment" | "press" | "other";

const TOPICS: Array<{ value: Topic; label: string }> = [
  { value: "support", label: "Supporting a creator" },
  { value: "creator", label: "Creator page or payouts" },
  { value: "payment", label: "A payment or refund" },
  { value: "press", label: "Press or partnerships" },
  { value: "other", label: "Something else" },
];

type FieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

export function ContactForm() {
  const submit = useMutation(api.contact.submit);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>("support");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (message.trim().length < 20) {
      next.message = "Tell us a little more (at least 20 characters).";
    }
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await submit({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
        ...(website ? { website } : {}),
      });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setTopic("support");
      toast.success("Message sent. We'll reply by email.");
    } catch (caught) {
      const text = appErrorMessage(
        caught,
        "We couldn't send that message. Please try again.",
      );
      setError(text);
      toast.error(text);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="toy-card flex flex-col items-center gap-4 rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-8 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </span>
        <div>
          <h2 className="font-toy text-xl font-bold">Message received</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            We read every message and reply by email. If it is about a payment,
            include the reference next time so we can find it faster.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSent(false)}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="toy-card rounded-2xl border-2 border-[var(--toy-ink)]/10 bg-card p-5 shadow-sm sm:p-7"
    >
      <div className="mb-5">
        <h2 className="font-toy text-xl font-bold tracking-tight">
          Send us a message
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Tell us what happened and how we can help. We reply by email.
        </p>
      </div>
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="contact-name">Your name</FieldLabel>
            <Input
              id="contact-name"
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="Ada"
              autoComplete="name"
              maxLength={80}
              required
              disabled={pending}
              className="h-10"
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
            <Input
              id="contact-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={pending}
              className="h-10"
            />
            <FieldError>{errors.email}</FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="contact-topic">What is this about?</FieldLabel>
          <Select
            value={topic}
            onValueChange={(value) => setTopic(value as Topic)}
            disabled={pending}
          >
            <SelectTrigger id="contact-topic" className="h-10 w-full">
              <SelectValue placeholder="Choose a topic" />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={Boolean(errors.message)}>
          <FieldLabel htmlFor="contact-message">Message</FieldLabel>
          <Textarea
            id="contact-message"
            name="message"
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setErrors((current) => ({ ...current, message: undefined }));
            }}
            placeholder="Tell us what happened, what you need, or what you're building. Include a payment reference if you have one."
            rows={6}
            maxLength={5_000}
            required
            disabled={pending}
            aria-invalid={Boolean(errors.message)}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldDescription>
              Do not include card numbers, bank passwords, or full account
              details.
            </FieldDescription>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {message.length}/5,000
            </span>
          </div>
          <FieldError>{errors.message}</FieldError>
        </Field>

        {/* Honeypot: hidden from people, tempting to bots. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {error ? (
          <Alert
            variant="destructive"
            className="border-destructive/25 bg-destructive/5"
          >
            <CircleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full gap-2 text-sm font-semibold sm:w-auto sm:px-6"
          disabled={pending}
        >
          {pending ? <Spinner /> : <Send className="size-4" />}
          {pending ? "Sending…" : "Send message"}
        </Button>
      </FieldGroup>
    </form>
  );
}
