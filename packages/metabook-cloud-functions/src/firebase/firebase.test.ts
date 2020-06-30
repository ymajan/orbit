import { Prompt } from "metabook-core";
import { testBasicPrompt } from "metabook-sample-data";
import { storePromptsIfNecessary } from "./firebase";

describe("storePromptsIfNecessary", () => {
  test("no inputs", async () => {
    await expect(
      storePromptsIfNecessary({}, jest.fn(), jest.fn()),
    ).resolves.toBeUndefined();
  });

  test("no prompts missing", async () => {
    const storePrompts = jest.fn();
    await expect(
      storePromptsIfNecessary(
        { a: {} as Prompt },
        jest.fn().mockResolvedValue(["a"]),
        storePrompts,
      ),
    ).resolves.toBeUndefined();
    expect(storePrompts).not.toBeCalled();
  });

  test("one prompt missing", async () => {
    const storePrompts = jest.fn().mockResolvedValue(["b"]);
    await expect(
      storePromptsIfNecessary(
        { a: {} as Prompt, b: testBasicPrompt },
        jest.fn().mockResolvedValue(["a"]),
        storePrompts,
      ),
    ).resolves.toBeUndefined();
    expect(storePrompts).toBeCalledWith([testBasicPrompt]);
  });

  test("mismatched ID", async () => {
    const storePrompts = jest.fn().mockResolvedValue(["b"]);
    await expect(
      storePromptsIfNecessary(
        { a: {} as Prompt },
        jest.fn().mockResolvedValue([null]),
        storePrompts,
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});