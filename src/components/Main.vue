<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import OpenAI from "openai";
import mermaid from "mermaid";
import mindMapGPTContext from "./mindMapGPTContext";
import "ldrs/ring2";

defineProps<{ msg: string }>();

// mermaid.initialize({ startOnLoad: false });
const localAPIKey = localStorage.getItem("API_KEY");
if (!localAPIKey)
  alert("Please set your OpenAI API key in the browser console using: localStorage");

const openai = new OpenAI({
  apiKey: localAPIKey,
  dangerouslyAllowBrowser: true,
});
const mindmapSVG = ref<string>(``);

async function isValidMindMapString(mindmapStr: string) {
  try {
    await mermaid.parse(mindmapStr);
    return true;
  }
  catch (error: any) {
    return error.message;
  }
}
const graphDiv = ref<HTMLDivElement | null>(null);
async function renderToSVG(mindmapStr: string) {
  const isValid = await isValidMindMapString(mindmapStr);
  if (isValid !== true)
    throw new Error(`Invalid mind map syntax: ${isValid}`);

  // const mermaidDiv = document.createElement("div");
  // document.body.appendChild(mermaidDiv);
  // console.log(`dom created: ${mermaidDiv}`);
  try {
    const result = await mermaid.render("mermaidDiv", mindmapStr, graphDiv.value!);
    return result.svg;
  }
  catch (error: any) {
    throw new Error(`Failed to render mind map: ${error.message}`);
  }
  finally {
    // document.body.removeChild(mermaidDiv);
    // console.log(`dom removed: ${mermaidDiv}`);
  }
}

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
  const generateResultMindMap = mindMapOrig.replace(/^\n*`*(mermaid)?\n*(.*?)\n*(?:`+\n*)?$/s, (match, p1, p2) => p2);
  const isValid = await isValidMindMapString(generateResultMindMap!);
  if (isValid !== true) {
    console.log(`Invalid mind map syntax ${isValid}, retrying[${retryCount}]...`);
    return await generateMindMap(prompt, retries, retryCount + 1);
  }
  return generateResultMindMap;
}

const prompt = ref<string>(`Generate a mind map for the following text:
  - Apples
    - Red
    - Green
  - Bananas
    - Yellow
  - Oranges
    - Orange
`);
const generating = ref<boolean>(false);
const mindMapGenerated = ref<string | null>("");
watch(mindMapGenerated, async (newVal) => {
  if (newVal) {
    if (newVal === "") { mindmapSVG.value = ""; }
    else {
      const svg = await renderToSVG(newVal);
      console.log(`Generated mind map SVG: ${svg}`);
      mindmapSVG.value = svg;
    }
  }
});
async function generate() {
  try {
    generating.value = true;
    const mindMap = await generateMindMap(prompt.value);
    mindMapGenerated.value = mindMap;
  }
  catch (error: any) {
    mindmapSVG.value = `Error: ${error.message}`;
  }
  finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col max-w-[60rem] mx-auto p-4">
    <p>generating: {{ generating }}</p>
    <div class="flex flex-row">
      <textarea v-model="prompt" class="w-full h-32 p-2 border border-gray-300" />
      <textarea v-model="mindMapGenerated" class="w-full h-32 p-2 border border-gray-300" />
    </div>
    <button class="p-2 bg-blue-500 text-white flex flex-row items-center justify-center" @click="generate">
      Generate Mind Map
      <l-ring-2
        v-if="generating" class="ml-2" size="20" stroke="5" stroke-length="0.25" bg-opacity="0.1" speed="0.8"
        color="white"
      />
    </button>
    <div ref="graphDiv" v-html="mindmapSVG" />
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
