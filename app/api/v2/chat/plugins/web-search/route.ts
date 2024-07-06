import { getServerProfile } from "@/lib/server/server-chat-helpers"
import { ServerRuntime } from "next"

import { updateOrAddSystemMessage } from "@/lib/ai-helper"
import llmConfig from "@/lib/models/llm/llm-config"
import { checkRatelimitOnApi } from "@/lib/server/ratelimiter"
import {
  buildFinalMessages,
  ensureAssistantMessagesNotEmpty
} from "@/lib/build-prompt"
import {
  handleErrorResponse,
  handleOpenRouterApiError
} from "@/lib/models/llm/api-error"
import { GPT4 } from "@/lib/models/llm/openai-llm-list"
import { MISTRAL_LARGE } from "@/lib/models/llm/mistral-llm-list"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { payload, chatImages, selectedPlugin } = json as {
    payload: any
    chatImages: any
    selectedPlugin: any
  }

  try {
    const profile = await getServerProfile()
    const chatSettings = payload.chatSettings

    let {
      providerUrl,
      providerHeaders,
      selectedModel,
      rateLimitCheckResult,
      modelTemperature
    } = await getProviderConfig(chatSettings, profile)

    if (rateLimitCheckResult !== null) {
      return rateLimitCheckResult.response
    }

    const cleanedMessages = (await buildFinalMessages(
      payload,
      profile,
      chatImages,
      selectedPlugin
    )) as any[]

    const systemMessageContent =
      llmConfig.systemPrompts.hackerGPTCurrentDateOnly

    updateOrAddSystemMessage(cleanedMessages, systemMessageContent)

    ensureAssistantMessagesNotEmpty(cleanedMessages)

    const requestBody = {
      model: selectedModel,
      route: "fallback",
      messages: cleanedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: modelTemperature,
      max_tokens: 1024,
      stream: true
    }

    try {
      const res = await fetch(providerUrl, {
        method: "POST",
        headers: providerHeaders,
        body: JSON.stringify(requestBody)
      })

      if (!res.ok) {
        await handleOpenRouterApiError(res)
      }

      if (!res.body) {
        throw new Error("Response body is null")
      }
      return res
    } catch (error) {
      return handleErrorResponse(error)
    }
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

async function getProviderConfig(chatSettings: any, profile: any) {
  const isProModel =
    chatSettings.model === MISTRAL_LARGE.modelId ||
    chatSettings.model === GPT4.modelId

  const providerUrl = llmConfig.openrouter.url
  const apiKey = llmConfig.openrouter.apiKey
  const defaultModel = "perplexity/llama-3-sonar-small-32k-online"
  const proModel = "perplexity/llama-3-sonar-large-32k-online"

  const providerHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://hackergpt.com/web-search",
    "X-Title": "web-search"
  }

  let modelTemperature = 0.5
  let selectedModel = isProModel ? proModel : defaultModel

  let rateLimitIdentifier
  if (chatSettings.model === GPT4.modelId) {
    rateLimitIdentifier = "gpt-4"
  } else if (chatSettings.model === MISTRAL_LARGE.modelId) {
    rateLimitIdentifier = "hackergpt-pro"
  } else {
    rateLimitIdentifier = "hackergpt"
  }

  let rateLimitCheckResult = await checkRatelimitOnApi(
    profile.user_id,
    rateLimitIdentifier
  )

  return {
    providerUrl,
    providerHeaders,
    selectedModel,
    rateLimitCheckResult,
    isProModel,
    modelTemperature
  }
}
