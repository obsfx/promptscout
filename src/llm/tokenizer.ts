import { getLlama, resolveModelFile, LlamaLogLevel } from "node-llama-cpp";
import type { LlamaModel } from "node-llama-cpp";
import { getModelDir } from "./model-manager.js";

let vocabModel: LlamaModel | null = null;
let cachedUri: string | null = null;

async function getVocabModel(hfUri: string): Promise<LlamaModel> {
  if (vocabModel && cachedUri === hfUri) return vocabModel;

  if (vocabModel) {
    await vocabModel.dispose();
    vocabModel = null;
    cachedUri = null;
  }

  const modelPath = hfUri.startsWith("hf:")
    ? await resolveModelFile(hfUri, getModelDir())
    : hfUri;
  const llama = await getLlama({ logLevel: LlamaLogLevel.error });
  vocabModel = await llama.loadModel({
    modelPath,
    vocabOnly: true,
  });
  cachedUri = hfUri;

  return vocabModel;
}

export async function countTokens(
  text: string,
  hfUri: string,
): Promise<number> {
  const model = await getVocabModel(hfUri);
  return model.tokenize(text).length;
}
