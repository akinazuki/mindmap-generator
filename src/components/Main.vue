<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import OpenAI from "openai";
import { useStorage, watchDebounced } from "@vueuse/core";
import svgPanZoom from "svg-pan-zoom";
import mindMapGPTContext from "./mindMapGPTContext";
import LoadRing from "./LoadRing.vue";
import { isValidMindMapString, waitUntilEstablished } from "./Utils";
import MermaidGraph from "./MermaidGraph.vue";

defineProps<{ msg: string }>();

const localAPIKey = useStorage("localAPIKey", "");
const lastGenerateCost = useStorage("lastGenerateCost", {
  total_tokens: 0,
  prompt_tokens: 0,
  completion_tokens: 0,
});
const defaultPrompt = `### 东方永夜抄的玩法总结\n\n**概述**\n- 东方永夜抄是东方Project系列的第八作，是一款弹幕射击游戏。\n- 游戏设定主要基于日本民间传说《竹取物语》。\n\n**游戏系统**\n1. **游戏角色**\n   - 每组自机由一个人类（高速移动）和一个妖怪（低速移动）组成。全四组分别为：\n     - 博丽灵梦与八云紫\n     - 雾雨魔理沙与爱丽丝·玛格特洛依德\n     - 十六夜咲夜与蕾米莉亚·斯卡蕾特\n     - 魂魄妖梦与西行寺幽幽子\n   - 通关所有组合之后，可以使用单一角色进行游戏。\n\n2. **关卡与BOSS**\n   - 游戏共包含常规关卡和Extra关卡。\n   - 第四面BOSS会根据使用的自机组合有所不同。\n   - 第五面通关后，可以选择进入6A面或6B面，两者剧情不同（6A为normal ending，6B为good ending）。\n\n3. **玩法机制**\n   - 刻符系统：收集蓝点道具可以增加残机。\n   - 决死bomb：系统中有一定改动，且引入了符卡练习模式。\n\n**故事背景与剧情**\n- 故事发生在幻想乡的永夜之中，玩家需控制人类与妖怪组合来解决异变，寻找“崭新的存在价值”。\n\n**角色**\n- 自机角色：包含人类和妖怪的组合以及单人使用模式。\n- BOSS角色：如莉格露·奈特巴格、米斯蒂娅·萝蕾拉、八意永琳、蓬莱山辉夜、藤原妹红等。\n\n通过游戏中的高速（人类）与低速（妖怪）切换，玩家需要适应弹幕和使用不同的策略来通关并解决幻想乡的异变。`;
const defaultFlowChart = `flowchart
    A[概述] --> B[系统]
    A --> C[背景与剧情]
    B --> D[游戏角色]
    B --> E[关卡与BOSS]
    B --> F[玩法机制]
    D --> G((博丽灵梦与八云紫))
    D --> H((雾雨魔理沙与爱丽丝·玛格特洛依德))
    D --> I((十六夜咲夜与蕾米莉亚·斯卡蕾特))
    D --> J((魂魄妖梦与西行寺幽幽子))
    F --> K[刻符系统]
    F --> L[决死bomb]
    E --> M((常规关卡和Extra关卡))
    E --> N((第四面BOSS随自机组合变化))
    E --> O((第五面后选择进入6A面或6B面))
    L --> P[符卡练习模式]
    C --> Q[玩家需解决幻想乡的异变]
    Q --> R[崭新的存在价值]`;

const errorMessages = ref<string>("");
const prompt = useStorage("prompt", defaultPrompt);
const generating = ref<boolean>(false);
const mindMapGenerated = useStorage("mindMapGenerated", defaultFlowChart);

onMounted(async () => {
  if (localAPIKey.value === "")
    localAPIKey.value = (window as any).prompt("Enter your OpenAI API key:");
});

const openai = new OpenAI({
  apiKey: localAPIKey.value,
  dangerouslyAllowBrowser: true,
});

async function generateMindMap(prompt: string, retries = 3, retryCount = 0) {
  if (retryCount >= retries)
    throw new Error(`Failed to generate mind map after ${retries} retries`);
  const chatCompletion = await openai.chat.completions.create({
    messages: [
      ...mindMapGPTContext,
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "gpt-4o",
  });
  const mindMapOrig = chatCompletion.choices[0].message.content;
  const currentLoopTokensUsed = chatCompletion.usage;
  lastGenerateCost.value = currentLoopTokensUsed;
  if (!mindMapOrig)
    throw new Error("Failed to generate mind map");
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const generateResultMindMap = mindMapOrig.replace(/^\n*`*(mermaid)?\n*(.*?)\n*(?:`+\n*)?$/s, (match, p1, p2) => p2);
  const isValid = await isValidMindMapString(generateResultMindMap!);
  if (isValid !== true) {
    console.log(`Invalid mind map syntax ${isValid}, retrying[${retryCount}]...`);
    return await generateMindMap(prompt, retries, retryCount + 1);
  }
  return generateResultMindMap;
}

async function generate() {
  try {
    generating.value = true;
    const mindMap = await generateMindMap(prompt.value);
    mindMapGenerated.value = mindMap;
  }
  catch (error: any) {
    errorMessages.value = error.message;
  }
  finally {
    generating.value = false;
  }
}
function processRenderError(error: string) {
  console.error(`Failed to render mind map: ${error}`);
  errorMessages.value = error;
}
function processRenderSuccess(message: string) {
  errorMessages.value = "";
}
</script>

<template>
  <div class="flex flex-col max-w-[60rem] mx-auto pt-4 px-4 h-screen gap-4">
    <div class="flex flex-col gap-4 max-h-[40vh]">
      <div v-show="lastGenerateCost.total_tokens !== 0" class="flex flex-row gap-4">
        <p>Prompt Tokens: {{ lastGenerateCost.prompt_tokens }}</p>
        <p>Completion Tokens: {{ lastGenerateCost.completion_tokens }}</p>
        <p>Total Tokens: {{ lastGenerateCost.total_tokens }}</p>
      </div>
      <div class="flex flex-row gap-4 h-64">
        <textarea
          v-model="prompt" class="w-full h-full p-2 border border-gray-300"
          placeholder="Enter your prompt here"
        />
        <textarea
          v-model="mindMapGenerated" class="w-full h-full p-2 border border-gray-300"
          placeholder="Mermaid syntax language"
        />
      </div>

      <button
        class="p-2 bg-blue-500 text-white flex flex-row items-center justify-center"
        :disabled="generating || !localAPIKey" @click="generate"
      >
        Generate Mind Map
        <LoadRing v-if="generating" class="ml-2 w-1 h-1" />
      </button>
    </div>
    <p class="text-red-500">
      {{ errorMessages }}
    </p>
    <MermaidGraph class="h-[50vh] overflow-scroll border border-gray-300" :mindmap-graph="mindMapGenerated" @on-render-success="processRenderSuccess" @on-render-error="processRenderError" />
  </div>
</template>

<style scoped>
</style>
