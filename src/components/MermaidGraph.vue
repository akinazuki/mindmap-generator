<script setup lang="ts">
import mermaid from "mermaid";
import svgPanZoom from "svg-pan-zoom";
import { computed, nextTick, onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { isValidMindMapString } from "./Utils";

const props = defineProps<{ mindmapGraph: string }>();
const emit = defineEmits(["onRenderError", "onRenderSuccess"]);
const graphDiv = ref<HTMLDivElement | null>(null);
const mindmapSVG = ref<string>(``);

function resetSvgWH() {
  const mermaidDiv = document.getElementById("mermaidDiv");
  mermaidDiv?.style.setProperty("height", "100%");
  mermaidDiv?.style.setProperty("max-width", "100%");
}
let panZoom: any;

function initPanZoom() {
  if (panZoom)
    panZoom.destroy();
  try {
    panZoom = svgPanZoom("#mermaidDiv", { controlIconsEnabled: true });
    window.panZoom = panZoom;
    panZoom.fit();
    panZoom.center();
  }
  catch (error: any) {
    console.error(`Failed to initialize pan-zoom: ${error.message}`);
  }
}

async function renderToSVG(mindmapStr: string) {
  const isValid = await isValidMindMapString(mindmapStr);
  if (isValid !== true)
    throw new Error(`Invalid mind map syntax: ${isValid}`);
  try {
    const result = await mermaid.render("mermaidDiv", mindmapStr, graphDiv.value!);
    emit("onRenderSuccess", "Mind map rendered successfully");
    return result.svg;
  }
  catch (error: any) {
    emit("onRenderError", `Failed to render mind map: ${error.message}`);
    throw new Error(`Failed to render mind map: ${error.message}`);
  }
  finally {
    // document.body.removeChild(mermaidDiv);
    // console.log(`dom removed: ${mermaidDiv}`);
  }
}

onMounted(async () => {
  try {
    const generated = await renderToSVG(props.mindmapGraph);
    mindmapSVG.value = generated;
    resetSvgWH();
    initPanZoom();
  }
  catch (error: any) {
    console.error(`Failed to render mind map: ${error.message}`);
  }
});
const mindMapGenerated = computed(() => props.mindmapGraph);

watchDebounced(mindMapGenerated, async (newVal) => {
  if (newVal) {
    if (newVal === "") { mindmapSVG.value = ""; }
    else {
      try {
        const svg = await renderToSVG(newVal);
        // console.log(`Generated mind map SVG: ${svg}`);
        mindmapSVG.value = svg;
        nextTick(() => {
          resetSvgWH();
          initPanZoom();
        });
      }
      catch (error: any) {
        emit("onRenderError", error.message);
      }
    }
  }
}, { debounce: 500, immediate: true });
</script>

<template>
  <div ref="graphDiv" v-html="mindmapSVG" />
</template>
