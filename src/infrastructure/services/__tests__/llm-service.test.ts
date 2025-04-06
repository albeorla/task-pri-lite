import { LangChainLLMService } from "../llm-service";

describe("LangChainLLMService", () => {
  test("should initialize correctly", () => {
    const service = new LangChainLLMService();
    expect(service).toBeInstanceOf(LangChainLLMService);
  });
});
