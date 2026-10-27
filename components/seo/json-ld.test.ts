import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("prevents creator text from closing the JSON-LD script tag", () => {
    const json = serializeJsonLd({
      "@type": "Person",
      name: "</script><script>alert(1)</script>",
    });

    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c/script>");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)</script>");
  });

  it("serializes an undefined payload as null", () => {
    expect(serializeJsonLd(undefined)).toBe("null");
  });
});
