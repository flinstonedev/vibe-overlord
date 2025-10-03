import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { AIProviderConfig, AIProvider } from './index.js';

export const getDefaultModel = (provider: AIProvider): string => {
    switch (provider) {
        case 'openai':
            return 'gpt-4o';
        case 'anthropic':
            return 'claude-3-5-sonnet-20241022';
        case 'google':
            return 'gemini-2.5-pro-latest';
        default:
            return 'gpt-4o';
    }
};

export const getProviderModel = (config: AIProviderConfig) => {
    const model = config.model || getDefaultModel(config.provider);

    switch (config.provider) {
        case 'openai':
            return openai(model);
        case 'anthropic':
            return anthropic(model);
        case 'google':
            return google(model);
        default:
            return openai(model);
    }
};

