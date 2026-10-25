import { BreadBuddy, HeartBuddy, SunBuddy } from "@/components/brand/toy-icons";

const PHRASES = [
  "Tear small bread",
  "Anything for the boys?",
  "Small bread, soft life",
  "No be by force",
  "If e sweet you, tell your purse",
  "Small small dey go far",
  "Support dey sweet body",
  "Tear bread, not tears",
  "Carry your creator along",
  "Drop small something",
];

/** A playful, continuously scrolling Naija slang strip. */
export function SlangMarquee() {
  return (
    <section
      aria-label="Nigerian slang"
      className="relative overflow-hidden border-y-2 border-[var(--toy-ink)]/10 bg-[var(--toy-ochre)]/25 py-3"
    >
      <div className="animate-marquee flex w-max">
        {[0, 1].map((run) => (
          <div
            key={run}
            aria-hidden={run === 1}
            className="flex items-center gap-6 pr-6"
          >
            {PHRASES.map((phrase, index) => {
              const Icon =
                index % 3 === 0
                  ? BreadBuddy
                  : index % 3 === 1
                    ? HeartBuddy
                    : SunBuddy;
              return (
                <span
                  key={`${run}-${phrase}`}
                  className="flex items-center gap-2 whitespace-nowrap font-toy text-sm font-semibold text-foreground sm:text-base"
                >
                  <Icon size={20} />
                  {phrase}
                  <span className="text-[var(--toy-leaf)]">✦</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
