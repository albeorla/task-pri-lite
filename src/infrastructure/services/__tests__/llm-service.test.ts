import { LangChainLLMService } from "../llm-service";

// We need to install the required LangChain dependencies before these tests can run
describe.skip("LangChainLLMService", () => {
  test("should initialize correctly", () => {
    // Skip tests until LangChain dependencies are installed
    const service = new LangChainLLMService();
    expect(service).toBeInstanceOf(LangChainLLMService);
  });
});
