import { MARKDOWN, URL } from "./regexps";

describe("RegExps", () => {
  it("matches markdown blockquote", () => {
    const match = "> lorem ipsum".match(MARKDOWN);
    expect(match?.groups?.text).toBe("lorem ipsum");
  });

  it("matches multi-line markdown blockquote", () => {
    const match = `
    blah blah
    > lorem ipsum
    blah blah
    `.match(MARKDOWN);
    expect(match?.groups?.text).toBe("lorem ipsum");
  });

  it("matches URL quote", () => {
    const match = (
      "https://discordapp.com" +
      "/channels" +
      "/443502244734828556" +
      "/443678718792040448" +
      "/678429687126556692"
    ).match(URL);
    expect(match?.groups?.serverId).toBe("443502244734828556");
    expect(match?.groups?.channelId).toBe("443678718792040448");
    expect(match?.groups?.messageId).toBe("678429687126556692");
  });

  it("matches URL quote (Public Beta)", () => {
    const match = (
      "https://ptb.discordapp.com" +
      "/channels" +
      "/443502244734828556" +
      "/443678718792040448" +
      "/678429687126556692"
    ).match(URL);
    expect(match?.groups?.serverId).toBe("443502244734828556");
    expect(match?.groups?.channelId).toBe("443678718792040448");
    expect(match?.groups?.messageId).toBe("678429687126556692");
  });
});
