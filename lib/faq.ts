export type FaqItem = { q: string; a: string };

/** Shared by the home-page accordion and its FAQPage structured data. */
export const HOME_FAQS: FaqItem[] = [
  {
    q: "What does “tear small bread” mean?",
    a: "In Nigerian Pidgin, “tearing small bread” is a playful way of saying “share a small portion” — like buying someone a loaf or saying “take small something.” On anything4boys, it is always voluntary. Small small is enough.",
  },
  {
    q: "Why “anything for the boys”?",
    a: "It is a familiar Naija phrase you will hear when friends ask for a small share. We are using it for good: no pressure, no extortion, just voluntary support for creators you love. “Boys” here means your people — the crew, the gang, everybody. All genders are welcome.",
  },
  {
    q: "Is this only for male creators or supporters?",
    a: "Not at all. “The boys” is slang for your people, not a men-only club. anything4boys is for creators and supporters of every gender, craft and city — from Lagos to London.",
  },
  {
    q: "Is this begging?",
    a: "No. This is a tip jar with manners. Supporters give only if they want to, and only if they can. If you can't give, sharing the page or leaving a kind word is more than enough. No pressure, no wahala.",
  },
  {
    q: "I only have small money — is that okay?",
    a: "That's the whole point. Small bread is still bread. Every creator sets their own price, and a kind word costs nothing. Small small dey go far.",
  },
  {
    q: "How do I get my money out into my Nigerian bank account?",
    a: "Whenever you have a balance, click “Request Payout” in your creator dashboard. Payouts go directly to your linked Nigerian commercial bank account or mobile wallet (GTBank, Access, Zenith, Kuda, OPay, etc.) through our Bachs payment infrastructure.",
  },
  {
    q: "Do my supporters need an account or an app?",
    a: "Not at all. Your supporters don’t need to download anything, remember a password, or sign up. They click your link in your bio, choose their bread count, drop a kind word, and check out securely in seconds.",
  },
  {
    q: "Are there any upfront or monthly fees to use anything4boys?",
    a: "Zero. It is completely free to create your page, customise your profile, set goals, and share your link. There are no monthly subscription fees. We only apply standard payment processing fees when you actually receive support.",
  },
  {
    q: "Can supporters pay from outside Nigeria?",
    a: "Yes. While our default currency is Naira (NGN), supporters worldwide can use standard debit or credit cards (Visa, Mastercard) to tear bread for you, converted at checkout.",
  },
  {
    q: "Can I set goals (e.g. for a camera, internet, or software)?",
    a: "Yes. You can set an optional public goal in your dashboard (e.g. “Goal: ₦150,000 for a Starlink dish”). A live progress bar will show on your public page so your people can see how close you are.",
  },
];

/** Support-specific answers, used on /support and its FAQPage JSON-LD. */
export const SUPPORT_FAQS: FaqItem[] = [
  {
    q: "A payment succeeded but the creator page still shows it as pending. What should I do?",
    a: "Payment confirmations usually arrive within a few minutes. Refresh the page, and if it is still pending after 15 minutes, contact us with the payment reference from your receipt. Never send your card number or bank password.",
  },
  {
    q: "How do creator payouts work?",
    a: "Creators request a payout from the dashboard once funds are available. Our team reviews the request and sends it to the creator's linked Nigerian bank account or mobile wallet. The payout page shows whether it is requested, paid, or failed.",
  },
  {
    q: "What does anything4boys charge?",
    a: "Creating a page is free, with no monthly subscription. A standard payment processing fee applies when support is received; the checkout amount is shown before the supporter pays. Creators see the net amount in their dashboard.",
  },
  {
    q: "Can supporters pay from outside Nigeria?",
    a: "The platform is built for Naira-first support. Supporters can use the payment methods Bachs offers at checkout, and the amount is shown in the creator's currency before payment. If a card is not accepted, try another method or contact us with the reference.",
  },
  {
    q: "I did not get my sign-in or password-reset code.",
    a: "Check your spam and promotions folders first. Codes expire after 15 minutes; go back and request a new one if needed. Make sure you are using the same email address that is on the account.",
  },
  {
    q: "How do I ask for a refund or report a problem?",
    a: "Use the contact form and choose “A payment or refund.” Include the payment reference, creator username, amount, and what happened. Do not include full card numbers or bank credentials. We will review it with the payment provider.",
  },
  {
    q: "Is my card information stored on anything4boys?",
    a: "No. Card and payment details are handled by the payment provider, Bachs. anything4boys stores the donation record, your name, email, and message so the creator can see who supported them.",
  },
  {
    q: "How do I delete my account or creator page?",
    a: "Contact us from the email address on the account and tell us whether you want your creator page unpublished or your account deleted. We will confirm what will be removed and what payment records we must keep for accounting and legal reasons.",
  },
];
