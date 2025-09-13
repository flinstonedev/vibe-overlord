'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getMDXComponent } from 'vibe-overlord/client';
import Demo from '@/components/demo';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import * as ApiUtils from '@/utils/api';

// Error boundary to catch runtime errors in the generated component so the whole UI
// does not freeze or blank out.
class ComponentErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Generated component runtime error:', error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    <strong>Component error:</strong> {this.state.error?.message}
                </div>
            );
        }
        return this.props.children;
    }
}

export default function Home() {
    const [prompt, setPrompt] = useState('');
    const [componentCode, setComponentCode] = useState<string | null>(null);
    const [compiledComponent, setCompiledComponent] = useState<React.ComponentType<any> | null>(null);
    const [frontmatter, setFrontmatter] = useState<{
        title?: string;
        description?: string;
        category?: string;
        tags?: string[];
        version?: string;
        [key: string]: unknown;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
    const [model, setModel] = useState('');

    const handleGenerate = async () => {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Generate button clicked');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    provider: {
                        provider,
                        model: model || undefined
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const { code, frontmatter } = await response.json();
            setComponentCode(code);
            setFrontmatter(frontmatter);
        } catch (error) {
            // Only log detailed errors in development
            if (process.env.NODE_ENV === 'development') {
                console.error('Component generation error:', error);
            }

            // Show user-friendly error message
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            setError(errorMessage);
        }

        setLoading(false);
    };

    // Compile the MDX code **after** React has committed the DOM update so that
    // the expensive Function constructor work does not block the UI thread.
    useEffect(() => {
        if (!componentCode) {
            setCompiledComponent(null);
            return;
        }

        let cancelled = false;

        // Defer compilation to the next tick to keep the UI responsive.
        // Using requestIdleCallback when available gives the browser more leeway.
        const compile = () => {
            try {
                const Comp = getMDXComponent(componentCode);
                if (!cancelled) {
                    setCompiledComponent(() => Comp);
                }
            } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error compiling generated component:', err);
                }
                if (!cancelled) {
                    setError('Error rendering the generated component. Please try generating again.');
                }
            }
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const id = (window as any).requestIdleCallback(compile);
            return () => {
                cancelled = true;
                (window as any).cancelIdleCallback?.(id);
            };
        } else {
            // Fallback for environments without requestIdleCallback
            const id = setTimeout(compile, 0);
            return () => {
                cancelled = true;
                clearTimeout(id);
            };
        }
    }, [componentCode]);

    // Memo-ise the map of allowed components/utilities so we don’t create a new
    // object every render (which would trigger needless re-renders of the MDX
    // component and could lead to performance issues).
    const componentsMap = useMemo(() => ({ Demo, Icon, Button, Card, Badge, ...ApiUtils }), []);

    // Alias with capital letter so JSX recognises it as a React component element
    const GeneratedComponent = compiledComponent;

    // Simple button disable logic
    const isDisabled = loading || prompt.trim() === '';

    const getModelPlaceholder = (provider: string) => {
        switch (provider) {
            case 'openai':
                return 'e.g., gpt-4o, gpt-4o-mini (default: gpt-4o)';
            case 'anthropic':
                return 'e.g., claude-3-5-sonnet-20241022 (default)';
            case 'google':
                return 'e.g., gemini-1.5-pro-latest (default)';
            default:
                return '';
        }
    };

    return (
        <main className="p-5 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-5">Vibe Overlord Example</h1>
            <div className="mb-5">
                {/* AI Provider Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            AI Provider
                        </label>
                        <select
                            value={provider}
                            onChange={(e) => {
                                setProvider(e.target.value as 'openai' | 'anthropic' | 'google');
                                setModel(''); // Reset model when provider changes
                            }}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                            <option value="openai">OpenAI (GPT)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="google">Google (Gemini)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model (optional)
                        </label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder={getModelPlaceholder(provider)}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>

                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt to generate a component (e.g., create a blue button with rounded corners)"
                    rows={4}
                    className="w-full p-3 mb-3 rounded border border-gray-300 text-sm"
                />
                <button
                    onClick={handleGenerate}
                    disabled={isDisabled}
                    className={`px-5 py-2 text-white border-none rounded text-sm ${isDisabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                        }`}
                >
                    {loading ? 'Generating...' : 'Generate Component'}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded mb-5 text-red-700">
                    <strong>Error:</strong> {error}
                </div>
            )}

            <div className="flex flex-col gap-6">
                {/* Rendered Component */}
                <div className="border border-gray-200 rounded-lg p-5">
                    <h2 className="mt-0 mb-4 text-lg font-semibold text-gray-800">Rendered Component:</h2>

                    {/* Component Metadata */}
                    {frontmatter && Object.keys(frontmatter).length > 0 && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                            <h3 className="text-sm font-medium text-blue-900 mb-2">Component Info:</h3>
                            {frontmatter.title && (
                                <p className="text-sm text-blue-800 mb-1">
                                    <strong>Title:</strong> {frontmatter.title}
                                </p>
                            )}
                            {frontmatter.description && (
                                <p className="text-sm text-blue-800 mb-1">
                                    <strong>Description:</strong> {frontmatter.description}
                                </p>
                            )}
                            {frontmatter.tags && Array.isArray(frontmatter.tags) && (
                                <p className="text-sm text-blue-800 mb-1">
                                    <strong>Tags:</strong> {frontmatter.tags.join(', ')}
                                </p>
                            )}
                            {frontmatter.category && (
                                <p className="text-sm text-blue-800">
                                    <strong>Category:</strong> {frontmatter.category}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="min-h-24 bg-gray-50 border border-dashed border-gray-300 rounded p-5 flex items-center justify-center">
                        {GeneratedComponent ? (
                            <ComponentErrorBoundary>
                                <GeneratedComponent components={componentsMap} />
                            </ComponentErrorBoundary>
                        ) : (
                            <p className="text-gray-600 italic">
                                No component generated yet. Enter a prompt and click &quot;Generate Component&quot; to see it rendered here.
                            </p>
                        )}
                    </div>
                </div>

                {/* Code Preview */}
                <div className="border border-gray-200 rounded-lg p-5">
                    <h2 className="mt-0 mb-4 text-lg font-semibold text-gray-800">Generated Code:</h2>
                    <div className="min-h-24 bg-gray-50 border border-gray-300 rounded p-4 overflow-auto text-xs font-mono max-h-96">
                        {componentCode ? (
                            <pre className="m-0 whitespace-pre-wrap break-words">
                                {componentCode}
                            </pre>
                        ) : (
                            <p className="text-gray-600 italic m-0">
                                Generated code will appear here...
                            </p>
                        )}
                    </div>
                </div>

                {/* Frontmatter Preview */}
                <div className="border border-gray-200 rounded-lg p-5">
                    <h2 className="mt-0 mb-4 text-lg font-semibold text-gray-800">Metadata (Frontmatter):</h2>
                    <div className="min-h-24 bg-gray-50 border border-gray-300 rounded p-4 overflow-auto text-xs font-mono max-h-64">
                        {frontmatter ? (
                            <pre className="m-0 whitespace-pre-wrap break-words">
                                {JSON.stringify(frontmatter, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-gray-600 italic m-0">
                                Component metadata will appear here...
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
} 